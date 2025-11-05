import { authMiddleware } from '../middleware/auth.js';
import { queryAll, execute } from '../lib/db.js';

async function handler(req, res) {
  const tenant_id = req.user.tenant_id;
  const user_id = req.user.id;

  try {
    // POST - Démarrer une session
    if (req.method === 'POST' && req.url.includes('/start')) {
      const { campaign_id } = req.body;

      if (!campaign_id) {
        return res.status(400).json({ error: 'campaign_id requis' });
      }

      const session = await execute(
        `INSERT INTO prospection_sessions 
        (user_id, campaign_id, tenant_id, status, start_time)
        VALUES ($1, $2, $3, 'active', NOW())
        RETURNING *`,
        [user_id, campaign_id, tenant_id]
      );

      return res.json({
        success: true,
        session
      });
    }

    // PATCH - Mettre en pause
    if (req.method === 'PATCH' && req.url.includes('/pause')) {
      const { session_id, pause_reason } = req.body;

      await execute(
        `UPDATE prospection_sessions 
         SET status = 'paused', 
             pause_time = NOW(),
             pause_reason = $1
         WHERE id = $2 AND user_id = $3`,
        [pause_reason, session_id, user_id]
      );

      return res.json({ success: true });
    }

    // PATCH - Reprendre
    if (req.method === 'PATCH' && req.url.includes('/resume')) {
      const { session_id } = req.body;

      const session = await queryAll(
        'SELECT pause_time FROM prospection_sessions WHERE id = $1',
        [session_id]
      );

      if (session.length > 0 && session[0].pause_time) {
        const pauseDuration = Math.floor(
          (Date.now() - new Date(session[0].pause_time).getTime()) / 1000
        );

        await execute(
          `UPDATE prospection_sessions 
           SET status = 'active',
               resume_time = NOW(),
               pause_reason = NULL
           WHERE id = $1 AND user_id = $2`,
          [session_id, user_id]
        );
      }

      return res.json({ success: true });
    }

    // POST - Terminer session
    if (req.method === 'POST' && req.url.includes('/end')) {
      const { session_id } = req.body;

      const session = await queryAll(
        'SELECT * FROM prospection_sessions WHERE id = $1',
        [session_id]
      );

      if (session.length > 0) {
        const totalDuration = Math.floor(
          (Date.now() - new Date(session[0].start_time).getTime()) / 1000
        );

        await execute(
          `UPDATE prospection_sessions 
           SET status = 'completed',
               end_time = NOW(),
               total_duration = $1
           WHERE id = $2`,
          [totalDuration, session_id]
        );

        // Mettre à jour les stats de la campagne
        await execute(
          `UPDATE campaign_assignments 
           SET time_spent = time_spent + $1,
               calls_made = calls_made + $2,
               meetings_scheduled = meetings_scheduled + $3
           WHERE campaign_id = $4 AND user_id = $5`,
          [
            totalDuration, 
            session[0].calls_made || 0,
            session[0].meetings_obtained || 0,
            session[0].campaign_id,
            user_id
          ]
        );

        return res.json({
          success: true,
          summary: {
            duration: totalDuration,
            calls: session[0].calls_made || 0,
            meetings: session[0].meetings_obtained || 0,
            docs_sent: session[0].docs_sent || 0,
            follow_ups: session[0].follow_ups_created || 0,
            disqualified: session[0].disqualified || 0,
            nrp: session[0].nrp || 0
          }
        });
      }

      return res.status(404).json({ error: 'Session non trouvée' });
    }

    // GET - Session active
    if (req.method === 'GET' && req.url.includes('/active')) {
      const activeSession = await queryAll(
        `SELECT * FROM prospection_sessions 
         WHERE user_id = $1 
         AND status IN ('active', 'paused')
         ORDER BY start_time DESC 
         LIMIT 1`,
        [user_id]
      );

      return res.json({
        success: true,
        session: activeSession[0] || null
      });
    }

    // POST - Enregistrer un appel
    if (req.method === 'POST' && req.url.includes('/call')) {
      const { 
        session_id, 
        lead_id, 
        duration, 
        qualification,
        notes,
        follow_up_date 
      } = req.body;

      // Récupérer la campagne de la session
      const sessionData = await queryAll(
        'SELECT campaign_id FROM prospection_sessions WHERE id = $1',
        [session_id]
      );

      if (sessionData.length === 0) {
        return res.status(404).json({ error: 'Session non trouvée' });
      }

      const campaign_id = sessionData[0].campaign_id;

      // Enregistrer l'appel
      await execute(
        `INSERT INTO call_history 
        (lead_id, user_id, session_id, duration, qualification, notes, follow_up_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [lead_id, user_id, session_id, duration, qualification, notes, follow_up_date]
      );

      // Mettre à jour le lead
      await execute(
        `UPDATE leads 
         SET pipeline_stage = $1,
             last_call_date = NOW(),
             next_follow_up = $2,
             notes = COALESCE(notes || E'\n\n', '') || $3
         WHERE id = $4`,
        [qualification, follow_up_date, notes, lead_id]
      );

      // 🔥 METTRE À JOUR LE STAGE DANS LE PIPELINE
      try {
        // Mapper la qualification vers le bon stage du pipeline
        const stageMapping = {
          // Intéressé → Qualifié
          'interested': 'qualifie',
          'qualified': 'qualifie',
          
          // RDV → Très Qualifié
          'meeting_scheduled': 'tres_qualifie',
          'meeting_requested': 'tres_qualifie',
          'rdv_scheduled': 'tres_qualifie',
          'appointment': 'tres_qualifie',
          
          // Démo → Proposition
          'demo_scheduled': 'proposition',
          'demo_requested': 'proposition',
          
          // À relancer
          'callback': 'relancer',
          'follow_up': 'relancer',
          'email_sent': 'relancer',
          
          // NRP / Pas intéressé / Hors scope
          'not_interested': 'nrp',
          'disqualified': 'hors_scope',
          'nrp': 'nrp',
          'no_answer': 'nrp',
          'wrong_number': 'nrp'
        };

        const stage = stageMapping[qualification] || 'cold_call';

        // Mettre à jour le stage dans pipeline_leads
        await execute(
          `INSERT INTO pipeline_leads (id, tenant_id, lead_id, campaign_id, stage, created_at, updated_at, assigned_user_id)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW(), $5)
           ON CONFLICT (lead_id, campaign_id) 
           DO UPDATE SET 
             stage = EXCLUDED.stage, 
             updated_at = NOW(),
             assigned_user_id = EXCLUDED.assigned_user_id`,
          [tenant_id, lead_id, campaign_id, stage, user_id]
        );

        console.log(`🧩 [PROSPECTION] Lead ${lead_id} déplacé vers ${stage} (qualification: ${qualification})`);
      } catch (pipelineError) {
        console.error('❌ [PROSPECTION] Erreur mise à jour pipeline:', pipelineError.message);
        console.error(`   - tenant_id: ${tenant_id}`);
        console.error(`   - lead_id: ${lead_id}`);
        console.error(`   - campaign_id: ${campaign_id}`);
        console.error(`   - qualification: ${qualification}`);
        // Ne pas bloquer l'enregistrement de l'appel si l'injection pipeline échoue
      }

      // Incrémenter compteur session
      await execute(
        `UPDATE prospection_sessions 
         SET calls_made = calls_made + 1,
             meetings_obtained = meetings_obtained + CASE WHEN $1 IN ('meeting_scheduled', 'demo_scheduled', 'meeting_requested') THEN 1 ELSE 0 END,
             docs_sent = docs_sent + CASE WHEN $1 = 'email_sent' THEN 1 ELSE 0 END,
             follow_ups_created = follow_ups_created + CASE WHEN $2 IS NOT NULL THEN 1 ELSE 0 END,
             disqualified = disqualified + CASE WHEN $1 IN ('disqualified', 'not_interested') THEN 1 ELSE 0 END,
             nrp = nrp + CASE WHEN $1 = 'nrp' THEN 1 ELSE 0 END
         WHERE id = $3`,
        [qualification, follow_up_date, session_id]
      );

      return res.json({ 
        success: true,
        message: 'Appel enregistré et lead mis à jour dans le pipeline'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Prospection sessions error:', error);
    return res.status(500).json({ 
      error: 'Server error',
      details: error.message 
    });
  }
}

export default authMiddleware(handler);