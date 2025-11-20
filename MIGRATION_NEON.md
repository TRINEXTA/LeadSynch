# 🚀 Migration Base de Données Neon - LeadSynch

Guide complet pour exécuter les migrations sur **Neon** (sans terminal PostgreSQL).

---

## 📋 Prérequis

✅ Neon Database configurée
✅ Variable `POSTGRES_URL` dans `.env`
✅ Node.js installé

---

## 🔧 Méthode 1 : Script Node.js (RECOMMANDÉ)

### Étape 1 : Exécuter les migrations

```powershell
cd app/backend
npm run migrate
```

**Ce script va** :
1. Se connecter à Neon via SSL
2. Exécuter `create_tenant_business_config.sql` (Partie 1)
3. Exécuter `create_super_admin_system.sql` (Partie 2)
4. Créer toutes les tables et plans par défaut

**Output attendu** :
```
🚀 Démarrage des migrations Neon
=====================================

🔄 Exécution de la migration: create_tenant_business_config.sql
✅ Connecté à Neon
📝 Exécution du SQL...
✅ Migration create_tenant_business_config.sql exécutée avec succès !

🔄 Exécution de la migration: create_super_admin_system.sql
✅ Connecté à Neon
📝 Exécution du SQL...
✅ Migration create_super_admin_system.sql exécutée avec succès !

=====================================
✅ Toutes les migrations sont terminées !
=====================================
```

---

### Étape 2 : Activer votre compte Super-Admin

```powershell
cd app/backend
node activate-super-admin.js admin@trinexta.fr
```

**Remplacez** `admin@trinexta.fr` par votre email TRINEXTA.

**Emails autorisés** :
- `admin@trinexta.fr`
- `direction@trinexta.fr`
- `dev@trinexta.fr`
- `support@trinexta.fr`

**Output attendu** :
```
✅ Connecté à Neon
========================================
✅ Super-Admin activé avec succès !
========================================
👤 Utilisateur: Votre Prénom Nom
📧 Email: admin@trinexta.fr
🔑 Permissions: * (toutes)
========================================

🚀 Vous pouvez maintenant vous connecter et accéder à:
   👉 /super-admin (Dashboard)
   👉 /super-admin/tenants (Gestion clients)
```

---

## 🌐 Méthode 2 : Interface Web Neon (Alternative)

Si vous préférez utiliser l'interface web Neon :

### 1. Ouvrir Neon Console
- Aller sur https://console.neon.tech
- Sélectionner votre projet LeadSynch
- Aller dans **SQL Editor**

### 2. Copier-Coller le SQL

**Migration 1** : Copier tout le contenu de `app/backend/migrations/create_tenant_business_config.sql`
→ Coller dans SQL Editor
→ Cliquer "Run"

**Migration 2** : Copier tout le contenu de `app/backend/migrations/create_super_admin_system.sql`
→ Coller dans SQL Editor
→ Cliquer "Run"

### 3. Activer Super-Admin manuellement

Dans SQL Editor, exécuter :

```sql
UPDATE users
SET is_super_admin = true,
    super_admin_permissions = '["*"]'::jsonb,
    updated_at = NOW()
WHERE email = 'admin@trinexta.fr';
```

---

## ✅ Vérification

### Vérifier que les tables sont créées

```sql
-- Vérifier les nouvelles tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'subscription_plans',
    'tenant_subscriptions',
    'invoices',
    'payments',
    'super_admin_activity_log',
    'tenant_products',
    'tenant_legal_documents',
    'tenant_payment_links'
  )
ORDER BY table_name;
```

**Résultat attendu** : 8 tables

### Vérifier les plans d'abonnement

```sql
SELECT name, slug, price_monthly, price_yearly
FROM subscription_plans
ORDER BY sort_order;
```

**Résultat attendu** : 5 plans (Trial, Starter, Pro, Enterprise, Custom)

### Vérifier votre super-admin

```sql
SELECT email, is_super_admin, super_admin_permissions
FROM users
WHERE is_super_admin = true;
```

**Résultat attendu** : Votre compte avec `is_super_admin = true`

---

## 🎯 Utilisation

### 1. Se connecter
- Ouvrir LeadSynch : https://app.leadsynch.com (ou localhost:5173)
- Login avec votre email TRINEXTA
- Mot de passe habituel

### 2. Accéder au Super-Admin
- Dans la sidebar, vous verrez une nouvelle section : **👑 SUPER-ADMIN TRINEXTA**
- Cliquer sur "Dashboard Super-Admin"

### 3. Créer un client
1. Aller dans "Gestion Clients"
2. Cliquer "Nouveau Client"
3. Remplir les infos
4. Le système crée automatiquement :
   - Le tenant
   - L'admin user
   - L'abonnement trial 30 jours gratuit

---

## 🚨 Problèmes Courants

### Erreur : "Cannot connect to database"
→ Vérifier que `POSTGRES_URL` est correct dans `.env`
→ Vérifier que Neon est en ligne sur https://console.neon.tech

### Erreur : "relation already exists"
→ Les tables existent déjà, migrations déjà exécutées
→ Pas besoin de refaire

### Erreur : "Email not in whitelist"
→ Ajouter votre email dans `activate-super-admin.js` ligne 12

### Super-Admin ne s'affiche pas dans sidebar
→ Vérifier que `is_super_admin = true` dans la DB
→ Se déconnecter et reconnecter

---

## 📞 Support

Si problème, vérifier dans cet ordre :

1. ✅ Variable `POSTGRES_URL` correcte ?
2. ✅ Neon database en ligne ?
3. ✅ Migrations exécutées sans erreur ?
4. ✅ Super-admin activé ?
5. ✅ Cache navigateur vidé ?

---

**Fait avec ❤️ pour TRINEXTA**
