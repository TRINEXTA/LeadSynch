// server.js
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

// --------- Vérifs env de base ----------
if (!process.env.POSTGRES_URL) {
  console.error('ERREUR: POSTGRES_URL manquant');
  process.exit(1);
}

// --------- App ----------
const app = express();

// Render est derrière un proxy HTTPS ? nécessaire pour cookies "secure"
app.set('trust proxy', 1);

// --------- CORS (front de prod + preview + local) ----------
const allowedOrigins = [
  'https://app.leadsynch.com',
  'https://leadsynch-app.vercel.app', // previews Vercel
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.FRONTEND_URL,           // optionnel
].filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      // Autorise requêtes sans origin (curl/Postman) et préflight
      if (!origin) return cb(null, true);
      const ok = allowedOrigins.includes(origin);
      if (!ok) {
        console.warn('[CORS] Origine refusée :', origin);
      }
      return cb(null, ok);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// (optionnel) accepte les préflights CORS pour toutes les routes
app.options('*', cors());

// Corps JSON et cookies
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

// --------- ROUTES ---------

// Healthcheck simple
app.get('/api/health', (req, res) =>
  res.json({ ok: true, ts: new Date().toISOString() })
);

// === Auth ===
import authLogin from './api/auth/login.js';
import authMe from './api/auth/me.js';
import changePasswordRoute from './api/auth/change-password.js';
import resetPassword from './api/auth/reset-password.js';

app.all('/api/auth/login', authLogin);
app.all('/api/auth/me', authMe);
app.all('/api/auth/change-password', changePasswordRoute);
app.all('/api/auth/reset-password', resetPassword);

// (facultatif) logout si tu as un handler dédié
import authLogout from './api/auth/logout.js'; // crée ce fichier si besoin
if (authLogout) app.all('/api/auth/logout', authLogout);

// === Core fonctionnel ===
import leadsRoute from './api/leads.js';
import usersRoute from './api/users.js';
import usersUpdateRoute from './api/users-update.js';
import teamsRoute from './api/teams.js';
import campaignsRoute from './api/campaigns.js';
import campaignsFullRoute from './api/campaigns-full.js';
import campaignLeadsRoute from './api/campaign-leads.js';
import prospectionSessionsRoute from './api/prospection-sessions.js';
import statsRoute from './api/stats.js';
import templatesRoute from './api/templates.js';
import generateLeadsRoute from './api/generate-leads.js';
import followUpsRoute from './api/follow-ups.js';
import quotasRoute from './api/quotas.js';
import importCsvRoute from './api/import-csv.js';
import asefiGenerateRoute from './api/asefi-generate.js';
import emailTemplatesRoute from './api/email-templates.js';
import chatbotRoute from './routes/chatbot.js';
import verifySiretRoute from './api/verify-siret.js';
import sendCampaignEmailsRoute from './api/send-campaign-emails.js';
import leadsCountRoute from './api/leads-count.js';
import uploadAttachmentRoute from './api/upload-attachment.js';
import sectorsRoute from './api/sectors.js';
import leadsCountMultiRoute from './api/leads-count-multi.js';
import trackRoutes from './api/track.js';
import leadDatabasesRoute from './api/lead-databases.js';
import pipelineLeadsRoute from './api/pipeline-leads.js';

app.use('/api/leads', leadsRoute);
app.use('/api/leads-count-multi', leadsCountMultiRoute);
app.use('/api/sectors', sectorsRoute);

app.all('/api/users*', usersRoute);
app.all('/api/users-update*', usersUpdateRoute);
app.all('/api/teams*', teamsRoute);

app.all('/api/campaigns-full*', campaignsFullRoute);
app.all('/api/campaign-leads*', campaignLeadsRoute);
app.all('/api/prospection-sessions*', prospectionSessionsRoute);

app.use('/api/campaigns', campaignsRoute);
app.use('/api/stats', statsRoute);
app.all('/api/templates*', templatesRoute);
app.all('/api/generate-leads*', generateLeadsRoute);
app.all('/api/quotas*', quotasRoute);
app.all('/api/follow-ups*', followUpsRoute);

app.all('/api/import-csv', importCsvRoute);
app.use('/api/asefi', asefiGenerateRoute);
app.use('/api/email-templates', emailTemplatesRoute);
app.use('/api/chatbot', chatbotRoute);
app.use('/api/verify-siret', verifySiretRoute);
app.use('/api/send-campaign-emails', sendCampaignEmailsRoute);
app.use('/api/leads/count', leadsCountRoute);
app.use('/api/upload-attachment', uploadAttachmentRoute);
app.use('/api/track', trackRoutes);
app.use('/api/lead-databases', leadDatabasesRoute);
app.use('/api/pipeline-leads', pipelineLeadsRoute);

// === Unsubscribe (public) ===
import * as unsubscribeController from './controllers/unsubscribeController.js';
app.get('/api/unsubscribe/:lead_id', unsubscribeController.getUnsubscribePage);
app.post('/api/unsubscribe/:lead_id', unsubscribeController.processUnsubscribe);

// === Unsubscribe admin (protégé) ===
app.post('/api/resubscribe/:lead_id', authMiddleware, unsubscribeController.resubscribe);
app.get('/api/unsubscribe-stats', authMiddleware, unsubscribeController.getUnsubscribeStats);

// === Email Tracking ===
import * as emailTrackingController from './controllers/emailTrackingController.js';
app.get('/api/track/click', emailTrackingController.trackClick);
app.get('/api/track/open', emailTrackingController.trackOpen);
app.get('/api/tracking/lead/:lead_id/events', authMiddleware, emailTrackingController.getLeadEvents);
app.get('/api/tracking/campaign/:campaign_id/stats', authMiddleware, emailTrackingController.getCampaignStats);

// === Upload Images ===
import * as imageUploadController from './controllers/imageUploadController.js';
app.post('/api/images/upload', authMiddleware, imageUploadController.uploadImage);
app.get('/api/images', authMiddleware, imageUploadController.getImages);
app.delete('/api/images/:id', authMiddleware, imageUploadController.deleteImage);

// Fichiers uploadés (public)
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Gestion des erreurs (toujours en dernier) ---
app.use(errorHandler);

// --------- Lancement serveur ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('Backend demarre sur port', PORT);

  // --- Démarrage worker emails (inchangé) ---
  import('./workers/emailWorker.js')
    .then((module) => {
      const startEmailWorker = module.default;
      console.log('[EMAIL WORKER] Démarrage…');
      startEmailWorker();
    })
    .catch(err => {
      console.error('Erreur demarrage email worker:', err);
    });

  // --- Polling Elastic Email (inchangé) ---
  import('./lib/elasticEmailPolling.js')
    .then(({ pollingService }) => {
      console.log('[POLLING] Premier run…');
      pollingService.syncAllActiveCampaigns().catch(e => {
        console.error('Erreur premier polling:', e);
      });

      // toutes les 10 minutes
      setInterval(async () => {
        try {
          console.log('[POLLING] Run auto…');
          await pollingService.syncAllActiveCampaigns();
        } catch (e) {
          console.error('Erreur polling auto:', e);
        }
      }, 10 * 60 * 1000);
    })
    .catch(err => {
      console.error('Erreur demarrage polling:', err);
    });
});
