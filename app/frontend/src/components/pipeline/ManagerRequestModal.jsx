import React, { useState } from 'react';
import { X, AlertCircle, UserCheck, Eye, CheckCircle } from 'lucide-react';
import api from '../../api/axios';

const REQUEST_TYPES = {
  help: {
    id: 'help',
    title: 'Demande d\'aide Manager',
    icon: AlertCircle,
    color: 'orange',
    bgColor: 'bg-orange-500',
    lightBg: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-700',
    description: 'Vous avez besoin de l\'aide d\'un manager pour ce prospect',
    placeholder: 'Décrivez la situation et ce dont vous avez besoin...'
  },
  validation: {
    id: 'validation',
    title: 'Demande de Validation',
    icon: UserCheck,
    color: 'blue',
    bgColor: 'bg-blue-500',
    lightBg: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    description: 'Demandez à un manager de valider votre approche ou proposition',
    placeholder: 'Que souhaitez-vous faire valider ?'
  },
  show: {
    id: 'show',
    title: 'Prospect Prioritaire',
    icon: Eye,
    color: 'purple',
    bgColor: 'bg-purple-500',
    lightBg: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    description: 'Marquer ce prospect comme prioritaire pour le manager',
    placeholder: 'Pourquoi ce prospect est-il prioritaire ?'
  }
};

export default function ManagerRequestModal({ lead, requestType, onClose, onSuccess }) {
  const [message, setMessage] = useState('');
  const [urgency, setUrgency] = useState('normal');
  const [submitting, setSubmitting] = useState(false);

  const config = REQUEST_TYPES[requestType] || REQUEST_TYPES.help;
  const Icon = config.icon;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!message.trim()) {
      alert('❌ Veuillez décrire votre demande');
      return;
    }

    setSubmitting(true);

    try {
      await api.post('/manager-requests', {
        lead_id: lead.lead_id,
        request_type: requestType,
        message: message.trim(),
        urgency
      });

      alert(`✅ Demande envoyée au manager !`);
      onSuccess && onSuccess();
      onClose();
    } catch (error) {
      console.error('❌ Erreur envoi demande:', error);
      alert('❌ Erreur lors de l\'envoi de la demande');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`${config.bgColor} text-white p-6 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="bg-white bg-opacity-20 p-3 rounded-xl">
              <Icon className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{config.title}</h2>
              <p className="text-sm opacity-90 mt-1">{lead.company_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Info Lead */}
          <div className={`${config.lightBg} border ${config.borderColor} rounded-xl p-4 mb-6`}>
            <h3 className="font-bold text-gray-900 mb-2">📋 Informations du prospect</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Entreprise:</span>
                <span className="font-semibold text-gray-900 ml-2">{lead.company_name}</span>
              </div>
              <div>
                <span className="text-gray-600">Contact:</span>
                <span className="font-semibold text-gray-900 ml-2">{lead.contact_name || '-'}</span>
              </div>
              <div>
                <span className="text-gray-600">Email:</span>
                <span className="font-semibold text-gray-900 ml-2 text-xs">{lead.email || '-'}</span>
              </div>
              <div>
                <span className="text-gray-600">Valeur:</span>
                <span className="font-semibold text-green-600 ml-2">
                  {lead.deal_value ? `${lead.deal_value.toLocaleString()}€` : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <p className={`${config.textColor} text-sm font-semibold mb-3 flex items-center gap-2`}>
              <Icon className="w-4 h-4" />
              {config.description}
            </p>
          </div>

          {/* Urgence */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-3">
              🚨 Niveau d'urgence
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setUrgency('low')}
                className={`p-3 rounded-xl border-2 transition-all ${
                  urgency === 'low'
                    ? 'border-gray-400 bg-gray-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-1">🟢</div>
                <div className="text-xs font-bold text-gray-700">Faible</div>
              </button>
              <button
                type="button"
                onClick={() => setUrgency('normal')}
                className={`p-3 rounded-xl border-2 transition-all ${
                  urgency === 'normal'
                    ? 'border-orange-400 bg-orange-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-1">🟠</div>
                <div className="text-xs font-bold text-gray-700">Normal</div>
              </button>
              <button
                type="button"
                onClick={() => setUrgency('urgent')}
                className={`p-3 rounded-xl border-2 transition-all ${
                  urgency === 'urgent'
                    ? 'border-red-400 bg-red-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-1">🔴</div>
                <div className="text-xs font-bold text-gray-700">Urgent</div>
              </button>
            </div>
          </div>

          {/* Message */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              📝 Votre message au manager
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={config.placeholder}
              rows={6}
              required
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 mt-2">
              💡 Soyez précis pour que le manager puisse vous aider efficacement
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`flex-1 ${config.bgColor} text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2`}
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Envoi...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Envoyer au Manager
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
