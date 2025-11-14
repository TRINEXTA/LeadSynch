# 🔴 URGENT : Sécuriser la clé Google Maps API

## ⚠️ PROBLÈME

La clé Google Maps API était **exposée en clair** dans le code source :
- **Fichier** : `app/backend/api/generate-leads.js` (ligne 8)
- **Clé exposée** : `AIzaSyCbNyMZXznzh-tHNxI3akt6RcrERH3pYFg`

**Risques** :
- ✅ Factures Google Maps excessives (jusqu'à plusieurs milliers d'euros)
- ✅ Quota épuisé par des tiers malveillants
- ✅ Clé visible dans l'historique Git

## ✅ CORRECTION APPLIQUÉE

Le code a été corrigé pour utiliser une variable d'environnement :
```javascript
// ✅ SÉCURISÉ
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Vérification fail-fast
if (!GOOGLE_API_KEY) {
  throw new Error('❌ GOOGLE_MAPS_API_KEY non configurée');
}
```

---

## 🚨 ACTIONS À FAIRE IMMÉDIATEMENT

### Étape 1 : Révoquer l'ancienne clé

1. **Aller sur Google Cloud Console**
   - URL : https://console.cloud.google.com/apis/credentials
   - Se connecter avec le compte qui a créé la clé

2. **Identifier la clé exposée**
   - Chercher la clé : `AIzaSyCbNyMZXznzh-tHNxI3akt6RcrERH3pYFg`
   - Cliquer sur le nom de la clé

3. **Révoquer la clé**
   - Cliquer sur "Supprimer" ou "Désactiver"
   - Confirmer la suppression

   **⚠️ IMPORTANT** : Cette action cassera temporairement la génération de leads jusqu'à ce que vous configuriez la nouvelle clé (Étape 2).

### Étape 2 : Créer une nouvelle clé sécurisée

1. **Créer une nouvelle clé API**
   - Cliquer sur "Créer des identifiants" → "Clé API"
   - Copier la nouvelle clé générée

2. **Ajouter des restrictions (OBLIGATOIRE)**

   **Option A : Restriction par adresse IP** (recommandé pour serveurs)
   - Cliquer sur "Modifier" sur la nouvelle clé
   - Section "Restrictions d'application"
   - Sélectionner "Adresses IP"
   - Ajouter l'IP de votre serveur Vercel/Render
   - **Exemple** : `52.71.123.45` (remplacer par votre IP réelle)

   **Option B : Restriction par domaine** (si hébergé sur domaine fixe)
   - Sélectionner "Référents HTTP"
   - Ajouter : `app.leadsynch.com/*`, `leadsynch-api.onrender.com/*`

3. **Limiter les APIs autorisées**
   - Section "Restrictions d'API"
   - Sélectionner "Restreindre la clé"
   - Cocher uniquement :
     - ✅ Places API
     - ✅ Geocoding API
     - ✅ Maps JavaScript API (si utilisé)

4. **Enregistrer**

### Étape 3 : Configurer la nouvelle clé

#### En développement local :

1. Créer le fichier `.env` dans `app/backend/` :
```bash
cd app/backend
cp .env.example .env
nano .env  # ou vim, code, etc.
```

2. Ajouter la nouvelle clé :
```bash
GOOGLE_MAPS_API_KEY=AIzaXXXXXXXXXXXXXXXXXXXXXXXX  # Votre nouvelle clé
```

3. Tester localement :
```bash
npm run dev
# Tester la génération de leads
```

#### En production (Vercel) :

1. **Aller sur le dashboard Vercel**
   - URL : https://vercel.com/dashboard
   - Sélectionner le projet `leadsynch-backend`

2. **Ajouter la variable d'environnement**
   - Onglet "Settings" → "Environment Variables"
   - Cliquer "Add"
   - Name : `GOOGLE_MAPS_API_KEY`
   - Value : `AIzaXXXXXXXXXXXXXXXXXXXXXXXX` (votre nouvelle clé)
   - Environment : Production, Preview, Development (cocher les 3)
   - Cliquer "Save"

3. **Redéployer**
   - Onglet "Deployments"
   - Cliquer "Redeploy" sur le dernier déploiement

#### En production (Render) :

1. **Aller sur le dashboard Render**
   - URL : https://dashboard.render.com
   - Sélectionner le service backend

2. **Ajouter la variable d'environnement**
   - Section "Environment" → "Environment Variables"
   - Cliquer "Add Environment Variable"
   - Key : `GOOGLE_MAPS_API_KEY`
   - Value : `AIzaXXXXXXXXXXXXXXXXXXXXXXXX`
   - Cliquer "Save Changes"

3. **Redéployer automatiquement** (se fait tout seul)

### Étape 4 : Vérifier que ça fonctionne

1. **Tester l'endpoint de génération de leads** :
```bash
curl -X POST https://leadsynch-api.onrender.com/api/generate-leads \
  -H "Authorization: Bearer <votre-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "sector": "juridique",
    "city": "Paris",
    "quantity": 5
  }'
```

2. **Vérifier les logs** :
   - Si erreur : `❌ GOOGLE_MAPS_API_KEY non configurée`
     → La variable n'est pas définie
   - Si succès : `✅ X leads trouvés`
     → Tout fonctionne !

---

## 📊 SUIVI DES COÛTS

Pour éviter les mauvaises surprises :

1. **Activer les alertes de facturation**
   - Google Cloud Console → "Facturation"
   - "Alertes de budget"
   - Créer une alerte à 50€, 100€, 200€

2. **Définir un quota maximal**
   - Google Cloud Console → "Quotas"
   - Limiter à 1000 requêtes/jour (ajustable selon besoin)

---

## ✅ CHECKLIST FINALE

- [ ] Ancienne clé révoquée dans Google Cloud Console
- [ ] Nouvelle clé créée avec restrictions IP/domaine
- [ ] APIs limitées (Places API, Geocoding API uniquement)
- [ ] Variable `GOOGLE_MAPS_API_KEY` configurée en local (.env)
- [ ] Variable configurée en production (Vercel/Render)
- [ ] Application redéployée
- [ ] Endpoint testé et fonctionnel
- [ ] Alertes de facturation configurées
- [ ] Quotas configurés (optionnel mais recommandé)

---

## 🔒 BONNE PRATIQUE

**Ne JAMAIS commiter la clé API dans Git** :
```bash
# Vérifier que .env est bien dans .gitignore
cat .gitignore | grep .env

# Si absent, ajouter :
echo ".env" >> .gitignore
```

---

**Ce fichier peut être supprimé une fois toutes les actions effectuées.**
