import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,   // ex: https://leadsynch-api.onrender.com
  withCredentials: true,                   // <-- indispensable pour cookie HttpOnly
  headers: { "Content-Type": "application/json" }
});

// Plus de token localStorage ici.

export default api;
