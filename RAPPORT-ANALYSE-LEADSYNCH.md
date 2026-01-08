# RAPPORT D'ANALYSE COMPLET - LeadSynch

> **Date d'analyse** : 8 janvier 2026
> **Objectif** : Préparer l'application pour le grand public et constituer une équipe de développement

---

## TABLE DES MATIÈRES

1. [Résumé Exécutif](#1-résumé-exécutif)
2. [Qu'est-ce que LeadSynch ?](#2-quest-ce-que-leadsynch-)
3. [Architecture Technique](#3-architecture-technique)
4. [Fonctionnalités Détaillées](#4-fonctionnalités-détaillées)
5. [Problèmes Critiques à Corriger](#5-problèmes-critiques-à-corriger)
6. [Scores et État Actuel](#6-scores-et-état-actuel)
7. [Équipe à Recruter](#7-équipe-à-recruter)
8. [Plan d'Action Détaillé](#8-plan-daction-détaillé)
9. [Budget et Timeline Estimés](#9-budget-et-timeline-estimés)

---

## 1. RÉSUMÉ EXÉCUTIF

### Ce que vous avez

LeadSynch est une **plateforme CRM SaaS B2B multi-tenant** complète avec :
- ✅ 79 endpoints API fonctionnels
- ✅ 70 pages frontend
- ✅ 60+ tables en base de données
- ✅ Intégration IA (Claude) pour génération de templates
- ✅ Système de campagnes email automatisées
- ✅ Pipeline Kanban drag & drop
- ✅ Site marketing professionnel

### Ce qui manque pour être prêt

| Priorité | Problème | Impact |
|----------|----------|--------|
| 🔴 CRITIQUE | Vulnérabilité injection SQL | Sécurité compromise |
| 🔴 CRITIQUE | Token en localStorage | Vulnérable aux attaques XSS |
| 🔴 CRITIQUE | 0% de tests | Bugs en production |
| 🟡 IMPORTANT | Performance workers (N+1) | Lenteur serveur |
| 🟡 IMPORTANT | Pas de monitoring | Pas de visibilité erreurs |
| 🟢 NORMAL | SEO incomplet | Moins de trafic organique |

### Score Global : 5.5/10

**Verdict** : L'application fonctionne mais n'est **PAS PRÊTE** pour le grand public. Il faut 2-3 mois de travail avec une équipe dédiée.

---

## 2. QU'EST-CE QUE LEADSYNCH ?

### Description

LeadSynch est un **CRM (Customer Relationship Management)** conçu pour les entreprises B2B qui font de la prospection commerciale. L'application permet de :

1. **Générer des leads** automatiquement (via Google Maps, API Sirene)
2. **Importer des leads** depuis des fichiers CSV
3. **Envoyer des campagnes email** automatisées
4. **Suivre les prospects** dans un pipeline visuel (Kanban)
5. **Automatiser les relances** selon le comportement des prospects
6. **Gérer une équipe commerciale** avec permissions et commissions

### Public Cible

- PME et TPE françaises
- Entreprises de services B2B
- Agences de prospection
- Équipes commerciales (5-50 personnes)

### Modèle Économique

- **SaaS par abonnement** (mensuel/annuel)
- **4 plans** : Starter, Pro, Business, Enterprise
- **Crédits leads** supplémentaires (système de crédits)
- **Multi-tenant** : Chaque client a ses propres données isolées

---

## 3. ARCHITECTURE TECHNIQUE

### Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                      UTILISATEURS                            │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   SITE MARKETING                             │
│    website/ - React 19 + Vite 7 + Tailwind 4                │
│    (Home, Pricing, Login, Register, Pages légales)          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  APPLICATION CRM                             │
│    app/frontend/ - React 18 + Vite 5 + Tailwind             │
│    (70 pages : Dashboard, Leads, Campaigns, Pipeline...)    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     API BACKEND                              │
│    app/backend/ - Node.js + Express + PostgreSQL            │
│    (79 endpoints, Workers email/relances)                   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  SERVICES EXTERNES                           │
├──────────────┬──────────────┬──────────────┬───────────────┤
│ Anthropic    │ Elastic      │ Google Maps  │ API Gouv      │
│ Claude AI    │ Email        │ API          │ (Sirene)      │
│ (Templates)  │ (Envoi)      │ (Leads)      │ (Leads)       │
└──────────────┴──────────────┴──────────────┴───────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   BASE DE DONNÉES                            │
│              PostgreSQL (Vercel Postgres)                    │
│                    60+ tables                                │
└─────────────────────────────────────────────────────────────┘
```

### Technologies Utilisées

| Composant | Technologies | Version |
|-----------|--------------|---------|
| **Frontend App** | React, Vite, Tailwind, Axios | 18.2, 5.0, 4.x |
| **Website** | React, Vite, Tailwind | 19.1, 7.1, 4.x |
| **Backend** | Node.js, Express, PostgreSQL | 20+, 4.18, 15+ |
| **IA** | Anthropic Claude API | SDK 0.67 |
| **Email** | Elastic Email API | V2 |
| **Hébergement** | Vercel (Serverless) | - |

### Statistiques du Code

| Composant | Lignes de code | Fichiers |
|-----------|----------------|----------|
| Backend API | ~28,000 | 79 endpoints |
| Frontend App | ~47,000 | 70 pages + 45 composants |
| Website | ~3,500 | 12 pages |
| Workers | ~37,000 | 2 workers |
| **TOTAL** | ~115,000 | 200+ fichiers |

---

## 4. FONCTIONNALITÉS DÉTAILLÉES

### 4.1 Génération de Leads

| Fonctionnalité | Description | État |
|----------------|-------------|------|
| Google Maps | Recherche entreprises par secteur/ville | ✅ Fonctionne |
| API Sirene | Base officielle française | ✅ Fonctionne |
| Import CSV | Avec détection IA du secteur | ✅ Fonctionne |
| Enrichissement | Données SIRET, NAF, effectifs | ✅ Partiel |
| Pool global | Cache de leads partagés | ✅ Fonctionne |

### 4.2 Gestion des Campagnes Email

| Fonctionnalité | Description | État |
|----------------|-------------|------|
| Création campagne | Nom, type, base de données, template | ✅ Fonctionne |
| Templates IA | Générés par Claude (Asefi) | ✅ Fonctionne |
| Planification | Jours, heures, intervalle | ✅ Fonctionne |
| Envoi automatique | Worker en arrière-plan | ✅ Fonctionne |
| Tracking | Ouvertures, clics, bounces | ✅ Fonctionne |
| Relances auto | 1ère et 2ème relance | ✅ Fonctionne |
| Filtrage | Par secteur, ville, SIRET | ✅ Fonctionne |

### 4.3 Pipeline Kanban

| Étape | Description |
|-------|-------------|
| **Cold Call** | Leads non contactés |
| **NRP** | Pas de réponse |
| **Rappeler** | À rappeler |
| **Qualifié** | Intérêt confirmé |
| **Très Qualifié** | Forte probabilité |
| **Proposition** | Devis envoyé |
| **Négociation** | En cours |
| **Gagné** | Contrat signé |
| **Perdu** | Refus |

### 4.4 Gestion d'Équipe

| Fonctionnalité | Description | État |
|----------------|-------------|------|
| Utilisateurs | CRUD avec rôles | ✅ Fonctionne |
| Permissions | Par rôle (admin, manager, user) | ✅ Fonctionne |
| Hiérarchie | DG, Directeur, Superviseur | ✅ Fonctionne |
| Commissions | Calcul automatique | ✅ Fonctionne |
| Équipes | Regroupement utilisateurs | ✅ Fonctionne |
| Planning | Calendrier partagé | ✅ Fonctionne |

### 4.5 Facturation & Abonnements

| Fonctionnalité | Description | État |
|----------------|-------------|------|
| Plans | 4 niveaux de plans | ✅ Fonctionne |
| Crédits leads | Système de crédits | ✅ Fonctionne |
| Factures | Génération automatique | ✅ Partiel |
| E-signature | Propositions/contrats | ✅ Fonctionne |

### 4.6 Chatbot IA (Asefi)

| Fonctionnalité | Description | État |
|----------------|-------------|------|
| Chat support | Questions/réponses | ✅ Fonctionne |
| Génération templates | Email professionnels | ✅ Fonctionne |
| Classification secteur | Détection automatique | ✅ Fonctionne |

---

## 5. PROBLÈMES CRITIQUES À CORRIGER

### 🔴 SÉCURITÉ CRITIQUE (À corriger IMMÉDIATEMENT)

#### 5.1 Injection SQL dans campaigns.js

**Fichier** : `app/backend/api/campaigns.js` (lignes 152-166)

**Problème** :
```javascript
// ❌ VULNÉRABLE - Concaténation directe
const sectorFilter = `(ldr.database_id = '${dbId}' AND l.sector = ANY(ARRAY[${sectorList}]))`;
```

**Impact** : Un attaquant peut exécuter du SQL arbitraire et voler/supprimer toutes les données.

**Solution** :
```javascript
// ✅ SÉCURISÉ - Paramètres
const params = [tenantId];
let idx = 2;
const filters = sectors.map(([dbId, sectorList]) => {
  params.push(dbId, sectorList);
  return `(ldr.database_id = $${idx++} AND l.sector = ANY($${idx++}::text[]))`;
});
```

---

#### 5.2 Token JWT en localStorage

**Fichier** : `app/frontend/src/context/AuthContext.jsx`

**Problème** :
```javascript
// ❌ Vulnérable aux attaques XSS
localStorage.setItem('token', token);
```

**Impact** : Si une attaque XSS réussit, l'attaquant vole le token et accède au compte.

**Solution** : Utiliser des **cookies httpOnly** côté serveur.

---

#### 5.3 Pas de validation Zod sur tous les endpoints

**Endpoints sans validation** :
- `campaigns.js` - 50% des routes
- `pipeline-leads.js` - 0%
- `organize-leads.js` - 0%
- `import-csv.js` - Partiel

**Impact** : Données invalides/malicieuses en base de données.

---

#### 5.4 SSL rejectUnauthorized: false

**Fichier** : `app/backend/lib/db.js`

**Problème** : Accepte les certificats SSL non vérifiés en production.

**Impact** : Vulnérable aux attaques man-in-the-middle.

---

### 🟡 PROBLÈMES IMPORTANTS

#### 5.5 Performance N+1 dans Workers

**Fichiers** :
- `workers/emailWorker.js` (14,471 lignes)
- `workers/followUpWorker.js` (22,374 lignes)

**Problème** :
```javascript
// ❌ Une requête par email = 1000 requêtes pour 1000 emails
for (const lead of leads) {
  await db.query('UPDATE email_queue SET status = $1 WHERE id = $2', ...);
}
```

**Impact** : Serveur surchargé, envois lents.

**Solution** :
```sql
-- ✅ Une seule requête pour 1000 emails
UPDATE email_queue SET status = 'sent' WHERE id = ANY($1::uuid[])
```

---

#### 5.6 Polling au lieu de WebSocket

**Situation actuelle** :
- Dashboard : refresh toutes les 30s
- Campaigns : refresh toutes les 30s
- Pipeline : refresh toutes les 60s
- Elastic Email : polling toutes les 10 min

**Impact** :
- Serveur surchargé
- Batterie mobile vidée
- Données pas en temps réel

**Solution** : WebSocket ou Server-Sent Events (SSE).

---

#### 5.7 Aucun Test (0% coverage)

**Impact** :
- Bugs non détectés avant production
- Peur de modifier le code
- Régression à chaque modification

---

#### 5.8 Pas de Monitoring (Sentry)

**Impact** :
- Pas de visibilité sur les erreurs en production
- Pas d'alertes quand le système plante
- Difficile de debugger

---

### 🟢 PROBLÈMES MINEURS

| Problème | Impact | Effort |
|----------|--------|--------|
| Images OG manquantes (website) | SEO partage réseaux | 1h |
| Animation manquante (slideDown) | UX mobile | 15min |
| Pas de sitemap.xml | SEO | 30min |
| Pas de Schema.org | SEO | 2h |
| 74 console.log en production | Perf/sécurité | 1h |
| Pas de virtualisation listes | Perf avec 1000+ leads | 4h |

---

## 6. SCORES ET ÉTAT ACTUEL

### Scores par Composant

| Composant | Score | Détails |
|-----------|-------|---------|
| **Backend API** | 5.3/10 | Fonctionne mais vulnérabilités critiques |
| **Frontend App** | 6/10 | Bonne architecture, pas de tests |
| **Website** | 7.5/10 | Quasi-prêt, manque images OG |
| **Base de données** | 7/10 | Bien structurée, quelques problèmes |
| **Sécurité** | 4/10 | Vulnérabilités critiques |
| **Performance** | 5/10 | N+1 queries, polling excessif |
| **Tests** | 0/10 | Aucun test |
| **Documentation** | 8/10 | CLAUDE.md excellent |

### Score Global : 5.5/10

### Comparaison avec les Standards Industrie

| Critère | LeadSynch | Standard Industrie | Écart |
|---------|-----------|-------------------|-------|
| Tests | 0% | 70-80% | 🔴 -70% |
| Sécurité | Vulnérabilités | OWASP Top 10 | 🔴 Critique |
| Performance | Lent | <200ms API | 🟡 À améliorer |
| Monitoring | Aucun | Sentry + APM | 🔴 Manquant |
| Documentation | Excellente | README + API docs | 🟢 OK |

---

## 7. ÉQUIPE À RECRUTER

### Vue d'ensemble de l'Équipe Recommandée

```
┌─────────────────────────────────────────────────────────────┐
│                    VOUS (Product Owner)                      │
│         Vision produit, Priorisation, Validation            │
└─────────────────────────────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  TECH LEAD      │ │  DEV FULLSTACK  │ │  DEV FULLSTACK  │
│  (1 personne)   │ │  SENIOR         │ │  JUNIOR         │
│                 │ │  (1 personne)   │ │  (1-2 personnes)│
│  Architecture   │ │  Features       │ │  Bugs & support │
│  Code review    │ │  complexes      │ │  Tests          │
│  Sécurité       │ │  Performance    │ │  Documentation  │
└─────────────────┘ └─────────────────┘ └─────────────────┘
                           │
                           ▼
            ┌─────────────────────────────┐
            │    QA / TESTEUR (optionnel) │
            │    Tests manuels + E2E      │
            └─────────────────────────────┘
```

### Profil 1 : Tech Lead / Développeur Senior Full-Stack

**Rôle** : Chef technique, architecte, garant de la qualité

**Compétences Requises** :
- ✅ **JavaScript/TypeScript** avancé (5+ ans)
- ✅ **React** (3+ ans)
- ✅ **Node.js/Express** (3+ ans)
- ✅ **PostgreSQL** (requêtes complexes, optimisation)
- ✅ **Sécurité web** (OWASP Top 10)
- ✅ **Git** (branching, PR, code review)
- ✅ **Testing** (Jest, Vitest, Playwright)
- ✅ **DevOps basique** (CI/CD, Vercel, monitoring)

**Responsabilités** :
1. Corriger les vulnérabilités de sécurité
2. Mettre en place les tests automatisés
3. Optimiser les performances (N+1, caching)
4. Faire les code reviews
5. Former l'équipe junior
6. Documenter l'architecture

**Salaire indicatif** : 2500-4000€/mois (selon pays africain)

---

### Profil 2 : Développeur Full-Stack Senior

**Rôle** : Développement de fonctionnalités complexes

**Compétences Requises** :
- ✅ **JavaScript/React** (3+ ans)
- ✅ **Node.js/Express** (2+ ans)
- ✅ **SQL/PostgreSQL** (bonnes bases)
- ✅ **API REST** (conception, consommation)
- ✅ **Git** (branches, merge, PR)
- 🟡 **Testing** (apprentissage OK)

**Responsabilités** :
1. Développer nouvelles fonctionnalités
2. Corriger les bugs complexes
3. Implémenter WebSocket/SSE
4. Optimiser les workers
5. Améliorer l'UX (virtualisation, animations)

**Salaire indicatif** : 1500-2500€/mois

---

### Profil 3 : Développeur Full-Stack Junior (1-2 personnes)

**Rôle** : Support, bugs simples, tests, documentation

**Compétences Requises** :
- ✅ **JavaScript** (1+ an)
- ✅ **React** (bases solides)
- ✅ **Node.js** (bases)
- ✅ **SQL** (CRUD basique)
- ✅ **Git** (commit, pull, push)
- ✅ **Motivation** pour apprendre

**Responsabilités** :
1. Corriger les bugs simples
2. Écrire les tests unitaires
3. Améliorer la documentation
4. Support client niveau 2
5. Tâches de maintenance

**Salaire indicatif** : 800-1500€/mois

---

### Profil 4 (Optionnel) : QA / Testeur

**Rôle** : Garantir la qualité avant mise en production

**Compétences Requises** :
- ✅ Tests manuels (scénarios, rapports)
- ✅ Tests E2E (Playwright, Cypress)
- ✅ Rédaction de tickets (Jira, GitHub Issues)
- 🟡 Automation testing (un plus)

**Responsabilités** :
1. Tester chaque fonctionnalité avant déploiement
2. Rédiger les cas de test
3. Automatiser les tests E2E critiques
4. Rapporter les bugs avec reproductibilité

**Salaire indicatif** : 600-1200€/mois

---

### Récapitulatif Équipe Minimum Viable

| Poste | Nombre | Salaire/mois | Total/mois |
|-------|--------|--------------|------------|
| Tech Lead | 1 | 3000€ | 3000€ |
| Dev Senior | 1 | 2000€ | 2000€ |
| Dev Junior | 1 | 1000€ | 1000€ |
| **TOTAL** | **3** | - | **6000€** |

### Équipe Recommandée (Optimale)

| Poste | Nombre | Salaire/mois | Total/mois |
|-------|--------|--------------|------------|
| Tech Lead | 1 | 3500€ | 3500€ |
| Dev Senior | 1 | 2200€ | 2200€ |
| Dev Junior | 2 | 1000€ | 2000€ |
| QA/Testeur | 1 | 800€ | 800€ |
| **TOTAL** | **5** | - | **8500€** |

---

## 8. PLAN D'ACTION DÉTAILLÉ

### Phase 1 : Sécurité (Semaines 1-2) - URGENT

**Responsable** : Tech Lead

| Tâche | Priorité | Durée | Qui |
|-------|----------|-------|-----|
| Corriger injection SQL campaigns.js | 🔴 | 4h | Tech Lead |
| Migrer token vers httpOnly cookies | 🔴 | 8h | Tech Lead |
| Ajouter validation Zod partout | 🔴 | 16h | Tech Lead + Senior |
| Configurer SSL correctement | 🔴 | 2h | Tech Lead |
| Audit sécurité complet | 🔴 | 8h | Tech Lead |
| Supprimer console.log sensibles | 🟡 | 2h | Junior |

**Livrable** : Application sécurisée, sans vulnérabilités connues.

---

### Phase 2 : Tests (Semaines 3-5)

**Responsable** : Tech Lead + Équipe

| Tâche | Priorité | Durée | Qui |
|-------|----------|-------|-----|
| Setup Jest + Vitest | 🔴 | 4h | Tech Lead |
| Tests auth (login, logout, tokens) | 🔴 | 16h | Senior |
| Tests CRUD leads/campaigns | 🔴 | 24h | Senior + Junior |
| Tests multi-tenant isolation | 🔴 | 8h | Tech Lead |
| Tests E2E (Playwright) parcours critiques | 🟡 | 16h | QA/Senior |
| Coverage minimum 50% | 🟡 | 40h | Équipe |

**Livrable** : Suite de tests avec 50%+ coverage, CI/CD configuré.

---

### Phase 3 : Performance (Semaines 6-7)

**Responsable** : Senior + Tech Lead

| Tâche | Priorité | Durée | Qui |
|-------|----------|-------|-----|
| Corriger N+1 emailWorker | 🔴 | 8h | Tech Lead |
| Corriger N+1 followUpWorker | 🔴 | 8h | Tech Lead |
| Ajouter transactions DB | 🟡 | 8h | Senior |
| Implémenter caching Redis | 🟡 | 16h | Senior |
| Virtualisation listes (react-window) | 🟡 | 8h | Senior |
| Remplacer polling par visibilitychange | 🟡 | 4h | Junior |

**Livrable** : API répondant en <200ms, workers optimisés.

---

### Phase 4 : Monitoring & DevOps (Semaine 8)

**Responsable** : Tech Lead

| Tâche | Priorité | Durée | Qui |
|-------|----------|-------|-----|
| Installer Sentry (backend + frontend) | 🔴 | 4h | Tech Lead |
| Configurer alertes erreurs | 🔴 | 2h | Tech Lead |
| Logs structurés (JSON) | 🟡 | 8h | Senior |
| Dashboard métriques | 🟡 | 8h | Senior |
| CI/CD avec tests auto | 🟡 | 8h | Tech Lead |

**Livrable** : Monitoring en place, alertes configurées.

---

### Phase 5 : UX/SEO (Semaines 9-10)

**Responsable** : Senior + Junior

| Tâche | Priorité | Durée | Qui |
|-------|----------|-------|-----|
| Créer images OG (website) | 🟡 | 2h | Junior |
| Ajouter sitemap.xml + robots.txt | 🟡 | 2h | Junior |
| Implémenter Schema.org | 🟡 | 4h | Junior |
| Corriger animation slideDown | 🟢 | 1h | Junior |
| Améliorer accessibilité (ARIA) | 🟡 | 8h | Senior |
| Implémenter WebSocket temps réel | 🟡 | 24h | Senior |

**Livrable** : SEO optimisé, UX améliorée, temps réel.

---

### Phase 6 : Stabilisation (Semaines 11-12)

**Responsable** : Toute l'équipe

| Tâche | Priorité | Durée | Qui |
|-------|----------|-------|-----|
| Tests de charge | 🟡 | 8h | Tech Lead |
| Correction bugs restants | 🟡 | 40h | Équipe |
| Documentation utilisateur | 🟡 | 16h | Junior |
| Formation équipe support | 🟡 | 8h | Tech Lead |
| Revue finale sécurité | 🔴 | 8h | Tech Lead |
| Préparation lancement | 🟡 | 8h | Équipe |

**Livrable** : Application prête pour le grand public.

---

## 9. BUDGET ET TIMELINE ESTIMÉS

### Budget Mensuel (Équipe de 4 personnes)

| Poste | Coût/mois |
|-------|-----------|
| Tech Lead | 3500€ |
| Dev Senior | 2200€ |
| Dev Junior | 1000€ |
| QA/Testeur | 800€ |
| **Salaires** | **7500€** |
| Outils (Sentry, etc.) | 200€ |
| Infrastructure | 150€ |
| **TOTAL** | **7850€/mois** |

### Timeline Globale

```
Semaine 1-2   │████████│ Sécurité (CRITIQUE)
Semaine 3-5   │████████████│ Tests
Semaine 6-7   │████████│ Performance
Semaine 8     │████│ Monitoring
Semaine 9-10  │████████│ UX/SEO
Semaine 11-12 │████████│ Stabilisation
              └────────────────────────────┘
              0    2    4    6    8   10   12 semaines
```

### Budget Total pour Mise en Production

| Phase | Durée | Coût |
|-------|-------|------|
| Phase 1-6 | 12 semaines | 23,550€ |
| Marge imprévus (+20%) | - | 4,710€ |
| **TOTAL** | **3 mois** | **~28,000€** |

### Après Lancement (Maintenance)

| Poste | Coût/mois |
|-------|-----------|
| Équipe réduite (2-3 pers) | 4000-5500€ |
| Infrastructure | 200-500€ |
| Outils | 200€ |
| **TOTAL** | **4400-6200€/mois** |

---

## CONCLUSION

### Ce que vous devez faire maintenant

1. **Recruter un Tech Lead** en priorité (profil le plus important)
2. **Ne PAS lancer** l'application avant correction des failles de sécurité
3. **Prévoir 3 mois** de développement avec l'équipe
4. **Budget** : ~28,000€ pour la mise en production

### Prochaines étapes immédiates

1. ✅ Lire ce rapport en détail
2. 📝 Définir votre budget réel
3. 🔍 Commencer le recrutement du Tech Lead
4. ⏰ Planifier le kick-off de l'équipe
5. 🚫 Bloquer tout accès public à l'application actuelle

---

**Document généré le** : 8 janvier 2026
**Pour** : TrusTech IT Support / LeadSynch
**Par** : Analyse automatisée du codebase
