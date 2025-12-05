import { log, error, warn } from "../lib/logger.js";
// logger.js
const isProduction = process.env.NODE_ENV === 'production';

export const log = (...args) => {
  if (!isProduction) {
    log(...args);
  }
};

export const error = (...args) => {
  error(...args);
};

export const warn = (...args) => {
  if (!isProduction) {
    warn(...args);
  }
};
