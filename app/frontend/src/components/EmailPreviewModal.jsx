import { log, error, warn } from "../lib/logger.js";
import React, { useState } from 'react';
import { X, Mail, Copy, Sparkles, RefreshCw, Send, CheckCircle, MessageSquare } from 'lucide-react';

const TONE_OPTIONS = [
  { id: 'formal', label: '🎩 Formel', description: 'Professionnel et distant' },
  { id: 'friendly', label: '😊 Amical', description: 'Chaleureux et proche' },
  { id: 'direct', label: '🎯 Direct', description: 'Concis et efficace' },
  { id: 'enthusiastic', label: '🚀 Enthousiaste', description: 'Énergique et motivant' },
];

export default function EmailPreviewModal({ 
  email, 
  lead, 
  onClose, 
  onRegenerateWithTone,
  generationsUsed = 1,
  maxGenerations = 2 
}) {
  const [selectedTone, setSelectedTone] = useState('friendly');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleRegenerateTone = async () => {
    if (generationsUsed >= maxGenerations) {
      alert(`Vous avez atteint la limite de ${maxGenerations} générations par appel.`);
      return;
    }

    setIsRegenerating(true);
    await onRegenerateWithTone(selectedTone);
    setIsRegenerating(false);
  };

  const handleCopyEmail = () => {
    const emailText = `Objet: ${email.subject}\n\n${email.body}\n\n${email.cta || ''}`;
    navigator.clipboard.writeText(emailText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenInMailApp = () => {
    // Encoder le corps de l'email pour mailto
    const subject = encodeURIComponent(email.subject);
    const body = encodeURIComponent(`${email.body}\n\n${email.cta || ''}`);
    const to = encodeURIComponent(lead.email);

    // Créer le lien mailto
    const mailtoLink = `mailto:${to}?subject=${subject}&body=${body}`;

    // Ouvrir dans l'application mail par défaut
    window.location.href = mailtoLink;

    // Message de confirmation
    setTimeout(() => {
      alert('📧 Email ouvert dans votre application mail ! Vous pouvez maintenant l\'envoyer.');
    }, 500);
  };

  const canRegenerate = generationsUsed < maxGenerations;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 via-pink-500 to-blue-600 text-white p-6 rounded-t-2xl flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 animate-pulse" />
            <div>
              <h2 className="text-2xl font-bold">Email généré par Asefi ✨</h2>
              <p className="text-purple-100 text-sm mt-1">Personnalisé pour {lead.company_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Compteur de générations */}
          <div className="flex items-center justify-between bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-semibold text-gray-700">
                Générations utilisées : {generationsUsed} / {maxGenerations}
              </span>
            </div>
            {canRegenerate && (
              <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">
                1 modification gratuite disponible
              </span>
            )}
          </div>

          {/* Sélecteur de ton */}
          {canRegenerate && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-5">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-purple-600" />
                Changer le ton de l'email
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {TONE_OPTIONS.map((tone) => (
                  <button
                    key={tone.id}
                    onClick={() => setSelectedTone(tone.id)}
                    className={`p-3 rounded-xl border-2 transition-all text-left ${
                      selectedTone === tone.id
                        ? 'border-purple-500 bg-purple-100 shadow-md'
                        : 'border-gray-200 hover:border-purple-300 bg-white'
                    }`}
                  >
                    <div className="font-semibold text-sm">{tone.label}</div>
                    <div className="text-xs text-gray-600 mt-1">{tone.description}</div>
                  </button>
                ))}
              </div>
              <button
                onClick={handleRegenerateTone}
                disabled={isRegenerating}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {isRegenerating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Asefi régénère avec le nouveau ton...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Régénérer avec ce ton
                  </>
                )}
              </button>
            </div>
          )}

          {/* Preview Email */}
          <div className="space-y-4">
            {/* Objet */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-purple-900">Objet</h3>
              </div>
              <p className="text-gray-800 font-medium text-lg">{email.subject}</p>
            </div>

            {/* Destinataire */}
            <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-500 font-semibold">À :</span>
                  <p className="text-gray-800 font-medium">{lead.email}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500 font-semibold">Contact :</span>
                  <p className="text-gray-800 font-medium">{lead.contact_name || 'Contact principal'}</p>
                </div>
              </div>
            </div>

            {/* Corps */}
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Corps de l'email
              </h3>
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed text-base">
                  {email.body}
                </div>
              </div>
            </div>

            {/* CTA */}
            {email.cta && (
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                <h3 className="font-bold text-green-900 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Appel à l'action
                </h3>
                <p className="text-gray-800 font-medium">{email.cta}</p>
              </div>
            )}

            {/* Suggestions */}
            {email.suggestions && email.suggestions.length > 0 && (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                <h3 className="font-bold text-yellow-900 mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  💡 Suggestions Asefi
                </h3>
                <ul className="space-y-2">
                  {email.suggestions.map((suggestion, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-yellow-600 mt-0.5">•</span>
                      <span className="text-sm text-gray-700">{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
            <button
              onClick={onClose}
              className="bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
            >
              <X className="w-5 h-5" />
              Fermer
            </button>

            <button
              onClick={handleCopyEmail}
              className="bg-blue-500 text-white py-3 px-6 rounded-xl font-semibold hover:bg-blue-600 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Copié !
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  Copier
                </>
              )}
            </button>

            <button
              onClick={handleOpenInMailApp}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all shadow-xl flex items-center justify-center gap-2 animate-pulse"
            >
              <Send className="w-5 h-5" />
              Ouvrir dans ma boite mail
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}