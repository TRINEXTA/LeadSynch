import { log, error } from "./lib/logger.js";
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { setupMiddlewares, allowedOrigins } from './config/middlewares.js';
import { setupRoutes } from './config/routes.js';
import { errorHandler } from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

// ========== ENVIRONMENT VALIDATION ==========
if (!process.env.POSTGRES_URL) {
  error('❌ ERREUR: POSTGRES_URL manquant');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  error('❌ ERREUR: JWT_SECRET manquant - La sécurité de l\'authentification nécessite cette variable');
  process.exit(1);
}

if (!process.env.ELASTIC_EMAIL_API_KEY) {
  error('❌ ERREUR: ELASTIC_EMAIL_API_KEY manquant - Requis pour l\'envoi d\'emails via Elastic Email');
  error('   Configurez votre clé API dans le fichier .env (voir .env.example)');
  process.exit(1);
}

// ========== EXPRESS APP SETUP ==========
const app = express();

// Setup middlewares (CORS, Helmet, Rate Limiting, etc.)
setupMiddlewares(app);

// Setup all API routes
setupRoutes(app);

// ========== STATIC FILES ==========
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ========== ERROR HANDLER (MUST BE LAST) ==========
app.use(errorHandler);

// ========== 404 HANDLER ==========
app.use((req, res) => {
  log('❓ 404 Not Found:', req.method, req.url);
  res.status(404).json({
    error: 'Route non trouvée',
    method: req.method,
    url: req.url
  });
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  log('');
  log('========================================');
  log('🚀 Backend LeadSynch démarré');
  log('========================================');
  log('🔌 Port:', PORT);
  log('🌐 CORS:', allowedOrigins.join(', '));
  log('📧 Elastic Email: Configuré ✅');
  log('   Email expéditeur:', process.env.EMAIL_FROM || 'b2b@trinexta.fr');
  log('📅 Date:', new Date().toLocaleString('fr-FR'));
  log('========================================');
  log('');

  // Start background workers
  startBackgroundWorkers();
});

// ========== BACKGROUND WORKERS ==========
async function startBackgroundWorkers() {
  // Email worker (principal)
  try {
    const { default: startEmailWorker } = await import('./workers/emailWorker.js');
    log('📧 [EMAIL WORKER] Démarrage');
    startEmailWorker();
  } catch (err) {
    error('❌ Erreur email worker:', err);
  }

  // Follow-up worker (relances automatiques)
  try {
    const { default: startFollowUpWorker } = await import('./workers/followUpWorker.js');
    log('📬 [FOLLOW-UP WORKER] Démarrage');
    startFollowUpWorker();
  } catch (err) {
    error('❌ Erreur follow-up worker:', err);
  }

  // Elastic Email polling
  try {
    const { pollingService } = await import('./lib/elasticEmailPolling.js');
    log('🔄 [POLLING] Premier run');
    pollingService.syncAllActiveCampaigns().catch(e => error('❌ Erreur polling:', e));

    // Schedule polling every 10 minutes
    setInterval(async () => {
      try {
        log('🔄 [POLLING] Run automatique');
        await pollingService.syncAllActiveCampaigns();
      } catch (e) {
        error('❌ Erreur polling auto:', e);
      }
    }, 10 * 60 * 1000);
  } catch (err) {
    error('❌ Erreur polling:', err);
  }

  // Sequence worker (automated sales sequences)
  try {
    const { startSequenceWorker } = await import('./workers/sequenceWorker.js');
    log('🔁 [SEQUENCE WORKER] Démarrage');
    startSequenceWorker();
  } catch (err) {
    error('❌ Erreur sequence worker:', err);
  }
}
