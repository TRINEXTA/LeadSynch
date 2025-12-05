import { log, error, warn } from "../lib/logger.js";
﻿import { authMiddleware } from '../middleware/auth.js';
import { queryAll, queryOne } from '../lib/db.js';
import { z } from 'zod';

// Validation schema
const createDatabaseSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  category: z.string().optional(),
  description: z.string().optional(),
  source: z.string().optional()
});

async function handler(req, res) {
  const { method } = req;

  try {
    // GET - List lead databases
    if (method === 'GET') {
      const databases = await queryAll(
        `SELECT ld.*, u.first_name || ' ' || u.last_name as created_by_name,
                COUNT(l.id) as actual_lead_count
         FROM lead_databases ld
         LEFT JOIN users u ON ld.created_by = u.id
         LEFT JOIN leads l ON ld.id = l.database_id
         WHERE ld.tenant_id = $1
         GROUP BY ld.id, u.first_name, u.last_name
         ORDER BY ld.created_at DESC`,
        [req.user.tenant_id]
      );

      return res.status(200).json({
        success: true,
        databases
      });
    }

    // POST - Create lead database
    if (method === 'POST') {
      const data = createDatabaseSchema.parse(req.body);

      // Create database
      const newDatabase = await queryOne(
        `INSERT INTO lead_databases (tenant_id, name, category, description, source, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          req.user.tenant_id,
          data.name,
          data.category || null,
          data.description || null,
          data.source || null,
          req.user.id
        ]
      );

      return res.status(201).json({
        success: true,
        database: newDatabase
      });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });

  } catch (error) {
    error('Lead Databases API error:', error);

    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Données invalides',
        details: error.errors 
      });
    }

    return res.status(500).json({ 
      error: 'Erreur serveur' 
    });
  }
}

export default authMiddleware(handler);
