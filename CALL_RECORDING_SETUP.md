# 📞 Système d'Enregistrement d'Appels - Guide d'Installation

## 🎯 Vue d'ensemble

Ce système permet d'uploader, stocker, écouter et transcrire les enregistrements d'appels téléphoniques des commerciaux.

### ✨ Fonctionnalités implémentées

- ✅ Upload d'enregistrements audio (MP3, WAV, WEBM, OGG, M4A, AAC, FLAC, MP4)
- ✅ Support multi-provider (Teams, téléphone standard, VoIP, autres)
- ✅ Lecteur audio intégré avec barre de progression
- ✅ Gestion du consentement RGPD
- ✅ Métadonnées (durée, provider, utilisateur)
- ✅ Interface d'upload dans QuickCallModal (avec onglets)
- ✅ Téléchargement des enregistrements
- ✅ Suppression des enregistrements
- ⚠️ Transcription IA (nécessite service externe - voir section)

---

## 📦 Fichiers créés

### Backend

1. **`app/backend/migrations/create_call_recordings.sql`**
   - Crée la table `lead_call_history` (historique des appels)
   - Crée la table `call_recordings` (enregistrements audio)
   - Indexes pour performance
   - Triggers pour `updated_at`
   - Colonnes RGPD (consentement, suppression planifiée)

2. **`app/backend/api/call-recordings.js`**
   - `POST /api/call-recordings/upload` - Upload audio avec multer
   - `GET /api/call-recordings/lead/:lead_id` - Liste des enregistrements d'un lead
   - `GET /api/call-recordings/:id/download` - Télécharger un fichier
   - `GET /api/call-recordings/:id/stream` - Streamer l'audio (avec range support)
   - `POST /api/call-recordings/:id/transcribe` - Lancer la transcription (non implémenté)
   - `DELETE /api/call-recordings/:id` - Supprimer un enregistrement
   - `GET /api/call-recordings/stats` - Statistiques globales

3. **`app/backend/server.js`** (modifié)
   - Ajout de l'import `import callRecordingsRoute from './api/call-recordings.js';`
   - Ajout de la route `app.use('/api/call-recordings', callRecordingsRoute);`

### Frontend

4. **`app/frontend/src/components/pipeline/CallRecordingPlayer.jsx`**
   - Affiche tous les enregistrements d'un lead
   - Lecteur audio avec play/pause, barre de progression, contrôle du temps
   - Boutons : Télécharger, Transcrire, Supprimer
   - Affichage de la transcription si disponible
   - Badges de statut (transcription en attente, terminée, échouée)

5. **`app/frontend/src/components/pipeline/CallRecordingUpload.jsx`**
   - Formulaire d'upload de fichier audio
   - Sélection du provider (Teams, standard, VoIP, autre)
   - Input durée (auto-détecté si possible)
   - Checkbox consentement RGPD + méthode
   - Barre de progression d'upload
   - Validation des types et tailles de fichiers

6. **`app/frontend/src/components/pipeline/QuickCallModal.jsx`** (modifié)
   - Ajout de 3 onglets : "Appel", "Uploader", "Enregistrements"
   - Intégration de `CallRecordingUpload` dans l'onglet "Uploader"
   - Intégration de `CallRecordingPlayer` dans l'onglet "Enregistrements"
   - Propose d'uploader après qualification d'un appel
   - Sauvegarde du `call_history_id` pour lier l'enregistrement à l'historique

---

## 🚀 Installation

### Étape 1 : Exécuter la migration SQL

```bash
# Se connecter à la base de données PostgreSQL
psql $POSTGRES_URL

# Exécuter la migration
\i app/backend/migrations/create_call_recordings.sql

# Vérifier que les tables sont créées
\dt lead_call_history
\dt call_recordings

# Quitter
\q
```

**Vérification :**
```sql
-- Vérifier les colonnes de call_recordings
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'call_recordings';
```

### Étape 2 : Installer les dépendances (déjà installées normalement)

Les packages suivants sont requis et déjà dans `package.json` :

```json
{
  "multer": "2.0.2",
  "@anthropic-ai/sdk": "0.67.1"
}
```

Si besoin :
```bash
cd app/backend
npm install multer @anthropic-ai/sdk
```

### Étape 3 : Créer le dossier d'upload

```bash
mkdir -p app/backend/uploads/call-recordings
chmod 755 app/backend/uploads/call-recordings
```

### Étape 4 : Redémarrer le backend

```bash
cd app/backend
npm run dev
```

**Vérification :**
```bash
# Tester l'endpoint
curl http://localhost:3000/api/call-recordings/stats \
  -H "Authorization: Bearer <votre-token>"

# Devrait retourner :
# {"success":true,"stats":{"total_recordings":0,"total_size_mb":0,...}}
```

### Étape 5 : Redémarrer le frontend

```bash
cd app/frontend
npm run dev
```

---

## 🧪 Tests manuels

### 1. Tester l'upload dans QuickCallModal

1. Aller sur **Pipeline** (`/pipeline`)
2. Cliquer sur un lead dans une colonne
3. Cliquer sur le bouton **📞 Appeler**
4. Dans la modal :
   - Cliquer sur l'onglet **"Uploader"**
   - Sélectionner un fichier audio (MP3, WAV, etc.)
   - Choisir le provider (Teams, standard, etc.)
   - Cocher "Consentement RGPD obtenu"
   - Cliquer sur **"Uploader"**
5. Vérifier que l'upload réussit
6. Cliquer sur l'onglet **"Enregistrements"**
7. Vérifier que l'enregistrement apparaît
8. Tester le lecteur audio (play/pause)

### 2. Tester le téléchargement

1. Dans l'onglet "Enregistrements"
2. Cliquer sur **"Télécharger"**
3. Vérifier que le fichier se télécharge

### 3. Tester la suppression

1. Cliquer sur **"Supprimer"**
2. Confirmer
3. Vérifier que l'enregistrement disparaît

### 4. Tester via Leads.jsx (optionnel)

Si vous voulez ajouter un bouton dans la liste des leads :

```jsx
// Dans Leads.jsx, ajouter une colonne "Enregistrements"
<td>
  <button onClick={() => openRecordingsModal(lead)}>
    🎧 Écouter ({lead.recordings_count || 0})
  </button>
</td>
```

---

## 🤖 Configuration de la transcription (OPTIONNEL)

La transcription nécessite un service externe. Options recommandées :

### Option A : OpenAI Whisper API (recommandé)

**Avantages :**
- Très précis
- Support multilingue
- Facile à intégrer

**Installation :**

1. Installer le SDK :
```bash
npm install openai
```

2. Ajouter dans `.env` :
```bash
OPENAI_API_KEY=sk-proj-...
```

3. Modifier `app/backend/api/call-recordings.js` (ligne ~350) :

```javascript
// Remplacer la section TODO par :
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const transcription = await openai.audio.transcriptions.create({
  file: fs.createReadStream(recording.filepath),
  model: 'whisper-1',
  language: 'fr',
  response_format: 'text'
});

await execute(
  `UPDATE call_recordings
   SET
     transcription_status = 'completed',
     transcription_text = $1,
     transcription_language = 'fr',
     transcription_confidence = 95,
     transcribed_at = NOW(),
     updated_at = NOW()
   WHERE id = $2`,
  [transcription, id]
);

return res.json({
  success: true,
  transcription: transcription
});
```

**Coût :** ~0,006€ par minute d'audio

### Option B : Google Speech-to-Text

```bash
npm install @google-cloud/speech
```

Variables d'environnement :
```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
```

### Option C : Azure Speech Services

```bash
npm install microsoft-cognitiveservices-speech-sdk
```

Variables d'environnement :
```bash
AZURE_SPEECH_KEY=your-key
AZURE_SPEECH_REGION=westeurope
```

---

## 📊 Structure de la base de données

### Table `lead_call_history`

```sql
CREATE TABLE lead_call_history (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  lead_id UUID NOT NULL,
  pipeline_lead_id UUID,
  campaign_id UUID,

  action_type VARCHAR(50) DEFAULT 'call',
  call_status VARCHAR(50), -- 'answered', 'no_answer', 'voicemail', 'busy'
  call_duration INTEGER, -- Durée en secondes
  phone_number VARCHAR(50),
  phone_provider VARCHAR(50), -- 'teams', 'standard', 'voip', 'other'

  qualification VARCHAR(50),
  stage_before VARCHAR(50),
  stage_after VARCHAR(50),

  notes TEXT,
  next_action VARCHAR(100),
  scheduled_date TIMESTAMP,
  deal_value DECIMAL(10, 2),

  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Table `call_recordings`

```sql
CREATE TABLE call_recordings (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,

  -- Relations
  call_history_id UUID, -- Lien avec lead_call_history
  lead_id UUID NOT NULL,
  campaign_id UUID,

  -- Fichier audio
  filename VARCHAR(255) NOT NULL, -- ex: "1637158293847-912847563.mp3"
  original_filename VARCHAR(255) NOT NULL, -- ex: "appel_client_abc.mp3"
  filepath TEXT NOT NULL, -- ex: "/uploads/call-recordings/..."
  filesize INTEGER, -- en bytes
  mimetype VARCHAR(100), -- ex: "audio/mpeg"
  duration INTEGER, -- en secondes

  -- Provider
  phone_provider VARCHAR(50), -- 'teams', 'standard', 'voip', 'other'
  provider_metadata JSONB, -- Métadonnées du provider

  -- Transcription
  transcription_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  transcription_text TEXT,
  transcription_language VARCHAR(10) DEFAULT 'fr',
  transcription_confidence DECIMAL(5, 2),
  transcription_error TEXT,
  transcribed_at TIMESTAMP,

  -- RGPD
  consent_obtained BOOLEAN DEFAULT false,
  consent_date TIMESTAMP,
  consent_method VARCHAR(100),
  can_be_stored BOOLEAN DEFAULT true,
  deletion_scheduled_at TIMESTAMP, -- Suppression auto RGPD

  uploaded_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔐 Sécurité et RGPD

### Consentement obligatoire

Le système inclut un checkbox de consentement RGPD lors de l'upload :

```javascript
consent_obtained: boolean
consent_method: 'manual' | 'email' | 'phone' | 'contract'
```

### Suppression planifiée

Pour conformité RGPD, ajouter un cron job pour supprimer automatiquement :

```javascript
// Exemple : Supprimer les enregistrements de plus de 3 ans
DELETE FROM call_recordings
WHERE deletion_scheduled_at < NOW();
```

### Contrôle d'accès multi-tenant

Toutes les requêtes filtrent par `tenant_id` :

```javascript
WHERE tenant_id = $1 AND lead_id = $2
```

**Sécurité :** Impossible d'accéder aux enregistrements d'un autre tenant.

---

## 📋 API Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/call-recordings/upload` | Upload un fichier audio |
| `GET` | `/api/call-recordings/lead/:lead_id` | Liste des enregistrements d'un lead |
| `GET` | `/api/call-recordings/:id/download` | Télécharger le fichier |
| `GET` | `/api/call-recordings/:id/stream` | Streamer l'audio (avec range) |
| `POST` | `/api/call-recordings/:id/transcribe` | Lancer la transcription |
| `DELETE` | `/api/call-recordings/:id` | Supprimer l'enregistrement |
| `GET` | `/api/call-recordings/stats` | Statistiques globales |

### Exemple d'upload avec curl

```bash
curl -X POST http://localhost:3000/api/call-recordings/upload \
  -H "Authorization: Bearer <token>" \
  -F "audio=@/path/to/recording.mp3" \
  -F "lead_id=uuid-du-lead" \
  -F "phone_provider=teams" \
  -F "consent_obtained=true" \
  -F "consent_method=manual"
```

---

## 🎨 Captures d'écran (à venir)

### QuickCallModal - Onglet "Appel"
- Timer en cours
- Bouton "Démarrer l'appel" / "Terminer l'appel"
- Zone de notes

### QuickCallModal - Onglet "Uploader"
- Sélection de fichier
- Provider dropdown
- Durée (optionnel)
- Checkbox RGPD
- Barre de progression

### QuickCallModal - Onglet "Enregistrements"
- Liste des enregistrements
- Lecteur audio
- Boutons : Télécharger, Transcrire, Supprimer
- Affichage transcription

---

## 🐛 Dépannage

### Erreur : "Table call_recordings does not exist"

**Solution :** Exécuter la migration SQL (Étape 1)

### Erreur : "ENOENT: no such file or directory '/uploads/call-recordings'"

**Solution :** Créer le dossier :
```bash
mkdir -p app/backend/uploads/call-recordings
```

### Erreur : "Type de fichier non autorisé"

**Solution :** Vérifier que le fichier est bien au format audio :
- Formats acceptés : MP3, WAV, WEBM, OGG, M4A, AAC, FLAC, MP4
- Taille max : 50 MB

### Erreur : "Fichier audio non trouvé sur le disque"

**Causes possibles :**
1. Le fichier a été supprimé manuellement
2. Le chemin `filepath` en DB est incorrect
3. Problème de permissions

**Solution :**
```bash
# Vérifier les permissions
ls -la app/backend/uploads/call-recordings/

# Corriger si besoin
chmod 755 app/backend/uploads/call-recordings
```

### Audio ne se lit pas dans le navigateur

**Solution :** Vérifier que le navigateur supporte le format :
- Chrome : MP3, WAV, WEBM, OGG
- Firefox : MP3, WAV, OGG
- Safari : MP3, WAV

**Format recommandé :** MP3 (compatibilité maximale)

---

## 🚀 Prochaines étapes (TODO)

### Fonctionnalités manquantes

- [ ] Intégration dans ProspectingMode.jsx (mode speed dialing)
- [ ] Transcription automatique avec Whisper API
- [ ] Analyse de sentiment de la transcription (IA)
- [ ] Tags automatiques (objections, intérêt, etc.)
- [ ] Export CSV des transcriptions
- [ ] Statistiques : durée moyenne, taux de consentement, etc.
- [ ] Notification après transcription terminée
- [ ] Recherche dans les transcriptions
- [ ] Highlights dans les transcriptions (mots-clés)

### Améliorations UI/UX

- [ ] Remplacer `alert()` par toast notifications (react-hot-toast)
- [ ] Afficher un aperçu de la forme d'onde (waveform)
- [ ] Permettre de couper/éditer les enregistrements
- [ ] Annotation temporelle (marquer des moments clés)
- [ ] Partage d'enregistrement avec lien sécurisé

### Optimisations

- [ ] Compression automatique des fichiers audio
- [ ] Stockage dans S3/R2 au lieu du disque local
- [ ] CDN pour streaming optimisé
- [ ] Préchargement des enregistrements
- [ ] Pagination de la liste (si >100 enregistrements)

---

## 📞 Support

Pour toute question ou problème :

1. Vérifier ce document
2. Consulter les logs du backend : `console.log` dans `call-recordings.js`
3. Consulter les logs du frontend : Console du navigateur (F12)

---

**Créé le** : 15 novembre 2025
**Dernière mise à jour** : 15 novembre 2025
**Version** : 1.0.0
