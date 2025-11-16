import { authMiddleware } from '../middleware/auth.js';
import { queryOne } from '../lib/db.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Endpoint sécurisé pour servir les fichiers uploadés
 * SÉCURITÉ:
 * - Requiert authentification
 * - Vérifie le tenant_id (isolation multi-tenant)
 * - Protection path traversal
 * - Validation du type de fichier
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;

    // Extraire le nom du fichier depuis l'URL
    // URL format: /api/serve-file/attachments/{filename}
    // ou /api/serve-file/images/{filename}
    const urlParts = req.url.split('/').filter(Boolean);

    if (urlParts.length < 2) {
      return res.status(400).json({ error: 'Chemin de fichier invalide' });
    }

    const fileType = urlParts[0]; // attachments, images, etc.
    const filename = urlParts[1].split('?')[0]; // Remove query params

    // ✅ SÉCURITÉ: Protection path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\\\')) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('🚨 Path traversal attempt blocked:', filename);
      }
      return res.status(403).json({ error: 'Accès refusé' });
    }

    // ✅ SÉCURITÉ: Vérifier que le fichier appartient au tenant
    let file;

    if (fileType === 'attachments') {
      file = await queryOne(
        'SELECT * FROM attachments WHERE filename = $1 AND tenant_id = $2',
        [filename, tenantId]
      );
    } else if (fileType === 'images') {
      // ✅ FIX: La table s'appelle 'email_images' et utilise 'uploaded_by' (user_id)
      file = await queryOne(
        'SELECT * FROM email_images WHERE filename = $1 AND uploaded_by = $2',
        [filename, userId]
      );
    } else {
      return res.status(400).json({ error: 'Type de fichier non supporté' });
    }

    if (!file) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`📁 Fichier non trouvé ou accès refusé: ${fileType}/${filename} pour tenant ${tenantId}`);
      }
      return res.status(404).json({ error: 'Fichier non trouvé' });
    }

    // Construire le chemin du fichier
    const uploadsDir = path.join(__dirname, '..', 'uploads', fileType);
    const filePath = path.join(uploadsDir, filename);

    // ✅ SÉCURITÉ: Vérification finale du chemin (double-check)
    const resolvedPath = path.resolve(filePath);
    const baseDir = path.resolve(uploadsDir);

    if (!resolvedPath.startsWith(baseDir)) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('🚨 Path traversal blocked (resolved path check)');
      }
      return res.status(403).json({ error: 'Accès refusé' });
    }

    // Vérifier que le fichier existe sur le disque
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Fichier DB trouvé mais absent du disque: ${filePath}`);
      return res.status(404).json({ error: 'Fichier non disponible' });
    }

    // Servir le fichier
    if (process.env.NODE_ENV !== 'production') {
      console.log(`✅ Serving file: ${fileType}/${filename} to tenant ${tenantId}`);
    }

    // Définir les headers appropriés
    res.setHeader('Content-Type', file.mimetype || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${file.original_filename || filename}"`);

    // Envoyer le fichier
    return res.sendFile(filePath);

  } catch (error) {
    console.error('❌ Serve file error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default authMiddleware(handler);
