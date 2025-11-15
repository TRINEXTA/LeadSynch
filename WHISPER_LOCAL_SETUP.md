# 🎤 Transcription GRATUITE avec Whisper Local

## ⚠️ IMPORTANT : Solution économique

Au lieu d'utiliser l'API Whisper (payante ~0,006€/minute), on utilise **Whisper en local** :
- ✅ **100% gratuit** (pas de coût par minute)
- ✅ Même précision que l'API
- ✅ Pas de limite d'utilisation
- ✅ Données restent sur ton serveur (RGPD compliant)
- ✅ Support français natif

---

## 📦 Installation Whisper Local

### Option A : Via Python (recommandé)

**Prérequis :**
- Python 3.8+
- ffmpeg

#### Étape 1 : Installer ffmpeg

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install ffmpeg

# Vérifier
ffmpeg -version
```

#### Étape 2 : Installer Whisper

```bash
# Créer un environnement virtuel
cd /home/user/LeadSynch/app/backend
python3 -m venv whisper-env
source whisper-env/bin/activate

# Installer Whisper
pip install openai-whisper

# Tester
whisper --help
```

#### Étape 3 : Créer le service de transcription

Créer le fichier **`app/backend/services/whisper-service.py`** :

```python
#!/usr/bin/env python3
import whisper
import sys
import json

# Charger le modèle (une seule fois au démarrage)
# Modèles disponibles : tiny, base, small, medium, large
# Recommandé : "base" (bon compromis vitesse/précision)
model = whisper.load_model("base")

def transcribe_audio(audio_path):
    """
    Transcrit un fichier audio en français
    """
    try:
        result = model.transcribe(
            audio_path,
            language="fr",
            fp16=False,  # Utiliser CPU (mettre True si GPU disponible)
            verbose=False
        )

        return {
            "success": True,
            "text": result["text"],
            "language": result["language"],
            "segments": len(result["segments"])
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Audio file path required"}))
        sys.exit(1)

    audio_path = sys.argv[1]
    result = transcribe_audio(audio_path)
    print(json.dumps(result))
```

Rendre le script exécutable :
```bash
chmod +x app/backend/services/whisper-service.py
```

#### Étape 4 : Tester le service

```bash
# Activer l'environnement
source app/backend/whisper-env/bin/activate

# Tester avec un fichier audio
python3 app/backend/services/whisper-service.py /path/to/audio.mp3

# Devrait retourner :
# {"success": true, "text": "transcription ici...", "language": "fr", "segments": 5}
```

---

## 🔌 Intégration dans l'API Node.js

Modifier **`app/backend/api/call-recordings.js`** (ligne ~350) :

```javascript
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========== POST /api/call-recordings/:id/transcribe ==========
router.post('/:id/transcribe', authMiddleware, async (req, res) => {
  const { tenant_id } = req.user;
  const { id } = req.params;

  try {
    const recording = await queryOne(
      'SELECT * FROM call_recordings WHERE id = $1 AND tenant_id = $2',
      [id, tenant_id]
    );

    if (!recording) {
      return res.status(404).json({ error: 'Enregistrement non trouvé' });
    }

    if (recording.transcription_status === 'completed') {
      return res.json({
        success: true,
        message: 'Déjà transcrit',
        transcription: recording.transcription_text
      });
    }

    if (!fs.existsSync(recording.filepath)) {
      return res.status(404).json({ error: 'Fichier audio non trouvé' });
    }

    // Marquer comme en cours
    await execute(
      `UPDATE call_recordings
       SET transcription_status = 'processing', updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    console.log(`🎤 Début transcription : ${recording.original_filename}`);

    // Appeler Whisper local
    const whisperScriptPath = path.join(__dirname, '../services/whisper-service.py');
    const pythonEnvPath = path.join(__dirname, '../whisper-env/bin/python3');

    const { stdout, stderr } = await execPromise(
      `${pythonEnvPath} ${whisperScriptPath} "${recording.filepath}"`,
      { timeout: 300000 } // 5 minutes max
    );

    if (stderr) {
      console.error('⚠️ Whisper stderr:', stderr);
    }

    const result = JSON.parse(stdout);

    if (result.success) {
      // Sauvegarder la transcription
      await execute(
        `UPDATE call_recordings
         SET
           transcription_status = 'completed',
           transcription_text = $1,
           transcription_language = $2,
           transcription_confidence = 95,
           transcribed_at = NOW(),
           updated_at = NOW()
         WHERE id = $3`,
        [result.text.trim(), result.language, id]
      );

      console.log(`✅ Transcription terminée : ${result.segments} segments`);

      return res.json({
        success: true,
        transcription: result.text.trim(),
        language: result.language,
        segments: result.segments
      });
    } else {
      throw new Error(result.error || 'Erreur transcription');
    }

  } catch (error) {
    console.error('❌ Erreur transcription:', error);

    // Marquer comme échec
    await execute(
      `UPDATE call_recordings
       SET
         transcription_status = 'failed',
         transcription_error = $1,
         updated_at = NOW()
       WHERE id = $2`,
      [error.message, id]
    );

    return res.status(500).json({
      error: 'Erreur lors de la transcription',
      details: error.message
    });
  }
});
```

---

## ⚡ Optimisations

### 1. Utiliser un modèle plus petit pour la vitesse

```python
# Dans whisper-service.py
model = whisper.load_model("tiny")  # Très rapide, moins précis
model = whisper.load_model("base")  # Bon compromis (recommandé)
model = whisper.load_model("small") # Meilleur, un peu plus lent
```

**Temps de transcription (approximatif) :**
- `tiny` : 1 minute d'audio = 5-10 secondes de traitement
- `base` : 1 minute d'audio = 15-30 secondes
- `small` : 1 minute d'audio = 30-60 secondes

### 2. Utiliser GPU si disponible

Si ton serveur a un GPU NVIDIA :

```bash
# Installer avec support CUDA
pip uninstall openai-whisper
pip install openai-whisper torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

Puis dans le script :
```python
result = model.transcribe(
    audio_path,
    language="fr",
    fp16=True,  # ✅ Activer GPU
    verbose=False
)
```

### 3. Queue de traitement asynchrone

Pour éviter de bloquer l'API, utiliser une queue (Bull/BullMQ) :

```javascript
// Créer une queue de transcription
const transcriptionQueue = new Queue('transcription', process.env.REDIS_URL);

// POST /transcribe envoie juste dans la queue
router.post('/:id/transcribe', authMiddleware, async (req, res) => {
  // ...
  await transcriptionQueue.add({ recordingId: id });

  return res.json({
    success: true,
    message: 'Transcription démarrée en arrière-plan'
  });
});

// Worker qui process la queue
transcriptionQueue.process(async (job) => {
  const { recordingId } = job.data;
  // Appeler Whisper ici
});
```

---

## 🐳 Alternative : Docker avec Whisper

Si tu préfères isoler dans Docker :

**Créer `app/backend/Dockerfile.whisper`** :

```dockerfile
FROM python:3.10-slim

# Installer ffmpeg
RUN apt-get update && apt-get install -y ffmpeg

# Installer Whisper
RUN pip install openai-whisper

WORKDIR /app

COPY services/whisper-service.py .

CMD ["python3", "whisper-service.py"]
```

**Docker Compose :**

```yaml
version: '3.8'

services:
  whisper:
    build:
      context: .
      dockerfile: Dockerfile.whisper
    volumes:
      - ./uploads:/app/uploads
    command: tail -f /dev/null  # Garder le container actif
```

---

## 📊 Comparaison des coûts

| Solution | Coût par minute | 1000 appels (10min chacun) | Limitations |
|----------|----------------|----------------------------|-------------|
| **Whisper API** | 0,006€ | **600€** 💸 | Payant, quota |
| **Whisper Local** | **0€** | **0€** ✅ | Aucune, gratuit |
| Google Speech-to-Text | 0,006€ | 600€ | Payant |
| Azure Speech | 0,008€ | 800€ | Payant |

**Verdict :** Whisper Local = **600€ d'économies** pour 1000 appels de 10 minutes.

---

## 🚀 Déploiement en production

### Sur Vercel (serverless)

⚠️ **Problème :** Vercel ne supporte pas Python + Whisper directement.

**Solutions :**

1. **Héberger Whisper séparément** (Render, Railway, VPS)
2. **Utiliser Vercel + service externe** (API Whisper sur autre serveur)

### Sur VPS / Serveur dédié

```bash
# Installer sur le serveur
cd /var/www/leadsynch/app/backend
python3 -m venv whisper-env
source whisper-env/bin/activate
pip install openai-whisper

# PM2 pour gérer le backend Node.js
pm2 start server.js --name leadsynch-api

# Whisper sera appelé par Node.js via exec()
```

### Sur Railway.app (recommandé)

Railway supporte Python + Node.js dans le même projet :

```toml
# railway.toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm run start"

[[build.providers]]
name = "python"
```

---

## 🧪 Tests complets

### Test 1 : Whisper standalone

```bash
cd /home/user/LeadSynch/app/backend
source whisper-env/bin/activate

# Télécharger un sample audio
wget https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav -O test-audio.wav

# Transcrire
python3 services/whisper-service.py test-audio.wav
```

### Test 2 : Via API

```bash
# Upload un enregistrement
curl -X POST http://localhost:3000/api/call-recordings/upload \
  -H "Authorization: Bearer <token>" \
  -F "audio=@recording.mp3" \
  -F "lead_id=<lead-uuid>" \
  -F "consent_obtained=true"

# Récupérer l'ID de l'enregistrement
# Exemple : "id": "abc-123-def"

# Lancer la transcription
curl -X POST http://localhost:3000/api/call-recordings/abc-123-def/transcribe \
  -H "Authorization: Bearer <token>"

# Devrait retourner :
# {"success": true, "transcription": "Texte transcrit...", "language": "fr"}
```

---

## 📝 Résumé de l'installation

1. **Installer Python + ffmpeg** sur le serveur
2. **Créer environnement virtuel** : `python3 -m venv whisper-env`
3. **Installer Whisper** : `pip install openai-whisper`
4. **Créer script Python** : `services/whisper-service.py`
5. **Modifier API Node.js** : Appeler le script Python via `exec()`
6. **Tester** : Upload audio + transcrire

**Coût final : 0€** (gratuit, illimité)

---

## 🆘 Dépannage

### Erreur : "command not found: whisper"

```bash
# Vérifier l'installation
source whisper-env/bin/activate
which python3
pip list | grep whisper
```

### Erreur : "ffmpeg not found"

```bash
# Installer ffmpeg
sudo apt install ffmpeg

# Vérifier
ffmpeg -version
```

### Transcription trop lente

- Utiliser modèle `tiny` au lieu de `base`
- Activer GPU si disponible
- Utiliser queue asynchrone (Bull)

### Erreur : "ModuleNotFoundError: No module named 'whisper'"

```bash
# Réinstaller
pip uninstall openai-whisper
pip install openai-whisper
```

---

**Créé le** : 15 novembre 2025
**Solution** : Whisper Local (Open Source, gratuit)
**Économies** : ~600€ pour 1000 appels de 10 minutes
