import { log, error, warn } from "../lib/logger.js";
import { query, queryOne, queryAll, execute } from '../lib/db.js';
import { verifyAuth } from '../middleware/auth.js';
import { z } from 'zod';

// List of valid event types including new categories
const VALID_EVENT_TYPES = [
  'meeting', 'call', 'video', 'task', 'break', 'other',
  'absence', 'sick_leave', 'vacation', 'late', 'full_day', 'half_day', 'follow_up'
];

// Schéma de validation pour créer un événement
const createEventSchema = z.object({
  title: z.string().min(1, 'Titre requis'),
  description: z.string().optional().nullable(),
  event_type: z.string().refine(val => VALID_EVENT_TYPES.includes(val), {
    message: 'Type d\'événement invalide'
  }).default('meeting'),
  start_date: z.string(),
  start_time: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  end_time: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  attendees: z.array(z.string()).optional().default([]),
  all_day: z.boolean().optional().default(false)
});

// Schéma pour mise à jour
const updateEventSchema = createEventSchema.partial();

export default async function handler(req, res) {
  try {
    // Vérifier l'authentification
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    const { userId, tenantId, role } = authResult;

    // Extraire l'ID de l'événement si présent dans l'URL
    const urlParts = req.url.split('/');
    const eventId = urlParts.length > 2 ? urlParts[urlParts.length - 1] : null;

    // GET /api/planning - Liste des événements
    if (req.method === 'GET' && (!eventId || eventId === 'planning')) {
      return await getEvents(req, res, userId, tenantId, role);
    }

    // GET /api/planning/:id - Détail d'un événement
    if (req.method === 'GET' && eventId && eventId !== 'planning') {
      return await getEventById(req, res, eventId, userId, tenantId);
    }

    // POST /api/planning - Créer un événement
    if (req.method === 'POST') {
      return await createEvent(req, res, userId, tenantId);
    }

    // PUT /api/planning/:id - Mettre à jour un événement
    if (req.method === 'PUT' && eventId) {
      return await updateEvent(req, res, eventId, userId, tenantId);
    }

    // DELETE /api/planning/:id - Supprimer un événement
    if (req.method === 'DELETE' && eventId) {
      return await deleteEvent(req, res, eventId, userId, tenantId);
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });

  } catch (err) {
    error('Erreur API planning:', err);
    return res.status(500).json({ error: err.message });
  }
}

// Récupérer les événements
async function getEvents(req, res, userId, tenantId, role) {
  const { start_date, end_date, include_team } = req.query;

  let dateFilter = '';
  const params = [tenantId];
  let paramIndex = 2;

  // Filtre par date
  if (start_date) {
    dateFilter += ` AND pe.start_date >= $${paramIndex}`;
    params.push(start_date);
    paramIndex++;
  }
  if (end_date) {
    dateFilter += ` AND pe.start_date <= $${paramIndex}`;
    params.push(end_date);
    paramIndex++;
  }

  // Filtre utilisateur ou équipe
  let userFilter = '';
  if (include_team === 'true' && (role === 'manager' || role === 'admin')) {
    if (role === 'manager') {
      // Récupérer les membres de l'équipe (utilisateurs qui ont ce manager comme manager_id)
      // Also include users who are in teams where this manager is the manager
      const teamMembers = await queryAll(`
        SELECT DISTINCT u.id
        FROM users u
        LEFT JOIN team_members tm ON tm.user_id = u.id
        LEFT JOIN teams t ON t.id = tm.team_id
        WHERE u.tenant_id = $1
          AND (u.manager_id = $2 OR t.manager_id = $2)
      `, [tenantId, userId]);

      const memberIds = [userId, ...teamMembers.map(m => m.id)];

      // Remove duplicates
      const uniqueIds = [...new Set(memberIds)];

      log(`📅 Planning équipe - Manager ${userId} - ${uniqueIds.length} membres:`, uniqueIds);

      userFilter = ` AND pe.user_id = ANY($${paramIndex}::uuid[])`;
      params.push(uniqueIds);
      paramIndex++;
    }
    // Admin voit tous les événements du tenant (pas de filtre utilisateur)
  } else {
    // Voir uniquement ses propres événements
    userFilter = ` AND pe.user_id = $${paramIndex}`;
    params.push(userId);
    paramIndex++;
  }

  const events = await queryAll(`
    SELECT
      pe.*,
      u.first_name || ' ' || u.last_name as owner_name,
      u.planning_color as user_color,
      u.first_name as user_first_name,
      u.last_name as user_last_name,
      COALESCE(
        (SELECT json_agg(json_build_object('id', att.id, 'name', att.first_name || ' ' || att.last_name))
         FROM users att
         WHERE att.id = ANY(pe.attendees)),
        '[]'
      ) as attendees_details
    FROM planning_events pe
    JOIN users u ON pe.user_id = u.id
    WHERE pe.tenant_id = $1${dateFilter}${userFilter}
    ORDER BY pe.start_date ASC, pe.start_time ASC
  `, params);

  log(`📅 Planning - ${events.length} événements trouvés`);

  return res.json({ events });
}

// Récupérer un événement par ID
async function getEventById(req, res, eventId, userId, tenantId) {
  const event = await queryOne(`
    SELECT
      pe.*,
      u.first_name || ' ' || u.last_name as owner_name,
      u.planning_color as user_color
    FROM planning_events pe
    JOIN users u ON pe.user_id = u.id
    WHERE pe.id = $1 AND pe.tenant_id = $2
  `, [eventId, tenantId]);

  if (!event) {
    return res.status(404).json({ error: 'Événement non trouvé' });
  }

  return res.json({ event });
}

// Créer un événement
async function createEvent(req, res, userId, tenantId) {
  log('📅 Création événement - données reçues:', JSON.stringify(req.body));

  let data;
  try {
    data = createEventSchema.parse(req.body);
  } catch (validationError) {
    error('❌ Erreur validation:', validationError.errors);
    return res.status(400).json({
      error: 'Données invalides',
      details: validationError.errors
    });
  }

  try {
    const result = await queryOne(`
      INSERT INTO planning_events (
        tenant_id, user_id, title, description, event_type,
        start_date, start_time, end_date, end_time,
        location, attendees, all_day
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      tenantId,
      userId,
      data.title,
      data.description || null,
      data.event_type || 'meeting',
      data.start_date,
      data.start_time || null,
      data.end_date || data.start_date,
      data.end_time || null,
      data.location || null,
      data.attendees || [],
      data.all_day || false
    ]);

    log('✅ Événement créé:', result.id);

    return res.status(201).json({
      success: true,
      event: result
    });
  } catch (dbError) {
    error('❌ Erreur DB création événement:', dbError);
    return res.status(500).json({
      error: 'Erreur lors de la création de l\'événement',
      details: dbError.message
    });
  }
}

// Mettre à jour un événement
async function updateEvent(req, res, eventId, userId, tenantId) {
  // Vérifier que l'événement existe et appartient à l'utilisateur
  const existing = await queryOne(`
    SELECT * FROM planning_events WHERE id = $1 AND tenant_id = $2
  `, [eventId, tenantId]);

  if (!existing) {
    return res.status(404).json({ error: 'Événement non trouvé' });
  }

  // Vérifier les droits (propriétaire ou admin)
  if (existing.user_id !== userId) {
    // Vérifier si admin ou manager du propriétaire
    const user = await queryOne(`SELECT role FROM users WHERE id = $1`, [userId]);
    if (user?.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorisé à modifier cet événement' });
    }
  }

  const data = updateEventSchema.parse(req.body);

  const result = await queryOne(`
    UPDATE planning_events SET
      title = COALESCE($1, title),
      description = COALESCE($2, description),
      event_type = COALESCE($3, event_type),
      start_date = COALESCE($4, start_date),
      start_time = COALESCE($5, start_time),
      end_date = COALESCE($6, end_date),
      end_time = COALESCE($7, end_time),
      location = COALESCE($8, location),
      attendees = COALESCE($9, attendees),
      all_day = COALESCE($10, all_day),
      updated_at = NOW()
    WHERE id = $11 AND tenant_id = $12
    RETURNING *
  `, [
    data.title,
    data.description,
    data.event_type,
    data.start_date,
    data.start_time,
    data.end_date,
    data.end_time,
    data.location,
    data.attendees,
    data.all_day,
    eventId,
    tenantId
  ]);

  log('✅ Événement mis à jour:', eventId);

  return res.json({
    success: true,
    event: result
  });
}

// Supprimer un événement
async function deleteEvent(req, res, eventId, userId, tenantId) {
  // Vérifier que l'événement existe
  const existing = await queryOne(`
    SELECT * FROM planning_events WHERE id = $1 AND tenant_id = $2
  `, [eventId, tenantId]);

  if (!existing) {
    return res.status(404).json({ error: 'Événement non trouvé' });
  }

  // Vérifier les droits
  if (existing.user_id !== userId) {
    const user = await queryOne(`SELECT role FROM users WHERE id = $1`, [userId]);
    if (user?.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorisé à supprimer cet événement' });
    }
  }

  await execute(`
    DELETE FROM planning_events WHERE id = $1 AND tenant_id = $2
  `, [eventId, tenantId]);

  log('✅ Événement supprimé:', eventId);

  return res.json({
    success: true,
    message: 'Événement supprimé'
  });
}
