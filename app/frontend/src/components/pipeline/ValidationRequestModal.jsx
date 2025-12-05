import { log, error, warn } from "./../../lib/logger.js";
import { useState } from 'react';
import { X, AlertCircle, HelpCircle, CheckCircle, UserCog } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function ValidationRequestModal({ isOpen, onClose, lead, type = 'validation' }) {
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    priority: 'normal'
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await api.post('/validation-requests', {
        type: type,
        lead_id: lead?.lead_id || lead?.id, // ✅ Utiliser lead_id (vrai lead) ou fallback sur id
        campaign_id: lead?.campaign_id,
        subject: formData.subject,
        message: formData.message,
        priority: formData.priority
      });

      // Succès
      const messages = {
        validation: 'validation',
        help: 'd\'aide',
        leadshow: 'd\'escalade (Lead Show)'
      };
      toast.success(`✅ Demande de ${messages[type] || 'validation'} envoyée au manager`);

      // Réinitialiser et fermer
      setFormData({ subject: '', message: '', priority: 'normal' });
      onClose();
    } catch (err) {
      error('Erreur création demande:', err);
      const errorMsg = err.response?.data?.error || 'Erreur lors de la création de la demande';
      setError(errorMsg);
      toast.error(`❌ ${errorMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isValidation = type === 'validation';
  const isHelp = type === 'help';
  const isLeadShow = type === 'leadshow';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`p-6 border-b flex items-center justify-between ${
          isValidation
            ? 'bg-gradient-to-r from-green-500 to-emerald-600'
            : isLeadShow
            ? 'bg-gradient-to-r from-purple-500 to-purple-600'
            : 'bg-gradient-to-r from-blue-500 to-indigo-600'
        }`}>
          <div className="flex items-center gap-3 text-white">
            {isValidation ? (
              <CheckCircle className="w-7 h-7" />
            ) : isLeadShow ? (
              <UserCog className="w-7 h-7" />
            ) : (
              <HelpCircle className="w-7 h-7" />
            )}
            <div>
              <h2 className="text-2xl font-bold">
                {isValidation ? 'Demande de Validation' : isLeadShow ? 'Lead Show / Escalade' : 'Demande d\'Aide'}
              </h2>
              <p className="text-white/90 text-sm">
                {isLeadShow ? 'Le prospect souhaite parler à un responsable' : 'Votre manager sera notifié immédiatement'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Lead info */}
        {lead && (
          <div className="p-4 bg-gray-50 border-b">
            <div className="text-sm">
              <span className="font-semibold text-gray-700">Lead concerné:</span>
              <span className="ml-2 text-gray-900 font-medium">
                {lead.company_name || lead.contact_name || 'Lead sans nom'}
              </span>
              {lead.contact_name && lead.company_name && (
                <span className="ml-2 text-gray-600">
                  ({lead.contact_name})
                </span>
              )}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          {/* Sujet */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Sujet *
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder={
                isValidation
                  ? 'Ex: Validation deal 50k€ avec prospect qualifié'
                  : isLeadShow
                  ? 'Ex: Lead demande à parler au directeur commercial'
                  : 'Ex: Besoin d\'aide sur objection prix'
              }
              required
              maxLength={255}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Priorité */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Priorité
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="low">Basse - Peut attendre</option>
              <option value="normal">Normale - Standard</option>
              <option value="high">Haute - Important</option>
              <option value="urgent">Urgente - Nécessite attention immédiate</option>
            </select>
          </div>

          {/* Message */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Message détaillé
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder={
                isValidation
                  ? 'Décrivez le contexte de la validation demandée:\n- Montant du deal\n- Conditions négociées\n- Raison de la demande\n- Échéance si applicable'
                  : isLeadShow
                  ? 'Décrivez la demande du prospect:\n- Raison de l\'escalade\n- Attentes du prospect\n- Contexte de la discussion\n- Urgence de la situation'
                  : 'Décrivez votre problème ou question:\n- Contexte de la situation\n- Ce que vous avez déjà essayé\n- Aide spécifique souhaitée'
              }
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              Plus vous donnez de détails, plus votre manager pourra vous aider efficacement
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold text-gray-700 transition"
              disabled={submitting}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting || !formData.subject.trim()}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold text-white transition ${
                isValidation
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                  : isLeadShow
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Envoi en cours...
                </span>
              ) : (
                `Envoyer la demande ${isValidation ? 'de validation' : isLeadShow ? 'd\'escalade' : 'd\'aide'}`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
