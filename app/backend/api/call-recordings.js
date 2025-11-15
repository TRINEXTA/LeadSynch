import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { queryOne, queryAll, execute } from '../lib/db.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Anthropic from '@anthropic-ai/sdk';

const router = express.Router();

// ========== CONFIGURATION MULTER POUR AUDIO ==========

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'call-recordings');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50 MB max pour audio
  },
  fileFilter: (req, file, cb) => {
    // Formats audio supportés
    const allowedMimes = [
      'audio/mpeg',      // .mp3
      'audio/wav',       // .wav
      'audio/wave',      // .wav
      'audio/x-wav',     // .wav
      'audio/webm',      // .webm
      'audio/ogg',       // .ogg
      'audio/mp4',       // .m4a
      'audio/x-m4a',     // .m4a
      'audio/aac',       // .aac
      'audio/flac',      // .flac
      'video/webm',      // Teams recordings (webm with audio)
      'video/mp4'        // Teams recordings (mp4 with audio)
    ];

    const allowedExts = /\.(mp3|wav|webm|ogg|m4a|aac|flac|mp4)$/i;
    const extname = allowedExts.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimes.includes(file.mimetype);

    if (mimetype || extname) {
      return cb(null, true);
    } else {
      cb(new Error(`Type de fichier non autorisé. Formats acceptés : MP3, WAV, WEBM, OGG, M4A, AAC, FLAC, MP4`));
    }
  }
});

// ========== POST /api/call-recordings/upload ==========
// Upload un enregistrement audio d'appel

router.post('/upload', authMiddleware, (req, res) => {
  upload.single('audio')(req, res, async (err) => {
    if (err) {
      console.error('❌ Upload error:', err);
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier audio fourni' });
    }

    const { tenant_id, id: user_id } = req.user;
    const {
      lead_id,
      call_history_id,
      campaign_id,
      phone_provider = 'standard',
      provider_metadata,
      duration,
      consent_obtained = false,
      consent_method = 'manual'
    } = req.body;

    if (!lead_id) {
      // Supprimer le fichier uploadé
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'lead_id est requis' });
    }

    try {
      // Vérifier que le lead appartient au tenant
      const lead = await queryOne(
        'SELECT id FROM leads WHERE id = $1 AND tenant_id = $2',
        [lead_id, tenant_id]
      );

      if (!lead) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'Lead non trouvé' });
      }

      // Insérer l'enregistrement en DB
      const recording = await execute(
        `INSERT INTO call_recordings (
          tenant_id,
          call_history_id,
          lead_id,
          campaign_id,
          filename,
          original_filename,
          filepath,
          filesize,
          mimetype,
          duration,
          phone_provider,
          provider_metadata,
          consent_obtained,
          consent_date,
          consent_method,
          uploaded_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *`,
        [
          tenant_id,
          call_history_id || null,
          lead_id,
          campaign_id || null,
          req.file.filename,
          req.file.originalname,
          req.file.path,
          req.file.size,
          req.file.mimetype,
          duration ? parseInt(duration) : null,
          phone_provider,
          provider_metadata ? JSON.parse(provider_metadata) : null,
          consent_obtained === 'true' || consent_obtained === true,
          consent_obtained ? new Date() : null,
          consent_method,
          user_id
        ]
      );

      console.log(`✅ Enregistrement uploadé: ${recording.id} pour lead ${lead_id}`);

      return res.status(201).json({
        success: true,
        recording: {
          id: recording.id,
          filename: recording.original_filename,
          size: recording.filesize,
          duration: recording.duration,
          phone_provider: recording.phone_provider,
          transcription_status: recording.transcription_status,
          created_at: recording.created_at
        }
      });

    } catch (error) {
      console.error('❌ Erreur sauvegarde enregistrement:', error);

      // Supprimer le fichier en cas d'erreur DB
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(500).json({ error: 'Erreur serveur lors de la sauvegarde' });
    }
  });
});

// ========== GET /api/call-recordings/lead/:lead_id ==========
// Récupère tous les enregistrements d'un lead

router.get('/lead/:lead_id', authMiddleware, async (req, res) => {
  const { tenant_id } = req.user;
  const { lead_id } = req.params;

  try {
    const recordings = await queryAll(
      `SELECT
        cr.*,
        u.first_name || ' ' || u.last_name as uploaded_by_name,
        l.company_name as lead_company
      FROM call_recordings cr
      LEFT JOIN users u ON cr.uploaded_by = u.id
      LEFT JOIN leads l ON cr.lead_id = l.id
      WHERE cr.tenant_id = $1 AND cr.lead_id = $2
      ORDER BY cr.created_at DESC`,
      [tenant_id, lead_id]
    );

    return res.json({
      success: true,
      recordings: recordings.map(r => ({
        id: r.id,
        filename: r.original_filename,
        size: r.filesize,
        duration: r.duration,
        phone_provider: r.phone_provider,
        transcription_status: r.transcription_status,
        transcription_text: r.transcription_text,
        consent_obtained: r.consent_obtained,
        uploaded_by: r.uploaded_by_name,
        created_at: r.created_at
      }))
    });

  } catch (error) {
    console.error('❌ Erreur récupération enregistrements:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ========== GET /api/call-recordings/:id/download ==========
// Télécharge le fichier audio

router.get('/:id/download', authMiddleware, async (req, res) => {
  const { tenant_id } = req.user;
  const { id } = req.params;

  try {
    const recording = await queryOne(
      'SELECT * FROM call_recordings WHERE id = $1 AND tenant_id = $2',
      [id, tenant_id]
    );

    if (!recording) {
      return res.status(404).json({ error: 'Enregistrement non trouvé' });
    }

    if (!fs.existsSync(recording.filepath)) {
      return res.status(404).json({ error: 'Fichier audio non trouvé sur le disque' });
    }

    // Envoyer le fichier
    res.setHeader('Content-Type', recording.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${recording.original_filename}"`);

    const fileStream = fs.createReadStream(recording.filepath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('❌ Erreur téléchargement:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ========== GET /api/call-recordings/:id/stream ==========
// Streame le fichier audio pour écoute dans le navigateur

router.get('/:id/stream', authMiddleware, async (req, res) => {
  const { tenant_id } = req.user;
  const { id } = req.params;

  try {
    const recording = await queryOne(
      'SELECT * FROM call_recordings WHERE id = $1 AND tenant_id = $2',
      [id, tenant_id]
    );

    if (!recording) {
      return res.status(404).json({ error: 'Enregistrement non trouvé' });
    }

    if (!fs.existsSync(recording.filepath)) {
      return res.status(404).json({ error: 'Fichier audio non trouvé sur le disque' });
    }

    const stat = fs.statSync(recording.filepath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Support du streaming avec range (pour pouvoir avancer/reculer dans l'audio)
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(recording.filepath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': recording.mimetype,
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      // Pas de range, envoyer tout le fichier
      const head = {
        'Content-Length': fileSize,
        'Content-Type': recording.mimetype,
      };
      res.writeHead(200, head);
      fs.createReadStream(recording.filepath).pipe(res);
    }

  } catch (error) {
    console.error('❌ Erreur streaming:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ========== POST /api/call-recordings/:id/transcribe ==========
// Lance la transcription avec Claude AI

router.post('/:id/transcribe', authMiddleware, async (req, res) => {
  const { tenant_id } = req.user;
  const { id } = req.params;

  try {
    const recording = await queryOne(
      'SELECT * FROM call_recordings WHERE id = $1 AND tenant_id = $2',
      [id, tenant_id]
    );

    if (!recording) {
      return res.status(404).json({ error: 'Enregistrement non trouvé' });
    }

    if (recording.transcription_status === 'completed') {
      return res.json({
        success: true,
        message: 'Déjà transcrit',
        transcription: recording.transcription_text
      });
    }

    // Marquer comme en cours
    await execute(
      `UPDATE call_recordings
       SET transcription_status = 'processing', updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    // Note: Claude AI ne supporte pas directement l'audio
    // Il faut utiliser un service de Speech-to-Text comme:
    // - OpenAI Whisper API
    // - Google Speech-to-Text
    // - AWS Transcribe
    // - Azure Speech Services

    // Pour l'instant, on retourne un message d'erreur explicatif
    await execute(
      `UPDATE call_recordings
       SET
         transcription_status = 'failed',
         transcription_error = 'Service de transcription non configuré. Installer Whisper API ou Google Speech-to-Text.',
         updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    return res.status(501).json({
      error: 'Service de transcription non configuré',
      message: 'Pour activer la transcription, installez un service Speech-to-Text (Whisper, Google, AWS, Azure)',
      recording_id: id
    });

    // TODO: Implémenter la transcription avec Whisper API
    // Exemple avec OpenAI Whisper:
    /*
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(recording.filepath),
      model: 'whisper-1',
      language: 'fr'
    });

    await execute(
      `UPDATE call_recordings
       SET
         transcription_status = 'completed',
         transcription_text = $1,
         transcription_language = 'fr',
         transcription_confidence = 95,
         transcribed_at = NOW(),
         updated_at = NOW()
       WHERE id = $2`,
      [transcription.text, id]
    );

    return res.json({
      success: true,
      transcription: transcription.text
    });
    */

  } catch (error) {
    console.error('❌ Erreur transcription:', error);

    // Marquer comme échec
    await execute(
      `UPDATE call_recordings
       SET
         transcription_status = 'failed',
         transcription_error = $1,
         updated_at = NOW()
       WHERE id = $2`,
      [error.message, id]
    );

    return res.status(500).json({ error: 'Erreur lors de la transcription' });
  }
});

// ========== DELETE /api/call-recordings/:id ==========
// Supprime un enregistrement (fichier + DB)

router.delete('/:id', authMiddleware, async (req, res) => {
  const { tenant_id, role } = req.user;
  const { id } = req.params;

  try {
    const recording = await queryOne(
      'SELECT * FROM call_recordings WHERE id = $1 AND tenant_id = $2',
      [id, tenant_id]
    );

    if (!recording) {
      return res.status(404).json({ error: 'Enregistrement non trouvé' });
    }

    // Supprimer le fichier du disque
    if (fs.existsSync(recording.filepath)) {
      fs.unlinkSync(recording.filepath);
      console.log(`🗑️  Fichier supprimé: ${recording.filepath}`);
    }

    // Supprimer de la DB
    await execute(
      'DELETE FROM call_recordings WHERE id = $1',
      [id]
    );

    console.log(`✅ Enregistrement supprimé: ${id}`);

    return res.json({
      success: true,
      message: 'Enregistrement supprimé'
    });

  } catch (error) {
    console.error('❌ Erreur suppression:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ========== GET /api/call-recordings/stats ==========
// Statistiques des enregistrements

router.get('/stats', authMiddleware, async (req, res) => {
  const { tenant_id } = req.user;

  try {
    const stats = await queryOne(
      `SELECT
        COUNT(*) as total_recordings,
        SUM(filesize) as total_size_bytes,
        SUM(duration) as total_duration_seconds,
        COUNT(CASE WHEN transcription_status = 'completed' THEN 1 END) as transcribed_count,
        COUNT(CASE WHEN consent_obtained = true THEN 1 END) as with_consent_count
      FROM call_recordings
      WHERE tenant_id = $1`,
      [tenant_id]
    );

    return res.json({
      success: true,
      stats: {
        total_recordings: parseInt(stats.total_recordings),
        total_size_mb: Math.round((stats.total_size_bytes || 0) / 1024 / 1024),
        total_duration_minutes: Math.round((stats.total_duration_seconds || 0) / 60),
        transcribed_count: parseInt(stats.transcribed_count),
        with_consent_count: parseInt(stats.with_consent_count)
      }
    });

  } catch (error) {
    console.error('❌ Erreur stats:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
