import { log } from "../lib/logger.js";
import { authMiddleware } from '../middleware/auth.js';
import { authLimiter } from './middlewares.js';

// ========== AUTH ROUTES ==========
import authLogin from '../api/auth/login.js';
import authMe from '../api/auth/me.js';
import changePasswordRoute from '../api/auth/change-password.js';
import resetPassword from '../api/auth/reset-password.js';
import authLogout from '../api/auth/logout.js';

// ========== MAIN API ROUTES ==========
import leadsRoute from '../api/leads.js';
import usersRoute from '../api/users.js';
import teamsRoute from '../api/teams.js';
import campaignsRoute from '../api/campaigns.js';
import statsRoute from '../api/stats.js';
import templatesRoute from '../api/templates.js';
import generateLeadsRoute from '../api/generate-leads.js';
import generateLeadsStreamRoute from '../api/generate-leads-stream.js';
import generateLeadsV2Route from '../api/generate-leads-v2.js';
import leadAvailabilityRoute from '../api/lead-availability.js';
import notificationsRoute from '../api/notifications.js';
import followUpsRoute from '../api/follow-ups.js';
import quotasRoute from '../api/quotas.js';
import importCsvRoute from '../api/import-csv.js';
import asefiRoute from '../api/asefi.js';
import asefiGenerateRoute from '../api/asefi-generate.js';
import emailTemplatesRoute from '../api/email-templates.js';
import chatbotRoute from '../routes/chatbot.js';
import verifySiretRoute from '../api/verify-siret.js';
import sendCampaignEmailsRoute from '../api/send-campaign-emails.js';
import leadsCountRoute from '../api/leads-count.js';
import uploadAttachmentRoute from '../api/upload-attachment.js';
import sectorsRoute from '../api/sectors.js';
import leadsCountMultiRoute from '../api/leads-count-multi.js';
import trackRoutes from '../api/track.js';
import leadDatabasesRoute from '../api/lead-databases.js';
import pipelineLeadsRoute from '../api/pipeline-leads.js';
import signaturesRoute from '../api/signatures.js';
import proposalsRoute from '../api/proposals.js';
import contractsRoute from '../api/contracts.js';
import proposalAcceptRoute from '../api/proposal-accept.js';
import contractSignRoute from '../api/contract-sign.js';
import campaignDetailedStatsRoute from '../api/campaign-detailed-stats.js';
import validationRequestsRoute from '../api/validation-requests.js';
import leadSectorAssignmentRoute from '../api/lead-sector-assignment.js';
import injectPipelineRoute from '../api/inject-pipeline.js';
import { getMailingSettings, updateMailingSettings, testMailingSettings } from '../api/mailing-settings.js';
import billingRoutes from '../api/billing.js';
import duplicatesRoutes from '../api/duplicates.js';
import exportRoutes from '../api/export.js';
import leadCreditsRoutes from '../api/lead-credits.js';
import servicesRoutes from '../api/services.js';
import subscriptionsRoutes from '../api/subscriptions.js';
import businessConfigRoutes from '../api/business-config.js';
import superAdminRoutes from '../api/super-admin.js';
import apiGouvLeadsRoute from '../api/api-gouv-leads.js';
import geographicSectorsRoute from '../api/geographic-sectors.js';
import leadContactsRoute from '../api/lead-contacts.js';
import leadPhonesRoute from '../api/lead-phones.js';
import leadOfficesRoute from '../api/lead-offices.js';
import leadNotesRoute from '../api/lead-notes.js';
import healthRoute from '../api/health.js';
import trainingRoute from '../api/training.js';
import aiGenerateTemplateRoute from '../api/ai-generate-template.js';
import checkBlacklistRoute from '../api/check-blacklist.js';
import rgpdController from '../controllers/rgpdController.js';
import unsubscribeController from '../controllers/unsubscribeController.js';
import * as emailTrackingController from '../controllers/emailTrackingController.js';
import * as imageUploadController from '../controllers/imageUploadController.js';

/**
 * Setup all routes on the Express app
 * @param {Express} app - Express application
 */
export function setupRoutes(app) {
  // ========== HEALTH CHECK ==========
  app.get('/api/health', (req, res) => {
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development'
    });
  });

  // ========== AUTH ROUTES ==========
  app.post('/api/auth/login', authLimiter, authLogin);
  app.get('/api/auth/me', authMe);
  app.post('/api/auth/change-password', changePasswordRoute);
  app.post('/api/auth/reset-password', authLimiter, resetPassword);
  if (authLogout) app.post('/api/auth/logout', authLogout);

  // ========== CORE ROUTES ==========
  app.use('/api/health', healthRoute);
  app.use('/api/training', trainingRoute);
  app.use('/api/leads', leadsRoute);
  app.use('/api/leads-count-multi', leadsCountMultiRoute);
  app.use('/api/sectors', sectorsRoute);
  app.use('/api/users', usersRoute);
  app.use('/api/teams', teamsRoute);
  app.use('/api/campaigns', campaignsRoute);
  app.use('/api/campaign-detailed-stats', campaignDetailedStatsRoute);
  app.use('/api/validation-requests', validationRequestsRoute);
  app.use('/api/lead-sector-assignment', leadSectorAssignmentRoute);
  app.use('/api/stats', statsRoute);
  app.use('/api/templates', templatesRoute);
  app.use('/api/generate-leads', generateLeadsRoute);

  // Lead generation streaming (legacy)
  app.post('/api/generate-leads-stream', generateLeadsStreamRoute);
  app.post('/api/pause-search', generateLeadsStreamRoute);
  app.post('/api/resume-search', generateLeadsStreamRoute);
  app.post('/api/stop-search', generateLeadsStreamRoute);

  // Lead generation V2 (optimized - internal search first + Sirene API)
  app.post('/api/generate-leads-v2', generateLeadsV2Route);
  app.post('/api/generate-leads-v2/preview', generateLeadsV2Route);
  app.post('/api/generate-leads-v2/save', generateLeadsV2Route);
  app.get('/api/generate-leads-v2/databases', generateLeadsV2Route);
  app.post('/api/generate-leads-v2/pause', generateLeadsV2Route);
  app.post('/api/generate-leads-v2/resume', generateLeadsV2Route);
  app.post('/api/generate-leads-v2/stop', generateLeadsV2Route);

  // Lead availability (analyse avant génération)
  app.get('/api/lead-availability/regions', leadAvailabilityRoute);
  app.get('/api/lead-availability/all-departments', leadAvailabilityRoute);
  app.get('/api/lead-availability/departments/:regionCode', leadAvailabilityRoute);
  app.post('/api/lead-availability/analyze', leadAvailabilityRoute);
  app.post('/api/lead-availability/suggest', leadAvailabilityRoute);

  // Notifications
  app.get('/api/notifications', notificationsRoute);
  app.get('/api/notifications/count', notificationsRoute);
  app.post('/api/notifications/:id/read', notificationsRoute);
  app.post('/api/notifications/read-all', notificationsRoute);

  app.use('/api/quotas', quotasRoute);
  app.use('/api/follow-ups', followUpsRoute);
  app.use('/api/import-csv', importCsvRoute);
  app.use('/api/asefi', asefiRoute);
  app.use('/api/asefi', asefiGenerateRoute);
  app.use('/api/ai/generate-template', aiGenerateTemplateRoute);
  app.use('/api/email-templates', emailTemplatesRoute);
  app.use('/api/chatbot', chatbotRoute);
  app.use('/api/verify-siret', verifySiretRoute);
  app.use('/api/send-campaign-emails', sendCampaignEmailsRoute);
  app.use('/api/leads/count', leadsCountRoute);
  app.use('/api/upload-attachment', uploadAttachmentRoute);
  app.use('/api/track', trackRoutes);
  app.use('/api/lead-databases', leadDatabasesRoute);
  app.use('/api/pipeline-leads', pipelineLeadsRoute);
  app.post('/api/inject-pipeline', injectPipelineRoute);
  app.use('/api/api-gouv', apiGouvLeadsRoute);
  app.use('/api/geographic-sectors', geographicSectorsRoute);

  // ========== SIGNATURES & CONTRACTS ==========
  app.use('/api/sign', signaturesRoute);
  app.all('/api/proposals', proposalsRoute);
  app.all('/api/proposals/:id', proposalsRoute);
  app.all('/api/contracts', contractsRoute);
  app.all('/api/contracts/:id', contractsRoute);

  // Public e-signature routes (no auth)
  app.get('/api/proposal-accept/:token', proposalAcceptRoute);
  app.post('/api/proposal-accept/:token', proposalAcceptRoute);
  app.get('/api/contract-sign/:token', contractSignRoute);
  app.post('/api/contract-sign/:token', contractSignRoute);

  // ========== MAILING SETTINGS ==========
  app.get('/api/mailing-settings', authMiddleware, getMailingSettings);
  app.post('/api/mailing-settings', authMiddleware, updateMailingSettings);
  app.post('/api/mailing-settings/test', authMiddleware, testMailingSettings);

  // ========== BILLING & SERVICES ==========
  app.use('/api/billing', billingRoutes);
  app.use('/api/duplicates', duplicatesRoutes);
  app.use('/api/export', exportRoutes);
  app.use('/api/lead-credits', leadCreditsRoutes);
  app.use('/api/services', servicesRoutes);
  app.use('/api/subscriptions', subscriptionsRoutes);
  app.use('/api/business-config', businessConfigRoutes);
  app.use('/api/super-admin', superAdminRoutes);

  // ========== RGPD & BLACKLIST ==========
  app.use('/api/check-blacklist', checkBlacklistRoute);
  app.post('/api/rgpd/check-blacklist', authMiddleware, rgpdController.checkBlacklist);
  app.get('/api/rgpd/violations', authMiddleware, rgpdController.getViolationStats);
  app.get('/api/unsubscribes', authMiddleware, unsubscribeController.getUnsubscribedEmails);
  app.get('/api/unsubscribes/stats', authMiddleware, unsubscribeController.getUnsubscribeStats);

  // Public unsubscribe routes
  app.get('/api/unsubscribe/:lead_id', unsubscribeController.getUnsubscribePage);
  app.post('/api/unsubscribe/:lead_id', unsubscribeController.processUnsubscribe);

  // ========== LEAD MANAGEMENT ==========
  app.use('/api/leads', leadContactsRoute);
  app.use('/api/leads', leadPhonesRoute);
  app.use('/api/leads', leadOfficesRoute);
  app.use('/api/leads', leadNotesRoute);

  // ========== TRACKING ==========
  app.post('/api/unsubscribe/:lead_id', authMiddleware, unsubscribeController.processUnsubscribe);
  app.post('/api/resubscribe/:lead_id', authMiddleware, unsubscribeController.resubscribe);
  app.get('/api/unsubscribe-stats', authMiddleware, unsubscribeController.getUnsubscribeStats);
  app.get('/api/track/click', emailTrackingController.trackClick);
  app.get('/api/track/open', emailTrackingController.trackOpen);
  app.get('/api/tracking/lead/:lead_id/events', authMiddleware, emailTrackingController.getLeadEvents);
  app.get('/api/tracking/campaign/:campaign_id/stats', authMiddleware, emailTrackingController.getCampaignStats);

  // ========== IMAGE UPLOAD ==========
  app.post('/api/images/upload', authMiddleware, imageUploadController.uploadImage);
  app.get('/api/images', authMiddleware, imageUploadController.getImages);
  app.delete('/api/images/:id', authMiddleware, imageUploadController.deleteImage);

  log('✅ Routes configurées');
}
