import { Router } from "express";
import { query } from "../lib/db.js";

const router = Router();

/**
 * GET /api/stats
 * Statistiques globales simples (exemples)
 */
router.get("/", async (req, res, next) => {
  try {
    const tenantId = req.user?.tenant_id || req.tenant_id || null;
    const params = [];
    let where = "1=1";
    if (tenantId) {
      params.push(tenantId);
      where = `tenant_id = $${params.length}`;
    }

    const sql = `
      WITH t AS (
        SELECT
          COUNT(*)                                        AS total_leads,
          COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) AS new_today
        FROM leads
        WHERE ${where}
      ),
      c AS (
        SELECT COUNT(*) AS total_campaigns
        FROM campaigns
        ${tenantId ? "WHERE tenant_id = $1" : ""}
      )
      SELECT t.total_leads, t.new_today, c.total_campaigns
      FROM t CROSS JOIN c
    `;

    const { rows } = await query(sql, params);
    return res.json({ ok: true, ...rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/stats/commercial
 * KPIs par commercial (basé sur la table leads)
 * Query:
 *  - date_from (YYYY-MM-DD)
 *  - date_to   (YYYY-MM-DD)
 *  - user_id   (optionnel)
 */
router.get("/commercial", async (req, res, next) => {
  try {
    const tenantId = req.user?.tenant_id || req.tenant_id || null;

    const dateFrom = req.query.date_from || null;
    const dateTo = req.query.date_to || null;
    const userId = req.query.user_id || null;

    const whereParts = [];
    const params = [];
    let i = 0;

    if (tenantId) {
      params.push(tenantId);
      i++;
      whereParts.push(`tenant_id = $${i}`);
    }

    if (dateFrom) {
      params.push(dateFrom);
      i++;
      whereParts.push(`DATE(created_at) >= $${i}`);
    } else {
      whereParts.push(`DATE(created_at) >= (CURRENT_DATE - INTERVAL '30 days')`);
    }

    if (dateTo) {
      params.push(dateTo);
      i++;
      whereParts.push(`DATE(created_at) <= $${i}`);
    } else {
      whereParts.push(`DATE(created_at) <= CURRENT_DATE`);
    }

    const baseWhere = whereParts.join(" AND ");

    // Leads créés
    const sqlCreated = `
      SELECT COUNT(*)::int AS leads_created
      FROM leads
      WHERE ${baseWhere}
    `;

    // Leads assignés
    let sqlAssigned;
    if (userId) {
      params.push(userId);
      i++;
      sqlAssigned = `
        SELECT COUNT(*)::int AS leads_assigned
        FROM leads
        WHERE ${baseWhere} AND assigned_to = $${i}
      `;
    } else {
      sqlAssigned = `
        SELECT assigned_to, COUNT(*)::int AS leads_assigned
        FROM leads
        WHERE ${baseWhere}
        GROUP BY assigned_to
        ORDER BY leads_assigned DESC
      `;
    }

    // Conversions (adapte la liste si besoin)
    const positiveStatuses = ["Interested", "Won", "Client", "MeetingBooked"];
    const statusPlaceholders = positiveStatuses.map((_, k) => `$${i + 1 + k}`).join(", ");
    positiveStatuses.forEach(s => params.push(s));
    i += positiveStatuses.length;

    let sqlConversions;
    if (userId) {
      params.push(userId);
      i++;
      sqlConversions = `
        SELECT COUNT(*)::int AS conversions
        FROM leads
        WHERE ${baseWhere}
          AND status IN (${statusPlaceholders})
          AND assigned_to = $${i}
      `;
    } else {
      sqlConversions = `
        SELECT assigned_to, COUNT(*)::int AS conversions
        FROM leads
        WHERE ${baseWhere}
          AND status IN (${statusPlaceholders})
        GROUP BY assigned_to
        ORDER BY conversions DESC
      `;
    }

    const [{ rows: createdRows }, { rows: assignedRows }, { rows: conversionRows }] = await Promise.all([
      query(sqlCreated, params.slice(0)),
      query(sqlAssigned, params.slice(0)),
      query(sqlConversions, params.slice(0))
    ]);

    const payload = {
      ok: true,
      window: {
        from: dateFrom || "CURRENT_DATE - 30d",
        to: dateTo || "CURRENT_DATE"
      },
      metrics: {
        leads_created: createdRows?.[0]?.leads_created ?? 0,
        assigned: userId ? (assignedRows?.[0]?.leads_assigned ?? 0) : assignedRows,
        conversions: userId ? (conversionRows?.[0]?.conversions ?? 0) : conversionRows
      }
    };

    return res.json(payload);
  } catch (err) {
    next(err);
  }
});

export default router;
