# Configuration Elastic Email - LeadSynch

## ✅ Configuration Automatique

Le système LeadSynch utilise **automatiquement** l'API Elastic Email pour l'envoi de campagnes email pour **tous les tenants** (incluant Trinexta).

### Étapes de Configuration

#### 1. Obtenir votre clé API Elastic Email

1. Créez un compte sur [Elastic Email](https://elasticemail.com/)
2. Allez dans **Settings** → **API** → **Create API Key**
3. Copiez votre clé API (format: `xxxxx-xxxxx-xxxxx-xxxxx-xxxxx`)

#### 2. Configurer les variables d'environnement

Dans le fichier `.env` du backend:

```bash
# Email Service (OBLIGATOIRE)
ELASTIC_EMAIL_API_KEY=votre-cle-api-elasticemail-ici

# Configuration expéditeur
EMAIL_FROM=noreply@leadsynch.com
EMAIL_REPLY_TO=support@leadsynch.com
```

#### 3. Vérification au démarrage

Le serveur vérifie automatiquement la présence de `ELASTIC_EMAIL_API_KEY` au démarrage:

```
✅ Si configuré:
   📧 Elastic Email: Configuré ✅
   Email expéditeur: noreply@leadsynch.com

❌ Si manquant:
   ❌ ERREUR: ELASTIC_EMAIL_API_KEY manquant
   Le serveur ne démarrera pas
```

## 🚀 Fonctionnement

### Envoi automatique pour tous les tenants

Le système utilise la même clé API Elastic Email pour **tous les tenants**:

- ✅ Tenant Trinexta (Super Admin)
- ✅ Tous les autres tenants

### Fichiers concernés

1. **`services/elasticEmail.js`** - Service d'envoi d'emails
   - Lit `process.env.ELASTIC_EMAIL_API_KEY`
   - Gère l'envoi via API Elastic Email v2

2. **`api/send-campaign-emails.js`** - API d'envoi de campagnes
   - Utilise le service elasticEmail
   - Gère le quota par tenant
   - Tracking des emails (ouvertures, clics)

3. **`server.js`** - Validation au démarrage
   - Vérifie `ELASTIC_EMAIL_API_KEY` est défini
   - Affiche la configuration email

## 📊 Quotas

Les quotas email sont gérés par tenant:

- **Plan GRATUIT**: 30 emails/mois
- **Plan STARTER**: 500 emails/mois
- **Plan PRO**: 2000 emails/mois
- **Plan BUSINESS**: 10000 emails/mois
- **Plan ENTREPRISE**: Illimité
- **Tenant Trinexta (Super Admin)**: Illimité (pas de quota)

## 🔍 Dépannage

### Erreur: "ELASTIC_EMAIL_API_KEY non configurée"

**Cause**: La clé API n'est pas définie dans `.env`

**Solution**:
1. Vérifiez que le fichier `.env` existe dans `app/backend/`
2. Ajoutez `ELASTIC_EMAIL_API_KEY=votre-cle`
3. Redémarrez le serveur

### Erreur: "Elastic Email a rejeté"

**Causes possibles**:
- Clé API invalide ou révoquée
- Email destinataire invalide
- Quota Elastic Email dépassé (vérifier votre compte)
- Domaine expéditeur non vérifié

**Solution**:
1. Vérifiez votre compte Elastic Email
2. Vérifiez les limites de votre plan
3. Vérifiez que le domaine est vérifié (SPF, DKIM)

### Le serveur ne démarre pas

**Cause**: Variable `ELASTIC_EMAIL_API_KEY` manquante

**Solution**: Copiez `.env.example` vers `.env` et configurez toutes les variables

```bash
cp .env.example .env
# Éditez .env et ajoutez vos clés
npm run dev
```

## 🎯 Bonnes Pratiques

1. **Ne jamais commiter** le fichier `.env` avec les clés
2. **Utiliser des domaines vérifiés** dans Elastic Email (SPF, DKIM)
3. **Monitorer les quotas** Elastic Email régulièrement
4. **Tester d'abord** avec le mode test (5 leads) avant envoi en masse
5. **Vérifier les bounces** et nettoyer la base de leads

## 📚 Documentation

- [Elastic Email API v2](https://elasticemail.com/developers/api-documentation/rest-api#)
- [Vérification de domaine](https://elasticemail.com/account#/settings/sending-domains)
- [Statistiques d'envoi](https://elasticemail.com/email-statistics)

## ✅ Test de Configuration

Pour tester que tout fonctionne:

1. Démarrez le backend: `npm run dev`
2. Vérifiez le log: `📧 Elastic Email: Configuré ✅`
3. Créez une campagne avec mode test activé
4. Envoyez à 5 leads maximum
5. Vérifiez les logs pour confirmer l'envoi

---

**Date de création**: 16 novembre 2025
**Dernière mise à jour**: 16 novembre 2025
