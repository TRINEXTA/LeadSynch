import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  Phone,
  Mail,
  User,
  FileText,
  Bell,
  Building,
  Loader2,
  AlertCircle
} from 'lucide-react';
import api from '../../api/axios';
import { toast } from '../../lib/toast';

// Types de rappel
const RAPPEL_TYPES = [
  { id: 'call', label: 'Appel téléphonique', icon: Phone, color: 'bg-green-500' },
  { id: 'email', label: 'Envoi email', icon: Mail, color: 'bg-blue-500' },
];

// Priorités
const PRIORITIES = [
  { id: 'low', label: 'Basse', color: 'bg-gray-400' },
  { id: 'medium', label: 'Normale', color: 'bg-yellow-500' },
  { id: 'high', label: 'Haute', color: 'bg-orange-500' },
  { id: 'urgent', label: 'Urgente', color: 'bg-red-500' },
];

export default function RappelModal({
  isOpen,
  onClose,
  lead,
  onSuccess,
  initialNotes = '',
  qualification = null
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'call',
    priority: 'medium',
    date: '',
    time: '10:00',
    contact_name: lead?.contact_name || '',
    contact_phone: lead?.phone || '',
    contact_method: 'phone',
    title: '',
    notes: initialNotes || '',
  });

  // Mettre à jour les valeurs du lead quand il change
  useEffect(() => {
    if (lead) {
      setFormData(prev => ({
        ...prev,
        contact_name: lead.contact_name || '',
        contact_phone: lead.phone || '',
      }));
    }
  }, [lead]);

  // Générer la date minimale (aujourd'hui)
  const today = new Date().toISOString().split('T')[0];

  // Générer un titre par défaut basé sur la qualification
  useEffect(() => {
    if (qualification && !formData.title) {
      const qualificationLabels = {
        'a_relancer': 'Relance',
        'tres_qualifie': 'RDV',
        'qualifie': 'Suivi lead qualifié',
        'nrp': 'Rappel NRP',
        'proposition': 'Suivi proposition',
      };
      const defaultTitle = qualificationLabels[qualification] || 'Rappel';
      setFormData(prev => ({
        ...prev,
        title: `${defaultTitle} - ${lead?.company_name || 'Lead'}`
      }));
    }
  }, [qualification, lead]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.date) {
      toast.warning('Veuillez sélectionner une date');
      return;
    }

    setLoading(true);

    try {
      // Créer le rappel
      const scheduledDate = `${formData.date}T${formData.time}:00`;

      const payload = {
        lead_id: lead?.lead_id || lead?.id,
        type: formData.type,
        priority: formData.priority,
        title: formData.title || `Rappel - ${lead?.company_name || 'Lead'}`,
        notes: formData.notes,
        scheduled_date: scheduledDate,
        contact_name: formData.contact_name,
        contact_phone: formData.contact_phone,
        contact_method: formData.contact_method,
      };

      const response = await api.post('/follow-ups', payload);

      if (response.data.success) {
        toast.success('Rappel créé avec succès !');

        if (onSuccess) {
          onSuccess({
            followup: response.data.followup,
            date: formData.date,
            time: formData.time,
            type: formData.type
          });
        }

        onClose();
      }
    } catch (err) {
      console.error('Erreur création rappel:', err);
      toast.error(err.response?.data?.error || 'Erreur lors de la création du rappel');
    } finally {
      setLoading(false);
    }
  };

  const selectedType = RAPPEL_TYPES.find(t => t.id === formData.type);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Créer un rappel</h2>
                {lead?.company_name && (
                  <p className="text-yellow-100 text-sm">{lead.company_name}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Info lead */}
          {lead && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <Building className="w-5 h-5 text-gray-500" />
                <span className="font-semibold text-gray-900">{lead.company_name}</span>
              </div>
              {lead.contact_name && (
                <p className="text-sm text-gray-600 ml-8">{lead.contact_name}</p>
              )}
              {lead.email && (
                <p className="text-sm text-gray-600 ml-8">{lead.email}</p>
              )}
            </div>
          )}

          {/* Type de rappel (Téléphone ou Email) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Type de rappel *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {RAPPEL_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = formData.contact_method === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      contact_method: type.id,
                      type: type.id
                    })}
                    className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? `${type.color} text-white border-transparent shadow-lg`
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-6 h-6 mb-2" />
                    <span className="text-sm font-medium">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date et Heure */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="inline w-4 h-4 mr-1" />
                Date du rappel *
              </label>
              <input
                type="date"
                required
                min={today}
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Clock className="inline w-4 h-4 mr-1" />
                Heure
              </label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100 transition-all"
              />
            </div>
          </div>

          {/* Personne à contacter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <User className="inline w-4 h-4 mr-1" />
              Personne à contacter
            </label>
            <input
              type="text"
              value={formData.contact_name}
              onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
              placeholder="Nom du contact (si différent du contact principal)"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100 transition-all"
            />
          </div>

          {/* Numéro de téléphone (si type = call) */}
          {formData.contact_method === 'phone' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Phone className="inline w-4 h-4 mr-1" />
                Numéro à appeler
              </label>
              <input
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="Numéro de téléphone"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100 transition-all"
              />
              {lead?.phone && formData.contact_phone !== lead.phone && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, contact_phone: lead.phone })}
                  className="mt-2 text-sm text-blue-600 hover:underline"
                >
                  Utiliser le numéro du lead : {lead.phone}
                </button>
              )}
            </div>
          )}

          {/* Priorité */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Priorité
            </label>
            <div className="flex gap-2">
              {PRIORITIES.map((priority) => {
                const isSelected = formData.priority === priority.id;
                return (
                  <button
                    key={priority.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority: priority.id })}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      isSelected
                        ? `${priority.color} text-white shadow-md`
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {priority.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Titre du rappel */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Titre du rappel
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Relance devis, Confirmation RDV..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100 transition-all"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <FileText className="inline w-4 h-4 mr-1" />
              Notes / Instructions
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Points à aborder, contexte de l'appel..."
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100 transition-all resize-none"
            />
          </div>

          {/* Récapitulatif */}
          {formData.date && (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="w-5 h-5 text-yellow-600" />
                <span className="font-semibold text-yellow-800">Récapitulatif</span>
              </div>
              <p className="text-sm text-yellow-700">
                <strong>{selectedType?.label || 'Rappel'}</strong>
                {formData.contact_name && ` avec ${formData.contact_name}`}
                <br />
                📅 {new Date(formData.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                <br />
                🕐 {formData.time}
                {formData.contact_method === 'phone' && formData.contact_phone && (
                  <>
                    <br />
                    📞 {formData.contact_phone}
                  </>
                )}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !formData.date}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Bell className="w-5 h-5" />
                  Créer le rappel
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
