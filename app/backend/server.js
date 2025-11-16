// server.js
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

// Validation des variables d'environnement critiques
if (!process.env.POSTGRES_URL) {
  console.error('❌ ERREUR: POSTGRES_URL manquant');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('❌ ERREUR: JWT_SECRET manquant - La sécurité de l\'authentification nécessite cette variable');
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1);

// ========== 🛡️ HELMET - SECURITY HEADERS ==========
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false, // Désactivé pour compatibilité
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Permet CORS
  hsts: {
    maxAge: 31536000, // 1 an
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true
}));

if (process.env.NODE_ENV !== 'production') {
  console.log('🛡️ Helmet.js activé avec headers de sécurité');
}

// ========= ?? CORS FIX COMPLET =========
const allowedOrigins = [
  'https://app.leadsynch.com',
  'https://leadsynch.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

console.log('?? CORS configur� pour:', allowedOrigins.join(', '));

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('? Origin refus�:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  exposedHeaders: ['Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

// ========== ⏱️ RATE LIMITING ==========
// Limite générale pour toutes les requêtes API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requêtes par IP
  message: 'Trop de requêtes depuis cette IP, réessayez dans 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// Limite stricte pour les endpoints d'authentification (prévention brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 tentatives de login
  message: 'Trop de tentatives de connexion, réessayez dans 15 minutes',
  skipSuccessfulRequests: true, // Ne compte que les échecs
});

// Limite pour les uploads de fichiers
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Max 20 uploads
  message: 'Trop d\'uploads, réessayez dans 15 minutes',
});

// Appliquer le rate limiter général sur toutes les routes /api
app.use('/api/', apiLimiter);

if (process.env.NODE_ENV !== 'production') {
  console.log('⏱️ Rate limiting activé: 100 req/15min (API), 5 req/15min (Auth), 20 req/15min (Upload)');
}

app.use((req, res, next) => {
  const start = Date.now();
  console.log(`?? [${req.method}] ${req.url} from ${req.headers.origin || 'no-origin'}`);

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`?? [${req.method}] ${req.url} ? ${res.statusCode} (${duration}ms)`);
  });

  next();
});

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

// ✅ SÉCURITÉ: Rate limiting sur endpoints sensibles
app.all('/api/auth/login', authLimiter, authLogin); // Max 5 tentatives/15min
app.all('/api/auth/me', authMe);
app.all('/api/auth/change-password', changePasswordRoute);
app.all('/api/auth/reset-password', authLimiter, resetPassword); // Max 5 tentatives/15min
if (authLogout) app.all('/api/auth/logout', authLogout);

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
import managerRequestsRoute from './api/manager-requests.js';
import signaturesRoute from './api/signatures.js';
import { getMailingSettings, updateMailingSettings, testMailingSettings } from './api/mailing-settings.js';
import billingRoutes from './api/billing.js';
import duplicatesRoutes from './api/duplicates.js';
import exportRoutes from './api/export.js';
import leadCreditsRoutes from './api/lead-credits.js';
import servicesRoutes from './api/services.js';
import subscriptionsRoutes from './api/subscriptions.js';

// ========== ?? NOUVELLES ROUTES LEAD MANAGEMENT ==========
import leadContactsRoute from './api/lead-contacts.js';
import leadPhonesRoute from './api/lead-phones.js';
import leadOfficesRoute from './api/lead-offices.js';
import leadNotesRoute from './api/lead-notes.js';

// ? CORRECTION CRITIQUE : Monter les routes dans le bon ordre
app.use('/api/leads', leadsRoute);
app.use('/api/leads-count-multi', leadsCountMultiRoute);
app.use('/api/sectors', sectorsRoute);

// ? USERS : Monter la route AVANT les autres pour �viter les conflits
app.use('/api/users', usersRoute);

app.use('/api/teams', teamsRoute);

// ? CAMPAIGNS : Routes sp�cifiques AVANT la route g�n�rique
app.use('/api/campaigns', campaignsRoute);

app.use('/api/stats', statsRoute);
app.use('/api/templates', templatesRoute);
app.use('/api/generate-leads', generateLeadsRoute);
app.all('/api/generate-leads-stream', generateLeadsStreamRoute);
app.all('/api/pause-search', generateLeadsStreamRoute);
app.all('/api/resume-search', generateLeadsStreamRoute);
app.all('/api/stop-search', generateLeadsStreamRoute);
app.use('/api/quotas', quotasRoute);
app.use('/api/follow-ups', followUpsRoute);

// ? FIX CRITIQUE : Utiliser app.use au lieu de app.all pour les routes Express
app.use('/api/import-csv', importCsvRoute);

app.use('/api/asefi', asefiGenerateRoute);
app.use('/api/email-templates', emailTemplatesRoute);
app.use('/api/chatbot', chatbotRoute);
app.use('/api/verify-siret', verifySiretRoute);
app.use('/api/send-campaign-emails', sendCampaignEmailsRoute);
app.use('/api/leads/count', leadsCountRoute);
app.use('/api/upload-attachment', uploadLimiter, uploadAttachmentRoute); // ✅ Max 20 uploads/15min
app.use('/api/track', trackRoutes);
app.use('/api/lead-databases', leadDatabasesRoute);
app.use('/api/pipeline-leads', pipelineLeadsRoute);
app.use('/api/manager-requests', authMiddleware, managerRequestsRoute);

// ========== ?? ROUTES SIGNATURES CONTRATS ==========
app.use('/api/sign', signaturesRoute);

// ========== ?? ROUTES MAILING SETTINGS ==========
app.get('/api/mailing-settings', authMiddleware, getMailingSettings);
app.post('/api/mailing-settings', authMiddleware, updateMailingSettings);
app.post('/api/mailing-settings/test', authMiddleware, testMailingSettings);

// ========== ?? ROUTES BILLING & STRIPE ==========
app.use('/api/billing', billingRoutes);

// ========== ?? ROUTES DUPLICATES MANAGEMENT ==========
app.use('/api/duplicates', duplicatesRoutes);

// ========== ?? ROUTES EXPORT CSV ==========
app.use('/api/export', exportRoutes);

// ========== ?? ROUTES LEAD CREDITS (SYSTÈME 0.03€/0.06€) ==========
app.use('/api/lead-credits', leadCreditsRoutes);

// ========== ?? ROUTES SERVICES & ABONNEMENTS ==========
app.use('/api/services', servicesRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);

// ========== ?? ROUTES LEAD MANAGEMENT AVANC� ==========
app.use('/api/leads', leadContactsRoute);
app.use('/api/leads', leadPhonesRoute);
app.use('/api/leads', leadOfficesRoute);
app.use('/api/leads', leadNotesRoute);

// ========== ROUTES TRACKING ==========
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
app.post('/api/images/upload', authMiddleware, uploadLimiter, imageUploadController.uploadImage); // ✅ Max 20 uploads/15min
app.get('/api/images', authMiddleware, imageUploadController.getImages);
app.delete('/api/images/:id', authMiddleware, imageUploadController.deleteImage);

// ========== PROTECTED FILE SERVING ==========
// ✅ SÉCURITÉ: Route protégée avec authentification et vérification tenant_id
import serveFileHandler from './api/serve-file.js';
app.get('/api/serve-file/*', serveFileHandler);

// ❌ SÉCURITÉ: Route publique désactivée - utiliser /api/serve-file à la place
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ========== ERROR HANDLER (DOIT �TRE EN DERNIER) ==========
app.use(errorHandler);

// ========== ROUTE 404 ==========
app.use((req, res) => {
  console.log('? 404 Not Found:', req.method, req.url);
  res.status(404).json({ 
    error: 'Route non trouv�e',
    method: req.method,
    url: req.url
  });
});

// ========== LANCEMENT ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('========================================');
  console.log('?? Backend LeadSynch d�marr�');
  console.log('========================================');
  console.log('?? Port:', PORT);
  console.log('?? CORS:', allowedOrigins.join(', '));
  console.log('?? Date:', new Date().toLocaleString('fr-FR'));
  console.log('========================================');
  console.log('');

  import('./workers/emailWorker.js')
    .then((module) => {
      const startEmailWorker = module.default;
      console.log('?? [EMAIL WORKER] D�marrage');
      startEmailWorker();
    })
    .catch(err => console.error('? Erreur email worker:', err));

  import('./lib/elasticEmailPolling.js')
    .then(({ pollingService }) => {
      console.log('?? [POLLING] Premier run');
      pollingService.syncAllActiveCampaigns().catch(e => console.error('? Erreur polling:', e));
      
      setInterval(async () => {
        try {
          console.log('?? [POLLING] Run automatique');
          await pollingService.syncAllActiveCampaigns();
        } catch (e) {
          console.error('? Erreur polling auto:', e);
        }
      }, 10 * 60 * 1000);
    })
    .catch(err => console.error('? Erreur polling:', err));
});