# 🧪 Guide de Test - Nouvelles Fonctionnalités LeadSynch

**Date:** 16 novembre 2025
**Branche:** `claude/leadsynch-security-phase-1-01Ybn5vkuaoRNVbyutBeyu81`
**Fonctionnalités à tester:** 6 majeures

---

## 📋 Checklist Générale

### ✅ Pré-requis
- [ ] Base de données Neon accessible
- [ ] Variables d'environnement configurées (`.env`)
- [ ] Node modules installés (backend + frontend)
- [ ] Migrations SQL exécutées

### 🔧 Démarrage Environnement

```powershell
# Terminal 1 - Backend (Port 3000)
cd app/backend
npm install
npm run dev

# Terminal 2 - Frontend (Port 5173)
cd app/frontend
npm install
npm run dev

# Terminal 3 - Migrations SQL (si nécessaire)
# Remplacer $POSTGRES_URL par votre connexion string
psql $POSTGRES_URL < app/backend/migrations/create_manager_requests_table.sql
psql $POSTGRES_URL < app/backend/migrations/add_do_not_contact_fields.sql
psql $POSTGRES_URL < app/backend/migrations/insert_default_email_templates.sql
```

---

## 🎯 Tests Fonctionnalités

### 1. Boutons Actions Manager ⭐⭐⭐

**Fichiers concernés:**
- `app/frontend/src/components/pipeline/ManagerRequestModal.jsx`
- `app/frontend/src/components/pipeline/LeadCard.jsx`
- `app/frontend/src/pages/Pipeline.jsx`
- `app/backend/api/manager-requests.js`

**Étapes de test:**

#### Test 1.1: Bouton "Demande Aide Manager"
1. [ ] Ouvrir http://localhost:5173
2. [ ] Se connecter avec un utilisateur valide
3. [ ] Aller sur page Pipeline
4. [ ] Cliquer sur un lead card
5. [ ] Vérifier présence du bouton orange "Aide" (rangée 2, colonne 1)
6. [ ] Cliquer sur "Aide"
7. [ ] **Résultat attendu:**
   - Modal "Demande d'aide Manager" s'ouvre
   - Icône AlertCircle visible
   - Couleur orange (bg-orange-500)
   - 3 niveaux d'urgence (faible/normal/urgent)
   - Champ message obligatoire

#### Test 1.2: Bouton "Demande Validation"
1. [ ] Sur même lead, cliquer bouton bleu "Valid." (rangée 2, colonne 2)
2. [ ] **Résultat attendu:**
   - Modal "Demande de Validation" s'ouvre
   - Icône UserCheck visible
   - Couleur bleue (bg-blue-500)
   - Même structure que Test 1.1

#### Test 1.3: Bouton "Prospect Prioritaire"
1. [ ] Cliquer bouton violet "Prior." (rangée 2, colonne 3)
2. [ ] **Résultat attendu:**
   - Modal "Prospect Prioritaire" s'ouvre
   - Icône Star visible
   - Couleur violette (bg-purple-500)

#### Test 1.4: Envoi Demande Manager
1. [ ] Remplir modal avec:
   - Message: "Besoin d'aide pour négocier ce prospect"
   - Urgence: "Urgent" (🔴)
2. [ ] Cliquer "Envoyer au Manager"
3. [ ] **Résultat attendu:**
   - Alert "✅ Demande envoyée au manager !"
   - Modal se ferme
   - Pas d'erreur console

#### Test 1.5: Vérification Backend
```powershell
# Dans psql
SELECT * FROM manager_requests ORDER BY created_at DESC LIMIT 5;
```
4. [ ] **Résultat attendu:**
   - 1 ligne créée
   - `request_type` = 'help' | 'validation' | 'show'
   - `urgency` = 'low' | 'normal' | 'urgent'
   - `status` = 'pending'
   - `tenant_id` correspond au tenant connecté

---

### 2. Système "Ne pas contacter" 🚫🚫🚫

**Fichiers concernés:**
- `app/frontend/src/components/pipeline/DoNotContactModal.jsx`
- `app/backend/api/do-not-contact.js`
- `app/backend/migrations/add_do_not_contact_fields.sql`

**Étapes de test:**

#### Test 2.1: Accès au bouton
1. [ ] Sur un lead card, cliquer sur icône "⋮" (MoreVertical)
2. [ ] Défiler le menu dropdown
3. [ ] **Résultat attendu:**
   - Séparateur visible (border-t)
   - Bouton rouge "Ne pas contacter" avec icône Ban
   - Hover change background en rouge clair

#### Test 2.2: Modal "Ne pas contacter"
1. [ ] Cliquer "Ne pas contacter"
2. [ ] **Résultat attendu:**
   - Modal rouge (bg-red-600) s'ouvre
   - Warning orange visible "⚠️ Action importante"
   - Infos lead affichées (entreprise, contact, email, téléphone)
   - 4 raisons visibles:
     - 📱 Pas de téléphone disponible (gris)
     - 🖱️ Après clic - Pas intéressé (bleu)
     - 📞 Appelé - Ne souhaite plus être contacté (rouge)
     - 📝 Autre raison (orange)

#### Test 2.3: Qualification "Pas de téléphone"
1. [ ] Sélectionner "Pas de téléphone disponible"
2. [ ] **Résultat attendu:**
   - Bouton devient border-red-400 bg-red-50
   - Badge "Sélectionné" apparaît
3. [ ] Ajouter note: "Aucun numéro trouvé sur le site"
4. [ ] Cliquer "Marquer 'Ne pas contacter'"
5. [ ] **Résultat attendu:**
   - Alert "✅ Lead marqué comme 'ne pas contacter'"
   - Modal se ferme

#### Test 2.4: Vérification Backend
```powershell
# Dans psql
SELECT id, company_name, do_not_contact, do_not_contact_reason, do_not_contact_note
FROM leads
WHERE do_not_contact = true
ORDER BY do_not_contact_since DESC
LIMIT 5;
```
4. [ ] **Résultat attendu:**
   - `do_not_contact` = true
   - `do_not_contact_reason` = 'no_phone'
   - `do_not_contact_note` contient la note
   - `do_not_contact_since` = timestamp actuel
   - `do_not_contact_by` = user_id connecté

#### Test 2.5: Test autres raisons
5. [ ] Répéter Test 2.2-2.4 avec:
   - [ ] "Après clic - Pas intéressé" → reason = 'after_click_no_interest'
   - [ ] "Appelé - Ne souhaite plus" → reason = 'called_no_interest'
   - [ ] "Autre raison" → reason = 'other'

---

### 3. Templates Emails Prêts 📧📧📧

**Fichiers concernés:**
- `app/backend/migrations/insert_default_email_templates.sql`

**Étapes de test:**

#### Test 3.1: Exécution Migration
```powershell
psql $POSTGRES_URL < app/backend/migrations/insert_default_email_templates.sql
```
1. [ ] **Résultat attendu:**
   - Message "✅ 15 templates email professionnels créés pour tous les tenants"
   - Pas d'erreur SQL

#### Test 3.2: Vérification Templates
```sql
SELECT id, name, subject, template_type, is_active
FROM email_templates
ORDER BY name;
```
2. [ ] **Résultat attendu:** 15 templates visibles:
   - [ ] 1. Premier Contact - Introduction
   - [ ] 2. Cold Email B2B - Direct
   - [ ] 3. Relance - Après Silence
   - [ ] 4. Proposition Commerciale
   - [ ] 5. Remerciement Après Rendez-vous
   - [ ] 6. Offre Limitée - Urgence
   - [ ] 7. Newsletter Mensuelle
   - [ ] 8. Demande de Témoignage
   - [ ] 9. Réactivation Client Inactif
   - [ ] 10. Invitation Événement
   - [ ] 11. Annonce Nouveau Produit
   - [ ] 12. Confirmation Rendez-vous
   - [ ] 13. Suivi Après Devis
   - [ ] 14. Onboarding Nouveau Client
   - [ ] 15. Anniversaire Client - Fidélisation

#### Test 3.3: Contenu Template
```sql
SELECT html_body FROM email_templates WHERE name = '1. Premier Contact - Introduction';
```
3. [ ] **Résultat attendu:**
   - HTML contient `{{company_name}}`, `{{contact_name}}`, etc.
   - Balises HTML valides (<div>, <p>, <strong>)
   - Style inline présent

#### Test 3.4: Interface Frontend
1. [ ] Aller sur page Campaigns ou Email Templates
2. [ ] **Résultat attendu:**
   - 15 templates listés
   - Possibilité de sélectionner un template
   - Aperçu du contenu HTML

---

### 4. Données Trinexta Complètes 📊📊📊

**Fichiers concernés:**
- `app/backend/data/trinexta_offers.json`
- `app/frontend/src/data/trinexta_offers.json`

**Étapes de test:**

#### Test 4.1: Vérification Fichier JSON
```powershell
# Backend
cat app/backend/data/trinexta_offers.json | ConvertFrom-Json | ConvertTo-Json -Depth 10

# Frontend
cat app/frontend/src/data/trinexta_offers.json | ConvertFrom-Json | ConvertTo-Json -Depth 10
```
1. [ ] **Résultat attendu:**
   - JSON valide (pas d'erreur parsing)
   - 3 offres: essentielle, serenite, impulsion
   - Chaque offre contient: pricing, engagement, features, options

#### Test 4.2: Structure Offre Essentielle
```json
{
  "id": "essentielle",
  "pricing": {
    "monthly": 149,
    "annual": 1490
  },
  "engagement": {
    "type": "sans_engagement",
    "minimum_duration": 1
  },
  "features": [...],
  "options": [...]
}
```
2. [ ] **Résultat attendu:** Structure complète présente

#### Test 4.3: Structure Offre Sérénité
3. [ ] Vérifier:
   - [ ] pricing.monthly = 299
   - [ ] pricing.setup_fee = 150
   - [ ] engagement.type = "12_mois"
   - [ ] features contient "Téléphonie Incluse"
   - [ ] options contient "ligne_sip"

#### Test 4.4: Structure Offre Impulsion
4. [ ] Vérifier:
   - [ ] pricing.monthly = 599
   - [ ] pricing.setup_fee = 500
   - [ ] engagement.type = "24_mois"
   - [ ] sla.availability = "99.9%"
   - [ ] options contient "developpement_specifique"

---

### 5. Amélioration Contrats Trinexta 📄📄📄

**Fichiers concernés:**
- `app/frontend/src/components/pipeline/QuickContractModal.jsx`

**Étapes de test:**

#### Test 5.1: Ouverture Modal Contrat
1. [ ] Sur Pipeline, cliquer bouton "Contrat" d'un lead
2. [ ] **Résultat attendu:**
   - Modal s'ouvre avec header orange/rouge
   - Titre "Créer un contrat"
   - Nom entreprise affiché sous le titre

#### Test 5.2: Sélection Offre Essentielle
1. [ ] Cliquer sur carte "Offre Essentielle"
2. [ ] **Résultat attendu:**
   - Carte devient border-orange-500 bg-orange-50
   - Prix affiché: "Dès 119€ HT/mois"
   - Services listés (4 premiers visible)
   - Lien "+2 autres services" si >4

#### Test 5.3: Import Données JSON
1. [ ] Ouvrir console développeur (F12)
2. [ ] Taper: `console.log(trinextaOffersData)`
3. [ ] **Résultat attendu:**
   - Objet JSON chargé
   - Propriété `offers` avec 3 éléments
   - Pas d'erreur 404 ou module not found

#### Test 5.4: Calcul Prix avec Engagement
1. [ ] Sélectionner "Offre Essentielle"
2. [ ] Choisir "Avec engagement 12 mois"
3. [ ] Choisir "Paiement annuel" (💰 Meilleur tarif)
4. [ ] **Résultat attendu:**
   - Prix mensuel calculé = 119€ (1490/12)
   - Récapitulatif affiche "119 € HT/mois"

#### Test 5.5: États selectedOptions et customCGV
1. [ ] Ouvrir React DevTools
2. [ ] Inspecter composant QuickContractModal
3. [ ] **Résultat attendu:**
   - État `selectedOptions` existe (array vide par défaut)
   - État `customCGV` existe (string vide par défaut)

---

### 6. Sécurité - Corrections Appliquées 🔒🔒🔒

**Fichiers concernés:**
- `app/backend/lib/sanitizer.js`
- `app/backend/api/export.js`
- `app/backend/api/serve-file.js`
- `app/backend/server.js`

**Tests de sécurité:**

#### Test 6.1: HTML Sanitization
```powershell
# Test API création template avec XSS
curl -X POST http://localhost:3000/api/email-templates \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test XSS",
    "subject": "Test",
    "html_body": "<script>alert(\"XSS\")</script><p>Contenu sain</p>"
  }'
```
1. [ ] **Résultat attendu:**
   - Template créé sans erreur
   - Script tag supprimé
   - Balise `<p>` conservée
   - Vérifier en BDD: `SELECT html_body FROM email_templates WHERE name = 'Test XSS'`
   - HTML ne contient PAS `<script>`

#### Test 6.2: CSV Formula Injection Prevention
```sql
-- Créer un lead avec formule Excel malicieuse
INSERT INTO leads (tenant_id, company_name, email)
VALUES ('...', '=2+2', 'test@test.com');
```
```powershell
# Exporter en CSV
curl http://localhost:3000/api/export/leads/csv \
  -H "Authorization: Bearer $TOKEN" \
  -o test.csv
```
2. [ ] Ouvrir `test.csv` dans un éditeur texte
3. [ ] **Résultat attendu:**
   - Valeur affichée: `"'=2+2"` (avec quote prefix)
   - Excel n'exécutera PAS la formule

#### Test 6.3: Protection /uploads (Serve File)
```powershell
# Essayer d'accéder à un fichier directement
curl http://localhost:3000/uploads/images/test.jpg
```
1. [ ] **Résultat attendu:** 404 ou 403 (route désactivée)

```powershell
# Essayer via endpoint protégé SANS token
curl http://localhost:3000/api/serve-file/images/test.jpg
```
2. [ ] **Résultat attendu:** 401 Unauthorized

```powershell
# Avec token valide
curl http://localhost:3000/api/serve-file/images/test.jpg \
  -H "Authorization: Bearer $TOKEN"
```
3. [ ] **Résultat attendu:** 200 OK + fichier (si appartient au tenant)

#### Test 6.4: Helmet.js Headers
```powershell
curl -I http://localhost:3000/api/health
```
4. [ ] **Résultat attendu:** Headers présents:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: SAMEORIGIN`
   - `X-XSS-Protection: 1; mode=block`
   - `Strict-Transport-Security: max-age=31536000`

#### Test 6.5: Rate Limiting
```powershell
# Envoyer 10 requêtes rapides
for ($i=1; $i -le 10; $i++) {
  curl http://localhost:3000/api/leads
}
```
5. [ ] **Résultat attendu:**
   - Requêtes 1-100: 200 OK (si authentifié)
   - Requête 101: 429 Too Many Requests
   - Message: "Trop de requêtes depuis cette IP"

---

## 🐛 Bugs Connus à Vérifier

### Bug Potentiel 1: Import JSON Frontend
**Symptôme:** Erreur module not found pour `trinexta_offers.json`
**Fix:** Vérifier que le fichier existe dans `/app/frontend/src/data/`

### Bug Potentiel 2: Migration déjà exécutée
**Symptôme:** Erreur "table already exists" ou "duplicate key"
**Fix:** Migrations sont idempotentes (CREATE IF NOT EXISTS, INSERT avec checks)

### Bug Potentiel 3: Tenant_id null
**Symptôme:** Erreur lors de création demande manager ou qualification
**Fix:** Vérifier que `req.user.tenant_id` est défini après authentification

---

## 📊 Résultats Attendus - Checklist Finale

### Base de Données
- [ ] Table `manager_requests` créée avec 8 index
- [ ] Table `leads` a 10 nouvelles colonnes (do_not_contact_*)
- [ ] 15 templates dans `email_templates` pour chaque tenant
- [ ] Pas d'erreur de foreign key ou constraint

### Frontend
- [ ] 8 boutons sur LeadCard (4 actions + 4 manager/histo)
- [ ] 3 modals fonctionnent (ManagerRequest, DoNotContact, QuickContract)
- [ ] Données JSON Trinexta chargées correctement
- [ ] Pas d'erreur console JavaScript

### Backend
- [ ] 2 nouvelles routes API fonctionnelles
- [ ] Sanitization HTML active
- [ ] Rate limiting actif (testable)
- [ ] Helmet headers présents

### Sécurité
- [ ] XSS bloqué (scripts supprimés)
- [ ] CSV injection prévenue (formules quotées)
- [ ] Fichiers protégés (auth requise)
- [ ] Rate limiting fonctionnel

---

## 🚀 Déploiement Production

Une fois tous les tests passés:

```powershell
# 1. Merger la branche
git checkout main
git merge claude/leadsynch-security-phase-1-01Ybn5vkuaoRNVbyutBeyu81

# 2. Exécuter migrations en production
psql $PRODUCTION_DB_URL < app/backend/migrations/create_manager_requests_table.sql
psql $PRODUCTION_DB_URL < app/backend/migrations/add_do_not_contact_fields.sql
psql $PRODUCTION_DB_URL < app/backend/migrations/insert_default_email_templates.sql

# 3. Déployer backend (Render)
cd app/backend
git push render main

# 4. Déployer frontend (Vercel)
cd app/frontend
vercel --prod
```

---

## 📞 Support

**En cas de problème:**
1. Vérifier les logs backend: `npm run dev` (terminal 1)
2. Vérifier console frontend: F12 > Console
3. Vérifier logs base de données: `\l` dans psql
4. Revenir au commit précédent: `git checkout <commit-hash>`

**Fichiers de configuration critiques:**
- `app/backend/.env` (variables d'environnement)
- `app/frontend/.env` (VITE_API_URL)
- `app/backend/server.js` (routes et middleware)

---

**✅ Bon test!**
