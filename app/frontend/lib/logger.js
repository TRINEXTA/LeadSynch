/**
 * Frontend Logger
 * Centralized logging for the frontend application
 * Only logs in development mode
 */

const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

export const log = (...args) => {
  if (isDevelopment) {
    console.log(...args);
  }
};

export const error = (...args) => {
  // Always log errors, even in production
  console.error(...args);
};

export const warn = (...args) => {
  if (isDevelopment) {
    console.warn(...args);
  }
};

export default { log, error, warn };
