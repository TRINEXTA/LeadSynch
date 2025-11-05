import { AppError } from '../lib/errors.js';

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const isDev = process.env.NODE_ENV !== 'production';
  
  console.error('❌ Erreur:', {
    tenant: req.user?.tenant_id,
    user: req.user?.id,
    method: req.method,
    url: req.url,
    error: err.message
  });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      ...err.toJSON(),
      ...(isDev && { stack: err.stack })
    });
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: err.name === 'TokenExpiredError' ? 'Token expiré' : 'Token invalide'
      }
    });
  }

  if (err.name === 'ZodError') {
    const details = err.errors.reduce((acc, e) => {
      acc[e.path.join('.')] = e.message;
      return acc;
    }, {});
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Données invalides', details }
    });
  }

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isDev ? err.message : 'Erreur serveur'
    },
    ...(isDev && { stack: err.stack })
  });
}
