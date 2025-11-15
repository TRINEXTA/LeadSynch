import { useState, useRef } from 'react';
import { Upload, Loader, CheckCircle, AlertCircle, X } from 'lucide-react';
import api from '../../api/axios';

export default function CallRecordingUpload({
  leadId,
  callHistoryId = null,
  campaignId = null,
  onUploadSuccess,
  onClose
}) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Métadonnées
  const [phoneProvider, setPhoneProvider] = useState('standard');
  const [duration, setDuration] = useState('');
  const [consentObtained, setConsentObtained] = useState(false);
  const [consentMethod, setConsentMethod] = useState('manual');

  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Vérifier le type
    const allowedTypes = [
      'audio/mpeg',
      'audio/wav',
      'audio/wave',
      'audio/x-wav',
      'audio/webm',
      'audio/ogg',
      'audio/mp4',
      'audio/x-m4a',
      'audio/aac',
      'audio/flac',
      'video/webm',
      'video/mp4'
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Type de fichier non supporté. Formats acceptés : MP3, WAV, WEBM, OGG, M4A, AAC, FLAC, MP4');
      return;
    }

    // Vérifier la taille (50 MB max)
    const maxSize = 50 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError('Fichier trop volumineux. Taille max : 50 MB');
      return;
    }

    setFile(selectedFile);
    setError(null);

    // Essayer d'extraire la durée si c'est un fichier audio/vidéo
    if (selectedFile.type.startsWith('audio/') || selectedFile.type.startsWith('video/')) {
      const media = document.createElement(selectedFile.type.startsWith('audio/') ? 'audio' : 'video');
      const url = URL.createObjectURL(selectedFile);
      media.src = url;
      media.addEventListener('loadedmetadata', () => {
        setDuration(Math.round(media.duration).toString());
        URL.revokeObjectURL(url);
      });
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Veuillez sélectionner un fichier');
      return;
    }

    if (!leadId) {
      setError('Lead ID manquant');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('audio', file);
      formData.append('lead_id', leadId);

      if (callHistoryId) {
        formData.append('call_history_id', callHistoryId);
      }

      if (campaignId) {
        formData.append('campaign_id', campaignId);
      }

      formData.append('phone_provider', phoneProvider);

      if (duration) {
        formData.append('duration', duration);
      }

      formData.append('consent_obtained', consentObtained);
      formData.append('consent_method', consentMethod);

      const response = await api.post('/call-recordings/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      if (response.data.success) {
        setUploadSuccess(true);
        setUploadProgress(100);

        // Appeler le callback
        if (onUploadSuccess) {
          onUploadSuccess(response.data.recording);
        }

        // Auto-fermer après 2s
        setTimeout(() => {
          if (onClose) onClose();
        }, 2000);
      }

    } catch (err) {
      console.error('Erreur upload:', err);
      setError(err.response?.data?.error || 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setUploading(false);
    setUploadProgress(0);
    setUploadSuccess(false);
    setError(null);
    setDuration('');
    setConsentObtained(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Upload className="w-5 h-5 text-blue-600" />
          Uploader un enregistrement
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {uploadSuccess ? (
        <div className="text-center py-8">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <p className="text-lg font-medium text-green-700">Enregistrement uploadé avec succès !</p>
          <p className="text-sm text-gray-600 mt-2">La transcription sera disponible dans quelques instants</p>
        </div>
      ) : (
        <>
          {/* File input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fichier audio
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/webm,video/mp4"
              onChange={handleFileSelect}
              disabled={uploading}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {file && (
              <div className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                <span className="font-medium">{file.name}</span>
                <span className="text-gray-400">•</span>
                <span>{formatFileSize(file.size)}</span>
              </div>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Formats acceptés : MP3, WAV, WEBM, OGG, M4A, AAC, FLAC, MP4 (max 50 MB)
            </p>
          </div>

          {/* Provider select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Système téléphonique utilisé
            </label>
            <select
              value={phoneProvider}
              onChange={(e) => setPhoneProvider(e.target.value)}
              disabled={uploading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            >
              <option value="standard">📞 Téléphone standard</option>
              <option value="teams">👥 Microsoft Teams</option>
              <option value="voip">☎️ VoIP / Softphone</option>
              <option value="other">📱 Autre</option>
            </select>
          </div>

          {/* Duration input (optionnel) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Durée (secondes) - optionnel
            </label>
            <input
              type="number"
              min="0"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              disabled={uploading}
              placeholder="Auto-détecté si possible"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            />
          </div>

          {/* RGPD consent */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="consent"
                checked={consentObtained}
                onChange={(e) => setConsentObtained(e.target.checked)}
                disabled={uploading}
                className="mt-1"
              />
              <label htmlFor="consent" className="text-sm text-gray-700 cursor-pointer">
                <span className="font-medium">Consentement RGPD obtenu</span>
                <p className="text-xs text-gray-600 mt-1">
                  J'atteste avoir obtenu le consentement du prospect pour l'enregistrement de cet appel
                </p>
              </label>
            </div>

            {consentObtained && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Méthode d'obtention du consentement
                </label>
                <select
                  value={consentMethod}
                  onChange={(e) => setConsentMethod(e.target.value)}
                  disabled={uploading}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="manual">Information orale au début de l'appel</option>
                  <option value="email">Email de confirmation</option>
                  <option value="contract">Clause contractuelle</option>
                  <option value="phone">Message pré-enregistré</option>
                </select>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Progress bar */}
          {uploading && (
            <div>
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Upload en cours...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            {file && !uploading && (
              <button
                onClick={resetForm}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Annuler
              </button>
            )}
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
            >
              {uploading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Upload en cours...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Uploader
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
