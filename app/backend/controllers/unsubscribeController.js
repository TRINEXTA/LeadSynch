import { v4 as uuidv4 } from 'uuid';
import db from '../lib/db.js';

// Page de désabonnement (GET)
export const getUnsubscribePage = async (req, res) => {
  try {
    const { lead_id } = req.params;

    // Vérifier si le lead existe
    const lead = await db.queryOne(
      'SELECT id, email, company_name, contact_name, unsubscribed FROM leads WHERE id = $1',
      [lead_id]
    );

    if (!lead) {
      return res.status(404).json({ message: 'Lead introuvable' });
    }

    res.json({
      lead: {
        id: lead.id,
        email: lead.email,
        name: lead.contact_name || lead.company_name,
        already_unsubscribed: lead.unsubscribed
      }
    });
  } catch (error) {
    console.error('Erreur get unsubscribe:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Traiter le désabonnement (POST)
export const processUnsubscribe = async (req, res) => {
  try {
    const { lead_id } = req.params;
    const { reason } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    // Vérifier si le lead existe
    const lead = await db.queryOne(
      'SELECT id, email, company_name, contact_name FROM leads WHERE id = $1',
      [lead_id]
    );

    if (!lead) {
      return res.status(404).json({ message: 'Lead introuvable' });
    }

    // Vérifier si déjà désabonné
    const existingUnsubscribe = await db.queryOne(
      'SELECT id FROM email_unsubscribes WHERE lead_id = $1',
      [lead_id]
    );

    if (existingUnsubscribe) {
      return res.json({ message: 'Déjà désabonné', already_unsubscribed: true });
    }

    const unsubId = uuidv4();

    // Enregistrer le désabonnement
    await db.query(
      `INSERT INTO email_unsubscribes (id, lead_id, email, reason, ip_address, user_agent, unsubscribed_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [unsubId, lead_id, lead.email, reason || null, ip, userAgent]
    );

    // Mettre à jour le lead
    await db.query(
      `UPDATE leads 
       SET unsubscribed = true, 
           unsubscribed_at = NOW()
       WHERE id = $1`,
      [lead_id]
    );

    console.log(`✅ Unsubscribe: ${lead.email} (${lead_id})`);

    res.json({
      message: 'Désabonnement effectué avec succès',
      success: true
    });
  } catch (error) {
    console.error('Erreur unsubscribe:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Réabonner un lead (pour admin)
export const resubscribe = async (req, res) => {
  try {
    const { lead_id } = req.params;

    await db.query(
      `UPDATE leads 
       SET unsubscribed = false, 
           unsubscribed_at = NULL
       WHERE id = $1`,
      [lead_id]
    );

    await db.query(
      'DELETE FROM email_unsubscribes WHERE lead_id = $1',
      [lead_id]
    );

    console.log(`✅ Resubscribe: lead ${lead_id}`);

    res.json({ message: 'Lead réabonné avec succès' });
  } catch (error) {
    console.error('Erreur resubscribe:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Stats désabonnements
export const getUnsubscribeStats = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        COUNT(*) as total_unsubscribes,
        COUNT(*) FILTER (WHERE unsubscribed_at > NOW() - INTERVAL '7 days') as last_7_days,
        COUNT(*) FILTER (WHERE unsubscribed_at > NOW() - INTERVAL '30 days') as last_30_days
      FROM email_unsubscribes
    `);

    res.json({ stats: result.rows[0] });
  } catch (error) {
    console.error('Erreur stats:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
