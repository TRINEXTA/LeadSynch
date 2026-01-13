import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Sparkles,
  FileText,
  Send,
  RefreshCw,
  Building,
  Copy,
  ExternalLink,
  Loader2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Check
} from 'lucide-react';
import api from '../../api/axios';
import { toast } from '../../lib/toast';

// Types d'emails disponibles
const EMAIL_TYPES = [
  { id: 'first_contact', label: 'Premier contact', description: 'Email de prospection initial' },
  { id: 'follow_up', label: 'Suivi / Relance', description: 'Email de relance après un échange' },
  { id: 'proposal', label: 'Envoi proposition', description: 'Accompagnement d\'une proposition' },
  { id: 'meeting_request', label: 'Demande de RDV', description: 'Proposition de rendez-vous' },
  { id: 'thank_you', label: 'Remerciement', description: 'Email de remerciement post-appel' },
  { id: 'reconnection', label: 'Reprise de contact', description: 'Après une période sans échange' },
];

// Tons disponibles
const TONES = [
  { id: 'friendly', label: 'Amical', emoji: '😊' },
  { id: 'professional', label: 'Professionnel', emoji: '👔' },
  { id: 'direct', label: 'Direct', emoji: '🎯' },
  { id: 'enthusiastic', label: 'Enthousiaste', emoji: '🚀' },
];

export default function EmailGeneratorModal({
  isOpen,
  onClose,
  lead,
  callNotes = '',
  onSuccess
}) {
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState(null);
  const [showNotesSection, setShowNotesSection] = useState(!!callNotes);

  const [formData, setFormData] = useState({
    emailType: 'follow_up',
    tone: 'friendly',
    selectedNotes: callNotes || '',
    customInstructions: '',
    useNotes: !!callNotes,
  });

  // Mettre à jour les notes quand elles changent
  useEffect(() => {
    if (callNotes) {
      setFormData(prev => ({
        ...prev,
        selectedNotes: callNotes,
        useNotes: true
      }));
      setShowNotesSection(true);
    }
  }, [callNotes]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setLoading(true);

    try {
      // Si on a des notes ou des instructions, utiliser l'endpoint avec notes
      if (formData.useNotes && formData.selectedNotes.trim()) {
        const response = await api.post('/asefi/generate-email-from-notes', {
          lead_info: {
            company_name: lead?.company_name,
            contact_name: lead?.contact_name,
            email: lead?.email,
            phone: lead?.phone,
            city: lead?.city,
            sector: lead?.sector || 'B2B'
          },
          call_notes: formData.selectedNotes,
          custom_instructions: formData.customInstructions || null,
          qualification: formData.emailType,
          user_signature: {
            name: 'Votre nom',
            title: 'Votre titre',
            company: 'Votre entreprise'
          }
        });

        if (response.data.success) {
          setGeneratedEmail(response.data.email);
        }
      } else {
        // Sinon, utiliser l'endpoint quick-email avec instructions custom
        const response = await api.post('/asefi/generate-quick-email', {
          template_type: formData.emailType,
          lead_info: {
            company_name: lead?.company_name,
            industry: lead?.sector || 'B2B',
            status: 'nouveau'
          },
          tone: formData.tone,
          custom_instructions: formData.customInstructions || null,
          user_signature: {
            name: 'Votre nom',
            title: 'Votre titre',
            company: 'Votre entreprise'
          }
        });

        if (response.data.success) {
          setGeneratedEmail(response.data.email);
        }
      }
    } catch (error) {
      console.error('Erreur génération email:', error);
      toast.error('Erreur lors de la génération de l\'email');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateWithTone = async (tone) => {
    setRegenerating(true);

    try {
      const response = await api.post('/asefi/regenerate-email-with-tone', {
        lead_info: {
          company_name: lead?.company_name,
          contact_name: lead?.contact_name,
          email: lead?.email,
          sector: lead?.sector || 'B2B'
        },
        call_notes: formData.selectedNotes || '',
        qualification: formData.emailType,
        tone: tone,
        user_signature: {
          name: 'Votre nom',
          title: 'Votre titre',
          company: 'Votre entreprise'
        }
      });

      if (response.data.success) {
        setGeneratedEmail(response.data.email);
        setFormData(prev => ({ ...prev, tone }));
        toast.success(`Email régénéré avec le ton "${TONES.find(t => t.id === tone)?.label}"`);
      }
    } catch (error) {
      console.error('Erreur régénération:', error);
      toast.error('Erreur lors de la régénération');
    } finally {
      setRegenerating(false);
    }
  };

  const handleSendEmail = () => {
    if (!generatedEmail || !lead?.email) return;

    const subject = encodeURIComponent(generatedEmail.subject);
    const body = encodeURIComponent(`${generatedEmail.body}\n\n${generatedEmail.cta || ''}`);
    const to = encodeURIComponent(lead.email);

    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;

    if (onSuccess) {
      onSuccess({ email: generatedEmail, sent: true });
    }

    onClose();
  };

  const handleCopyEmail = () => {
    if (!generatedEmail) return;

    const fullEmail = `Objet: ${generatedEmail.subject}\n\n${generatedEmail.body}\n\n${generatedEmail.cta || ''}`;
    navigator.clipboard.writeText(fullEmail);
    toast.success('Email copié dans le presse-papier !');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Générer un email avec Asefi</h2>
                {lead?.company_name && (
                  <p className="text-blue-100 text-sm">{lead.company_name}</p>
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

        {/* Contenu */}
        <div className="p-6 space-y-6">
          {/* Info lead */}
          {lead && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <Building className="w-5 h-5 text-gray-500" />
                <div>
                  <span className="font-semibold text-gray-900">{lead.company_name}</span>
                  {lead.email && (
                    <p className="text-sm text-gray-600">{lead.email}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Section Notes de l'appel */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowNotesSection(!showNotesSection)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-gray-900">Notes de l'appel</span>
                {formData.useNotes && formData.selectedNotes && (
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                    Sera utilisé
                  </span>
                )}
              </div>
              {showNotesSection ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>

            {showNotesSection && (
              <div className="p-4 space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.useNotes}
                    onChange={(e) => setFormData({ ...formData, useNotes: e.target.checked })}
                    className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">
                    Utiliser les notes pour personnaliser l'email
                  </span>
                </label>

                <textarea
                  value={formData.selectedNotes}
                  onChange={(e) => setFormData({ ...formData, selectedNotes: e.target.value })}
                  placeholder="Collez ou modifiez les notes de l'appel ici..."
                  rows={4}
                  disabled={!formData.useNotes}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all resize-none disabled:bg-gray-100 disabled:opacity-60"
                />
              </div>
            )}
          </div>

          {/* Type d'email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Type d'email
            </label>
            <div className="grid grid-cols-2 gap-2">
              {EMAIL_TYPES.map((type) => {
                const isSelected = formData.emailType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, emailType: type.id })}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{type.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-purple-600" />}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ton de l'email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Ton de l'email
            </label>
            <div className="flex gap-2">
              {TONES.map((tone) => {
                const isSelected = formData.tone === tone.id;
                return (
                  <button
                    key={tone.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, tone: tone.id })}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tone.emoji} {tone.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Instructions personnalisées */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <FileText className="inline w-4 h-4 mr-1" />
              Instructions pour Asefi (optionnel)
            </label>
            <textarea
              value={formData.customInstructions}
              onChange={(e) => setFormData({ ...formData, customInstructions: e.target.value })}
              placeholder="Ex: Mentionner notre offre spéciale, parler de notre nouveau produit, insister sur l'urgence..."
              rows={2}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all resize-none"
            />
          </div>

          {/* Bouton Générer */}
          {!generatedEmail && (
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Asefi génère votre email...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Générer l'email
                </>
              )}
            </button>
          )}

          {/* Email généré */}
          {generatedEmail && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-blue-800 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Email généré par Asefi
                  </span>
                  <div className="flex gap-2">
                    {TONES.map((tone) => (
                      <button
                        key={tone.id}
                        onClick={() => handleRegenerateWithTone(tone.id)}
                        disabled={regenerating}
                        className={`p-1.5 rounded-lg text-xs transition-all ${
                          formData.tone === tone.id
                            ? 'bg-purple-600 text-white'
                            : 'bg-white text-gray-600 hover:bg-purple-100'
                        }`}
                        title={`Régénérer en mode ${tone.label}`}
                      >
                        {tone.emoji}
                      </button>
                    ))}
                    {regenerating && <Loader2 className="w-4 h-4 animate-spin text-purple-600" />}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 space-y-3">
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Objet</span>
                    <p className="font-semibold text-gray-900">{generatedEmail.subject}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Corps</span>
                    <p className="text-gray-700 whitespace-pre-wrap text-sm">{generatedEmail.body}</p>
                  </div>
                  {generatedEmail.cta && (
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wide">CTA</span>
                      <p className="text-gray-700 text-sm">{generatedEmail.cta}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleCopyEmail}
                  className="flex-1 py-3 px-4 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                >
                  <Copy className="w-5 h-5" />
                  Copier
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={!lead?.email}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                  Envoyer via Mail
                </button>
              </div>

              {/* Régénérer */}
              <button
                onClick={() => setGeneratedEmail(null)}
                className="w-full py-2 text-purple-600 font-medium hover:underline flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Modifier les paramètres et régénérer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
