import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { log, error } from '../lib/logger.js';

// ========= 🌐 CORS FIX COMPLET =========
const allowedOrigins = [
  'https://app.leadsynch.com',
  'https://www.leadsynch.com',
  'https://leadsynch.com',
  'https://leadsynch.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174', // Website local
  'http://localhost:3000'
];

// Pattern pour accepter tous les déploiements Vercel (preview + production)
const vercelPattern = /https:\/\/leadsynch-.*\.vercel\.app$/;

const corsMiddleware = cors({
  origin: function(origin, callback) {
    // Pas d'origine (comme Postman ou curl) → autoriser
    if (!origin) return callback(null, true);

    // Vérifier la liste des origines exactes
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Vérifier le pattern Vercel (tous les déploiements preview)
    if (vercelPattern.test(origin)) {
      log('✅ Origin Vercel autorisée:', origin);
      return callback(null, true);
    }

    // Sinon refuser
    log('❌ Origin refusée:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  exposedHeaders: ['Authorization']
});

// ========= 🔒 SÉCURITÉ - Helmet + Rate Limiting =========

// Rate limiter global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 500, // Plus permissif en dev
  message: 'Trop de requêtes, veuillez réessayer plus tard',
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter pour auth - PLUS PERMISSIF EN DÉVELOPPEMENT
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 50, // 50 en dev, 5 en prod
  skipSuccessfulRequests: true,
  message: 'Trop de tentatives de connexion, réessayez dans 15 minutes'
});

// Rate limiter pour tracking - Protection contre le spam de faux events
const trackingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requêtes par minute par IP
  message: 'Too many tracking requests',
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware de logging des requêtes
const requestLogger = (req, res, next) => {
  const start = Date.now();
  log(`?? [${req.method}] ${req.url} from ${req.headers.origin || 'no-origin'}`);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    log(`?? [${req.method}] ${req.url} ? ${res.statusCode} (${duration}ms)`);
  });
  
  next();
};

export const setupMiddlewares = (app) => {
  app.set('trust proxy', 1);
  
  // CORS
  app.use(corsMiddleware);

  // Body parser et cookie parser
  app.use(express.json({ limit: '50mb' }));
  app.use(cookieParser());

  // Sécurité
  app.use(helmet({
    contentSecurityPolicy: false, // Désactivé pour éviter conflit avec frontend
    crossOriginEmbedderPolicy: false
  }));

  // Rate Limiting
  app.use('/api/', globalLimiter);
  app.use('/api/track/', trackingLimiter);
  
  log('🔒 Sécurité activée: Helmet + Rate Limiting');
  log(`   Global: ${process.env.NODE_ENV === 'production' ? '100' : '500'} req/15min`);
  log(`   Auth: ${process.env.NODE_ENV === 'production' ? '5' : '50'} req/15min`);

  // Logger
  app.use(requestLogger);
};

export { authLimiter };
