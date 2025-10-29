import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import usersRouter from "./routes/users.js";
import teamsRouter from "./routes/teams.js";
// Import des routes
import teamRouter from "./routes/team.js";
import authRouter from "./routes/auth.js";
import callsRouter from "./routes/calls.js";
import leadDatabasesRouter from "./routes/lead-databases.js";
import campaignsRouter from "./routes/campaigns.js";
import leadGroupsRouter from "./routes/lead-groups.js";
import emailTemplatesRouter from "./routes/email-templates.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ✅ CORS MANUEL - AVANT TOUT
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://leadsync.trinexta.fr',
    'http://localhost:5173',
    'http://localhost:3000'
  ];
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Répondre immédiatement aux requêtes OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(cors({
  origin: [
    'https://leadsync.trinexta.fr',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ... (le reste reste identique)