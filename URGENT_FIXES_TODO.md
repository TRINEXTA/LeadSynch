# 🚨 CORRECTIONS URGENTES - LeadSynch

**Date:** 16 novembre 2025  
**Session:** claude/analyze-leadsynch-project-013PQM7xJRW9hKUokNCjqGNq

---

## ✅ COMPLÉTÉ (1/12)

### 1. ✅ Asefi Chatbot Fonctionnel
- **Status:** COMPLÉTÉ ✅
- **Commit:** `4e43f57`
- **Fichiers:** `ChatbotAsefi.jsx`, `DashboardUniversel.jsx`
- **Fix:**
  - Modal chatbot au lieu de navigation /chatbot
  - Support reconnaissance vocale (bouton micro)
  - Quick replies pour démarrage rapide
  - Intégration dashboard
- **Résultat:** Clic fonctionne, chatbot s'ouvre, micro activé

---

## 🔥 EN COURS (1/12)

### 2. 🔄 Dashboard - TOUTES Campagnes avec Détails Complets
- **Status:** EN COURS 🔄
- **Problème actuel:**
  - Affiche seulement "campagne test" (top 5 actives)
  - Manque "campagne à froid" en pause
  - Détails incomplets (pas de breakdown par statut)

- **Requis:**
  - Afficher TOUTES campagnes (actives + pausées)
  - Pour chaque campagne:
    - Leads totaux
    - Contactés
    - Statut commercial (one call, no answer, qualified, stopped)
    - Exemple: "7 leads, 6 contactés, 1 one call, 4 sans réponse, 1 qualifié, 1 arrêt"

- **Solution:**
  1. Retirer filtre `.filter(c => c.status === 'active')` 
  2. Retirer limite `.slice(0, 5)`
  3. Créer endpoint API `/api/campaigns/:id/detailed-stats`
  4. Afficher toutes campagnes avec stats complètes

---

## 🔴 PRIORITÉ HAUTE (4/12)

### 3. Pipeline - Boutons Aide + Validation
- **Fichier:** `app/frontend/src/pages/Pipeline.jsx`
- **Requis:**
  - Bouton "Demande d'aide" sur chaque lead
  - Bouton "Demande de validation" sur chaque lead
  - Modal workflow approbation manager
  - Notification au manager

- **Backend requis:**
  - POST `/api/help-requests` - Créer demande aide
  - POST `/api/validations` - Créer demande validation
  - GET `/api/validations` - Liste pour manager
  - POST `/api/validations/:id/approve` - Approuver
  - POST `/api/validations/:id/reject` - Refuser

### 4. Dashboard Manager Accessible
- **Fichier:** `app/frontend/src/pages/DashboardManager.jsx`
- **Problème:** Utilisateur ne le voit pas
- **Vérifications:**
  - Route `/dashboard-manager` existe ✅
  - Sidebar link pour rôle manager ✅
  - Permissions check ✅
  - **À vérifier:** User a-t-il role='manager' ?

### 5. Bases de Données - Vue Globale
- **Page:** Bases de Données
- **Requis:**
  - Nombre total bases de données
  - Nombre secteurs actifs
  - Leads par base
  - Vue d'ensemble complète

### 6. Secteurs Géographiques - Filtrage Automatique
- **Requis:**
  - Leads assignés automatiquement par code postal
  - Ex: Lead à Paris 17e → Secteur "Paris Nord"
  - Commercial Paris Nord voit seulement ses leads
  - Manager département voit toute sa zone

---

## 🟡 PRIORITÉ MOYENNE (4/12)

### 7. Templates Emails - 15-20 Modèles Pré-faits
- **Requis:**
  - Relance client
  - Envoi facture
  - Confirmation RDV
  - Remerciement
  - Offre promotionnelle
  - Etc.
- **Action:** Créer migration SQL avec templates

### 8. Config Email - Fix Elastic
- **Problème:** Champs disparus, demande clé alors que dans .env
- **Requis:**
  - Utiliser `ELASTIC_EMAIL_API_KEY` depuis .env
  - Ne pas demander clé pour tenant Trinexta
  - Garder option custom pour autres tenants

### 9. Page Statistiques - Fix Couleurs/Données
- **Fichier:** `app/frontend/src/pages/Statistics.jsx`
- **Problèmes:**
  - Couleurs non respectées
  - Données manquantes/invisibles
  - Graphiques cassés

### 10. API Temps Réel H24
- **Requis:**
  - Polling auto toutes les 30s
  - Rafraîchissement données dashboard
  - WebSocket pour notifications
  - Monitoring performances campagnes

---

## 🟢 PRIORITÉ BASSE (2/12)

### 11. Zone de Test - Fix 404
- **Fichier:** `app/frontend/src/pages/TestZone.jsx`
- **Problème:** Tous tests retournent 404
- **Tests concernés:**
  - Test connexion DB
  - Config email
  - Appli externe
  - Système campagne
  - Tracking email
  - Webhooks

### 12. Formation - Système par Rôle
- **Fichier:** `app/frontend/src/pages/Formation.jsx`
- **Requis:**
  - Contenu différent par rôle (commercial/manager/admin)
  - Mini-vidéos explicatives
  - Session obligatoire au premier login
  - Pop-up "Souhaitez-vous être formé ?"
  - Schémas clairs

---

## 📊 PROGRESSION

| Catégorie | Complété | En cours | Pending |
|-----------|----------|----------|---------|
| Critique | 1 | 1 | 4 |
| Moyenne | 0 | 0 | 4 |
| Basse | 0 | 0 | 2 |
| **TOTAL** | **1/12** | **1/12** | **10/12** |

---

## 🎯 ORDRE RECOMMANDÉ

1. ✅ Asefi (FAIT)
2. 🔄 Dashboard campagnes complètes (EN COURS)
3. 🔴 Boutons Pipeline aide/validation
4. 🔴 Dashboard Manager visible
5. 🔴 Bases de données vue globale
6. 🔴 Secteurs filtrage auto
7. 🟡 Templates emails
8. 🟡 Config email Elastic
9. 🟡 Stats page fix
10. 🟡 API temps réel
11. 🟢 Zone test 404
12. 🟢 Formation rôles

---

## 📝 NOTES IMPORTANTES

- Rate limiter fixé (50 tentatives en dev) ✅
- Migration secteurs géo prête mais **PAS APPLIQUÉE sur Neon** ⚠️
- Toutes les routes existent côté frontend ✅
- Backend endpoints manquants pour validations ❌

---

**Pour appliquer migration secteurs sur Neon:**
1. https://console.neon.tech
2. SQL Editor
3. Copier `app/backend/migrations/create_geographic_sectors.sql`
4. Run

