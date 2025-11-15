#!/usr/bin/env python3
"""
Service de transcription audio avec Whisper (local)

Usage:
    python3 whisper-service.py /path/to/audio.mp3

Returns:
    JSON avec la transcription ou l'erreur
"""

import whisper
import sys
import json
import os

# Charger le modèle (une seule fois au démarrage)
# Modèles disponibles : tiny, base, small, medium, large
# Recommandé : "base" (bon compromis vitesse/précision)
#
# Tailles des modèles :
# - tiny   : ~39 MB   (rapide mais moins précis)
# - base   : ~74 MB   (recommandé - bon compromis)
# - small  : ~244 MB  (meilleur mais plus lent)
# - medium : ~769 MB  (excellent mais très lent)
# - large  : ~1550 MB (le meilleur mais très lourd)

MODEL_NAME = os.getenv("WHISPER_MODEL", "base")

try:
    print(f"🔄 Chargement du modèle Whisper '{MODEL_NAME}'...", file=sys.stderr)
    model = whisper.load_model(MODEL_NAME)
    print(f"✅ Modèle '{MODEL_NAME}' chargé avec succès", file=sys.stderr)
except Exception as e:
    print(f"❌ Erreur chargement modèle: {e}", file=sys.stderr)
    print(json.dumps({"success": False, "error": f"Erreur chargement modèle: {str(e)}"}))
    sys.exit(1)


def transcribe_audio(audio_path):
    """
    Transcrit un fichier audio en français

    Args:
        audio_path (str): Chemin vers le fichier audio

    Returns:
        dict: Résultat de la transcription
    """
    try:
        # Vérifier que le fichier existe
        if not os.path.exists(audio_path):
            return {
                "success": False,
                "error": f"Fichier non trouvé: {audio_path}"
            }

        print(f"🎤 Début transcription : {os.path.basename(audio_path)}", file=sys.stderr)

        # Transcrire l'audio
        result = model.transcribe(
            audio_path,
            language="fr",  # Forcer le français
            fp16=False,     # Utiliser CPU (mettre True si GPU disponible)
            verbose=False,  # Pas de logs verbeux

            # Options additionnelles (optionnelles)
            # task="transcribe",  # "transcribe" ou "translate"
            # temperature=0.0,    # Déterministe (0.0) ou créatif (1.0)
            # best_of=5,          # Nombre de tentatives
            # beam_size=5,        # Taille du beam search
        )

        # Extraire le texte et les métadonnées
        text = result["text"].strip()
        language = result["language"]
        segments = result["segments"]

        print(f"✅ Transcription terminée : {len(text)} caractères, {len(segments)} segments", file=sys.stderr)

        return {
            "success": True,
            "text": text,
            "language": language,
            "segments": len(segments),
            "duration": result.get("duration", 0)
        }

    except Exception as e:
        print(f"❌ Erreur transcription: {e}", file=sys.stderr)
        return {
            "success": False,
            "error": str(e)
        }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python3 whisper-service.py <audio_file_path>"
        }))
        sys.exit(1)

    audio_path = sys.argv[1]
    result = transcribe_audio(audio_path)

    # Retourner le JSON
    print(json.dumps(result, ensure_ascii=False))

    # Exit code
    sys.exit(0 if result["success"] else 1)
