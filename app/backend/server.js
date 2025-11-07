// server.js
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

if (!process.env.POSTGRES_URL) {
  console.error('ERREUR: POSTGRES_URL manquant');
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1);

// ========= ?? CORS FIX (Ultra-compatible navigateur) =========
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin"); // ? Indique à Render que la réponse dépend de l'origin
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.setHeader("Access-Control-Expose-Headers", "Authorization");

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204); // ? Répond directement aux preflight requests
  }

  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

// Log toutes les requêtes
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url} from ${req.headers.origin || 'no-origin'}`);
  next();
});

// ========== ROUTES ==========
app.get('/api/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

import authLogin from './api/auth/login.js';
import authMe from './api/auth/me.js';
import changePasswordRoute from './api/auth/change-password.js';
import resetPassword from './api/auth/reset-password.js';
import authLogout from './api/auth/logout.js';

app.all('/api/auth/login', authLogin);
app.all('/api/auth/me', authMe);
app.all('/api/auth/change-password', changePasswordRoute);
app.all('/api/auth/reset-password', resetPassword);
if (authLogout) app.all('/api/auth/logout', authLogout);

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
app.use('/api/users', usersRoute);
app.all('/api/users-update*', usersUpdateRoute);
app.use('/api/teams', teamsRoute);
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

import * as unsubscribeController from './controllers/unsubscribeController.js';
app.get('/api/unsubscribe/:lead_id', unsubscribeController.getUnsubscribePage);
app.post('/api/unsubscribe/:lead_id', authMiddleware, unsubscribeController.processUnsubscribe);
app.post('/api/resubscribe/:lead_id', authMiddleware, unsubscribeController.resubscribe);
app.get('/api/unsubscribe-stats', authMiddleware, unsubscribeController.getUnsubscribeStats);

import * as emailTrackingController from './controllers/emailTrackingController.js';
app.get('/api/track/click', emailTrackingController.trackClick);
app.get('/api/track/open', emailTrackingController.trackOpen);
app.get('/api/tracking/lead/:lead_id/events', authMiddleware, emailTrackingController.getLeadEvents);
app.get('/api/tracking/campaign/:campaign_id/stats', authMiddleware, emailTrackingController.getCampaignStats);

import * as imageUploadController from './controllers/imageUploadController.js';
app.post('/api/images/upload', authMiddleware, imageUploadController.uploadImage);
app.get('/api/images', authMiddleware, imageUploadController.getImages);
app.delete('/api/images/:id', authMiddleware, imageUploadController.deleteImage);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(errorHandler);

// ========== LANCEMENT ==========

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('Backend démarré sur port', PORT);

  import('./workers/emailWorker.js')
    .then((module) => {
      const startEmailWorker = module.default;
      console.log('[EMAIL WORKER] Démarrage');
      startEmailWorker();
    })
    .catch(err => console.error('Erreur email worker:', err));

  import('./lib/elasticEmailPolling.js')
    .then(({ pollingService }) => {
      console.log('[POLLING] Premier run');
      pollingService.syncAllActiveCampaigns().catch(e => console.error('Erreur polling:', e));
      setInterval(async () => {
        try {
          console.log('[POLLING] Run auto');
          await pollingService.syncAllActiveCampaigns();
        } catch (e) {
          console.error('Erreur polling auto:', e);
        }
      }, 10 * 60 * 1000);
    })
    .catch(err => console.error('Erreur polling:', err));
});
