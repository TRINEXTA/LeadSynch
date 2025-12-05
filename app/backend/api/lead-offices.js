import { log, error, warn } from "../lib/logger.js";
import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import db from '../config/db.js';

const router = express.Router();

router.get('/:leadId/offices', authMiddleware, async (req, res) => {
  try {
    const { leadId } = req.params;
    const { tenant_id } = req.user;

    const result = await db.query(
      `SELECT lo.* 
       FROM lead_offices lo
       JOIN leads l ON lo.lead_id = l.id
       WHERE lo.lead_id = $1 AND lo.tenant_id = $2 AND l.tenant_id = $2
       ORDER BY lo.is_primary DESC, lo.created_at ASC`,
      [leadId, tenant_id]
    );

    res.json({
      success: true,
      offices: result.rows
    });
  } catch (error) {
    error('❌ Erreur GET offices:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:leadId/offices', authMiddleware, async (req, res) => {
  try {
    const { leadId } = req.params;
    const { tenant_id, id: user_id } = req.user;
    const { 
      office_name,
      office_type,
      address,
      address_line2,
      city,
      postal_code,
      region,
      country,
      latitude,
      longitude,
      is_primary,
      phone,
      email,
      opening_hours,
      employee_count,
      notes
    } = req.body;

    if (!office_name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nom du bureau requis' 
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
        'UPDATE lead_offices SET is_primary = false WHERE lead_id = $1 AND tenant_id = $2',
        [leadId, tenant_id]
      );
    }

    const result = await db.query(
      `INSERT INTO lead_offices 
       (lead_id, tenant_id, office_name, office_type, address, address_line2, 
        city, postal_code, region, country, latitude, longitude, is_primary, 
        phone, email, opening_hours, employee_count, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [leadId, tenant_id, office_name, office_type, address, address_line2,
       city, postal_code, region, country || 'France', latitude, longitude, 
       is_primary || false, phone, email, opening_hours, employee_count, notes]
    );

    await db.query(
      `INSERT INTO lead_activities 
       (lead_id, tenant_id, activity_type, activity_title, activity_description, performed_by)
       VALUES ($1, $2, 'office_added', 'Bureau ajouté', $3, $4)`,
      [leadId, tenant_id, `Bureau ${office_name} à ${city || 'ville non spécifiée'} ajouté`, user_id]
    );

    log(`✅ Bureau ajouté pour lead ${leadId}`);

    res.json({
      success: true,
      office: result.rows[0]
    });
  } catch (error) {
    error('❌ Erreur POST office:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:leadId/offices/:id', authMiddleware, async (req, res) => {
  try {
    const { leadId, id } = req.params;
    const { tenant_id, id: user_id } = req.user;
    const { 
      office_name,
      office_type,
      address,
      address_line2,
      city,
      postal_code,
      region,
      country,
      latitude,
      longitude,
      is_primary,
      phone,
      email,
      opening_hours,
      employee_count,
      notes
    } = req.body;

    if (is_primary) {
      await db.query(
        'UPDATE lead_offices SET is_primary = false WHERE lead_id = $1 AND tenant_id = $2 AND id != $3',
        [leadId, tenant_id, id]
      );
    }

    const result = await db.query(
      `UPDATE lead_offices 
       SET office_name = $1,
           office_type = $2,
           address = $3,
           address_line2 = $4,
           city = $5,
           postal_code = $6,
           region = $7,
           country = $8,
           latitude = $9,
           longitude = $10,
           is_primary = $11,
           phone = $12,
           email = $13,
           opening_hours = $14,
           employee_count = $15,
           notes = $16,
           updated_at = NOW()
       WHERE id = $17 AND lead_id = $18 AND tenant_id = $19
       RETURNING *`,
      [office_name, office_type, address, address_line2, city, postal_code, region,
       country, latitude, longitude, is_primary, phone, email, opening_hours, 
       employee_count, notes, id, leadId, tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Bureau introuvable' 
      });
    }

    await db.query(
      `INSERT INTO lead_activities 
       (lead_id, tenant_id, activity_type, activity_title, activity_description, performed_by)
       VALUES ($1, $2, 'office_updated', 'Bureau modifié', $3, $4)`,
      [leadId, tenant_id, `Bureau ${office_name} modifié`, user_id]
    );

    log(`✅ Bureau ${id} modifié`);

    res.json({
      success: true,
      office: result.rows[0]
    });
  } catch (error) {
    error('❌ Erreur PUT office:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:leadId/offices/:id', authMiddleware, async (req, res) => {
  try {
    const { leadId, id } = req.params;
    const { tenant_id, id: user_id } = req.user;

    const officeCheck = await db.query(
      'SELECT * FROM lead_offices WHERE id = $1 AND lead_id = $2 AND tenant_id = $3',
      [id, leadId, tenant_id]
    );

    if (officeCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Bureau introuvable' 
      });
    }

    const office = officeCheck.rows[0];

    await db.query(
      'DELETE FROM lead_offices WHERE id = $1 AND lead_id = $2 AND tenant_id = $3',
      [id, leadId, tenant_id]
    );

    await db.query(
      `INSERT INTO lead_activities 
       (lead_id, tenant_id, activity_type, activity_title, activity_description, performed_by)
       VALUES ($1, $2, 'office_deleted', 'Bureau supprimé', $3, $4)`,
      [leadId, tenant_id, `Bureau ${office.office_name} supprimé`, user_id]
    );

    log(`✅ Bureau ${id} supprimé`);

    res.json({
      success: true,
      message: 'Bureau supprimé'
    });
  } catch (error) {
    error('❌ Erreur DELETE office:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/:leadId/offices/:id/set-primary', authMiddleware, async (req, res) => {
  try {
    const { leadId, id } = req.params;
    const { tenant_id } = req.user;

    await db.query(
      'UPDATE lead_offices SET is_primary = false WHERE lead_id = $1 AND tenant_id = $2',
      [leadId, tenant_id]
    );

    const result = await db.query(
      'UPDATE lead_offices SET is_primary = true WHERE id = $1 AND lead_id = $2 AND tenant_id = $3 RETURNING *',
      [id, leadId, tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Bureau introuvable' 
      });
    }

    log(`✅ Bureau ${id} défini comme principal`);

    res.json({
      success: true,
      office: result.rows[0]
    });
  } catch (error) {
    error('❌ Erreur PATCH set-primary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;