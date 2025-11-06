// server.js
import express from 'express';
import { authMiddleware } from './middleware/auth.js';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

if (!process.env.POSTGRES_URL) {
  console.error('ERREUR: POSTGRES_URL manquant');
  process.exit(1);
}

const app = express();

// CORS CONFIGURE - Ajoute ton URL frontend production
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://leadsynch.com',
    'https://www.leadsynch.com',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));

// --- Import routes ---
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
import authLogin from './api/auth/login.js';
import followUpsRoute from './api/follow-ups.js';
import authMe from './api/auth/me.js';
import changePasswordRoute from './api/auth/change-password.js';
import resetPassword from './api/auth/reset-password.js';
import quotasRoute from './api/quotas.js';
import importCsvRoute from './api/import-csv.js';
import asefiGenerateRoute from './api/asefi-generate.js';
import emailTemplatesRoute from './api/email-templates.js';
import chatbotRoute from './routes/chatbot.js';
import verifySiretRoute from './api/verify-siret.js';
import sendCampaignEmailsRoute from './api/send-campaign-emails.js';
import leadsCountRoute from './api/leads-count.js';
import uploadAttachmentRoute from './api/upload-attachment.js';
import sendTestEmailRoute from './api/send-test-email.js';
import sectorsRoute from './api/sectors.js';
import leadsCountMultiRoute from './api/leads-count-multi.js';
import trackRoutes from './api/track.js';
import leadDatabasesRoute from './api/lead-databases.js';
import pipelineLeadsRoute from './api/pipeline-leads.js';

// --- Routes ---
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.all('/api/auth/login', authLogin);
app.all('/api/auth/me', authMe);
app.all('/api/auth/change-password', changePasswordRoute);
app.all('/api/auth/reset-password', resetPassword);
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
app.use('/api/send-test-email', sendTestEmailRoute);
app.use('/api/track', trackRoutes);
app.use('/api/lead-databases', leadDatabasesRoute);
app.use('/api/pipeline-leads', pipelineLeadsRoute);

// --- Unsubscribe (PUBLIC) ---
import * as unsubscribeController from './controllers/unsubscribeController.js';
app.get('/api/unsubscribe/:lead_id', unsubscribeController.getUnsubscribePage);
app.post('/api/unsubscribe/:lead_id', unsubscribeController.processUnsubscribe);

// --- Unsubscribe admin (PROTECTED) ---
app.post('/api/resubscribe/:lead_id', authMiddleware, unsubscribeController.resubscribe);
app.get('/api/unsubscribe-stats', authMiddleware, unsubscribeController.getUnsubscribeStats);

// --- Email Tracking ---
import * as emailTrackingController from './controllers/emailTrackingController.js';
app.get('/api/track/click', emailTrackingController.trackClick);
app.get('/api/track/open', emailTrackingController.trackOpen);
app.get('/api/tracking/lead/:lead_id/events', authMiddleware, emailTrackingController.getLeadEvents);
app.get('/api/tracking/campaign/:campaign_id/stats', authMiddleware, emailTrackingController.getCampaignStats);

// --- Upload Images ---
import * as imageUploadController from './controllers/imageUploadController.js';
app.post('/api/images/upload', authMiddleware, imageUploadController.uploadImage);
app.get('/api/images', authMiddleware, imageUploadController.getImages);
app.delete('/api/images/:id', authMiddleware, imageUploadController.deleteImage);

// Servir les images uploadees
app.use('/uploads', express.static('uploads'));

// --- AI Template Generator ---
import * as aiTemplateController from './controllers/aiTemplateController.js';
app.post('/api/ai/generate-template', authMiddleware, aiTemplateController.generateTemplate);
app.post('/api/ai/improve-template', authMiddleware, aiTemplateController.improveTemplate);

// --- Spam Analyzer ---
import * as spamController from './controllers/spamController.js';
app.post('/api/analyze-spam', authMiddleware, spamController.analyzeSpam);
app.get('/api/analyze-template/:template_id', authMiddleware, spamController.analyzeTemplate);

// --- Error handler (toujours en dernier) ---
app.use(errorHandler);

const PORT = 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log('Backend demarre sur port', PORT);

  // Demarrer le worker d'envoi d'emails
  import('./workers/emailWorker.js')
    .then((module) => {
      const startEmailWorker = module.default;
      console.log('Demarrage du worker emails...');
      startEmailWorker();
    })
    .catch(err => {
      console.error('Erreur demarrage email worker:', err);
    });

  // Demarrer le polling Elastic Email
  import('./lib/elasticEmailPolling.js')
    .then(({ pollingService }) => {
      console.log('Premier polling au demarrage...');
      pollingService.syncAllActiveCampaigns().catch(e => {
        console.error('Erreur premier polling:', e);
      });

      // Polling toutes les 10 minutes
      setInterval(async () => {
        try {
          console.log('Polling automatique...');
          await pollingService.syncAllActiveCampaigns();
        } catch (e) {
          console.error('Erreur polling automatique:', e);
        }
      }, 10 * 60 * 1000);
    })
    .catch(err => {
      console.error('Erreur demarrage polling:', err);
    });
});