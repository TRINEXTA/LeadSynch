import { Router } from "express";
import { query } from "../lib/db.js";

const router = Router();

/** Helper: construit les bornes temps Europe/Paris -> UTC pour UNE requête */
function buildBounds(df, dt) {
  const p = [];
  let i = 0;
  const sql = `
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
  if (df) p.push(df);
  if (dt) p.push(dt);
  return { sql, params: p, nextIndex: i };
}


// ===============================================
// GET /api/stats
// Stats globales pour le dashboard
// ===============================================
router.get("/", async (req, res, next) => {
  try {
    const tenantId = req.user?.tenant_id || req.tenant_id || null;

    // Total leads
    const totalQuery = tenantId 
      ? `SELECT COUNT(*)::int AS total FROM leads WHERE tenant_id = // ===============================================
// GET /api/stats/commercial`
      : `SELECT COUNT(*)::int AS total FROM leads`;
    const totalParams = tenantId ? [tenantId] : [];

    // Par statut
    const statusQuery = tenantId
      ? `SELECT status, COUNT(*)::int AS count FROM leads WHERE tenant_id = // ===============================================
// GET /api/stats/commercial GROUP BY status ORDER BY count DESC`
      : `SELECT status, COUNT(*)::int AS count FROM leads GROUP BY status ORDER BY count DESC`;
    const statusParams = tenantId ? [tenantId] : [];

    const [{ rows: totalRows }, { rows: statusRows }] = await Promise.all([
      query(totalQuery, totalParams),
      query(statusQuery, statusParams)
    ]);

    res.json({
      ok: true,
      stats: {
        total: totalRows?.[0]?.total ?? 0,
        byStatus: statusRows || []
      }
    });
  } catch (err) {
    next(err);
  }
});
// ===============================================
// GET /api/stats/commercial
// Query: date_from (YYYY-MM-DD), date_to (YYYY-MM-DD), user_id (UUID optionnel)
// ===============================================
router.get("/commercial", async (req, res, next) => {
  try {
    const tenantId = req.user?.tenant_id || req.tenant_id || null;
    const df = req.query.date_from || null;
    const dt = req.query.date_to || null;
    const userId = req.query.user_id || null;

    // ---------- 1) Leads créés ----------
    const b1 = buildBounds(df, dt);
    let i1 = b1.nextIndex;
    const where1 = [
      "l.created_at >= bu.start_utc",
      "l.created_at <  bu.end_utc",
    ];
    if (tenantId) {
      b1.params.push(tenantId);
      where1.push(`l.tenant_id = $${++i1}`);
    }
    const sqlCreated = `
      ${b1.sql}
      SELECT COUNT(*)::int AS leads_created
      FROM leads l
      JOIN bounds_utc bu ON true
      WHERE ${where1.join(" AND ")}
    `;

    // ---------- 2) Leads assignés ----------
    const b2 = buildBounds(df, dt);
    let i2 = b2.nextIndex;
    const where2 = [
      "l.created_at >= bu.start_utc",
      "l.created_at <  bu.end_utc",
    ];
    if (tenantId) {
      b2.params.push(tenantId);
      where2.push(`l.tenant_id = $${++i2}`);
    }
    let sqlAssigned;
    if (userId) {
      b2.params.push(userId);
      i2++;
      sqlAssigned = `
        ${b2.sql}
        SELECT COUNT(*)::int AS leads_assigned
        FROM leads l
        JOIN bounds_utc bu ON true
        WHERE ${where2.join(" AND ")} AND l.assigned_to = $${i2}
      `;
    } else {
      sqlAssigned = `
        ${b2.sql}
        SELECT COALESCE(l.assigned_to::text, 'unassigned') AS owner,
               COUNT(*)::int AS leads_assigned
        FROM leads l
        JOIN bounds_utc bu ON true
        WHERE ${where2.join(" AND ")}
        GROUP BY COALESCE(l.assigned_to::text, 'unassigned')
        ORDER BY leads_assigned DESC
      `;
    }

    // ---------- 3) Conversions ----------
    const b3 = buildBounds(df, dt);
    let i3 = b3.nextIndex;
    const where3 = [
      "l.created_at >= bu.start_utc",
      "l.created_at <  bu.end_utc",
    ];
    if (tenantId) {
      b3.params.push(tenantId);
      where3.push(`l.tenant_id = $${++i3}`);
    }
    const positiveStatuses = ["Interested", "Won", "Client", "MeetingBooked"];
    const placeholders = positiveStatuses.map((_, k) => `$${i3 + 1 + k}`).join(", ");
    positiveStatuses.forEach(s => b3.params.push(s));
    i3 += positiveStatuses.length;

    let sqlConversions;
    if (userId) {
      b3.params.push(userId);
      i3++;
      sqlConversions = `
        ${b3.sql}
        SELECT COUNT(*)::int AS conversions
        FROM leads l
        JOIN bounds_utc bu ON true
        WHERE ${where3.join(" AND ")}
          AND l.status IN (${placeholders})
          AND l.assigned_to = $${i3}
      `;
    } else {
      sqlConversions = `
        ${b3.sql}
        SELECT COALESCE(l.assigned_to::text, 'unassigned') AS owner,
               COUNT(*)::int AS conversions
        FROM leads l
        JOIN bounds_utc bu ON true
        WHERE ${where3.join(" AND ")}
          AND l.status IN (${placeholders})
        GROUP BY COALESCE(l.assigned_to::text, 'unassigned')
        ORDER BY conversions DESC
      `;
    }

    // Exécute avec les bons jeux de paramètres
    const [{ rows: created }, { rows: assigned }, { rows: conv }] = await Promise.all([
      query(sqlCreated, b1.params),
      query(sqlAssigned, b2.params),
      query(sqlConversions, b3.params),
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

