# Guide de Sécurité pour Équipe de Développement Distante

> **Objectif** : Permettre à une équipe au Kenya de travailler sur LeadSynch en toute sécurité
> **Infrastructure actuelle** : Backend (Render) + Frontend (Vercel) + BDD (VPS OVH) + GitHub

---

## TABLE DES MATIÈRES

1. [Architecture des Environnements](#1-architecture-des-environnements)
2. [Gestion des Accès GitHub](#2-gestion-des-accès-github)
3. [Gestion des Secrets](#3-gestion-des-secrets)
4. [Accès Base de Données](#4-accès-base-de-données)
5. [Outils de Suivi et Monitoring](#5-outils-de-suivi-et-monitoring)
6. [Aspects Légaux et Contractuels](#6-aspects-légaux-et-contractuels)
7. [Checklist Avant Onboarding](#7-checklist-avant-onboarding)
8. [Coûts des Outils](#8-coûts-des-outils)

---

## 1. ARCHITECTURE DES ENVIRONNEMENTS

### Principe : Séparation Stricte des Environnements

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENVIRONNEMENT PRODUCTION                      │
│                    (Accès INTERDIT aux devs)                     │
├─────────────────────────────────────────────────────────────────┤
│  Backend: Render (leadsynch-api.onrender.com)                   │
│  Frontend: Vercel (app.leadsynch.com)                           │
│  BDD: VPS OVH (PostgreSQL - données clients réelles)            │
│  Secrets: Variables d'env sur Render/Vercel                     │
└─────────────────────────────────────────────────────────────────┘
                              ⛔ ACCÈS INTERDIT

┌─────────────────────────────────────────────────────────────────┐
│                    ENVIRONNEMENT STAGING                         │
│                    (Accès limité - Tech Lead)                    │
├─────────────────────────────────────────────────────────────────┤
│  Backend: Render (leadsynch-staging.onrender.com)               │
│  Frontend: Vercel (staging.leadsynch.com)                       │
│  BDD: VPS OVH (base séparée avec données anonymisées)           │
│  Usage: Tests finaux avant production                           │
└─────────────────────────────────────────────────────────────────┘
                              🔒 ACCÈS TECH LEAD SEULEMENT

┌─────────────────────────────────────────────────────────────────┐
│                    ENVIRONNEMENT DÉVELOPPEMENT                   │
│                    (Accès équipe dev)                            │
├─────────────────────────────────────────────────────────────────┤
│  Backend: Local ou Render (leadsynch-dev.onrender.com)          │
│  Frontend: Local ou Vercel (dev.leadsynch.com)                  │
│  BDD: Base de dev séparée (données fictives)                    │
│  Usage: Développement quotidien                                 │
└─────────────────────────────────────────────────────────────────┘
                              ✅ ACCÈS ÉQUIPE DEV
```

### Ce que tu dois créer

| Environnement | Backend | Frontend | Base de données |
|---------------|---------|----------|-----------------|
| **Production** | leadsynch-api.onrender.com | app.leadsynch.com | `leadsynch_prod` (VPS) |
| **Staging** | leadsynch-staging.onrender.com | staging.leadsynch.com | `leadsynch_staging` (VPS) |
| **Dev** | leadsynch-dev.onrender.com | dev.leadsynch.com | `leadsynch_dev` (VPS) |

### Actions à faire sur ton VPS OVH

```bash
# Créer les bases de données séparées
sudo -u postgres psql

CREATE DATABASE leadsynch_staging;
CREATE DATABASE leadsynch_dev;

# Créer des utilisateurs séparés avec permissions limitées
CREATE USER leadsynch_staging_user WITH PASSWORD 'mot_de_passe_fort_1';
CREATE USER leadsynch_dev_user WITH PASSWORD 'mot_de_passe_fort_2';

# Donner les permissions
GRANT ALL PRIVILEGES ON DATABASE leadsynch_staging TO leadsynch_staging_user;
GRANT ALL PRIVILEGES ON DATABASE leadsynch_dev TO leadsynch_dev_user;

# IMPORTANT: L'utilisateur de production reste séparé et secret
```

---

## 2. GESTION DES ACCÈS GITHUB

### 2.1 Structure des Permissions

| Rôle | Permission GitHub | Ce qu'il peut faire |
|------|-------------------|---------------------|
| **Toi (Owner)** | Admin | Tout |
| **Tech Lead** | Maintain | Merge dans main, gérer branches |
| **Dev Senior** | Write | Push branches, créer PR |
| **Dev Junior** | Write | Push branches, créer PR |
| **QA** | Triage | Commenter, tester, rapporter |

### 2.2 Protection de la Branche Main

**Aller dans** : GitHub → Settings → Branches → Add rule

```
Branch name pattern: main

✅ Require a pull request before merging
   ✅ Require approvals: 1 (minimum)
   ✅ Dismiss stale pull request approvals when new commits are pushed
   ✅ Require review from Code Owners

✅ Require status checks to pass before merging
   ✅ Require branches to be up to date before merging
   (Ajouter: tests, lint, build)

✅ Require conversation resolution before merging

✅ Require signed commits (optionnel mais recommandé)

✅ Do not allow bypassing the above settings
   (Même toi tu dois passer par une PR)

❌ Allow force pushes (DÉSACTIVÉ)
❌ Allow deletions (DÉSACTIVÉ)
```

### 2.3 Fichier CODEOWNERS

Créer `.github/CODEOWNERS` :

```
# Fichier CODEOWNERS - Définit qui doit approuver les modifications

# Par défaut, tu dois approuver tout
* @ton-username-github

# Le Tech Lead peut approuver les modifications de code
/app/backend/ @ton-username-github @tech-lead-username
/app/frontend/ @ton-username-github @tech-lead-username

# Toi seul peux modifier les fichiers sensibles
/.github/ @ton-username-github
/CLAUDE.md @ton-username-github
/.env* @ton-username-github
/app/backend/lib/db.js @ton-username-github
/app/backend/middleware/auth.js @ton-username-github
```

### 2.4 Secrets GitHub (pour CI/CD)

**Aller dans** : GitHub → Settings → Secrets and variables → Actions

| Secret | Environnement | Qui peut voir |
|--------|---------------|---------------|
| `PROD_DATABASE_URL` | Production | Personne (seulement CI) |
| `STAGING_DATABASE_URL` | Staging | Personne |
| `DEV_DATABASE_URL` | Development | Personne |
| `JWT_SECRET_PROD` | Production | Personne |
| `ANTHROPIC_API_KEY` | Tous | Personne |

**IMPORTANT** : Les secrets GitHub ne sont JAMAIS visibles, même par les admins.

### 2.5 Workflow de Développement Sécurisé

```
Développeur crée une branche
         │
         ▼
    feat/ma-feature
         │
         ▼
Push sur sa branche
         │
         ▼
Crée une Pull Request vers 'develop'
         │
         ▼
    ┌────────────────┐
    │ Tests auto     │ ← GitHub Actions
    │ (Jest, lint)   │
    └────────────────┘
         │
         ▼
    ┌────────────────┐
    │ Code Review    │ ← Tech Lead ou Senior
    │ par un pair    │
    └────────────────┘
         │
         ▼
    ┌────────────────┐
    │ Approbation    │ ← Toi ou Tech Lead
    │ finale         │
    └────────────────┘
         │
         ▼
Merge dans 'develop'
         │
         ▼
Déploiement auto sur DEV
         │
         ▼
Tests sur environnement DEV
         │
         ▼
    ┌────────────────┐
    │ PR develop →   │ ← Tech Lead crée
    │ staging        │
    └────────────────┘
         │
         ▼
    ┌────────────────┐
    │ TOI approuves  │ ← Validation finale
    └────────────────┘
         │
         ▼
Merge dans 'staging' → Déploiement staging
         │
         ▼
Tests sur staging (données anonymisées)
         │
         ▼
    ┌────────────────┐
    │ PR staging →   │ ← TOI seul
    │ main           │
    └────────────────┘
         │
         ▼
Déploiement PRODUCTION
```

---

## 3. GESTION DES SECRETS

### 3.1 Règle d'Or

```
╔════════════════════════════════════════════════════════════════╗
║  LES DÉVELOPPEURS NE DOIVENT JAMAIS AVOIR ACCÈS AUX SECRETS    ║
║  DE PRODUCTION (API keys, mots de passe BDD, JWT secret)       ║
╚════════════════════════════════════════════════════════════════╝
```

### 3.2 Comment Partager les Secrets DEV

**Option 1 : Fichier .env.dev partagé (Simple)**

Créer un fichier `.env.dev.example` dans le repo :

```bash
# .env.dev.example - Copier vers .env pour développement local

# Base de données DEV (pas de vraies données)
POSTGRES_URL=postgresql://leadsynch_dev_user:xxx@ton-vps-ovh.com:5432/leadsynch_dev

# JWT Secret (différent de production!)
JWT_SECRET=dev-secret-key-not-for-production-use-only

# API Keys (comptes de test séparés)
ANTHROPIC_API_KEY=sk-ant-dev-xxx
ELASTIC_EMAIL_API_KEY=dev-xxx
GOOGLE_MAPS_API_KEY=AIza-dev-xxx

# Environnement
NODE_ENV=development
```

**Option 2 : 1Password / Bitwarden Teams (Recommandé)**

- Créer un vault "LeadSynch Dev"
- Partager uniquement les secrets DEV
- Garder un vault "LeadSynch Prod" privé (toi seul)

**Option 3 : Doppler (Professionnel)**

- Service de gestion de secrets
- Intégration avec Render, Vercel
- Audit trail de qui accède à quoi
- ~20$/mois

### 3.3 Clés API Séparées

| Service | Compte DEV | Compte PROD |
|---------|------------|-------------|
| Anthropic | Compte séparé (limité) | Ton compte principal |
| Elastic Email | Sous-compte test | Compte principal |
| Google Maps | Clé avec restrictions | Clé de production |

**Pour Anthropic** :
1. Créer un compte séparé pour l'équipe dev
2. Définir une limite de dépenses (ex: 50$/mois)
3. Partager cette clé dans `.env.dev`

**Pour Google Maps** :
1. Créer une clé séparée "DEV"
2. Restreindre à 1000 requêtes/jour
3. Limiter aux IPs des développeurs (si possible)

---

## 4. ACCÈS BASE DE DONNÉES

### 4.1 Configuration VPS OVH Sécurisée

```bash
# Sur ton VPS OVH

# 1. Configurer le firewall
sudo ufw allow from IP_TECH_LEAD to any port 5432
sudo ufw allow from IP_DEV_SENIOR to any port 5432
# NE PAS ouvrir 5432 à tout le monde!

# 2. Configurer PostgreSQL pour accepter les connexions
sudo nano /etc/postgresql/15/main/pg_hba.conf

# Ajouter:
# TYPE  DATABASE              USER                    ADDRESS         METHOD
host    leadsynch_dev         leadsynch_dev_user      IP_TECH_LEAD/32 scram-sha-256
host    leadsynch_dev         leadsynch_dev_user      IP_DEV_SENIOR/32 scram-sha-256
host    leadsynch_staging     leadsynch_staging_user  IP_TECH_LEAD/32 scram-sha-256

# JAMAIS de connexion directe à leadsynch_prod pour les devs!

# 3. Redémarrer PostgreSQL
sudo systemctl restart postgresql
```

### 4.2 Alternative : VPN ou Tunnel SSH

**Option recommandée : Tunnel SSH**

Les développeurs se connectent via SSH, pas directement à la BDD :

```bash
# Le développeur exécute sur son PC :
ssh -L 5433:localhost:5432 user@ton-vps-ovh.com

# Puis se connecte à :
postgresql://leadsynch_dev_user:xxx@localhost:5433/leadsynch_dev
```

**Avantages** :
- Pas besoin d'ouvrir le port 5432 publiquement
- Connexion chiffrée
- Tu contrôles les accès SSH

### 4.3 Données Anonymisées pour Staging

Script pour copier et anonymiser les données :

```sql
-- Script à exécuter par TOI uniquement
-- Copie les données prod vers staging en anonymisant

-- 1. Copier la structure
pg_dump -s leadsynch_prod | psql leadsynch_staging

-- 2. Copier et anonymiser les données
INSERT INTO leadsynch_staging.leads (id, company_name, email, phone, ...)
SELECT
    id,
    'Entreprise Test ' || id::text,  -- Anonymiser nom
    'test' || id::text || '@example.com',  -- Anonymiser email
    '+33600000000',  -- Numéro fictif
    ...
FROM leadsynch_prod.leads
LIMIT 1000;  -- Seulement 1000 leads pour les tests

-- 3. Supprimer les vraies données sensibles
UPDATE leadsynch_staging.users SET
    email = 'user' || id::text || '@test.com',
    password_hash = '$2b$10$test...',  -- Hash de "password123"
    first_name = 'Test',
    last_name = 'User' || id::text;
```

---

## 5. OUTILS DE SUIVI ET MONITORING

### 5.1 Outils Recommandés

| Outil | Usage | Coût | Priorité |
|-------|-------|------|----------|
| **GitHub** | Code, PR, Issues | Gratuit (public) / 4$/user (privé) | 🔴 Obligatoire |
| **Linear** ou **Jira** | Gestion de tâches | Gratuit - 10$/user | 🔴 Obligatoire |
| **Slack** ou **Discord** | Communication | Gratuit | 🔴 Obligatoire |
| **Loom** | Vidéos explicatives | Gratuit - 15$/user | 🟡 Recommandé |
| **Notion** | Documentation | Gratuit - 10$/user | 🟡 Recommandé |
| **Sentry** | Monitoring erreurs | Gratuit - 26$/mois | 🔴 Obligatoire |
| **Papertrail** | Logs centralisés | Gratuit - 7$/mois | 🟡 Recommandé |

### 5.2 GitHub Actions pour Audit

Créer `.github/workflows/audit.yml` :

```yaml
name: Security Audit

on:
  push:
    branches: [main, develop, staging]
  pull_request:
    branches: [main, develop]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Vérifier qu'il n'y a pas de secrets dans le code
      - name: Check for secrets
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./

      # Audit des dépendances
      - name: Audit npm packages
        run: |
          cd app/backend && npm audit --audit-level=high
          cd ../frontend && npm audit --audit-level=high

      # Linting
      - name: Lint code
        run: |
          cd app/backend && npm run lint
          cd ../frontend && npm run lint
```

### 5.3 Suivi du Temps de Travail

**Options** :
1. **Toggl Track** (Gratuit) - Suivi manuel
2. **Hubstaff** (7$/user/mois) - Screenshots, activité
3. **Time Doctor** (10$/user/mois) - Plus strict

**Recommandation** : Commencer par Toggl (gratuit), passer à Hubstaff si besoin de plus de contrôle.

### 5.4 Reporting Hebdomadaire

Template de rapport à demander chaque vendredi :

```markdown
## Rapport Hebdomadaire - [Nom] - Semaine du [Date]

### Tâches Complétées
- [ ] Tâche 1 - X heures
- [ ] Tâche 2 - X heures

### Tâches En Cours
- [ ] Tâche 3 - X% complété

### Blocages / Problèmes
- Description du problème

### Prochaine Semaine
- Tâche prévue 1
- Tâche prévue 2

### Heures Totales : XX heures
```

---

## 6. ASPECTS LÉGAUX ET CONTRACTUELS

### 6.1 Contrat de Travail / Freelance

**Éléments essentiels à inclure** :

```
1. CONFIDENTIALITÉ (NDA)
   - Ne pas divulguer le code source
   - Ne pas partager les accès
   - Ne pas copier les données clients
   - Durée: Pendant le contrat + 2 ans après

2. PROPRIÉTÉ INTELLECTUELLE
   - Tout code écrit appartient à TrusTech IT Support
   - Cession complète des droits d'auteur
   - Pas de réutilisation dans d'autres projets

3. NON-CONCURRENCE (optionnel)
   - Pas de travail pour concurrents directs pendant X mois

4. SÉCURITÉ DES DONNÉES
   - Obligation de signaler toute faille
   - Interdiction d'exporter des données
   - Utilisation de connexions sécurisées uniquement

5. RÉSILIATION
   - Remise de tous les accès sous 24h
   - Suppression des données locales
   - Transmission des connaissances
```

### 6.2 Clause RGPD (Obligatoire pour données EU)

```
TRAITEMENT DES DONNÉES PERSONNELLES

Le Prestataire s'engage à :
- Traiter les données uniquement selon les instructions du Client
- Ne pas transférer les données hors de l'UE sans autorisation
- Mettre en œuvre les mesures de sécurité appropriées
- Informer immédiatement en cas de violation de données
- Supprimer ou restituer les données à la fin du contrat
```

### 6.3 Vérification Avant Embauche

- [ ] Vérifier le profil LinkedIn
- [ ] Demander des références (anciens employeurs)
- [ ] Test technique supervisé
- [ ] Appel vidéo pour confirmer l'identité
- [ ] Période d'essai de 1 mois

---

## 7. CHECKLIST AVANT ONBOARDING

### 7.1 Infrastructure à Préparer

- [ ] Créer environnement DEV sur Render
- [ ] Créer environnement DEV sur Vercel
- [ ] Créer base de données `leadsynch_dev` sur VPS
- [ ] Créer base de données `leadsynch_staging` sur VPS
- [ ] Créer utilisateur PostgreSQL limité
- [ ] Configurer firewall VPS (IPs autorisées)
- [ ] Créer clés API de développement (Anthropic, etc.)

### 7.2 GitHub à Configurer

- [ ] Activer 2FA obligatoire pour l'organisation
- [ ] Créer fichier CODEOWNERS
- [ ] Configurer protection de branche `main`
- [ ] Configurer protection de branche `staging`
- [ ] Créer les secrets GitHub Actions
- [ ] Créer le workflow CI/CD

### 7.3 Outils à Mettre en Place

- [ ] Créer workspace Slack/Discord
- [ ] Créer projet Linear/Jira
- [ ] Configurer Sentry (backend + frontend)
- [ ] Créer compte Notion pour documentation
- [ ] Configurer outil de time tracking

### 7.4 Documents à Préparer

- [ ] Contrat de travail/freelance avec NDA
- [ ] Guide d'onboarding technique
- [ ] Documentation architecture
- [ ] Standards de code (linting rules)
- [ ] Processus de code review

### 7.5 Pour Chaque Nouveau Développeur

**Jour 1 :**
- [ ] Signer le contrat + NDA
- [ ] Créer compte GitHub et ajouter à l'organisation
- [ ] Activer 2FA sur GitHub
- [ ] Configurer SSH pour GitHub
- [ ] Ajouter aux channels Slack pertinents
- [ ] Ajouter au projet Linear/Jira
- [ ] Partager `.env.dev` (via 1Password ou similaire)

**Semaine 1 :**
- [ ] Onboarding technique (appel vidéo)
- [ ] Premier ticket simple (bug ou petite feature)
- [ ] Première PR reviewée
- [ ] Vérifier compréhension du workflow

---

## 8. COÛTS DES OUTILS

### Budget Mensuel Recommandé

| Outil | Plan | Coût/mois | Notes |
|-------|------|-----------|-------|
| **GitHub Team** | 4$/user | 20$ (5 users) | Repo privé, CODEOWNERS |
| **Linear** | Gratuit | 0$ | Jusqu'à 250 issues |
| **Slack** | Gratuit | 0$ | Historique limité |
| **Sentry** | Team | 26$ | 100K events/mois |
| **1Password Teams** | 8$/user | 40$ (5 users) | Gestion secrets |
| **Toggl Track** | Gratuit | 0$ | Time tracking |
| **Loom** | Business | 15$/user | 75$ (5 users) | Optionnel |
| **TOTAL** | | **~161$/mois** | |

### Budget Minimum (Essentiel seulement)

| Outil | Plan | Coût/mois |
|-------|------|-----------|
| GitHub Team | 4$/user | 20$ |
| Linear | Gratuit | 0$ |
| Slack | Gratuit | 0$ |
| Sentry | Developer | 0$ (5K events) |
| **TOTAL** | | **~20$/mois** |

---

## RÉCAPITULATIF - CE QUE TU DOIS FAIRE

### Étape 1 : Avant de Recruter (1-2 jours)

1. ✅ Créer les environnements DEV et STAGING
2. ✅ Configurer les protections GitHub
3. ✅ Préparer le contrat avec NDA
4. ✅ Créer les comptes d'outils (Slack, Linear, etc.)

### Étape 2 : Pendant le Recrutement

1. ✅ Faire un test technique
2. ✅ Vérifier les références
3. ✅ Appel vidéo obligatoire

### Étape 3 : Onboarding

1. ✅ Signature du contrat
2. ✅ Accès limités (jamais prod)
3. ✅ Formation sur le workflow
4. ✅ Première tâche supervisée

### Règles d'Or

```
╔════════════════════════════════════════════════════════════════╗
║  1. JAMAIS d'accès direct à la production                      ║
║  2. JAMAIS de secrets de prod partagés                         ║
║  3. TOUJOURS des PR reviewées avant merge                      ║
║  4. TOUJOURS 2FA activé sur GitHub                             ║
║  5. CONTRAT avec NDA signé avant tout accès                    ║
╚════════════════════════════════════════════════════════════════╝
```

---

**Document créé le** : 8 janvier 2026
**Pour** : TrusTech IT Support / LeadSynch
