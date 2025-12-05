<<<<<<< HEAD
import { log, error, warn } from "./../lib/logger.js";
=======
import { log, error, warn } from "../lib/logger.js";
>>>>>>> origin/main
import React, { useState } from 'react';
import { X, Phone, Clock, MessageSquare, Calendar, CheckCircle, Sparkles, Mail, Loader } from 'lucide-react';
import api from '../api/axios';
import EmailPreviewModal from './EmailPreviewModal';

const QUALIFICATIONS = [
  { id: 'nrp', label: 'NRP - Ne répond pas', stage: 'nrp', color: 'gray' },
  { id: 'mauvais_contact', label: 'Mauvais contact', stage: 'hors_scope', color: 'orange' },
  { id: 'qualifie', label: 'Qualifié - Intéressé', stage: 'qualifie', color: 'blue' },
  { id: 'a_relancer', label: 'À relancer plus tard', stage: 'relancer', color: 'yellow' },
  { id: 'tres_qualifie', label: 'Très qualifié / RDV pris', stage: 'tres_qualifie', color: 'green' },
  { id: 'proposition', label: 'En attente proposition', stage: 'proposition', color: 'purple' },
  { id: 'gagne', label: 'Client gagné !', stage: 'gagne', color: 'emerald' },
];

export default function QualificationModal({ lead, callDuration, notes: initialNotes, onClose, onQualify }) {
  const [selectedQualification, setSelectedQualification] = useState(null);
  const [notes, setNotes] = useState(initialNotes || '');
  const [nextAction, setNextAction] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState(null);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [generationsUsed, setGenerationsUsed] = useState(0);

  const handleSubmit = async () => {
    if (!selectedQualification) {
      alert('Veuillez sélectionner une qualification');
      return;
    }

    setLoading(true);

    const qualification = QUALIFICATIONS.find(q => q.id === selectedQualification);

    await onQualify({
      stage: qualification.stage,
      qualification: selectedQualification,
      notes,
      call_duration: callDuration,
      next_action: nextAction,
      scheduled_date: scheduledDate || null
    });

    setLoading(false);
    onClose();
  };

  const handleGenerateEmail = async () => {
    if (!notes || notes.trim().length < 10) {
      alert('Veuillez ajouter des notes de l\'appel (minimum 10 caractères) pour générer un email pertinent.');
      return;
    }

    setGeneratingEmail(true);

    try {
      const response = await api.post('/asefi/generate-email-from-notes', {
        lead_info: {
          company_name: lead.company_name,
          contact_name: lead.contact_name,
          email: lead.email,
          phone: lead.phone,
          city: lead.city,
          sector: lead.sector || 'B2B'
        },
        call_notes: notes,
        qualification: selectedQualification || 'qualifie',
        user_signature: {
          name: 'Votre nom',
          title: 'Votre titre',
          company: 'Votre entreprise',
          email: 'votre@email.com',
          phone: 'Votre téléphone'
        }
      });

      if (response.data.success) {
        setGeneratedEmail(response.data.email);
        setGenerationsUsed(1);
        setShowEmailPreview(true);
        log('✅ Email généré par IA:', response.data.email);
      }
    } catch (error) {
      error('❌ Erreur génération email:', error);
      alert('Erreur lors de la génération de l\'email. Réessayez.');
    } finally {
      setGeneratingEmail(false);
    }
  };

  const handleRegenerateWithTone = async (tone) => {
    try {
      const response = await api.post('/asefi/regenerate-email-with-tone', {
        lead_info: {
          company_name: lead.company_name,
          contact_name: lead.contact_name,
          email: lead.email,
          phone: lead.phone,
          city: lead.city,
          sector: lead.sector || 'B2B'
        },
        call_notes: notes,
        qualification: selectedQualification || 'qualifie',
        tone: tone,
        user_signature: {
          name: 'Votre nom',
          title: 'Votre titre',
          company: 'Votre entreprise',
          email: 'votre@email.com',
          phone: 'Votre téléphone'
        }
      });

      if (response.data.success) {
        setGeneratedEmail(response.data.email);
        setGenerationsUsed(prev => prev + 1);
        log(`✅ Email régénéré avec ton: ${tone}`);
      }
    } catch (error) {
      error('❌ Erreur régénération email:', error);
      alert('Erreur lors de la régénération. Réessayez.');
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (showEmailPreview && generatedEmail) {
    return (
      <EmailPreviewModal
        email={generatedEmail}
        lead={lead}
        onClose={() => setShowEmailPreview(false)}
        onRegenerateWithTone={handleRegenerateWithTone}
        generationsUsed={generationsUsed}
        maxGenerations={2}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Qualifier l'appel</h2>
            <p className="text-purple-100 text-sm mt-1">{lead.company_name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex items-center gap-3">
            <Clock className="w-6 h-6 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Durée de l'appel</p>
              <p className="text-2xl font-bold text-blue-700">{formatDuration(callDuration)}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              <Phone className="inline w-4 h-4 mr-2" />
              Comment s'est passé l'appel ?
            </label>
            <div className="grid grid-cols-1 gap-3">
              {QUALIFICATIONS.map((qual) => {
                const isSelected = selectedQualification === qual.id;
                return (
                  <button
                    key={qual.id}
                    onClick={() => setSelectedQualification(qual.id)}
                    className={`relative border-2 rounded-xl p-4 text-left transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{qual.label}</span>
                      {isSelected && (
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <MessageSquare className="inline w-4 h-4 mr-2" />
              Notes de l'appel
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Qu'avez-vous discuté ? Points importants..."
              className="w-full border-2 border-gray-200 rounded-xl p-4 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all resize-none"
              rows={4}
            />
            
            {notes && notes.length >= 10 && (
              <button
                onClick={handleGenerateEmail}
                disabled={generatingEmail}
                className="mt-3 w-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-purple-600 hover:via-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2 animate-shimmer"
              >
                {generatingEmail ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Asefi génère votre email...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    🤖 Générer email avec Asefi
                  </>
                )}
              </button>
            )}
          </div>

          {['a_relancer', 'tres_qualifie', 'proposition'].includes(selectedQualification) && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Prochaine action
                </label>
                <input
                  type="text"
                  value={nextAction}
                  onChange={(e) => setNextAction(e.target.value)}
                  placeholder="Ex: Envoyer proposition, Relancer le 15/03..."
                  className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Calendar className="inline w-4 h-4 mr-2" />
                  Date de relance / RDV
                </label>
                <input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all"
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-200 transition-all"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !selectedQualification}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              {loading ? 'Enregistrement...' : 'Valider'}
            </button>
          </div>
        </div>

        <style jsx>{`
          @keyframes shimmer {
            0% { background-position: -200% center; }
            100% { background-position: 200% center; }
          }
          .animate-shimmer {
            background-size: 200% auto;
            animation: shimmer 3s linear infinite;
          }
        `}</style>
      </div>
    </div>
  );
}