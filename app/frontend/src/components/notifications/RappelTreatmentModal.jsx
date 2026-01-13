import React, { useState, useEffect } from 'react';
import {
  X, Phone, Mail, Building2, User, Clock, Calendar, CheckCircle,
  AlertCircle, RefreshCw, MessageSquare, FileText, MapPin, Globe,
  PhoneCall, Loader2
} from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function RappelTreatmentModal({ rappel, onClose, onSuccess }) {
  const [loading, setLoading] = useState(true);
  const [leadDetails, setLeadDetails] = useState(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('10:00');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    loadLeadDetails();
  }, [rappel]);

  const loadLeadDetails = async () => {
    try {
      setLoading(true);

      // Charger les détails du lead
      if (rappel.lead_id) {
        const [leadRes, historyRes] = await Promise.all([
          api.get(`/leads/${rappel.lead_id}`).catch(() => null),
          api.get(`/leads/${rappel.lead_id}/history`).catch(() => ({ data: { history: [] } }))
        ]);

        if (leadRes?.data) {
          setLeadDetails(leadRes.data.lead || leadRes.data);
        }
        setHistory(historyRes?.data?.history || []);
      }
    } catch (error) {
      console.error('Erreur chargement détails:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCall = () => {
    const phone = leadDetails?.phone || rappel.lead_phone || rappel.contact_phone;
    if (phone) {
      const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
      window.location.href = `tel:${cleanPhone}`;
    }
  };

  const handleEmail = () => {
    const email = leadDetails?.email || rappel.lead_email;
    if (email) {
      window.location.href = `mailto:${email}`;
    }
  };

  const handleMarkComplete = async () => {
    try {
      setSaving(true);

      await api.patch(`/follow-ups/${rappel.id}`, {
        completed: true,
        notes: notes.trim() || rappel.notes
      });

      toast.success('Rappel marqué comme terminé !');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Erreur completion rappel:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleDate) {
      toast.error('Veuillez sélectionner une date');
      return;
    }

    try {
      setSaving(true);

      await api.patch(`/follow-ups/${rappel.id}`, {
        scheduled_date: `${rescheduleDate}T${rescheduleTime}:00`,
        notes: notes.trim() || rappel.notes
      });

      toast.success('Rappel reprogrammé !');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Erreur reprogrammation:', error);
      toast.error('Erreur lors de la reprogrammation');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOverdue = rappel.scheduled_date && new Date(rappel.scheduled_date) < new Date();

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl p-8">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`p-6 ${isOverdue ? 'bg-red-600' : 'bg-purple-600'} text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isOverdue ? (
                <AlertCircle className="w-8 h-8" />
              ) : (
                <Clock className="w-8 h-8" />
              )}
              <div>
                <h2 className="text-xl font-bold">
                  {isOverdue ? 'Rappel en retard' : 'Rappel programmé'}
                </h2>
                <p className="text-white/80 text-sm">
                  {formatDate(rappel.scheduled_date)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Titre du rappel */}
          <div className="mt-4 p-3 bg-white/10 rounded-lg">
            <p className="font-medium">{rappel.title || 'Rappel à traiter'}</p>
            {rappel.notes && (
              <p className="text-sm text-white/80 mt-1">{rappel.notes}</p>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Informations du lead */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Colonne gauche - Infos lead */}
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-600" />
                Informations du lead
              </h3>

              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Entreprise</label>
                  <p className="font-semibold text-gray-900">
                    {leadDetails?.company_name || rappel.company_name || 'Non renseigné'}
                  </p>
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Contact</label>
                  <p className="font-medium text-gray-800">
                    {rappel.contact_name || leadDetails?.contact_name || 'Non renseigné'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Téléphone</label>
                    <p className="font-medium text-gray-800">
                      {rappel.contact_phone || leadDetails?.phone || rappel.lead_phone || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Email</label>
                    <p className="font-medium text-gray-800 text-sm truncate">
                      {leadDetails?.email || rappel.lead_email || '-'}
                    </p>
                  </div>
                </div>

                {(leadDetails?.city || leadDetails?.address) && (
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Adresse</label>
                    <p className="font-medium text-gray-800 flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {leadDetails.address ? `${leadDetails.address}, ` : ''}{leadDetails.city}
                    </p>
                  </div>
                )}

                {leadDetails?.website && (
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Site web</label>
                    <a
                      href={leadDetails.website.startsWith('http') ? leadDetails.website : `https://${leadDetails.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Globe className="w-4 h-4" />
                      {leadDetails.website}
                    </a>
                  </div>
                )}

                {leadDetails?.sector && (
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Secteur</label>
                    <p className="font-medium text-gray-800">{leadDetails.sector}</p>
                  </div>
                )}
              </div>

              {/* Boutons d'action principaux */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCall}
                  disabled={!leadDetails?.phone && !rappel.lead_phone && !rappel.contact_phone}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <PhoneCall className="w-5 h-5" />
                  Appeler
                </button>
                <button
                  onClick={handleEmail}
                  disabled={!leadDetails?.email && !rappel.lead_email}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Mail className="w-5 h-5" />
                  Email
                </button>
              </div>
            </div>

            {/* Colonne droite - Actions et historique */}
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-600" />
                Notes de l'appel
              </h3>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notez ici le résultat de l'appel, les informations importantes..."
                className="w-full h-32 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
              />

              {/* Historique des interactions */}
              {history.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Historique récent
                  </h4>
                  <div className="bg-gray-50 rounded-xl p-3 max-h-40 overflow-y-auto space-y-2">
                    {history.slice(0, 5).map((item, index) => (
                      <div key={index} className="text-sm border-b border-gray-200 pb-2 last:border-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">{item.action || item.type}</span>
                          <span className="text-xs text-gray-500">{formatDate(item.created_at)}</span>
                        </div>
                        {item.notes && (
                          <p className="text-gray-600 text-xs mt-1">{item.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reprogrammation */}
              {showReschedule && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <h4 className="font-medium text-yellow-800 mb-3">Reprogrammer le rappel</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <input
                        type="date"
                        value={rescheduleDate}
                        onChange={(e) => setRescheduleDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Heure</label>
                      <input
                        type="time"
                        value={rescheduleTime}
                        onChange={(e) => setRescheduleTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleReschedule}
                    disabled={saving || !rescheduleDate}
                    className="mt-3 w-full py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 disabled:opacity-50"
                  >
                    {saving ? 'Enregistrement...' : 'Confirmer la reprogrammation'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer avec actions */}
        <div className="p-4 bg-gray-50 border-t flex items-center justify-between gap-3">
          <button
            onClick={() => setShowReschedule(!showReschedule)}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg font-medium hover:bg-yellow-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {showReschedule ? 'Annuler reprog.' : 'Reprogrammer'}
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Fermer
            </button>
            <button
              onClick={handleMarkComplete}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Marquer terminé
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
