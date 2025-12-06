import { log } from "../lib/logger.js";
import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

// ========= CORS Configuration =========
const allowedOrigins = [
  'https://app.leadsynch.com',
  'https://www.leadsynch.com',
  'https://leadsynch.com',
  'https://leadsynch.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000'
];

const vercelPattern = /https:\/\/leadsynch-.*\.vercel\.app$/;

const corsOptions = {
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (vercelPattern.test(origin)) {
      log('✅ Origin Vercel autorisée:', origin);
      return callback(null, true);
    }
    log('❌ Origin refusée:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  exposedHeaders: ['Authorization']
};

// ========= Rate Limiters =========
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 500,
  message: 'Trop de requêtes, veuillez réessayer plus tard',
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 50,
  skipSuccessfulRequests: true,
  message: 'Trop de tentatives de connexion, réessayez dans 15 minutes'
});

const trackingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many tracking requests',
  standardHeaders: true,
  legacyHeaders: false
});

// ========= Request Logger Middleware =========
const requestLogger = (req, res, next) => {
  const start = Date.now();
  log(`➡️ [${req.method}] ${req.url} from ${req.headers.origin || 'no-origin'}`);

  res.on('finish', () => {
    const duration = Date.now() - start;
    log(`⬅️ [${req.method}] ${req.url} → ${res.statusCode} (${duration}ms)`);
  });

  next();
};

/**
 * Configure all middlewares on the Express app
 * @param {Express} app - Express application
 */
export function setupMiddlewares(app) {
  app.set('trust proxy', 1);

  // CORS
  app.use(cors(corsOptions));
  log('🌐 CORS configuré pour:', allowedOrigins.join(', '));

  // Body parsing
  app.use(express.json({ limit: '50mb' }));
  app.use(cookieParser());

  // Security
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  }));

  // Rate limiting
  app.use('/api/', globalLimiter);
  app.use('/api/track/', trackingLimiter);

  // Request logging
  app.use(requestLogger);

  log('🔒 Sécurité activée: Helmet + Rate Limiting');
  log(`   Global: ${process.env.NODE_ENV === 'production' ? '100' : '500'} req/15min`);
  log(`   Auth: ${process.env.NODE_ENV === 'production' ? '5' : '50'} req/15min`);
}

export { authLimiter, allowedOrigins };
