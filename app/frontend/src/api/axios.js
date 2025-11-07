import axios from "axios";

// URL de base de l'API (doit contenir /api)
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
console.log('✅ API URL:', API_BASE);

const api = axios.create({
  baseURL: API_BASE,
  // ❌ ENLEVÉ withCredentials (pas nécessaire avec Bearer tokens)
  headers: { 
    "Content-Type": "application/json"
  }
});

// Interceptor pour ajouter le token automatiquement
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

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