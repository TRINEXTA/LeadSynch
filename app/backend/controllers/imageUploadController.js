import multer from 'multer';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import db from '../lib/db.js';

const UPLOAD_DIR = './uploads/images';

// Configuration multer
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non supporté. Utilisez JPG, PNG, GIF ou WEBP.'));
    }
  }
}).single('image');

// Upload une image
export const uploadImage = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error('Erreur upload:', err);
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier uploadé' });
    }

    try {
      const imageId = uuidv4();
      const ext = path.extname(req.file.originalname);
      const filename = `${imageId}${ext}`;
      const filePath = path.join(UPLOAD_DIR, filename);

      // Redimensionner et optimiser l'image avec Sharp
      const metadata = await sharp(req.file.buffer).metadata();
      
      await sharp(req.file.buffer)
        .resize(1200, 1200, { // Max 1200px, garde le ratio
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 85 }) // Compression
        .toFile(filePath);

      const stats = fs.statSync(filePath);
      // ✅ SÉCURITÉ: Utiliser l'endpoint protégé
      const fileUrl = `/api/serve-file/images/${filename}`;

      // Sauvegarder dans la DB
      await db.query(
        `INSERT INTO email_images (id, filename, original_name, file_path, file_url, mime_type, file_size, width, height, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          imageId,
          filename,
          req.file.originalname,
          filePath,
          fileUrl,
          req.file.mimetype,
          stats.size,
          metadata.width,
          metadata.height,
          req.user.id
        ]
      );

      console.log(`✅ Image uploadée: ${filename} (${stats.size} bytes)`);

      res.json({
        success: true,
        image: {
          id: imageId,
          filename,
          original_name: req.file.originalname,
          url: fileUrl,
          width: metadata.width,
          height: metadata.height,
          size: stats.size
        }
      });
    } catch (error) {
      console.error('Erreur traitement image:', error);
      res.status(500).json({ message: 'Erreur lors du traitement de l\'image' });
    }
  });
};

// Récupérer toutes les images
export const getImages = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, filename, original_name, file_url, mime_type, file_size, width, height, uploaded_at
       FROM email_images
       WHERE uploaded_by = $1
       ORDER BY uploaded_at DESC
       LIMIT 100`,
      [req.user.id]
    );

    res.json({ images: result.rows });
  } catch (error) {
    console.error('Erreur get images:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Supprimer une image
export const deleteImage = async (req, res) => {
  try {
    const { id } = req.params;

    const image = await db.queryOne(
      'SELECT * FROM email_images WHERE id = $1 AND uploaded_by = $2',
      [id, req.user.id]
    );

    if (!image) {
      return res.status(404).json({ message: 'Image introuvable' });
    }

    // Supprimer le fichier physique
    if (fs.existsSync(image.file_path)) {
      fs.unlinkSync(image.file_path);
    }

    // Supprimer de la DB
    await db.query('DELETE FROM email_images WHERE id = $1', [id]);

    console.log(`✅ Image supprimée: ${image.filename}`);

    res.json({ message: 'Image supprimée' });
  } catch (error) {
    console.error('Erreur delete image:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
