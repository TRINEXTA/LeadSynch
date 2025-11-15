import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Mic, FileAudio, Loader, RefreshCw, Trash2 } from 'lucide-react';
import api from '../../api/axios';

export default function CallRecordingPlayer({ leadId }) {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(null);
  const [currentTime, setCurrentTime] = useState({});
  const [duration, setDuration] = useState({});
  const audioRefs = useRef({});

  useEffect(() => {
    loadRecordings();
  }, [leadId]);

  const loadRecordings = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/call-recordings/lead/${leadId}`);
      setRecordings(response.data.recordings || []);
    } catch (error) {
      console.error('Erreur chargement enregistrements:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = (recordingId) => {
    const audio = audioRefs.current[recordingId];
    if (!audio) return;

    if (playing === recordingId) {
      audio.pause();
      setPlaying(null);
    } else {
      // Pause tous les autres
      Object.keys(audioRefs.current).forEach(id => {
        if (id !== recordingId && audioRefs.current[id]) {
          audioRefs.current[id].pause();
        }
      });

      audio.play();
      setPlaying(recordingId);
    }
  };

  const handleTimeUpdate = (recordingId) => {
    const audio = audioRefs.current[recordingId];
    if (audio) {
      setCurrentTime(prev => ({ ...prev, [recordingId]: audio.currentTime }));
    }
  };

  const handleLoadedMetadata = (recordingId) => {
    const audio = audioRefs.current[recordingId];
    if (audio) {
      setDuration(prev => ({ ...prev, [recordingId]: audio.duration }));
    }
  };

  const handleEnded = (recordingId) => {
    setPlaying(null);
  };

  const handleSeek = (recordingId, e) => {
    const audio = audioRefs.current[recordingId];
    if (audio) {
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      audio.currentTime = percent * audio.duration;
    }
  };

  const downloadRecording = async (recordingId, filename) => {
    try {
      const response = await api.get(`/call-recordings/${recordingId}/download`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Erreur téléchargement:', error);
      alert('Erreur lors du téléchargement');
    }
  };

  const transcribeRecording = async (recordingId) => {
    try {
      const response = await api.post(`/call-recordings/${recordingId}/transcribe`);

      if (response.data.success) {
        alert('Transcription terminée !');
        loadRecordings(); // Recharger pour afficher la transcription
      }
    } catch (error) {
      console.error('Erreur transcription:', error);

      // Afficher le message d'erreur détaillé
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Erreur lors de la transcription';
      alert(errorMsg);
    }
  };

  const deleteRecording = async (recordingId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet enregistrement ?')) {
      return;
    }

    try {
      await api.delete(`/call-recordings/${recordingId}`);
      setRecordings(prev => prev.filter(r => r.id !== recordingId));
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProviderIcon = (provider) => {
    const icons = {
      teams: '👥',
      standard: '📞',
      voip: '☎️',
      other: '📱'
    };
    return icons[provider] || '📞';
  };

  const getTranscriptionBadge = (status) => {
    const badges = {
      pending: <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">En attente</span>,
      processing: <span className="text-xs bg-blue-200 text-blue-700 px-2 py-1 rounded flex items-center gap-1"><Loader className="w-3 h-3 animate-spin" /> Traitement...</span>,
      completed: <span className="text-xs bg-green-200 text-green-700 px-2 py-1 rounded">✓ Transcrit</span>,
      failed: <span className="text-xs bg-red-200 text-red-700 px-2 py-1 rounded">✗ Échec</span>
    };
    return badges[status] || badges.pending;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Chargement des enregistrements...</span>
      </div>
    );
  }

  if (recordings.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
        <FileAudio className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Aucun enregistrement pour ce lead</p>
        <p className="text-sm text-gray-500 mt-2">
          Les enregistrements uploadés apparaîtront ici
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Mic className="w-5 h-5 text-blue-600" />
          Enregistrements d'appels ({recordings.length})
        </h3>
        <button
          onClick={loadRecordings}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      {recordings.map((recording) => {
        const rec = recording;
        const isPlaying = playing === rec.id;
        const progress = (currentTime[rec.id] / duration[rec.id]) * 100 || 0;

        return (
          <div key={rec.id} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{getProviderIcon(rec.phone_provider)}</span>
                  <span className="font-medium text-gray-900">{rec.filename}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <span>{formatDate(rec.created_at)}</span>
                  <span>•</span>
                  <span>{formatFileSize(rec.size)}</span>
                  {rec.duration && (
                    <>
                      <span>•</span>
                      <span>{formatTime(rec.duration)}</span>
                    </>
                  )}
                  {rec.uploaded_by && (
                    <>
                      <span>•</span>
                      <span>Par {rec.uploaded_by}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getTranscriptionBadge(rec.transcription_status)}
              </div>
            </div>

            {/* Audio player */}
            <div className="space-y-2">
              <audio
                ref={el => audioRefs.current[rec.id] = el}
                src={`/api/call-recordings/${rec.id}/stream`}
                onTimeUpdate={() => handleTimeUpdate(rec.id)}
                onLoadedMetadata={() => handleLoadedMetadata(rec.id)}
                onEnded={() => handleEnded(rec.id)}
                preload="metadata"
              />

              {/* Progress bar */}
              <div
                className="h-2 bg-gray-200 rounded-full cursor-pointer relative overflow-hidden"
                onClick={(e) => handleSeek(rec.id, e)}
              >
                <div
                  className="absolute top-0 left-0 h-full bg-blue-600 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => togglePlay(rec.id)}
                    className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-1" />
                    )}
                  </button>
                  <div className="text-sm text-gray-600">
                    {formatTime(currentTime[rec.id] || 0)} / {formatTime(duration[rec.id] || rec.duration)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {rec.transcription_status !== 'completed' && rec.transcription_status !== 'processing' && (
                    <button
                      onClick={() => transcribeRecording(rec.id)}
                      className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors flex items-center gap-1"
                    >
                      <Mic className="w-4 h-4" />
                      Transcrire
                    </button>
                  )}
                  <button
                    onClick={() => downloadRecording(rec.id, rec.filename)}
                    className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" />
                    Télécharger
                  </button>
                  <button
                    onClick={() => deleteRecording(rec.id)}
                    className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </button>
                </div>
              </div>
            </div>

            {/* Transcription */}
            {rec.transcription_text && (
              <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <Mic className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-900">Transcription</span>
                  {rec.transcription_confidence && (
                    <span className="text-xs text-purple-600">
                      ({rec.transcription_confidence}% de confiance)
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {rec.transcription_text}
                </p>
              </div>
            )}

            {/* Consent RGPD */}
            {rec.consent_obtained && (
              <div className="text-xs text-green-600 flex items-center gap-1">
                <span>✓</span>
                <span>Consentement RGPD obtenu</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
