import axios from "axios";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { "Content-Type": "application/json" }
});

// 🔧 Ajoute /api/ si ce n'est pas déjà présent
api.interceptors.request.use((cfg) => {
  // Si l'URL ne commence pas par /api/, on l'ajoute
  if (cfg.url && !cfg.url.startsWith("/api/") && !cfg.url.startsWith("http")) {
    cfg.url = "/api" + cfg.url;
  }
  return cfg;
});

export default api;