// logger.js
const isProduction = import.meta.env.PROD;

export const log = (...args) => {
  if (!isProduction) {
    console.log(...args);
  }
};

export const error = (...args) => {
  console.error(...args);
};

export const warn = (...args) => {
  if (!isProduction) {
    console.warn(...args);
  }
};
