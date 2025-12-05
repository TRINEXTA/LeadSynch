import { log, error, warn } from "../lib/logger.js";
import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import db from '../config/db.js';

const router = express.Router();

router.get('/:leadId/notes', authMiddleware, async (req, res) => {
  try {
    const { leadId } = req.params;
    const { tenant_id } = req.user;

    const result = await db.query(
      `SELECT ln.*, u.first_name, u.last_name,
              (u.first_name || ' ' || u.last_name) as author_name
       FROM lead_notes ln
       JOIN leads l ON ln.lead_id = l.id
       LEFT JOIN users u ON ln.created_by = u.id
       WHERE ln.lead_id = $1 AND ln.tenant_id = $2 AND l.tenant_id = $2
       ORDER BY ln.is_pinned DESC, ln.created_at DESC`,
      [leadId, tenant_id]
    );

    res.json({
      success: true,
      notes: result.rows
    });
  } catch (error) {
    error('❌ Erreur GET notes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:leadId/notes', authMiddleware, async (req, res) => {
  try {
    const { leadId } = req.params;
    const { tenant_id, id: user_id } = req.user;
    const { 
      content,
      note_type,
      is_important,
      is_pinned,
      attachments
    } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Contenu de la note requis' 
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

    const result = await db.query(
      `INSERT INTO lead_notes 
       (lead_id, tenant_id, content, note_type, is_important, is_pinned, attachments, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [leadId, tenant_id, content, note_type || 'general', 
       is_important || false, is_pinned || false, 
       attachments ? JSON.stringify(attachments) : null, user_id]
    );

    await db.query(
      `INSERT INTO lead_activities 
       (lead_id, tenant_id, activity_type, activity_title, activity_description, performed_by)
       VALUES ($1, $2, 'note_added', 'Note ajoutée', $3, $4)`,
      [leadId, tenant_id, `Note de type ${note_type || 'general'} ajoutée`, user_id]
    );

    log(`✅ Note ajoutée pour lead ${leadId}`);

    res.json({
      success: true,
      note: result.rows[0]
    });
  } catch (error) {
    error('❌ Erreur POST note:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:leadId/notes/:id', authMiddleware, async (req, res) => {
  try {
    const { leadId, id } = req.params;
    const { tenant_id, id: user_id } = req.user;
    const { 
      content,
      note_type,
      is_important,
      is_pinned,
      attachments
    } = req.body;

    const result = await db.query(
      `UPDATE lead_notes 
       SET content = $1,
           note_type = $2,
           is_important = $3,
           is_pinned = $4,
           attachments = $5,
           updated_at = NOW()
       WHERE id = $6 AND lead_id = $7 AND tenant_id = $8
       RETURNING *`,
      [content, note_type, is_important, is_pinned, 
       attachments ? JSON.stringify(attachments) : null,
       id, leadId, tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Note introuvable' 
      });
    }

    await db.query(
      `INSERT INTO lead_activities 
       (lead_id, tenant_id, activity_type, activity_title, activity_description, performed_by)
       VALUES ($1, $2, 'note_updated', 'Note modifiée', 'Note modifiée', $3)`,
      [leadId, tenant_id, user_id]
    );

    log(`✅ Note ${id} modifiée`);

    res.json({
      success: true,
      note: result.rows[0]
    });
  } catch (error) {
    error('❌ Erreur PUT note:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:leadId/notes/:id', authMiddleware, async (req, res) => {
  try {
    const { leadId, id } = req.params;
    const { tenant_id, id: user_id } = req.user;

    const noteCheck = await db.query(
      'SELECT * FROM lead_notes WHERE id = $1 AND lead_id = $2 AND tenant_id = $3',
      [id, leadId, tenant_id]
    );

    if (noteCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Note introuvable' 
      });
    }

    await db.query(
      'DELETE FROM lead_notes WHERE id = $1 AND lead_id = $2 AND tenant_id = $3',
      [id, leadId, tenant_id]
    );

    await db.query(
      `INSERT INTO lead_activities 
       (lead_id, tenant_id, activity_type, activity_title, activity_description, performed_by)
       VALUES ($1, $2, 'note_deleted', 'Note supprimée', 'Note supprimée', $3)`,
      [leadId, tenant_id, user_id]
    );

    log(`✅ Note ${id} supprimée`);

    res.json({
      success: true,
      message: 'Note supprimée'
    });
  } catch (error) {
    error('❌ Erreur DELETE note:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/:leadId/notes/:id/toggle-pin', authMiddleware, async (req, res) => {
  try {
    const { leadId, id } = req.params;
    const { tenant_id } = req.user;

    const result = await db.query(
      'UPDATE lead_notes SET is_pinned = NOT is_pinned WHERE id = $1 AND lead_id = $2 AND tenant_id = $3 RETURNING *',
      [id, leadId, tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Note introuvable' 
      });
    }

    log(`✅ Note ${id} épinglée/désépinglée`);

    res.json({
      success: true,
      note: result.rows[0]
    });
  } catch (error) {
    error('❌ Erreur PATCH toggle-pin:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/:leadId/notes/:id/toggle-important', authMiddleware, async (req, res) => {
  try {
    const { leadId, id } = req.params;
    const { tenant_id } = req.user;

    const result = await db.query(
      'UPDATE lead_notes SET is_important = NOT is_important WHERE id = $1 AND lead_id = $2 AND tenant_id = $3 RETURNING *',
      [id, leadId, tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Note introuvable' 
      });
    }

    log(`✅ Note ${id} marquée importante/normale`);

    res.json({
      success: true,
      note: result.rows[0]
    });
  } catch (error) {
    error('❌ Erreur PATCH toggle-important:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;