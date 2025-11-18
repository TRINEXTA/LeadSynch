CLSimport axios from "axios";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, ""); // ex: https://leadsynch-api.onrender.com

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { "Content-Type": "application/json" }
});

// 🔧 Sécurise contre les vieux appels "/api/..." ou "http://localhost:3000/..."
api.interceptors.request.use((cfg) => {
  if (cfg.url?.startsWith("/api/")) cfg.url = cfg.url.slice(4);          // "/api/x" -> "/x"
  if (cfg.url?.startsWith("http://localhost:3000"))
    cfg.url = cfg.url.replace("http://localhost:3000", "");
  return cfg;
});

export default api;
