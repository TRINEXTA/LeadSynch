import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.POSTGRES_URL) {
  console.error('ERREUR: POSTGRES_URL manquant dans .env');
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());

// Import des routes
import authLogin from './api/auth/login.js';
import authMe from './api/auth/me.js';
import campaigns from './api/campaigns.js';
import leads from './api/leads.js';
import stats from './api/stats/index.js';
import templates from './api/templates/index.js';
import users from './api/users.js';
import teams from './api/teams.js';
import leadDatabases from './api/lead-databases.js';

// Enregistrement manuel des routes
app.all('/api/auth/login', authLogin);
app.all('/api/auth/me', authMe);
app.all('/api/campaigns', campaigns);
app.all('/api/leads', leads);
app.all('/api/stats', stats);
app.all('/api/templates', templates);
app.all('/api/users', users);
app.all('/api/teams', teams);
app.all('/api/lead-databases', leadDatabases);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('✅ Backend démarré sur http://localhost:' + PORT);
  console.log('✅ Routes chargées: /api/campaigns, /api/leads, /api/stats...');
});
