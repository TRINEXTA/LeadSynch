import axios from "axios";

const API_BASE_URL = "http://localhost:3000";

class LeadSyncClient {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: { "Content-Type": "application/json" }
    });
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem("token");
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
  }

  campaigns = {
    list: () => this.client.get("/api/campaigns").then(res => res.data.campaigns || [])
  };

  auth = {
    me: () => this.client.get("/api/auth/me").then(res => res.data),
    login: (email, password) => this.client.post("/api/auth/login", { email, password }).then(res => res.data)
  };
}

export const LeadSync = new LeadSyncClient();
