import { authMiddleware } from '../middleware/auth.js';
import { execute } from '../lib/db.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configuration multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'attachments');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|xls|xlsx|ppt|pptx|txt|jpg|jpeg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé'));
    }
  }
});

async function handler(req, res) {
  const tenant_id = req.user.tenant_id;
  const user_id = req.user.id;

  try {
    if (req.method === 'POST') {
      // Vérifier quota pièces jointes
      const quotas = await execute(
        `SELECT * FROM quotas WHERE tenant_id = $1 AND quota_type = 'attachments'`,
        [tenant_id]
      );

      let maxSizeMB = 3; // Par défaut FREE
      if (quotas && quotas.length > 0) {
        const plan = quotas[0].plan_type;
        if (plan === 'STARTER') maxSizeMB = 5;
        else if (plan === 'PRO') maxSizeMB = 10;
        else if (plan === 'ENTERPRISE') maxSizeMB = 20;
      }

      // Upload avec multer
      upload.single('file')(req, res, async (err) => {
        if (err) {
          return res.status(400).json({ error: err.message });
        }

        if (!req.file) {
          return res.status(400).json({ error: 'Aucun fichier uploadé' });
        }

        const fileSizeMB = req.file.size / (1024 * 1024);

        if (fileSizeMB > maxSizeMB) {
          fs.unlinkSync(req.file.path); // Supprimer le fichier
          return res.status(400).json({ 
            error: `Fichier trop volumineux. Max: ${maxSizeMB} MB` 
          });
        }

        // Sauvegarder en DB
        const attachment = await execute(
          `INSERT INTO attachments (tenant_id, user_id, filename, original_filename, filepath, size, mimetype)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            tenant_id,
            user_id,
            req.file.filename,
            req.file.originalname,
            req.file.path,
            req.file.size,
            req.file.mimetype
          ]
        );

        return res.status(200).json({
          success: true,
          attachment: attachment
        });
      });

      return;
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default authMiddleware(handler);
