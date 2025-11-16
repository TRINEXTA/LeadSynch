import React, { useState } from 'react';
import { X, Ban, PhoneOff, MousePointerClick, Phone, FileText, AlertTriangle } from 'lucide-react';
import api from '../../api/axios';

const REASONS = [
  {
    id: 'no_phone',
    label: 'Pas de téléphone disponible',
    icon: PhoneOff,
    color: 'gray',
    description: 'Aucun numéro de téléphone valide trouvé'
  },
  {
    id: 'after_click_no_interest',
    label: 'Après clic - Pas intéressé',
    icon: MousePointerClick,
    color: 'blue',
    description: 'A cliqué sur l\'email mais n\'est pas intéressé'
  },
  {
    id: 'called_no_interest',
    label: 'Appelé - Ne souhaite plus être contacté',
    icon: Phone,
    color: 'red',
    description: 'A demandé explicitement à ne plus être contacté'
  },
  {
    id: 'other',
    label: 'Autre raison',
    icon: FileText,
    color: 'orange',
    description: 'Autre raison spécifique (préciser dans les notes)'
  }
];

export default function DoNotContactModal({ lead, onClose, onSuccess }) {
  const [selectedReason, setSelectedReason] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedReason) {
      alert('❌ Veuillez sélectionner une raison');
      return;
    }

    setSubmitting(true);

    try {
      await api.post('/do-not-contact', {
        lead_id: lead.lead_id,
        reason: selectedReason,
        note: note.trim() || null
      });

      alert('✅ Lead marqué comme "ne pas contacter"');
      onSuccess && onSuccess();
      onClose();
    } catch (error) {
      console.error('❌ Erreur:', error);
      alert('❌ Erreur lors de la qualification');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-red-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white bg-opacity-20 p-3 rounded-xl">
              <Ban className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Ne pas contacter</h2>
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
          {/* Warning */}
          <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
            <div>
              <p className="font-bold text-orange-900 mb-1">⚠️ Action importante</p>
              <p className="text-sm text-orange-700">
                Ce lead ne sera <strong>plus contacté automatiquement</strong> par les campagnes,
                sauf autorisation explicite d'un manager.
              </p>
            </div>
          </div>

          {/* Info Lead */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
            <h3 className="font-bold text-gray-900 mb-3">📋 Informations du prospect</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Entreprise:</span>
                <span className="font-semibold text-gray-900 ml-2">{lead.company_name}</span>
              </div>
              <div>
                <span className="text-gray-600">Contact:</span>
                <span className="font-semibold text-gray-900 ml-2">{lead.contact_name || '-'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">Email:</span>
                <span className="font-semibold text-gray-900 ml-2 text-xs">{lead.email || '-'}</span>
              </div>
              <div>
                <span className="text-gray-600">Téléphone:</span>
                <span className="font-semibold text-gray-900 ml-2">{lead.phone || 'Non renseigné'}</span>
              </div>
              <div>
                <span className="text-gray-600">Stage:</span>
                <span className="font-semibold text-gray-900 ml-2">{lead.stage || '-'}</span>
              </div>
            </div>
          </div>

          {/* Raisons */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-3">
              🚫 Raison de la qualification "Ne pas contacter"
            </label>
            <div className="space-y-3">
              {REASONS.map(reason => {
                const Icon = reason.icon;
                const isSelected = selectedReason === reason.id;

                return (
                  <button
                    key={reason.id}
                    type="button"
                    onClick={() => setSelectedReason(reason.id)}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-red-400 bg-red-50 shadow-md ring-2 ring-red-200'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        isSelected ? 'bg-red-100' : 'bg-gray-100'
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          isSelected ? 'text-red-600' : 'text-gray-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`font-bold ${
                            isSelected ? 'text-red-900' : 'text-gray-900'
                          }`}>
                            {reason.label}
                          </h4>
                          {isSelected && (
                            <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                              Sélectionné
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{reason.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Note */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              📝 Notes complémentaires <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ajoutez des détails sur la raison de cette qualification..."
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 mt-2">
              💡 Ces notes seront visibles par les managers
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
              disabled={submitting || !selectedReason}
              className="flex-1 bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Qualification...
                </>
              ) : (
                <>
                  <Ban className="w-5 h-5" />
                  Marquer "Ne pas contacter"
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
