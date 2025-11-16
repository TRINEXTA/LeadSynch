import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { authMiddleware } from '../middleware/auth.js';
import { query, queryOne } from '../lib/db.js';

const router = express.Router();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// POST / - Chatbot Asefi intelligent (s'alimente des vraies données)
router.post('/', authMiddleware, async (req, res) => {
  console.log('💬 Asefi chatbot - Question utilisateur');

  try {
    const { prompt } = req.body;
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const userRole = req.user.role;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt requis' });
    }

    // ===== ALIMENTER LE CONTEXTE AVEC VRAIES DONNÉES =====

    // Stats de l'utilisateur
    const statsQuery = await query(
      `SELECT
        COUNT(*) FILTER (WHERE l.tenant_id = $1) as total_leads,
        COUNT(*) FILTER (WHERE l.status = 'qualifie' AND l.tenant_id = $1) as qualified_leads,
        COUNT(*) FILTER (WHERE l.status = 'gagne' AND l.tenant_id = $1) as won_leads
      FROM leads l
      WHERE l.tenant_id = $1`,
      [tenantId]
    );

    const stats = statsQuery.rows[0] || {};

    // Campagnes actives
    const campaignsQuery = await query(
      `SELECT COUNT(*) as active_campaigns
      FROM campaigns
      WHERE tenant_id = $1 AND status = 'active'`,
      [tenantId]
    );

    const campaigns = campaignsQuery.rows[0] || {};

    // Leads récents (5 derniers)
    const recentLeadsQuery = await query(
      `SELECT company_name, status, sector, created_at
      FROM leads
      WHERE tenant_id = $1
      ORDER BY created_at DESC
      LIMIT 5`,
      [tenantId]
    );

    const recentLeads = recentLeadsQuery.rows || [];

    // Plan utilisateur (à adapter selon votre système)
    const userPlanQuery = await queryOne(
      `SELECT plan_type, email_quota
      FROM tenants
      WHERE id = $1`,
      [tenantId]
    );

    const userPlan = userPlanQuery || { plan_type: 'FREE', email_quota: 30 };

    // ===== CONSTRUIRE LE CONTEXTE DYNAMIQUE =====

    const dynamicContext = `Tu es Asefi, l'assistant IA intelligent de LeadSynch - Plateforme CRM B2B.

DONNÉES TEMPS RÉEL DE L'UTILISATEUR:
- Rôle: ${userRole}
- Plan: ${userPlan.plan_type}
- Quota emails: ${userPlan.email_quota}/mois

STATISTIQUES ACTUELLES:
- Total leads: ${stats.total_leads || 0}
- Leads qualifiés: ${stats.qualified_leads || 0}
- Deals gagnés: ${stats.won_leads || 0}
- Campagnes actives: ${campaigns.active_campaigns || 0}

${recentLeads.length > 0 ? `LEADS RÉCENTS:
${recentLeads.map((l, i) => `${i + 1}. ${l.company_name} - ${l.sector || 'Secteur non spécifié'} - ${l.status}`).join('\n')}` : ''}

PLANS TARIFAIRES LEADSYNCH:
- GRATUIT: 30 leads/mois
- STARTER: 27€/mois - 500 leads
- PRO: 67€/mois - 2000 leads
- BUSINESS: 147€/mois - 10000 leads
- ENTREPRISE: Sur mesure - illimité

FONCTIONNALITÉS CLÉS:
1. Génération leads Google Maps + scraping
2. Import CSV avec détection IA secteur
3. Campagnes email + tracking (ouvertures, clics)
4. Pipeline Kanban drag & drop
5. Scoring automatique leads
6. Templates email IA
7. Multi-utilisateurs (admin/manager/commercial)
8. Secteurs géographiques auto-assignation
9. Demandes validation/aide managers

SUPPORT:
- Problème avec l'application: support@lit5.com
- Demande d'information: contact@lit5.com
- Site web: https://lit5.com (PAS .fr, uniquement .com)

INSTRUCTIONS RÉPONSE:
1. Utilise les VRAIES données ci-dessus pour répondre
2. Sois précis, concis et professionnel
3. Si tu ne sais pas, DIS-LE et propose de contacter le support
4. Pour questions complexes nécessitant action humaine, suggère le formulaire de contact
5. Ne mentionne JAMAIS d'email .fr (seulement .com)
6. Adapte ta réponse au rôle de l'utilisateur (${userRole})`;

    // ===== APPEL CLAUDE API =====

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      temperature: 0.7,
      system: dynamicContext,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const response = message.content[0].text.trim();

    console.log('✅ Asefi réponse générée');

    res.json({
      success: true,
      response: response,
      tokens_used: message.usage.input_tokens + message.usage.output_tokens,
      context_fed: {
        total_leads: stats.total_leads,
        active_campaigns: campaigns.active_campaigns,
        user_plan: userPlan.plan_type
      }
    });

  } catch (error) {
    console.error('❌ Erreur Asefi chatbot:', error);
    res.status(500).json({
      error: 'Erreur lors de la génération de la réponse',
      details: error.message
    });
  }
});

export default router;
