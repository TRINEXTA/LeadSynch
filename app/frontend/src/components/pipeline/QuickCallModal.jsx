import React, { useState, useEffect } from 'react';
import { X, Phone, Clock, Upload, Headphones } from 'lucide-react';
import QualificationModal from '../QualificationModal';
import CallRecordingUpload from './CallRecordingUpload';
import CallRecordingPlayer from './CallRecordingPlayer';
import api from '../../api/axios';

export default function QuickCallModal({ lead, onClose, onSuccess }) {
  const [callStarted, setCallStarted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [notes, setNotes] = useState('');
  const [showQualification, setShowQualification] = useState(false);
  const [intervalId, setIntervalId] = useState(null);
  const [callStartTime, setCallStartTime] = useState(null);
  const [activeTab, setActiveTab] = useState('call'); // 'call', 'upload', 'recordings'
  const [callHistoryId, setCallHistoryId] = useState(null);

  const startCall = () => {
    setCallStarted(true);
    setCallStartTime(Date.now());
    const id = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    setIntervalId(id);

    // Ouvrir l'app de téléphone
    if (lead.phone) {
      const cleanPhone = lead.phone.replace(/[\s\-\(\)]/g, '');
      const telLink = document.createElement('a');
      telLink.href = `tel:${cleanPhone}`;
      telLink.style.display = 'none';
      document.body.appendChild(telLink);
      telLink.click();
      document.body.removeChild(telLink);
    }
  };

  const endCall = () => {
    if (intervalId) clearInterval(intervalId);
    setShowQualification(true);
  };

  const handleQualify = async (qualificationData) => {
    try {
      // 1. Qualifier le lead
      await api.post(`/pipeline-leads/${lead.id}/qualify`, {
        ...qualificationData,
        call_duration: callDuration,
        notes: notes
      });

      // 2. Enregistrer l'action dans l'historique
      const historyResponse = await api.post(`/pipeline-leads/${lead.id}/action`, {
        action_type: 'call',
        notes: `📞 Appel téléphonique (${formatDuration(callDuration)})\n\nQualification: ${qualificationData.qualification}\n\n${notes || 'Aucune note'}`
      });

      // Sauvegarder l'ID de l'historique pour l'upload d'enregistrement
      if (historyResponse.data?.id) {
        setCallHistoryId(historyResponse.data.id);
      }

      alert('✅ Appel enregistré !');

      // Passer à l'onglet upload si l'utilisateur veut uploader l'enregistrement
      const wantsUpload = confirm('Voulez-vous uploader l\'enregistrement de cet appel ?');
      if (wantsUpload) {
        setShowQualification(false);
        setActiveTab('upload');
      } else {
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('❌ Erreur:', error);
      alert('Erreur lors de l\'enregistrement');
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [intervalId]);

  if (showQualification) {
    return (
      <QualificationModal
        lead={lead}
        callDuration={callDuration}
        notes={notes}
        onClose={onClose}
        onQualify={handleQualify}
      />
    );
  }

  const handleUploadSuccess = (recording) => {
    alert('✅ Enregistrement uploadé avec succès !');
    setActiveTab('recordings');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">

        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Phone className="w-6 h-6" />
            <div>
              <h2 className="text-2xl font-bold">Appel téléphonique</h2>
              <p className="text-green-100 text-sm mt-1">{lead.company_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex">
            <button
              onClick={() => setActiveTab('call')}
              className={`flex-1 px-6 py-3 font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'call'
                  ? 'bg-white text-green-600 border-b-2 border-green-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Phone className="w-4 h-4" />
              Appel
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 px-6 py-3 font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'upload'
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Upload className="w-4 h-4" />
              Uploader
            </button>
            <button
              onClick={() => setActiveTab('recordings')}
              className={`flex-1 px-6 py-3 font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'recordings'
                  ? 'bg-white text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Headphones className="w-4 h-4" />
              Enregistrements
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">{activeTab === 'call' && (
          <>
          
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 mb-6 border-2 border-green-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-600">Contact</p>
                <p className="text-lg font-bold text-gray-900">{lead.contact_name || 'Contact'}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Téléphone</p>
                <p className="text-lg font-bold text-green-700">{lead.phone || 'Non renseigné'}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-8 mb-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Clock className="w-6 h-6 text-green-400" />
              <p className="text-white text-sm font-semibold">Durée de l'appel</p>
            </div>
            <p className="text-6xl font-mono font-bold text-green-400 mb-6">
              {formatDuration(callDuration)}
            </p>
            
            {!callStarted ? (
              <button
                onClick={startCall}
                className="bg-green-500 text-white px-8 py-4 rounded-xl font-bold hover:bg-green-600 transition-all shadow-lg text-lg"
              >
                ▶️ Démarrer l'appel
              </button>
            ) : (
              <button
                onClick={endCall}
                className="bg-red-500 text-white px-8 py-4 rounded-xl font-bold hover:bg-red-600 transition-all shadow-lg text-lg animate-pulse"
              >
                ⏹️ Terminer l'appel
              </button>
            )}
          </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Notes de l'appel (facultatif)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Points importants discutés..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              />
            </div>
          </>
        )}

        {activeTab === 'upload' && (
          <CallRecordingUpload
            leadId={lead.id}
            callHistoryId={callHistoryId}
            campaignId={lead.campaign_id}
            onUploadSuccess={handleUploadSuccess}
          />
        )}

        {activeTab === 'recordings' && (
          <CallRecordingPlayer leadId={lead.id} />
        )}
        </div>
      </div>
    </div>
  );
}