import { Router } from "express";
import { query } from "../lib/db.js";

const router = Router();

// ===============================================
// GET /api/stats/commercial
// ===============================================
// Query: date_from (YYYY-MM-DD), date_to (YYYY-MM-DD), user_id (UUID optionnel)
router.get("/commercial", async (req, res, next) => {
  try {
    const tenantId = req.user?.tenant_id || req.tenant_id || null;
    const df = req.query.date_from || null;
    const dt = req.query.date_to || null;
    const userId = req.query.user_id || null;

    // Fenêtre temps Europe/Paris → bornes UTC
    // Si pas de dates → 30j glissants jusqu’à fin de “aujourd’hui” Europe/Paris
    const params = [];
    let i = 0;

    // Bâtit les bornes dans SQL pour éviter les erreurs de TZ côté Node
    const boundsSQL = `
      WITH bounds AS (
        SELECT
          ${df
            ? `($${++i}::date)::timestamp`
            : `date_trunc('day', timezone('Europe/Paris', now() - interval '30 days'))`
          } AS start_local,
          ${dt
            ? `($${++i}::date + interval '1 day')::timestamp`
            : `date_trunc('day', timezone('Europe/Paris', now() + interval '1 day'))`
          } AS end_local
      ),
      bounds_utc AS (
        SELECT
          (start_local AT TIME ZONE 'Europe/Paris') AS start_utc,
          (end_local   AT TIME ZONE 'Europe/Paris') AS end_utc
        FROM bounds
      )
    `;

    if (df) params.push(df);
    if (dt) params.push(dt);

    // WHERE commun
    const whereParts = [
      "l.created_at >= bu.start_utc",
      "l.created_at <  bu.end_utc",
    ];
    if (tenantId) {
      whereParts.push(`l.tenant_id = $${++i}`);
      params.push(tenantId);
    }

    // 1️⃣ Leads créés
    const sqlCreated = `
      ${boundsSQL}
      SELECT COUNT(*)::int AS leads_created
      FROM leads l
      JOIN bounds_utc bu ON true
      WHERE ${whereParts.join(' AND ')}
    `;

    // 2️⃣ Leads assignés (groupés ou filtrés par user)
    let sqlAssigned;
    if (userId) {
      params.push(userId); i++;
      sqlAssigned = `
        ${boundsSQL}
        SELECT COUNT(*)::int AS leads_assigned
        FROM leads l
        JOIN bounds_utc bu ON true
        WHERE ${whereParts.join(' AND ')} AND l.assigned_to = $${i}
      `;
    } else {
      sqlAssigned = `
        ${boundsSQL}
        SELECT COALESCE(l.assigned_to::text, 'unassigned') AS owner,
               COUNT(*)::int AS leads_assigned
        FROM leads l
        JOIN bounds_utc bu ON true
        WHERE ${whereParts.join(' AND ')}
        GROUP BY COALESCE(l.assigned_to::text, 'unassigned')
        ORDER BY leads_assigned DESC
      `;
    }

    // 3️⃣ Conversions (statuses “positifs”)
    const positiveStatuses = ["Interested", "Won", "Client", "MeetingBooked"];
    const placeholders = positiveStatuses.map((_, k) => `$${i + 1 + k}`).join(", ");
    positiveStatuses.forEach(s => params.push(s));
    i += positiveStatuses.length;

    let sqlConversions;
    if (userId) {
      params.push(userId); i++;
      sqlConversions = `
        ${boundsSQL}
        SELECT COUNT(*)::int AS conversions
        FROM leads l
        JOIN bounds_utc bu ON true
        WHERE ${whereParts.join(' AND ')}
          AND l.status IN (${placeholders})
          AND l.assigned_to = $${i}
      `;
    } else {
      sqlConversions = `
        ${boundsSQL}
        SELECT COALESCE(l.assigned_to::text, 'unassigned') AS owner,
               COUNT(*)::int AS conversions
        FROM leads l
        JOIN bounds_utc bu ON true
        WHERE ${whereParts.join(' AND ')}
          AND l.status IN (${placeholders})
        GROUP BY COALESCE(l.assigned_to::text, 'unassigned')
        ORDER BY conversions DESC
      `;
    }

    const [{ rows: created }, { rows: assigned }, { rows: conv }] = await Promise.all([
      query(sqlCreated, params),
      query(sqlAssigned, params),
      query(sqlConversions, params),
    ]);

    res.json({
      ok: true,
      window: {
        from: df || "last_30_days@Europe/Paris",
        to: dt || "today_end@Europe/Paris",
      },
      metrics: {
        leads_created: created?.[0]?.leads_created ?? 0,
        assigned: userId ? (assigned?.[0]?.leads_assigned ?? 0) : assigned,
        conversions: userId ? (conv?.[0]?.conversions ?? 0) : conv,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
