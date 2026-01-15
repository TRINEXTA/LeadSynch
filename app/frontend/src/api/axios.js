import axios from 'axios';

// Déterminer l'URL de base selon l'environnement
// Priorité: variable d'env > détection auto
const API_URL = import.meta.env.VITE_API_URL || (
  window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : 'https://leadsynch-api.onrender.com/api'
);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // ✅ SÉCURITÉ : Indispensable pour que les cookies HttpOnly soient envoyés
  withCredentials: true,
  timeout: 30000, // Timeout raisonnable de 30s
});

// Intercepteur de requête - Rétrocompatibilité avec token localStorage
// À supprimer une fois la migration cookies complète
api.interceptors.request.use(
  (config) => {
    // Fallback: token dans storage si pas encore migré vers cookies
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur de réponse pour gérer les erreurs globales
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('⚠️ Session expirée ou non autorisé (401)');
      // Nettoyage des anciens tokens (rétrocompatibilité)
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

export default api;
