import { log, error, warn } from "../lib/logger.js";
import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import db from '../config/db.js';

const router = express.Router();

router.get('/:leadId/contacts', authMiddleware, async (req, res) => {
  try {
    const { leadId } = req.params;
    const { tenant_id } = req.user;

    const result = await db.query(
      `SELECT lc.* 
       FROM lead_contacts lc
       JOIN leads l ON lc.lead_id = l.id
       WHERE lc.lead_id = $1 AND lc.tenant_id = $2 AND l.tenant_id = $2
       ORDER BY lc.is_primary DESC, lc.created_at ASC`,
      [leadId, tenant_id]
    );

    res.json({
      success: true,
      contacts: result.rows
    });
  } catch (error) {
    error('❌ Erreur GET contacts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:leadId/contacts', authMiddleware, async (req, res) => {
  try {
    const { leadId } = req.params;
    const { tenant_id, id: user_id } = req.user;
    const { 
      first_name, 
      last_name, 
      position, 
      department, 
      email, 
      phone, 
      mobile, 
      is_primary, 
      is_decision_maker,
      notes 
    } = req.body;

    if (!last_name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nom requis' 
      });
    }

    const leadCheck = await db.query(
      'SELECT id FROM leads WHERE id = $1 AND tenant_id = $2',
      [leadId, tenant_id]
    );

    if (leadCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Lead introuvable' 
      });
    }

    if (is_primary) {
      await db.query(
        'UPDATE lead_contacts SET is_primary = false WHERE lead_id = $1 AND tenant_id = $2',
        [leadId, tenant_id]
      );
    }

    const result = await db.query(
      `INSERT INTO lead_contacts 
       (lead_id, tenant_id, first_name, last_name, position, department, 
        email, phone, mobile, is_primary, is_decision_maker, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [leadId, tenant_id, first_name, last_name, position, department, 
       email, phone, mobile, is_primary || false, is_decision_maker || false, notes, user_id]
    );

    await db.query(
      `INSERT INTO lead_activities 
       (lead_id, tenant_id, activity_type, activity_title, activity_description, performed_by)
       VALUES ($1, $2, 'contact_added', 'Contact ajouté', $3, $4)`,
      [leadId, tenant_id, `Contact ${first_name || ''} ${last_name} ajouté`, user_id]
    );

    log(`✅ Contact créé pour lead ${leadId}`);

    res.json({
      success: true,
      contact: result.rows[0]
    });
  } catch (error) {
    error('❌ Erreur POST contact:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:leadId/contacts/:id', authMiddleware, async (req, res) => {
  try {
    const { leadId, id } = req.params;
    const { tenant_id, id: user_id } = req.user;
    const { 
      first_name, 
      last_name, 
      position, 
      department, 
      email, 
      phone, 
      mobile, 
      is_primary, 
      is_decision_maker,
      notes 
    } = req.body;

    if (is_primary) {
      await db.query(
        'UPDATE lead_contacts SET is_primary = false WHERE lead_id = $1 AND tenant_id = $2 AND id != $3',
        [leadId, tenant_id, id]
      );
    }

    const result = await db.query(
      `UPDATE lead_contacts 
       SET first_name = $1, 
           last_name = $2, 
           position = $3, 
           department = $4,
           email = $5, 
           phone = $6, 
           mobile = $7, 
           is_primary = $8, 
           is_decision_maker = $9,
           notes = $10,
           updated_at = NOW()
       WHERE id = $11 AND lead_id = $12 AND tenant_id = $13
       RETURNING *`,
      [first_name, last_name, position, department, email, phone, mobile, 
       is_primary, is_decision_maker, notes, id, leadId, tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Contact introuvable' 
      });
    }

    await db.query(
      `INSERT INTO lead_activities 
       (lead_id, tenant_id, activity_type, activity_title, activity_description, performed_by)
       VALUES ($1, $2, 'contact_updated', 'Contact modifié', $3, $4)`,
      [leadId, tenant_id, `Contact ${first_name || ''} ${last_name} modifié`, user_id]
    );

    log(`✅ Contact ${id} modifié`);

    res.json({
      success: true,
      contact: result.rows[0]
    });
  } catch (error) {
    error('❌ Erreur PUT contact:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:leadId/contacts/:id', authMiddleware, async (req, res) => {
  try {
    const { leadId, id } = req.params;
    const { tenant_id, id: user_id } = req.user;

    const contactCheck = await db.query(
      'SELECT * FROM lead_contacts WHERE id = $1 AND lead_id = $2 AND tenant_id = $3',
      [id, leadId, tenant_id]
    );

    if (contactCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Contact introuvable' 
      });
    }

    const contact = contactCheck.rows[0];

    await db.query(
      'DELETE FROM lead_contacts WHERE id = $1 AND lead_id = $2 AND tenant_id = $3',
      [id, leadId, tenant_id]
    );

    await db.query(
      `INSERT INTO lead_activities 
       (lead_id, tenant_id, activity_type, activity_title, activity_description, performed_by)
       VALUES ($1, $2, 'contact_deleted', 'Contact supprimé', $3, $4)`,
      [leadId, tenant_id, `Contact ${contact.first_name || ''} ${contact.last_name} supprimé`, user_id]
    );

    log(`✅ Contact ${id} supprimé`);

    res.json({
      success: true,
      message: 'Contact supprimé'
    });
  } catch (error) {
    error('❌ Erreur DELETE contact:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/:leadId/contacts/:id/set-primary', authMiddleware, async (req, res) => {
  try {
    const { leadId, id } = req.params;
    const { tenant_id } = req.user;

    await db.query(
      'UPDATE lead_contacts SET is_primary = false WHERE lead_id = $1 AND tenant_id = $2',
      [leadId, tenant_id]
    );

    const result = await db.query(
      'UPDATE lead_contacts SET is_primary = true WHERE id = $1 AND lead_id = $2 AND tenant_id = $3 RETURNING *',
      [id, leadId, tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Contact introuvable' 
      });
    }

    log(`✅ Contact ${id} défini comme principal`);

    res.json({
      success: true,
      contact: result.rows[0]
    });
  } catch (error) {
    error('❌ Erreur PATCH set-primary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;