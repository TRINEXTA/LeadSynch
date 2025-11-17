# Guide de Déploiement LeadSynch

## 🎯 Architecture de Déploiement

- **Base de données** : Neon (PostgreSQL serverless)
- **Frontend** : Vercel
- **Backend** : Render

---

## 📦 Étape 1 : Base de Données (Neon)

### 1.1 Créer le projet Neon

1. Aller sur [Neon](https://neon.tech)
2. Créer un nouveau projet : **LeadSynch Production**
3. Région recommandée : **US East (Ohio)** ou la plus proche de vos utilisateurs
4. Copier la **Connection String** :
   ```
   postgresql://user:password@host/database?sslmode=require
   ```

### 1.2 Exécuter les migrations

```bash
# Se connecter à la base Neon
psql "postgresql://user:password@host/database?sslmode=require"

# Exécuter toutes les migrations
\i app/backend/migrations/001_initial_schema.sql
\i app/backend/migrations/002_add_indexes.sql
# ... etc.
```

### 1.3 Vérifier les tables

```sql
\dt  -- Liste toutes les tables
SELECT COUNT(*) FROM tenants;
```

---

## 🚀 Étape 2 : Backend (Render)

### 2.1 Créer le service Render

1. Aller sur [Render](https://render.com)
2. **New** → **Web Service**
3. Connecter le repository GitHub : `TRINEXTA/LeadSynch`
4. Configuration :
   - **Name** : `leadsynch-backend`
   - **Root Directory** : `app/backend`
   - **Environment** : `Node`
   - **Build Command** : `npm install`
   - **Start Command** : `node server.js`
   - **Instance Type** : Starter (ou supérieur selon besoins)

### 2.2 Configurer les Variables d'Environnement

Aller dans **Environment** et ajouter :

```bash
# Database
POSTGRES_URL=postgresql://user:password@host/database?sslmode=require

# Authentication
JWT_SECRET=<générer une clé forte de 64 caractères>

# Email
ELASTIC_EMAIL_API_KEY=<votre clé API Elastic Email>
EMAIL_FROM=noreply@leadsynch.com
EMAIL_REPLY_TO=support@leadsynch.com

# AI
ANTHROPIC_API_KEY=sk-ant-<votre clé Claude>

# Google
GOOGLE_MAPS_API_KEY=AIzaSy<votre clé Google Maps>

# Optionnel
HUNTER_API_KEY=<votre clé Hunter.io>

# Environment
NODE_ENV=production
PORT=3000

# CORS
FRONTEND_URL=https://app.leadsynch.com

# Security
SSL_REJECT_UNAUTHORIZED=true

# Tenant
TRINEXTA_TENANT_ID=584544e5-892c-4550-a9f6-f8360d7c3eb9
```

### 2.3 Générer un JWT Secret fort

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2.4 Déployer

1. Cliquer sur **Create Web Service**
2. Attendre le build (3-5 minutes)
3. Vérifier le health check : `https://leadsynch-backend.onrender.com/api/health`

### 2.5 Configurer le Custom Domain (Optionnel)

1. Aller dans **Settings** → **Custom Domains**
2. Ajouter : `api.leadsynch.com`
3. Configurer le CNAME dans votre DNS :
   ```
   CNAME  api  leadsynch-backend.onrender.com
   ```

---

## 🌐 Étape 3 : Frontend (Vercel)

### 3.1 Créer le projet Vercel

1. Aller sur [Vercel](https://vercel.com)
2. **Add New** → **Project**
3. Import depuis GitHub : `TRINEXTA/LeadSynch`
4. Configuration :
   - **Framework Preset** : Vite
   - **Root Directory** : `app/frontend`
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`

### 3.2 Configurer les Variables d'Environnement

Aller dans **Settings** → **Environment Variables** :

```bash
# Production
VITE_API_URL=https://leadsynch-backend.onrender.com/api

# Preview (optionnel)
VITE_API_URL=https://leadsynch-backend-preview.onrender.com/api

# Development (déjà dans .env.local)
VITE_API_URL=http://localhost:3000/api
```

### 3.3 Déployer

1. Cliquer sur **Deploy**
2. Attendre le build (2-3 minutes)
3. Votre app est live : `https://leadsynch-app.vercel.app`

### 3.4 Configurer le Custom Domain

1. Aller dans **Settings** → **Domains**
2. Ajouter : `app.leadsynch.com`
3. Vercel configure automatiquement le SSL

---

## 🔄 Étape 4 : Mises à Jour CORS Backend

Une fois le frontend déployé, mettre à jour la variable `FRONTEND_URL` sur Render :

```bash
FRONTEND_URL=https://app.leadsynch.com
```

Puis redéployer le backend (Render le fera automatiquement).

---

## ✅ Étape 5 : Vérifications Post-Déploiement

### 5.1 Health Checks

```bash
# Backend
curl https://api.leadsynch.com/api/health

# Devrait retourner :
{
  "status": "ok",
  "timestamp": "2025-01-16T10:00:00.000Z",
  "database": "connected"
}
```

### 5.2 Test Login

1. Aller sur `https://app.leadsynch.com`
2. S'inscrire avec un email de test
3. Vérifier que l'authentification fonctionne

### 5.3 Test Fonctionnalités

- ✅ Créer une base de leads
- ✅ Importer un CSV
- ✅ Créer une campagne
- ✅ Envoyer un email de test
- ✅ Vérifier le pipeline
- ✅ Dashboard manager

---

## 🔐 Sécurité Post-Déploiement

### 1. Vérifier les secrets

```bash
# Tous les secrets doivent être configurés
echo $JWT_SECRET | wc -c  # >= 64 caractères
```

### 2. Activer les restrictions API

**Google Maps API** :
1. Aller dans Google Cloud Console
2. Credentials → Restreindre la clé
3. Application restrictions : HTTP referrers
4. Ajouter : `https://api.leadsynch.com/*`

**Elastic Email** :
1. Vérifier que le domaine `leadsynch.com` est vérifié
2. Configurer SPF et DKIM records

### 3. Configurer les CORS

Le backend doit autoriser UNIQUEMENT :
- `https://app.leadsynch.com`
- `https://app.leadsynch.com` (avec www si configuré)

Ceci est configuré via `FRONTEND_URL` dans Render.

### 4. Rate Limiting (TODO)

Ajouter express-rate-limit sur Render (voir TODO dans le code).

---

## 📊 Monitoring

### Logs Backend (Render)

1. Aller dans **Logs** sur Render
2. Filtrer par niveau : `error`, `warn`

### Logs Frontend (Vercel)

1. Aller dans **Deployments** → **Functions**
2. Voir les logs en temps réel

### Database Monitoring (Neon)

1. Aller dans **Monitoring** sur Neon
2. Vérifier :
   - Connection count
   - Query performance
   - Storage usage

---

## 🚨 Troubleshooting

### Problème : Backend ne démarre pas

1. Vérifier les logs Render
2. Vérifier que `POSTGRES_URL` est correct
3. Tester la connexion DB :
   ```bash
   psql "$POSTGRES_URL"
   ```

### Problème : Frontend ne se connecte pas au backend

1. Vérifier la variable `VITE_API_URL` sur Vercel
2. Vérifier que le backend est accessible :
   ```bash
   curl https://api.leadsynch.com/api/health
   ```
3. Vérifier les CORS dans les logs backend

### Problème : Emails ne s'envoient pas

1. Vérifier que `ELASTIC_EMAIL_API_KEY` est configurée
2. Vérifier le domaine vérifié sur Elastic Email
3. Tester l'envoi depuis le dashboard

---

## 📝 Checklist de Déploiement

- [ ] Base de données Neon créée
- [ ] Migrations SQL exécutées
- [ ] Backend Render configuré
- [ ] Variables d'environnement backend ajoutées
- [ ] Frontend Vercel configuré
- [ ] Variables d'environnement frontend ajoutées
- [ ] Custom domains configurés
- [ ] SSL activé partout
- [ ] Health checks passent
- [ ] Login fonctionne
- [ ] Emails de test envoyés
- [ ] Restrictions API Google activées
- [ ] Domaine Elastic Email vérifié
- [ ] Monitoring configuré

---

## 🔄 Workflow de Développement

### Branches

- `main` : Production (auto-deploy Vercel + Render)
- `staging` : Preview (auto-deploy preview.vercel.app)
- `claude/*` : Feature branches

### Déploiements Automatiques

**Vercel** (Frontend) :
- Push sur `main` → Deploy production
- Push sur autre branche → Deploy preview

**Render** (Backend) :
- Push sur `main` → Deploy production
- Manuel pour les autres branches

### Rollback

**Vercel** :
1. Aller dans **Deployments**
2. Cliquer sur deployment précédent → **Promote to Production**

**Render** :
1. Aller dans **Events**
2. Cliquer sur deployment précédent → **Rollback**

---

## 💰 Coûts Estimés

| Service | Plan | Coût/mois |
|---------|------|-----------|
| **Neon** | Free / Paid | $0 - $19 |
| **Vercel** | Hobby / Pro | $0 - $20 |
| **Render** | Starter / Professional | $7 - $25 |
| **Elastic Email** | Pay-as-you-go | ~$5 |
| **Anthropic Claude** | Pay-as-you-go | ~$10-50 |
| **Google Maps API** | Pay-as-you-go | ~$5-20 |
| **TOTAL** | | **~$27-139/mois** |

---

## 📞 Support

Pour toute question sur le déploiement :
- Email : support@trinexta.com
- GitHub Issues : https://github.com/TRINEXTA/LeadSynch/issues

---

**Dernière mise à jour** : 16 novembre 2025
**Version** : 1.0.0
