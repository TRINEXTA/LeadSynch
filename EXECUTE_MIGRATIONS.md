# 🔧 Guide d'exécution des migrations SQL

## ⚠️ IMPORTANT - À EXÉCUTER IMMÉDIATEMENT

Votre base de données PostgreSQL **ne contient pas** les tables nécessaires pour plusieurs fonctionnalités de LeadSynch.
Cela cause les erreurs suivantes :

- ❌ Pages blanches dans l'application
- ❌ Erreur `relation "credit_purchases" does not exist`
- ❌ Erreur `relation "services" does not exist`
- ❌ Erreur `relation "subscription_history" does not exist`
- ❌ Erreur `column cu.lead_id does not exist`

## 📋 Tables qui seront créées

Le script `00_COMPLETE_SETUP.sql` va créer les tables suivantes :

### Système de crédits leads
- `lead_credits` - Crédits disponibles par tenant
- `credit_purchases` - Historique des achats de crédits
- `credit_usage` - Historique de consommation des crédits

### Services et abonnements
- `services` - Catalogue des services proposés
- `subscriptions` - Abonnements clients
- `subscription_invoices` - Factures des abonnements
- `subscription_history` - Historique des modifications

### Facturation Stripe
- `invoices` - Factures Stripe
- `billing_info` - Informations de facturation des tenants

## 🚀 Comment exécuter les migrations

### Option 1 : Via Neon Console (RECOMMANDÉ)

1. Connectez-vous à votre console Neon : https://console.neon.tech
2. Sélectionnez votre projet LeadSynch
3. Allez dans l'onglet **SQL Editor**
4. Copiez le contenu complet du fichier `/app/backend/migrations/00_COMPLETE_SETUP.sql`
5. Collez-le dans l'éditeur SQL
6. Cliquez sur **Run** pour exécuter le script
7. Vérifiez que le message `✅ Migration terminée ! 9 tables créées/vérifiées` apparaît

### Option 2 : Via psql en ligne de commande

```bash
# Depuis le dossier racine du projet
cd app/backend

# Exécuter le script (remplacez l'URL par votre POSTGRES_URL)
psql "postgresql://your-user:your-password@your-host.neon.tech/neondb?sslmode=require" -f migrations/00_COMPLETE_SETUP.sql
```

### Option 3 : Via Node.js script

```bash
cd app/backend

# Créer un script temporaire
cat > run-migration.js << 'EOF'
import { readFileSync } from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const client = new pg.Client({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    await client.connect();
    console.log('✅ Connecté à la base de données');

    const sql = readFileSync('./migrations/00_COMPLETE_SETUP.sql', 'utf8');
    await client.query(sql);

    console.log('✅ Migration exécutée avec succès !');
  } catch (error) {
    console.error('❌ Erreur migration:', error);
  } finally {
    await client.end();
  }
}

runMigration();
EOF

# Exécuter le script
node run-migration.js

# Nettoyer
rm run-migration.js
```

## ✅ Vérification

Après avoir exécuté le script, vérifiez que tout fonctionne :

1. **Redémarrez votre serveur backend**
   ```bash
   cd app/backend
   # Ctrl+C pour arrêter
   npm start
   ```

2. **Vérifiez les logs** - Vous ne devriez plus voir d'erreurs `relation does not exist`

3. **Testez les pages suivantes** :
   - `/billing` - Page de facturation
   - `/lead-credits` - Gestion des crédits
   - `/Statistics` - Statistiques (nouvellement créée)
   - `/DuplicateDetection` - Détection de doublons (nouvellement créée)
   - `/Users` - Gestion des utilisateurs (avec nouveaux boutons)

## 🔍 Vérification SQL manuelle

Pour vérifier que les tables ont bien été créées, exécutez dans votre console SQL :

```sql
-- Lister toutes les tables créées
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'lead_credits', 'credit_purchases', 'credit_usage',
  'services', 'subscriptions', 'subscription_invoices',
  'subscription_history', 'invoices', 'billing_info'
)
ORDER BY table_name;

-- Vérifier les données initiales
SELECT COUNT(*) as lead_credits_rows FROM lead_credits;
SELECT COUNT(*) as services_rows FROM services;
```

Vous devriez voir :
- 9 tables listées
- Au moins 1 ligne dans `lead_credits` (une par tenant)
- Au moins 4 lignes dans `services` (4 services par tenant)

## 🆘 En cas de problème

### Erreur : "relation already exists"
C'est normal ! Le script utilise `CREATE TABLE IF NOT EXISTS`, donc il ne recréera pas les tables existantes.

### Erreur : "permission denied"
Vérifiez que votre utilisateur PostgreSQL a les droits nécessaires (CREATE TABLE, CREATE INDEX, etc.)

### Les pages sont toujours blanches
1. Vérifiez que le script SQL s'est bien exécuté sans erreur
2. Redémarrez le backend (`Ctrl+C` puis `npm start`)
3. Videz le cache du navigateur (`Ctrl+Shift+R`)
4. Consultez les logs du serveur pour voir les nouvelles erreurs

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs du serveur backend
2. Vérifiez les logs de la console du navigateur (F12)
3. Partagez le message d'erreur complet
