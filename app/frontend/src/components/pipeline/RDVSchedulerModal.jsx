import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  FileText,
  Video,
  Phone,
  Users,
  Building,
  CheckCircle,
  Loader2
} from 'lucide-react';
import api from '../../api/axios';
import { toast } from '../../lib/toast';

// Types de RDV
const RDV_TYPES = [
  { id: 'meeting', label: 'Réunion physique', icon: Users, color: 'bg-blue-500' },
  { id: 'video', label: 'Visioconférence', icon: Video, color: 'bg-purple-500' },
  { id: 'call', label: 'Appel téléphonique', icon: Phone, color: 'bg-green-500' },
];

export default function RDVSchedulerModal({
  isOpen,
  onClose,
  lead,
  onSuccess,
  qualification = 'tres_qualifie'
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    rdvType: 'meeting',
    date: '',
    startTime: '10:00',
    endTime: '11:00',
    location: '',
    notes: '',
    createFollowUp: true, // Créer aussi un rappel
  });

  if (!isOpen || !lead) return null;

  // Générer la date minimale (aujourd'hui)
  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.date) {
      toast.warning('Veuillez sélectionner une date pour le RDV');
      return;
    }

    setLoading(true);

    try {
      // 1. Créer l'événement dans le planning
      const planningPayload = {
        title: `RDV - ${lead.company_name}`,
        description: `Contact: ${lead.contact_name || 'Non renseigné'}\nTéléphone: ${lead.phone || 'Non renseigné'}\nEmail: ${lead.email || 'Non renseigné'}\n\n${formData.notes}`,
        event_type: formData.rdvType,
        start_date: formData.date,
        start_time: formData.startTime,
        end_date: formData.date,
        end_time: formData.endTime,
        location: formData.location,
        all_day: false,
        // Metadata pour lier au lead
        lead_id: lead.lead_id || lead.id,
        pipeline_lead_id: lead.id
      };

      await api.post('/planning', planningPayload);

      // 2. Qualifier le lead comme "très qualifié"
      await api.post(`/pipeline-leads/${lead.id}/qualify`, {
        qualification: qualification,
        stage: 'tres_qualifie',
        notes: formData.notes,
        next_action: `RDV prévu le ${new Date(formData.date).toLocaleDateString('fr-FR')} à ${formData.startTime}`,
        scheduled_date: `${formData.date}T${formData.startTime}:00`
      });

      // 3. Enregistrer l'action dans l'historique
      await api.post(`/pipeline-leads/${lead.id}/action`, {
        action_type: 'rdv_scheduled',
        notes: `📅 RDV planifié le ${new Date(formData.date).toLocaleDateString('fr-FR')} à ${formData.startTime}\nType: ${RDV_TYPES.find(t => t.id === formData.rdvType)?.label}\nLieu: ${formData.location || 'Non précisé'}\n\n${formData.notes || ''}`
      });

      toast.success('RDV planifié avec succès !');

      if (onSuccess) {
        onSuccess({
          date: formData.date,
          time: formData.startTime,
          type: formData.rdvType
        });
      }

      onClose();
    } catch (err) {
      console.error('Erreur création RDV:', err);
      toast.error(err.response?.data?.error || 'Erreur lors de la création du RDV');
    } finally {
      setLoading(false);
    }
  };

  const selectedType = RDV_TYPES.find(t => t.id === formData.rdvType);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Planifier un RDV</h2>
                <p className="text-green-100 text-sm">{lead.company_name}</p>
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
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <Building className="w-5 h-5 text-gray-500" />
              <span className="font-semibold text-gray-900">{lead.company_name}</span>
            </div>
            {lead.contact_name && (
              <p className="text-sm text-gray-600 ml-8">{lead.contact_name}</p>
            )}
            {lead.phone && (
              <p className="text-sm text-gray-600 ml-8">{lead.phone}</p>
            )}
          </div>

          {/* Type de RDV */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Type de rendez-vous
            </label>
            <div className="grid grid-cols-3 gap-3">
              {RDV_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = formData.rdvType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, rdvType: type.id })}
                    className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? `${type.color} text-white border-transparent shadow-lg`
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-6 h-6 mb-2" />
                    <span className="text-xs font-medium text-center">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date et Heure */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="inline w-4 h-4 mr-1" />
                Date *
              </label>
              <input
                type="date"
                required
                min={today}
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Clock className="inline w-4 h-4 mr-1" />
                Début
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fin
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all"
              />
            </div>
          </div>

          {/* Lieu */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <MapPin className="inline w-4 h-4 mr-1" />
              {formData.rdvType === 'video' ? 'Lien visio' : formData.rdvType === 'call' ? 'Numéro à appeler' : 'Lieu du RDV'}
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder={
                formData.rdvType === 'video'
                  ? 'https://meet.google.com/...'
                  : formData.rdvType === 'call'
                  ? lead.phone || 'Numéro de téléphone'
                  : 'Adresse ou lieu de rendez-vous'
              }
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <FileText className="inline w-4 h-4 mr-1" />
              Notes / Ordre du jour
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Points à aborder, objectifs du RDV..."
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all resize-none"
            />
          </div>

          {/* Options */}
          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.createFollowUp}
                onChange={(e) => setFormData({ ...formData, createFollowUp: e.target.checked })}
                className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <div>
                <span className="font-medium text-gray-900">Créer un rappel</span>
                <p className="text-sm text-gray-600">Recevoir une notification avant le RDV</p>
              </div>
            </label>
          </div>

          {/* Résumé */}
          {formData.date && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-800">Récapitulatif</span>
              </div>
              <p className="text-sm text-green-700">
                {selectedType?.label} avec <strong>{lead.company_name}</strong>
                <br />
                📅 {new Date(formData.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                <br />
                🕐 {formData.startTime} - {formData.endTime}
                {formData.location && (
                  <>
                    <br />
                    📍 {formData.location}
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
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Calendar className="w-5 h-5" />
                  Planifier le RDV
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
