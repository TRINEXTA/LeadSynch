export class AppError extends Error {
  constructor(message, statusCode, errorCode, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.errorCode,
        message: this.message,
        ...(Object.keys(this.details).length > 0 && { details: this.details })
      }
    };
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Données invalides', details = {}) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Non autorisé', details = {}) {
    super(message, 401, 'AUTHENTICATION_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Ressource', id = null) {
    const message = id ? `${resource} ${id} introuvable` : `${resource} introuvable`;
    super(message, 404, 'NOT_FOUND', { resource, id });
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'Erreur base de données', originalError = null) {
    super(message, 500, 'DATABASE_ERROR', { dbError: originalError?.message });
  }
}

export class ExternalAPIError extends AppError {
  constructor(service = 'Service externe', message = 'Le service ne répond pas') {
    super(`${service}: ${message}`, 502, 'EXTERNAL_API_ERROR', { service });
  }
}
