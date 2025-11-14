# CLAUDE.md - Documentation pour Assistant IA

> **Dernière mise à jour** : 14 novembre 2025
> **Projet** : LeadSynch - CRM & Lead Management Platform
> **Entreprise** : TrusTech IT Support (SIRET: 94202008200015)

---

## 📋 TABLE DES MATIÈRES

1. [Vue d'ensemble du projet](#vue-densemble-du-projet)
2. [Architecture et structure](#architecture-et-structure)
3. [Stack technique](#stack-technique)
4. [Conventions de code](#conventions-de-code)
5. [Workflows de développement](#workflows-de-développement)
6. [Points d'attention critiques](#points-dattention-critiques)
7. [Bonnes pratiques à suivre](#bonnes-pratiques-à-suivre)
8. [Commandes utiles](#commandes-utiles)
9. [Documentation des APIs](#documentation-des-apis)
10. [Problèmes connus](#problèmes-connus)

---

## 🎯 VUE D'ENSEMBLE DU PROJET

### Description
LeadSynch est une plateforme CRM SaaS B2B multi-tenant pour la gestion de leads et l'automatisation de campagnes de prospection. Le projet est divisé en **deux parties principales** :

1. **Application CRM** (`app/`) - L'application principale pour les utilisateurs
   - Frontend React (`app/frontend/`)
   - Backend API Serverless (`app/backend/`)

2. **Site Marketing** (`website/`) - Site vitrine et authentification
   - Pages publiques (Home, Pricing, Features)
   - Pages d'authentification (Login, Register, etc.)
   - Pages légales (CGU, CGV, RGPD)

### Fonctionnalités principales
- **Génération de leads** via Google Maps API + web scraping
- **Import CSV** avec détection automatique de secteur par IA (Claude)
- **Campagnes email** avec tracking (ouvertures, clics)
- **Pipeline Kanban** avec drag & drop
- **Scoring de leads** automatique
- **Templates email IA** générés par Claude (Asefi)
- **Gestion multi-utilisateurs** avec rôles (admin, manager, user)
- **Chatbot IA** (Asefi) pour assistance

---

## 🏗 ARCHITECTURE ET STRUCTURE

### Structure des dossiers

```
LeadSynch/
├── app/                          # Application CRM principale
│   ├── frontend/                 # React SPA
│   │   ├── src/
│   │   │   ├── api/             # Clients API (axios, LeadSynchClient)
│   │   │   ├── components/      # Composants React
│   │   │   │   ├── layout/      # Header, Sidebar, DashboardLayout
│   │   │   │   ├── ui/          # Composants UI réutilisables
│   │   │   │   ├── campaigns/   # Composants spécifiques campagnes
│   │   │   │   ├── pipeline/    # Kanban board components
│   │   │   │   └── email/       # Templates et générateur email
│   │   │   ├── context/         # React Context (AuthContext)
│   │   │   ├── pages/           # 43+ pages de l'application
│   │   │   └── main.jsx         # Point d'entrée
│   │   ├── public/              # Assets statiques
│   │   ├── vite.config.js       # Config Vite avec proxy
│   │   ├── tailwind.config.js   # Config Tailwind
│   │   └── vercel.json          # Config déploiement
│   │
│   ├── backend/                 # API Serverless Node.js
│   │   ├── api/                 # 40+ endpoints serverless
│   │   │   ├── auth/           # Authentification
│   │   │   ├── leads.js        # CRUD leads
│   │   │   ├── campaigns.js    # Gestion campagnes
│   │   │   ├── generate-leads.js
│   │   │   ├── import-csv.js
│   │   │   └── ...
│   │   ├── controllers/        # Logique métier
│   │   ├── services/           # Services (email, PDF, etc.)
│   │   ├── lib/                # Utilitaires
│   │   │   ├── db.js          # Helper DB PostgreSQL
│   │   │   ├── auth.js        # JWT utilities
│   │   │   ├── aiTemplateGenerator.js  # Claude AI
│   │   │   └── errors.js      # Classes d'erreurs custom
│   │   ├── middleware/         # Express middleware
│   │   ├── workers/            # Background workers
│   │   ├── migrations/         # Migrations SQL
│   │   ├── server.js           # Serveur Express principal
│   │   └── vercel.json         # Config Vercel serverless
│   │
│   └── package.json            # Dependencies workspace
│
├── website/                     # Site marketing
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/         # Header, Footer
│   │   │   ├── ui/             # Logo, etc.
│   │   │   └── asefi/          # Chatbot IA
│   │   ├── pages/              # 12 pages publiques
│   │   │   ├── Home.jsx
│   │   │   ├── Pricing.jsx
│   │   │   ├── Features.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   └── ...
│   │   ├── App.jsx             # Routing principal
│   │   └── main.jsx
│   └── vite.config.js
│
├── lib/                         # Shared libraries (erreurs)
├── middleware/                  # Shared middleware
├── README.md
└── CLAUDE.md                    # Ce fichier

```

### Architecture multi-tenant

**Tous les utilisateurs et données sont isolés par `tenant_id`** :
- Table `tenants` : Organisations
- Table `users` : Utilisateurs avec `tenant_id`
- Toutes les requêtes doivent filtrer par `tenant_id`

**Exemple de requête sécurisée** :
```javascript
// ✅ CORRECT
const leads = await queryAll(
  'SELECT * FROM leads WHERE tenant_id = $1',
  [tenantId]
);

// ❌ INCORRECT - Faille de sécurité !
const leads = await queryAll('SELECT * FROM leads');
```

---

## 💻 STACK TECHNIQUE

### Frontend (app/frontend + website)

| Technologie | Version | Usage |
|-------------|---------|-------|
| **React** | 18.2.0 (app), 19.1.1 (website) | Framework UI |
| **Vite** | 5.0.8 (app), 7.1.7 (website) | Build tool |
| **React Router** | 6.20.0 (app), 7.9.4 (website) | Routing |
| **Tailwind CSS** | 4.1.16 | Styling |
| **Axios** | 1.6.2 | HTTP client |
| **Framer Motion** | 12.23.24 | Animations |
| **Lucide React** | 0.294.0 | Icônes |
| **Recharts** | 3.3.0 | Graphiques |
| **@hello-pangea/dnd** | 18.0.1 | Drag & drop (pipeline) |

### Backend (app/backend)

| Technologie | Version | Usage |
|-------------|---------|-------|
| **Node.js** | - | Runtime (ES Modules) |
| **Express** | 4.18.2 | Framework API |
| **PostgreSQL** | - | Base de données |
| **@vercel/postgres** | 0.5.1 | Client DB Vercel |
| **pg** | 8.16.3 | Driver PostgreSQL |
| **jsonwebtoken** | 9.0.2 | Authentification JWT |
| **bcryptjs** | 2.4.3 | Hashing mots de passe |
| **Anthropic SDK** | 0.67.1 | IA Claude (Asefi) |
| **Multer** | 2.0.2 | Upload fichiers |
| **Puppeteer** | 24.29.1 | Web scraping |
| **Cheerio** | 1.1.2 | Parsing HTML |
| **csv-parse** | 6.1.0 | Import CSV |
| **Zod** | 3.22.4 | Validation |
| **Nodemailer** | 7.0.10 | Envoi emails |

### Services externes

- **Anthropic Claude API** : Génération templates email + classification secteurs
- **Elastic Email API** : Envoi d'emails en masse
- **Google Maps API** : Génération de leads
- **Vercel Postgres** : Base de données hébergée
- **Vercel** : Déploiement serverless

### Base de données PostgreSQL

**Tables principales** :
```
tenants                # Organisations (multi-tenant)
users                  # Utilisateurs avec rôles
leads                  # Leads/prospects
lead_databases         # Conteneurs de leads
campaigns              # Campagnes email/phone
email_templates        # Templates d'emails
email_queue            # Queue d'envoi
pipeline_leads         # Étapes du pipeline (clicked, contacted, etc.)
follow_ups             # Tâches de suivi
tracking_events        # Events tracking (opens, clicks)
contract_signatures    # E-signatures
```

**Relations importantes** :
- `users.tenant_id` → `tenants.id`
- `leads.assigned_to` → `users.id`
- `leads.database_id` → `lead_databases.id`
- `campaigns.created_by` → `users.id`
- `pipeline_leads.lead_id` → `leads.id`
- `email_queue.lead_id` → `leads.id`

---

## 📐 CONVENTIONS DE CODE

### Backend

#### 1. Structure des endpoints API

**Format standard** :
```javascript
// api/[resource].js
import { query, queryOne, queryAll, execute } from '../lib/db.js';
import { AppError, ValidationError } from '../lib/errors.js';

export default async function handler(req, res) {
  // Vérifier la méthode HTTP
  if (req.method === 'GET') {
    // Logique GET
  } else if (req.method === 'POST') {
    // Logique POST
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
```

#### 2. Gestion des erreurs

**Toujours utiliser try/catch** :
```javascript
try {
  // Code métier
  const result = await queryAll('SELECT ...', [param]);
  res.json({ success: true, data: result });
} catch (error) {
  console.error('Error in [endpoint]:', error);
  res.status(500).json({ error: error.message });
}
```

#### 3. Requêtes SQL paramétrées

**✅ TOUJOURS utiliser des paramètres** :
```javascript
// ✅ CORRECT
await query('SELECT * FROM leads WHERE id = $1', [leadId]);

// ❌ INCORRECT - Injection SQL !
await query(`SELECT * FROM leads WHERE id = '${leadId}'`);
```

#### 4. Authentification

**Middleware hybride** (Express + Serverless) :
```javascript
import { verifyAuth } from '../middleware/auth.js';

export default async function handler(req, res) {
  // Vérifier l'authentification
  const authResult = await verifyAuth(req);
  if (!authResult.authenticated) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { userId, tenantId, role } = authResult;
  // Utiliser userId et tenantId pour les requêtes
}
```

#### 5. Multi-tenancy

**Toujours filtrer par tenant_id** :
```javascript
// ✅ Isolation correcte
const leads = await queryAll(
  'SELECT * FROM leads WHERE tenant_id = $1 AND status = $2',
  [tenantId, status]
);

// ❌ Faille de sécurité - cross-tenant access !
const leads = await queryAll(
  'SELECT * FROM leads WHERE status = $1',
  [status]
);
```

### Frontend

#### 1. Structure des composants

**Composant de page** :
```javascript
import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function MyPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/endpoint');
      setData(response.data);
    } catch (error) {
      console.error('Error:', error);
      // TODO: Remplacer alert() par toast notification
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      {/* JSX */}
    </div>
  );
}
```

#### 2. Appels API

**Utiliser le client axios configuré** :
```javascript
import api from '../api/axios';  // ✅ Avec interceptors

// ✅ CORRECT
const response = await api.get('/leads');
const response = await api.post('/leads', data);

// ❌ INCORRECT - Pas de token automatique
const response = await fetch('/api/leads');
```

#### 3. Routes protégées

**Utiliser PrivateRoute** :
```javascript
import PrivateRoute from './components/PrivateRoute';

<Route
  path="/dashboard"
  element={
    <PrivateRoute>
      <DashboardLayout>
        <Dashboard />
      </DashboardLayout>
    </PrivateRoute>
  }
/>
```

#### 4. Styling Tailwind

**Classes cohérentes** :
```javascript
// Boutons CTA
className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl"

// Cards
className="bg-white rounded-2xl shadow-lg p-6"

// Inputs
className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
```

### Conventions de nommage

| Élément | Convention | Exemple |
|---------|------------|---------|
| Composants React | PascalCase | `LeadCard.jsx` |
| Fichiers API | kebab-case | `generate-leads.js` |
| Fonctions | camelCase | `loadLeads()` |
| Constantes | UPPER_SNAKE_CASE | `API_BASE_URL` |
| Variables DB | snake_case | `tenant_id`, `created_at` |
| Classes CSS | kebab-case | `lead-card`, `btn-primary` |

### Messages de commit

**Format conventionnel** :
```
feat: Scoring avec vrais leads + Import CSV + UI améliorée
fix: Import CSV with automatic sector detection AI
refactor: Centraliser la configuration DB
docs: Mise à jour README avec nouvelles features
```

**Préfixes** : `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `style`

---

## 🔄 WORKFLOWS DE DÉVELOPPEMENT

### 1. Développement local

#### Setup initial

```bash
# Cloner le repo
git clone <repo-url>
cd LeadSynch

# Backend
cd app/backend
npm install
cp .env.example .env  # Configurer les variables
npm run dev  # Port 3000

# Frontend (autre terminal)
cd app/frontend
npm install
cp .env.example .env
npm run dev  # Port 5173

# Website (optionnel)
cd website
npm install
npm run dev  # Port 5174
```

#### Variables d'environnement

**Backend (.env)** :
```bash
# Database
POSTGRES_URL=postgresql://user:password@host:5432/database

# Auth
JWT_SECRET=votre_secret_tres_long_et_securise

# APIs externes
ANTHROPIC_API_KEY=sk-ant-...
ELASTIC_EMAIL_API_KEY=...
GOOGLE_API_KEY=AIza...
HUNTER_API_KEY=...

# Email
EMAIL_FROM=noreply@leadsynch.com

# Environnement
NODE_ENV=development
```

**Frontend (.env)** :
```bash
VITE_API_URL=http://localhost:3000/api
```

### 2. Workflow de développement

#### Créer une nouvelle feature

```bash
# Créer une branche
git checkout -b feat/nom-de-la-feature

# Développer
# ...

# Commiter
git add .
git commit -m "feat: Description de la feature"

# Pousser
git push -u origin feat/nom-de-la-feature
```

#### Ajouter un endpoint API

1. **Créer le fichier** : `app/backend/api/mon-endpoint.js`
2. **Structure de base** :
```javascript
import { queryAll } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await queryAll('SELECT * FROM ma_table WHERE tenant_id = $1', [req.tenantId]);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}
```

3. **Tester localement** :
```bash
curl http://localhost:3000/api/mon-endpoint \
  -H "Authorization: Bearer <token>"
```

#### Ajouter une page frontend

1. **Créer** : `app/frontend/src/pages/MaPage.jsx`
2. **Ajouter route** dans `App.jsx` :
```javascript
import MaPage from './pages/MaPage';

<Route path="/ma-page" element={
  <PrivateRoute>
    <DashboardLayout>
      <MaPage />
    </DashboardLayout>
  </PrivateRoute>
} />
```

3. **Ajouter lien** dans `Sidebar.jsx` :
```javascript
<Link to="/ma-page">
  <Icon className="w-5 h-5" />
  <span>Ma Page</span>
</Link>
```

### 3. Tests

**⚠️ ATTENTION : Aucun test existant actuellement**

**À implémenter** :
```bash
# Backend (à créer)
cd app/backend
npm run test

# Frontend (à créer)
cd app/frontend
npm run test
```

### 4. Déploiement

#### Vercel (production)

**Backend** :
```bash
cd app/backend
vercel --prod
```

**Frontend** :
```bash
cd app/frontend
npm run build
vercel --prod
```

**Variables d'environnement** : Configurées dans le dashboard Vercel

#### Vérifier le déploiement

```bash
# Backend
curl https://leadsynch-api.onrender.com/api/health

# Frontend
curl https://app.leadsynch.com
```

---

## ⚠️ POINTS D'ATTENTION CRITIQUES

### 🔴 SÉCURITÉ - À corriger IMMÉDIATEMENT

#### 1. Injection SQL dans campaigns.js

**Fichier** : `app/backend/api/campaigns.js` (lignes 152-166)

**Problème** : Concaténation directe de valeurs utilisateur dans SQL
```javascript
// ❌ VULNÉRABLE
const sectorFilter = `(ldr.database_id = '${dbId}' AND l.sector = ANY(ARRAY[${sectorList.map(s => `'${s}'`).join(',')}]))`;
```

**Solution** :
```javascript
// ✅ SÉCURISÉ
const params = [tenantId, database_id];
let idx = 3;
const placeholders = [];

Object.entries(sectors).forEach(([dbId, sectorList]) => {
  if (sectorList?.length > 0) {
    placeholders.push(`(ldr.database_id = $${idx++} AND l.sector = ANY($${idx++}::text[]))`);
    params.push(dbId, sectorList);
  }
});

const whereClause = placeholders.length > 0 ? `AND (${placeholders.join(' OR ')})` : '';
const leads = await queryAll(
  `SELECT DISTINCT l.* FROM leads l
   JOIN lead_database_relations ldr ON l.id = ldr.lead_id
   WHERE l.tenant_id = $1 AND ldr.database_id = $2 ${whereClause}`,
  params
);
```

#### 2. Clé Google Maps API exposée

**Fichier** : `app/backend/api/generate-leads.js` (ligne 8)

**Problème** : Clé API hardcodée dans le code
```javascript
// ❌ EXPOSÉE
const GOOGLE_API_KEY = 'AIzaSyCbNyMZXznzh-tHNxI3akt6RcrERH3pYFg';
```

**Actions à faire** :
1. **Révoquer cette clé** dans Google Cloud Console
2. **Créer une nouvelle clé** avec restrictions
3. **Déplacer vers .env** :
```javascript
// ✅ SÉCURISÉ
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!GOOGLE_API_KEY) {
  throw new Error('GOOGLE_MAPS_API_KEY non configurée');
}
```

#### 3. SSL rejectUnauthorized: false

**Fichier** : `app/backend/lib/db.js` (ligne 10)

**Problème** : Accepte les certificats SSL non vérifiés
```javascript
// ❌ DANGEREUX
ssl: { rejectUnauthorized: false }
```

**Solution** :
```javascript
// ✅ SÉCURISÉ
ssl: process.env.NODE_ENV === 'production'
  ? { rejectUnauthorized: true }
  : { rejectUnauthorized: false }  // Seulement en dev
```

#### 4. JWT Secret avec fallback faible

**Fichier** : `app/backend/lib/auth.js`

**Problème** :
```javascript
// ❌ Fallback par défaut
process.env.JWT_SECRET || 'your-secret-key'
```

**Solution** :
```javascript
// ✅ Fail-fast si pas configuré
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be defined in environment variables');
}
```

#### 5. Token en localStorage (Frontend)

**Fichier** : `app/frontend/src/context/AuthContext.jsx`

**Problème** : Vulnérable aux attaques XSS
```javascript
// ❌ VULNÉRABLE
localStorage.setItem('token', token);
```

**Solution recommandée** : Migrer vers **httpOnly cookies**

#### 6. Logs de données sensibles

**Fichiers multiples**

**Problèmes** :
```javascript
// ❌ À SUPPRIMER
console.log('Password length:', password?.length);
console.log('Token:', localStorage.getItem('token')?.substring(0, 20));
console.log('🔐 Mot de passe temporaire généré:', tempPassword);
```

**Action** : Supprimer TOUS les console.log en production

### 🟡 PROBLÈMES IMPORTANTS

#### 1. Pas de validation Zod sur tous les endpoints

**Endpoints sans validation** :
- `campaigns.js`
- `import-csv.js`
- `generate-leads.js`

**Solution** : Ajouter validation Zod partout
```javascript
import { z } from 'zod';

const createCampaignSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  type: z.enum(['email', 'phone']),
  database_id: z.string().uuid()
});

const { name, type, database_id } = createCampaignSchema.parse(req.body);
```

#### 2. Pas de rate limiting

**Action** : Ajouter express-rate-limit
```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // 100 requêtes max
});

app.use('/api/', limiter);
```

#### 3. Alert() et confirm() partout (Frontend)

**Fichiers** : Leads.jsx, Campaigns.jsx, Dashboard.jsx, etc.

**Problème** : 186 occurrences d'alert()/confirm() → UX horrible

**Solution** : Implémenter react-hot-toast
```javascript
import toast from 'react-hot-toast';

// Au lieu de
alert('Lead mis à jour');

// Utiliser
toast.success('Lead mis à jour');
```

#### 4. URLs hardcodées (Website)

**Fichiers** : Login.jsx, Register.jsx, ChatbotAsefi.jsx

**Problème** :
```javascript
// ❌ Ne fonctionne qu'en local
fetch('http://localhost:3000/api/auth/login')
window.location.href = 'http://localhost:5173';
```

**Solution** :
```javascript
// .env
VITE_API_URL=http://localhost:3000
VITE_APP_URL=http://localhost:5173

// Code
fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`)
```

### 🟢 AMÉLIORATIONS RECOMMANDÉES

#### 1. Ajouter code splitting (Frontend)

```javascript
// App.jsx
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Leads = lazy(() => import('./pages/Leads'));

<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
  </Routes>
</Suspense>
```

#### 2. Ajouter un système de queue (Backend)

**Remplacer workers en mémoire par Bull/BullMQ** :
```javascript
import Queue from 'bull';

const emailQueue = new Queue('email', process.env.REDIS_URL);

emailQueue.process(async (job) => {
  await sendEmail(job.data);
});
```

#### 3. Migrer vers un ORM (Prisma ou Drizzle)

**Avantages** :
- Type-safety
- Migrations automatiques
- Relations simplifiées
- Pas de SQL manuel

#### 4. Ajouter monitoring (Sentry)

```javascript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});
```

---

## ✅ BONNES PRATIQUES À SUIVRE

### Backend

1. **Toujours filtrer par tenant_id** dans les requêtes
2. **Utiliser des requêtes paramétrées** (jamais de concaténation SQL)
3. **Valider les inputs** avec Zod
4. **Gérer les erreurs** avec try/catch
5. **Logger les erreurs** mais jamais les données sensibles
6. **Vérifier l'authentification** sur tous les endpoints privés
7. **Limiter le rate** sur les endpoints publics
8. **Utiliser transactions** pour opérations multi-tables

### Frontend

1. **Ne jamais logger** de données sensibles (tokens, passwords)
2. **Utiliser le client axios** configuré (pas fetch direct)
3. **Gérer les états de chargement** (loading, error, success)
4. **Valider les inputs** côté client avant envoi
5. **Optimiser les re-renders** avec useMemo/useCallback
6. **Lazy load** les routes et composants lourds
7. **Utiliser des notifications** au lieu d'alert()
8. **Accessibilité** : aria-labels, keyboard navigation

### Général

1. **Variables d'environnement** pour toutes les configs
2. **Commits atomiques** avec messages clairs
3. **Code review** avant merge
4. **Tests** pour les fonctionnalités critiques
5. **Documentation** à jour
6. **Versioning** sémantique (semver)

---

## 🔧 COMMANDES UTILES

### Développement

```bash
# Backend
cd app/backend
npm run dev              # Démarrer en mode dev (port 3000)
npm run build            # Pas de build nécessaire
node server.js           # Démarrer en production

# Frontend
cd app/frontend
npm run dev              # Démarrer en mode dev (port 5173)
npm run build            # Build pour production
npm run preview          # Prévisualiser le build

# Website
cd website
npm run dev              # Démarrer en mode dev (port 5174)
npm run build            # Build pour production
```

### Base de données

```bash
# Se connecter à la DB
psql $POSTGRES_URL

# Exécuter une migration
psql $POSTGRES_URL < app/backend/migrations/migration.sql

# Backup
pg_dump $POSTGRES_URL > backup.sql

# Restore
psql $POSTGRES_URL < backup.sql
```

### Git

```bash
# Voir les branches
git branch -a

# Créer une branche
git checkout -b feat/nouvelle-feature

# Voir les commits récents
git log --oneline -20

# Status
git status

# Commiter
git add .
git commit -m "feat: Description"

# Pousser
git push -u origin feat/nouvelle-feature
```

### Déploiement Vercel

```bash
# Installer Vercel CLI
npm i -g vercel

# Login
vercel login

# Déployer en preview
vercel

# Déployer en production
vercel --prod

# Voir les logs
vercel logs
```

---

## 📚 DOCUMENTATION DES APIS

### Authentification

**Toutes les requêtes privées nécessitent** :
```
Authorization: Bearer <jwt-token>
```

### Endpoints principaux

#### Auth

```bash
# Login
POST /api/auth/login
Body: { email, password }
Response: { token, user }

# Logout
POST /api/auth/logout
Headers: Authorization: Bearer <token>

# Get current user
GET /api/auth/me
Headers: Authorization: Bearer <token>
Response: { id, email, first_name, last_name, role, tenant_id }

# Change password
POST /api/auth/change-password
Body: { oldPassword, newPassword }

# Reset password
POST /api/auth/reset-password
Body: { email }
```

#### Leads

```bash
# List leads
GET /api/leads?page=1&limit=50&status=active&search=company
Response: { leads: [...], total, page, limit }

# Get lead
GET /api/leads/:id
Response: { lead: {...} }

# Create lead
POST /api/leads
Body: { company_name, email, phone, sector, ... }
Response: { lead: {...} }

# Update lead
PUT /api/leads/:id
Body: { company_name, status, ... }

# Delete lead
DELETE /api/leads/:id
```

#### Campaigns

```bash
# List campaigns
GET /api/campaigns
Response: { campaigns: [...] }

# Get campaign
GET /api/campaigns/:id
Response: { campaign: {...}, stats: {...} }

# Create campaign
POST /api/campaigns
Body: { name, type, database_id, template_id, ... }

# Start campaign
POST /api/campaigns/:id/start

# Pause campaign
POST /api/campaigns/:id/pause
```

#### Email Templates

```bash
# List templates
GET /api/email-templates

# Create template
POST /api/email-templates
Body: { name, subject, html_content }

# Generate with AI (Asefi)
POST /api/asefi
Body: { prompt, context }
Response: { subject, html }
```

#### Lead Generation

```bash
# Generate leads from Google Maps
POST /api/generate-leads
Body: {
  sector: 'juridique',
  location: 'Paris',
  maxResults: 50
}
Response: { leads: [...], count }
```

#### CSV Import

```bash
# Import CSV with AI sector detection
POST /api/import-csv
Body: FormData with 'file' field
Response: {
  imported: 123,
  errors: [...],
  sectors_detected: { ... }
}
```

#### Tracking

```bash
# Track email open (pixel)
GET /api/track/open?lead_id=xxx&campaign_id=yyy

# Track email click
GET /api/track/click?lead_id=xxx&campaign_id=yyy&url=...

# Get tracking stats
GET /api/tracking/campaign/:campaign_id/stats
Response: {
  sent: 1000,
  opened: 420,
  clicked: 85,
  open_rate: 42%,
  click_rate: 8.5%
}
```

### Codes de réponse HTTP

| Code | Signification | Action |
|------|---------------|--------|
| 200 | OK | Succès |
| 201 | Created | Ressource créée |
| 400 | Bad Request | Vérifier les paramètres |
| 401 | Unauthorized | Token manquant ou invalide |
| 403 | Forbidden | Accès refusé (mauvais tenant_id) |
| 404 | Not Found | Ressource introuvable |
| 405 | Method Not Allowed | Mauvaise méthode HTTP |
| 429 | Too Many Requests | Rate limit dépassé |
| 500 | Internal Server Error | Erreur serveur |

---

## 🐛 PROBLÈMES CONNUS

### Bugs confirmés

1. **Composant button.jsx cassé** (`app/frontend/src/components/ui/button.jsx`)
   - Classes CSS vides → Styles non appliqués
   - Variables `variants` et `sizes` définies mais inutilisées

2. **Animation gradient non définie** (Website `Home.jsx`)
   - Classe `animate-gradient` utilisée mais non définie dans Tailwind

3. **Classes Tailwind dynamiques cassées** (Website `Register.jsx`)
   - `className={border-${plan.color}-500}` ne sera pas généré en production
   - Besoin de safelist dans tailwind.config.js

4. **Apostrophes manquantes** (Website - multiples fichiers)
   - "L IA" au lieu de "L'IA"
   - "d ouverture" au lieu de "d'ouverture"

5. **Chatbot backend mal placé** (Website)
   - `website/src/components/asefi/chatbot.js` est un serveur Express
   - Devrait être dans `app/backend/routes/chatbot.js`

### Performance

1. **N+1 queries** dans emailWorker.js
   - Boucle avec une requête UPDATE par email
   - Solution : Batch updates

2. **Polling excessif** (Frontend)
   - Dashboard rafraîchit toutes les 60s
   - Campaigns rafraîchit toutes les 30s
   - Solution : WebSocket ou visibilitychange listener

3. **Aucun code splitting** (Frontend)
   - Toutes les pages chargées d'un coup
   - Bundle initial très lourd
   - Solution : React.lazy() + Suspense

4. **Pas de virtualisation** des listes
   - Avec 1000+ leads → 70,000 lignes DOM
   - Solution : react-window ou react-virtual

### Sécurité (voir section Points d'attention critiques)

1. Injection SQL dans campaigns.js
2. Clé Google Maps exposée
3. SSL rejectUnauthorized: false
4. Token en localStorage
5. Logs de données sensibles

### UX

1. **186 alert()/confirm()** → Interruptions intrusives
2. **Pas de système de notifications** cohérent
3. **États de chargement** non uniformes
4. **Accessibilité** quasi inexistante (pas d'ARIA labels)

### SEO (Website)

1. **Titre = "website"** dans index.html
2. **Favicon = vite.svg** (pas le logo LeadSynch)
3. **Pas de meta description**
4. **Pas d'Open Graph tags**
5. **Pas de Schema.org markup**

---

## 📊 MÉTRIQUES ACTUELLES

### Codebase

- **Backend** : ~11,091 lignes JS
- **Frontend** : ~14,635 lignes JSX
- **Website** : ~3,500 lignes JSX
- **Total** : ~29,000 lignes

### Couverture de tests

- **Backend** : 0% ❌
- **Frontend** : 0% ❌
- **E2E** : 0% ❌

### Performance (estimée)

- **Bundle frontend** : ~420KB gzipped
- **Temps de chargement** : ~2-3s (sans optimisations)
- **Lighthouse** :
  - Performance : 65/100
  - Accessibility : 78/100
  - SEO : 72/100

### Dépendances

- **Backend** : 35 packages
- **Frontend** : 8 packages
- **Website** : 5 packages

---

## 🎯 ROADMAP RECOMMANDÉE

### Phase 1 : Sécurité (URGENT - 1 semaine)

- [ ] Corriger injection SQL dans campaigns.js
- [ ] Révoquer et remplacer clé Google Maps
- [ ] Migrer token vers httpOnly cookies
- [ ] Supprimer tous les console.log de données sensibles
- [ ] Ajouter validation JWT_SECRET au démarrage
- [ ] Configurer SSL correctement (rejectUnauthorized en prod)

### Phase 2 : Stabilité (2 semaines)

- [ ] Ajouter validation Zod sur tous les endpoints
- [ ] Implémenter rate limiting
- [ ] Remplacer alert() par toast notifications
- [ ] Centraliser configuration DB (un seul fichier)
- [ ] Ajouter gestion d'erreurs cohérente
- [ ] Corriger bugs UI (button.jsx, animations)

### Phase 3 : Performance (2 semaines)

- [ ] Code splitting avec React.lazy()
- [ ] Virtualisation des listes (react-window)
- [ ] Optimisation bundle (tree-shaking)
- [ ] Remplacer polling par WebSocket
- [ ] Batch updates dans workers
- [ ] Ajouter cache Redis

### Phase 4 : Qualité (3 semaines)

- [ ] Tests backend (Jest) - coverage >70%
- [ ] Tests frontend (Vitest) - coverage >70%
- [ ] Tests E2E (Playwright)
- [ ] Migration vers Prisma/Drizzle
- [ ] Monitoring (Sentry)
- [ ] Documentation API (Swagger)

### Phase 5 : UX/SEO (2 semaines)

- [ ] Améliorer accessibilité (ARIA, keyboard nav)
- [ ] SEO website (meta tags, OG, schema.org)
- [ ] Responsive mobile amélioré
- [ ] Design system uniformisé
- [ ] Dark mode
- [ ] Internationalisation (i18n)

---

## 📞 CONTACTS ET RESSOURCES

### Documentation externe

- **React** : https://react.dev
- **Vite** : https://vitejs.dev
- **Tailwind** : https://tailwindcss.com
- **PostgreSQL** : https://www.postgresql.org/docs/
- **Anthropic Claude** : https://docs.anthropic.com
- **Vercel** : https://vercel.com/docs

### Outils utiles

- **DB GUI** : pgAdmin, TablePlus
- **API Testing** : Postman, Insomnia
- **Logs** : Vercel Dashboard
- **Monitoring** : Sentry (à implémenter)

---

## 🔐 SÉCURITÉ - CHECKLIST

Avant chaque déploiement en production :

- [ ] Toutes les variables d'env sont configurées
- [ ] Aucune clé API hardcodée
- [ ] JWT_SECRET est fort (>32 caractères)
- [ ] SSL avec rejectUnauthorized: true
- [ ] Rate limiting activé
- [ ] Validation Zod sur tous les endpoints
- [ ] CORS configuré correctement
- [ ] Pas de console.log de données sensibles
- [ ] Requêtes SQL paramétrées
- [ ] Multi-tenancy vérifié (tenant_id partout)

---

## 📝 NOTES FINALES

### Points forts du projet

✅ Architecture claire et modulaire
✅ Multi-tenant bien implémenté
✅ Stack moderne (React 19, Vite 7, Tailwind 4)
✅ Fonctionnalités riches (IA, tracking, pipeline)
✅ Design professionnel et cohérent
✅ Pages légales complètes (RGPD)

### Points d'amélioration prioritaires

⚠️ Sécurité (injection SQL, clés exposées)
⚠️ Tests (0% coverage)
⚠️ Performance (pas d'optimisations)
⚠️ UX (alert() partout)
⚠️ SEO (website non optimisé)
⚠️ Monitoring (pas de Sentry)

### Scores globaux

| Composant | Score | Commentaire |
|-----------|-------|-------------|
| **Backend** | 5/10 | Fonctionnel mais vulnérabilités critiques |
| **Frontend** | 3.2/10 | UX/performance à retravailler |
| **Website** | 7/10 | Bien fait mais SEO/prod non prêt |
| **Général** | 5/10 | Bonne base, correctifs urgents nécessaires |

---

**Document maintenu par** : Équipe technique LeadSynch
**Dernière révision** : 14 novembre 2025
**Version** : 1.0.0

Pour toute question, consulter ce document en premier avant de modifier le code.
