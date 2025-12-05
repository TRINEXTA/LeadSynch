import { log, error } from "./lib/logger.js";
import express from 'express';
import dotenv from 'dotenv';
import { setupMiddlewares, authLimiter } from './config/middleware.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

// Validation des variables d'environnement critiques
if (!process.env.POSTGRES_URL) {
  error('❌ ERREUR: POSTGRES_URL manquant');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  error('❌ ERREUR: JWT_SECRET manquant - La sécurité de l\\'authentification nécessite cette variable');
  process.exit(1);
}

if (!process.env.ELASTIC_EMAIL_API_KEY) {
  error('❌ ERREUR: ELASTIC_EMAIL_API_KEY manquant - Requis pour l\\'envoi d\\'emails via Elastic Email');
  error('   Configurez votre clé API dans le fichier .env (voir .env.example)');
  process.exit(1);
}

const app = express();

// Configuration des middlewares
setupMiddlewares(app);

// ========== ROUTES AUTH ==========
app.get('/api/health', (req, res) => {
  res.json({ 
    ok: true, 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

import authLogin from './api/auth/login.js';
import authMe from './api/auth/me.js';
import changePasswordRoute from './api/auth/change-password.js';
import resetPassword from './api/auth/reset-password.js';
import authLogout from './api/auth/logout.js';

app.post('/api/auth/login', authLimiter, authLogin);
app.get('/api/auth/me', authMe);
app.post('/api/auth/change-password', changePasswordRoute);
app.post('/api/auth/reset-password', authLimiter, resetPassword);
if (authLogout) app.post('/api/auth/logout', authLogout);

// ========== ?? ROUTES PRINCIPALES (ORDRE IMPORTANT) ==========
import leadsRoute from './api/leads.js';
import usersRoute from './api/users.js';
import teamsRoute from './api/teams.js';
import campaignsRoute from './api/campaigns.js';
import statsRoute from './api/stats.js';
import templatesRoute from './api/templates.js';
import generateLeadsRoute from './api/generate-leads.js';
import generateLeadsStreamRoute from './api/generate-leads-stream.js';
import followUpsRoute from './api/follow-ups.js';
import quotasRoute from './api/quotas.js';
import importCsvRoute from './api/import-csv.js';
import asefiRoute from './api/asefi.js';
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
import signaturesRoute from './api/signatures.js';
import proposalsRoute from './api/proposals.js';
import contractsRoute from './api/contracts.js';
import proposalAcceptRoute from './api/proposal-accept.js';
import contractSignRoute from './api/contract-sign.js';
import campaignDetailedStatsRoute from './api/campaign-detailed-stats.js';
import validationRequestsRoute from './api/validation-requests.js';
import leadSectorAssignmentRoute from './api/lead-sector-assignment.js';
import injectPipelineRoute from './api/inject-pipeline.js';
import { getMailingSettings, updateMailingSettings, testMailingSettings } from './api/mailing-settings.js';
import billingRoutes from './api/billing.js';
import duplicatesRoutes from './api/duplicates.js';
import exportRoutes from './api/export.js';
import leadCreditsRoutes from './api/lead-credits.js';
import servicesRoutes from './api/services.js';
import subscriptionsRoutes from './api/subscriptions.js';
import businessConfigRoutes from './api/business-config.js';
import superAdminRoutes from './api/super-admin.js';

// ========== API Gouv - Génération leads légaux ==========
import apiGouvLeadsRoute from './api/api-gouv-leads.js';

// ========== Geographic Sectors - Gestion secteurs géographiques ==========
import geographicSectorsRoute from './api/geographic-sectors.js';

// ========== ?? NOUVELLES ROUTES LEAD MANAGEMENT ==========
import leadContactsRoute from './api/lead-contacts.js';
import leadPhonesRoute from './api/lead-phones.js';
import leadOfficesRoute from './api/lead-offices.js';
import leadNotesRoute from './api/lead-notes.js';
import healthRoute from './api/health.js';
import trainingRoute from './api/training.js';

// Health check endpoints (test zone)
app.use('/api/health', healthRoute);

// Training system (formation par rôle)
app.use('/api/training', trainingRoute);

// ? CORRECTION CRITIQUE : Monter les routes dans le bon ordre
app.use('/api/leads', leadsRoute);
app.use('/api/leads-count-multi', leadsCountMultiRoute);
app.use('/api/sectors', sectorsRoute);

// ? USERS : Monter la route AVANT les autres pour viter les conflits
app.use('/api/users', usersRoute);

app.use('/api/teams', teamsRoute);

// ? CAMPAIGNS : Routes spcifiques AVANT la route gnrique
app.use('/api/campaigns', campaignsRoute);
app.use('/api/campaign-detailed-stats', campaignDetailedStatsRoute);

// Demandes de validation et d'aide
app.use('/api/validation-requests', validationRequestsRoute);

// Assignation leads aux secteurs géographiques
app.use('/api/lead-sector-assignment', leadSectorAssignmentRoute);

app.use('/api/stats', statsRoute);
app.use('/api/templates', templatesRoute);
app.use('/api/generate-leads', generateLeadsRoute);
app.use('/api/generate-leads-stream', generateLeadsStreamRoute);
app.use('/api/pause-search', generateLeadsStreamRoute);
app.use('/api/resume-search', generateLeadsStreamRoute);
app.use('/api/stop-search', generateLeadsStreamRoute);
app.use('/api/quotas', quotasRoute);
app.use('/api/follow-ups', followUpsRoute);

// ? FIX CRITIQUE : Utiliser app.use au lieu de app.all pour les routes Express
app.use('/api/import-csv', importCsvRoute);

// Asefi chatbot intelligent (s'alimente des vraies données)
app.use('/api/asefi', asefiRoute);
// Asefi génération de templates (endpoints spécifiques)
app.use('/api/asefi', asefiGenerateRoute);

// AI Generate Template - Endpoint pour génération templates email via IA
import aiGenerateTemplateRoute from './api/ai-generate-template.js';
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
app.use('/api/inject-pipeline', injectPipelineRoute);
app.use('/api/api-gouv', apiGouvLeadsRoute);
app.use('/api/geographic-sectors', geographicSectorsRoute);

// ========== ?? ROUTES SIGNATURES CONTRATS ==========
app.use('/api/sign', signaturesRoute);

// ========== ?? ROUTES DEVIS & CONTRATS ==========
app.use('/api/proposals', proposalsRoute);
app.use('/api/proposals/:id', proposalsRoute);
app.use('/api/contracts', contractsRoute);
app.use('/api/contracts/:id', contractsRoute);

// ========== ?? ROUTES PUBLIQUES E-SIGNATURE (pas d'auth) ==========
// Acceptation proposition (bon pour accord)
app.get('/api/proposal-accept/:token', proposalAcceptRoute);

// Signature contrat
app.get('/api/contract-sign/:token', contractSignRoute);

// ========== ?? ROUTES LEAD MANAGEMENT ==========
app.use('/api/leads/:leadId/contacts', leadContactsRoute);
app.use('/api/leads/:leadId/phones', leadPhonesRoute);
app.use('/api/leads/:leadId/offices', leadOfficesRoute);
app.use('/api/leads/:leadId/notes', leadNotesRoute);

// ========== ?? ROUTES MAILING SETTINGS ==========
app.get('/api/settings/mailing', getMailingSettings);
app.put('/api/settings/mailing', updateMailingSettings);
app.post('/api/settings/mailing/test', testMailingSettings);

// ========== ?? ROUTES BILLING & SUBSCRIPTIONS ==========
app.use('/api/billing', billingRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);

// ========== ?? ROUTES DUPLICATES & EXPORT ==========
app.use('/api/duplicates', duplicatesRoutes);
app.use('/api/export', exportRoutes);

// ========== ?? ROUTES LEAD CREDITS & SERVICES ==========
app.use('/api/lead-credits', leadCreditsRoutes);
app.use('/api/services', servicesRoutes);

// ========== ?? ROUTES BUSINESS CONFIG ==========
app.use('/api/business-config', businessConfigRoutes);

// ========== ?? ROUTES SUPER ADMIN ==========
app.use('/api/super-admin', superAdminRoutes);

// ========== GESTION ERREURS & 404 ==========
app.use((req, res, next) => {
  log('? 404 Not Found:', req.method, req.url);
  res.status(404).json({ error: 'Route non trouvée' });
});

app.use(errorHandler);

// ========== DÉMARRAGE SERVEUR ==========
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  log('');
  log('========================================');
  log('?? Backend LeadSynch démarré');
  log('?? Port:', PORT);
  log('?? CORS:', allowedOrigins.join(', '));
  if (process.env.ELASTIC_EMAIL_API_KEY) {
    log('📧 Elastic Email: Configuré ✅');
    log('   Email expéditeur:' , process.env.EMAIL_FROM || 'b2b@trinexta.fr');
  }
  log('?? Date:', new Date().toLocaleString('fr-FR'));
  log('========================================');
  log('');
});
