import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.POSTGRES_URL) {
  console.error('?? ERREUR: POSTGRES_URL manquant');
  process.exit(1);
}

const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'https://leadsync.trinexta.fr'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));

// Import routes
import leadsRoute from './api/leads.js';
import usersRoute from './api/users.js';
import teamsRoute from './api/teams.js';
import leadDatabasesRoute from './api/lead-databases.js';
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

// Routes
app.all('/api/leads*', leadsRoute);
app.all('/api/users*', usersRoute);
app.all('/api/teams*', teamsRoute);
app.all('/api/lead-databases*', leadDatabasesRoute);
app.all('/api/campaigns-full*', campaignsFullRoute);
app.all('/api/campaign-leads*', campaignLeadsRoute);
app.all('/api/prospection-sessions*', prospectionSessionsRoute);
app.all('/api/campaigns*', campaignsRoute);
app.all('/api/stats', statsRoute);
app.all('/api/templates*', templatesRoute);
app.all('/api/generate-leads*', generateLeadsRoute);
app.all('/api/auth/login', authLogin);
app.all('/api/quotas*', quotasRoute);
app.all('/api/follow-ups*', followUpsRoute);
app.all('/api/auth/me', authMe);
app.all('/api/import-csv', importCsvRoute);
app.use('/api/asefi', asefiGenerateRoute);
app.use('/api/email-templates', emailTemplatesRoute);
app.use('/api/chatbot', chatbotRoute);
app.use('/api/verify-siret', verifySiretRoute);
app.use('/api/send-campaign-emails', sendCampaignEmailsRoute);
app.use('/api/leads/count', leadsCountRoute);
app.use('/api/upload-attachment', uploadAttachmentRoute);
app.use('/api/send-test-email', sendTestEmailRoute);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('?? Backend démarré sur port', PORT);
});



