import { log, error, warn } from "../lib/logger.js";
import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import db from '../config/db.js';

const router = express.Router();

router.get('/:leadId/phones', authMiddleware, async (req, res) => {
  try {
    const { leadId } = req.params;
    const { tenant_id } = req.user;

    const result = await db.query(
      `SELECT lp.* 
       FROM lead_phones lp
       JOIN leads l ON lp.lead_id = l.id
       WHERE lp.lead_id = $1 AND lp.tenant_id = $2 AND l.tenant_id = $2
       ORDER BY lp.is_primary DESC, lp.created_at ASC`,
      [leadId, tenant_id]
    );

    res.json({
      success: true,
      phones: result.rows
    });
  } catch (error) {
    error('❌ Erreur GET phones:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:leadId/phones', authMiddleware, async (req, res) => {
  try {
    const { leadId } = req.params;
    const { tenant_id, id: user_id } = req.user;
    const { 
      phone_number, 
      phone_type, 
      label, 
      extension, 
      is_primary,
      is_verified,
      notes 
    } = req.body;

    if (!phone_number) {
      return res.status(400).json({ 
        success: false, 
        error: 'Numéro de téléphone requis' 
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
        'UPDATE lead_phones SET is_primary = false WHERE lead_id = $1 AND tenant_id = $2',
        [leadId, tenant_id]
      );
    }

    const result = await db.query(
      `INSERT INTO lead_phones 
       (lead_id, tenant_id, phone_number, phone_type, label, extension, is_primary, is_verified, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [leadId, tenant_id, phone_number, phone_type || 'fixe', label, extension, 
       is_primary || false, is_verified || false, notes]
    );

    await db.query(
      `INSERT INTO lead_activities 
       (lead_id, tenant_id, activity_type, activity_title, activity_description, performed_by)
       VALUES ($1, $2, 'phone_added', 'Téléphone ajouté', $3, $4)`,
      [leadId, tenant_id, `Téléphone ${phone_number} (${label || phone_type}) ajouté`, user_id]
    );

    log(`✅ Téléphone ajouté pour lead ${leadId}`);

    res.json({
      success: true,
      phone: result.rows[0]
    });
  } catch (error) {
    error('❌ Erreur POST phone:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:leadId/phones/:id', authMiddleware, async (req, res) => {
  try {
    const { leadId, id } = req.params;
    const { tenant_id, id: user_id } = req.user;
    const { 
      phone_number, 
      phone_type, 
      label, 
      extension, 
      is_primary,
      is_verified,
      notes 
    } = req.body;

    if (is_primary) {
      await db.query(
        'UPDATE lead_phones SET is_primary = false WHERE lead_id = $1 AND tenant_id = $2 AND id != $3',
        [leadId, tenant_id, id]
      );
    }

    const result = await db.query(
      `UPDATE lead_phones 
       SET phone_number = $1, 
           phone_type = $2, 
           label = $3, 
           extension = $4,
           is_primary = $5,
           is_verified = $6,
           notes = $7,
           updated_at = NOW()
       WHERE id = $8 AND lead_id = $9 AND tenant_id = $10
       RETURNING *`,
      [phone_number, phone_type, label, extension, is_primary, is_verified, notes,
       id, leadId, tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Téléphone introuvable' 
      });
    }

    await db.query(
      `INSERT INTO lead_activities 
       (lead_id, tenant_id, activity_type, activity_title, activity_description, performed_by)
       VALUES ($1, $2, 'phone_updated', 'Téléphone modifié', $3, $4)`,
      [leadId, tenant_id, `Téléphone ${phone_number} modifié`, user_id]
    );

    log(`✅ Téléphone ${id} modifié`);

    res.json({
      success: true,
      phone: result.rows[0]
    });
  } catch (error) {
    error('❌ Erreur PUT phone:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:leadId/phones/:id', authMiddleware, async (req, res) => {
  try {
    const { leadId, id } = req.params;
    const { tenant_id, id: user_id } = req.user;

    const phoneCheck = await db.query(
      'SELECT * FROM lead_phones WHERE id = $1 AND lead_id = $2 AND tenant_id = $3',
      [id, leadId, tenant_id]
    );

    if (phoneCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Téléphone introuvable' 
      });
    }

    const phone = phoneCheck.rows[0];

    await db.query(
      'DELETE FROM lead_phones WHERE id = $1 AND lead_id = $2 AND tenant_id = $3',
      [id, leadId, tenant_id]
    );

    await db.query(
      `INSERT INTO lead_activities 
       (lead_id, tenant_id, activity_type, activity_title, activity_description, performed_by)
       VALUES ($1, $2, 'phone_deleted', 'Téléphone supprimé', $3, $4)`,
      [leadId, tenant_id, `Téléphone ${phone.phone_number} supprimé`, user_id]
    );

    log(`✅ Téléphone ${id} supprimé`);

    res.json({
      success: true,
      message: 'Téléphone supprimé'
    });
  } catch (error) {
    error('❌ Erreur DELETE phone:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/:leadId/phones/:id/set-primary', authMiddleware, async (req, res) => {
  try {
    const { leadId, id } = req.params;
    const { tenant_id } = req.user;

    await db.query(
      'UPDATE lead_phones SET is_primary = false WHERE lead_id = $1 AND tenant_id = $2',
      [leadId, tenant_id]
    );

    const result = await db.query(
      'UPDATE lead_phones SET is_primary = true WHERE id = $1 AND lead_id = $2 AND tenant_id = $3 RETURNING *',
      [id, leadId, tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Téléphone introuvable' 
      });
    }

    log(`✅ Téléphone ${id} défini comme principal`);

    res.json({
      success: true,
      phone: result.rows[0]
    });
  } catch (error) {
    error('❌ Erreur PATCH set-primary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;