import { log, error, warn } from "../../lib/logger.js";
import React, { useState, useEffect } from 'react';
import { X, Phone, Clock } from 'lucide-react';
import QualificationModal from '../QualificationModal';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function QuickCallModal({ lead, onClose, onSuccess }) {
  const [callStarted, setCallStarted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [notes, setNotes] = useState('');
  const [showQualification, setShowQualification] = useState(false);
  const [intervalId, setIntervalId] = useState(null);
  const [callStartTime, setCallStartTime] = useState(null);

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
      await api.post(`/pipeline-leads/${lead.id}/action`, {
        action_type: 'call',
        notes: `📞 Appel téléphonique (${formatDuration(callDuration)})\n\nQualification: ${qualificationData.qualification}\n\n${notes || 'Aucune note'}`
      });

      // 3. Enregistrer l'appel dans call_logs pour les statistiques
      try {
        await api.post('/call-sessions', {
          action: 'log-call-direct',
          lead_id: lead.lead_id || lead.id,
          pipeline_lead_id: lead.id,
          duration: callDuration,
          qualification: qualificationData.qualification,
          notes: notes || '',
          outcome: qualificationData.qualification
        });
      } catch (e) {
        // Ne pas bloquer si l'enregistrement stats échoue
        warn('Erreur enregistrement stats appel:', e);
      }

      toast.success('Appel enregistré !');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      error('❌ Erreur:', err);
      toast.error('Erreur lors de l\'enregistrement');
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full">
        
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
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

        <div className="p-6">
          
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
        </div>
      </div>
    </div>
  );
}