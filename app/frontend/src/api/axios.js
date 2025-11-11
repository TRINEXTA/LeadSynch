import axios from "axios";

// URL de base SANS /api
const API_BASE = 'http://localhost:3000';
console.log('✅ API URL:', API_BASE);

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 
    "Content-Type": "application/json"
  }
});

// Interceptor pour ajouter le token automatiquement
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  }, 
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de réponse pour gérer les erreurs
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('⚠️ Non autorisé (401) - Token invalide ou expiré');
      localStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

export default api;