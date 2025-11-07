import axios from "axios";

// Récupère l'URL de l'API depuis les variables d'environnement
const RAW_URL = import.meta.env.VITE_API_URL;

if (!RAW_URL) {
  throw new Error("❌ VITE_API_URL is not defined! Vérifie tes variables sur Vercel.");
}

const API_BASE = RAW_URL.replace(/\/+$/, "");

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { "Content-Type": "application/json" }
});

// Ajoute automatiquement /api/ au chemin si besoin
api.interceptors.request.use((cfg) => {
  if (cfg.url && !cfg.url.startsWith("/api/") && !cfg.url.startsWith("http")) {
    cfg.url = "/api" + cfg.url;
  }
  
  // Ajouter le token depuis localStorage
  const token = localStorage.getItem('token');
  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  
  return cfg;
});

export default api;