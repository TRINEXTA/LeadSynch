<<<<<<< HEAD
import { log, error, warn } from "./../../lib/logger.js";
=======
import { log, error, warn } from "../lib/logger.js";
>>>>>>> origin/main
import React, { useState } from 'react';
import { X, FileText, Save, Plus, Trash2, Download, Mail, Loader2, Sparkles } from 'lucide-react';
import api from '../../api/axios';

const TRINEXTA_SERVICES = [
  { id: 'essentielle', name: 'Offre Essentielle', price: 129, url: 'https://trinexta.com/offre-essentielle/' },
  { id: 'serenite', name: 'Offre Sérénité', price: 299, url: 'https://trinexta.com/offre-serenite/' },
  { id: 'impulsion', name: 'Offre Impulsion', price: 0, url: 'https://trinexta.com/offre-impulsion/' }
];

export default function QuickProposalModal({ lead, onClose, onSuccess }) {
  const [selectedService, setSelectedService] = useState('');
  const [customLines, setCustomLines] = useState([]);
  const [notes, setNotes] = useState('');
  const [validUntil, setValidUntil] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  });
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [createdProposal, setCreatedProposal] = useState(null);
  const [step, setStep] = useState('create'); // 'create' | 'actions'

  const addCustomLine = () => {
    setCustomLines([...customLines, { description: '', quantity: 1, unit_price: 0 }]);
  };

  const removeCustomLine = (index) => {
    setCustomLines(customLines.filter((_, i) => i !== index));
  };

  const updateCustomLine = (index, field, value) => {
    const newLines = [...customLines];
    newLines[index][field] = value;
    setCustomLines(newLines);
  };

  const calculateTotal = () => {
    let total = 0;

    if (selectedService) {
      const service = TRINEXTA_SERVICES.find(s => s.id === selectedService);
      if (service && service.price > 0) total += Number(service.price) || 0;
    }

    customLines.forEach(line => {
      total += (Number(line.quantity) || 0) * (Number(line.unit_price) || 0);
    });

    return total;
  };

  const handleSave = async (action = 'draft') => {
    if (!selectedService && customLines.length === 0) {
      alert('Veuillez sélectionner au moins un service');
      return;
    }

    setSaving(true);
    try {
      const services = [];

      if (selectedService) {
        const service = TRINEXTA_SERVICES.find(s => s.id === selectedService);
        services.push({
          name: service.name,
          quantity: 1,
          unit_price: service.price,
          url: service.url
        });
      }

      customLines.forEach(line => {
        if (line.description && Number(line.unit_price) > 0) {
          services.push({
            name: line.description,
            description: line.description,
            quantity: Number(line.quantity) || 1,
            unit_price: Number(line.unit_price) || 0
          });
        }
      });

      const response = await api.post('/proposals', {
        pipeline_lead_id: lead.id,
        lead_id: lead.lead_id || lead.id,
        services,
        notes,
        valid_until: validUntil,
        total_ht: calculateTotal()
      });

      setCreatedProposal(response.data.proposal);
      setStep('actions');

      if (action === 'download') {
        await handleDownloadPDF(response.data.proposal.id);
      } else if (action === 'send') {
        await handleSendEmail(response.data.proposal.id);
      }

    } catch (error) {
      error('Erreur:', error);
      alert('Erreur lors de la création du devis');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = async (proposalId = createdProposal?.id) => {
    if (!proposalId) return;

    setDownloading(true);
    try {
      const response = await api.get(`/proposals/${proposalId}?action=pdf`);

      if (response.data.pdf_base64) {
        // Convert base64 to blob
        const byteCharacters = atob(response.data.pdf_base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = response.data.filename || `devis-${proposalId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        alert('PDF téléchargé avec succès !');
      }
    } catch (error) {
      error('Erreur téléchargement PDF:', error);
      alert('Erreur lors du téléchargement du PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handleSendEmail = async (proposalId = createdProposal?.id) => {
    if (!proposalId) return;

    setSendingEmail(true);
    try {
      // First download the PDF
      await handleDownloadPDF(proposalId);

      // Generate email content with Asefi
      let emailBody = '';
      let emailSubject = `Devis - ${lead.company_name}`;

      try {
        const asefiResponse = await api.post('/asefi', {
          prompt: `Génère un email professionnel court pour accompagner l'envoi d'un devis.

Entreprise destinataire: ${lead.company_name}
Contact: ${lead.contact_name || 'le responsable'}
Service proposé: ${selectedService ? TRINEXTA_SERVICES.find(s => s.id === selectedService)?.name : 'Services personnalisés'}
Montant HT: ${calculateTotal().toFixed(2)}€

L'email doit:
- Être professionnel et chaleureux
- Mentionner le devis en pièce jointe
- Inviter à prendre contact pour toute question
- Être signé "L'équipe Trinexta"

Réponds uniquement avec le corps de l'email (sans objet, sans salutation de type "Bonjour").`
        });

        if (asefiResponse.data.content) {
          emailBody = asefiResponse.data.content;
        }
      } catch (asefiError) {
        warn('Asefi non disponible, email par défaut');
        emailBody = `Bonjour ${lead.contact_name || ''},

Veuillez trouver ci-joint notre devis pour les services proposés.

Montant total HT: ${calculateTotal().toFixed(2)}€

N'hésitez pas à nous contacter pour toute question.

Cordialement,
L'équipe Trinexta`;
      }

      // Open mailto with the generated content
      const mailtoLink = `mailto:${lead.email || ''}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

      // Open the email client
      window.location.href = mailtoLink;

      // Mark proposal as sent
      try {
        await api.put(`/proposals/${proposalId}`, { status: 'sent' });
      } catch (e) {
        warn('Could not update proposal status');
      }

      if (onSuccess) onSuccess();

    } catch (error) {
      error('Erreur envoi email:', error);
      alert('Erreur lors de la préparation de l\'email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleClose = () => {
    if (createdProposal && onSuccess) {
      onSuccess();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-t-2xl flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6" />
            <div>
              <h2 className="text-2xl font-bold">
                {step === 'create' ? 'Créer un devis' : 'Devis créé !'}
              </h2>
              <p className="text-purple-100 text-sm mt-1">{lead.company_name}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {step === 'create' ? (
          <div className="p-6 space-y-6">

            {/* Offres Trinexta */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">
                Sélectionner une offre Trinexta
              </label>
              <div className="grid grid-cols-3 gap-3">
                {TRINEXTA_SERVICES.map(service => (
                  <button
                    key={service.id}
                    onClick={() => setSelectedService(service.id === selectedService ? '' : service.id)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      selectedService === service.id
                        ? 'border-purple-500 bg-purple-50 shadow-md'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <p className="font-bold text-gray-900 mb-1">{service.name}</p>
                    {service.price > 0 ? (
                      <p className="text-lg font-bold text-purple-600">{service.price}€ HT/mois</p>
                    ) : (
                      <p className="text-sm text-gray-600">Sur devis</p>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Lignes personnalisées */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-bold text-gray-700">
                  Services supplémentaires
                </label>
                <button
                  onClick={addCustomLine}
                  className="bg-purple-100 text-purple-700 px-3 py-1 rounded-lg font-semibold hover:bg-purple-200 transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter
                </button>
              </div>

              <div className="space-y-2">
                {customLines.map((line, index) => (
                  <div key={index} className="flex gap-2 items-start bg-gray-50 p-3 rounded-lg">
                    <input
                      type="text"
                      value={line.description}
                      onChange={(e) => updateCustomLine(index, 'description', e.target.value)}
                      placeholder="Description"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="number"
                      value={line.quantity}
                      onChange={(e) => updateCustomLine(index, 'quantity', parseFloat(e.target.value) || 0)}
                      placeholder="Qté"
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="number"
                      value={line.unit_price}
                      onChange={(e) => updateCustomLine(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      placeholder="Prix HT"
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <button
                      onClick={() => removeCustomLine(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Validité */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Valable jusqu'au
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Notes internes (optionnel)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Notes pour le devis..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>

            {/* Total */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-gray-900">Total HT</span>
                <span className="text-3xl font-bold text-purple-600">{calculateTotal().toFixed(2)} €</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-4">
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-bold hover:bg-gray-200 transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleSave('draft')}
                  disabled={saving}
                  className="flex-1 bg-gray-600 text-white py-3 px-6 rounded-xl font-bold hover:bg-gray-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Création...' : 'Enregistrer brouillon'}
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleSave('download')}
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Créer et télécharger PDF
                </button>
                <button
                  onClick={() => handleSave('send')}
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-6 rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Mail className="w-5 h-5" />
                  <Sparkles className="w-4 h-4" />
                  Créer et envoyer (Asefi)
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Actions after creation */
          <div className="p-6 space-y-6">
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-green-800 mb-2">Devis créé avec succès !</h3>
              <p className="text-green-600">Référence: {createdProposal?.reference}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleDownloadPDF()}
                disabled={downloading}
                className="bg-blue-600 text-white py-4 px-6 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
              >
                {downloading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
                Télécharger le PDF
              </button>

              <button
                onClick={() => handleSendEmail()}
                disabled={sendingEmail}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 px-6 rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-3"
              >
                {sendingEmail ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Mail className="w-5 h-5" />
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
                Envoyer par email (Asefi)
              </button>
            </div>

            <p className="text-sm text-gray-500 text-center">
              Le PDF sera téléchargé sur votre ordinateur. Vous pourrez ensuite l'attacher manuellement à l'email qui s'ouvrira dans votre client de messagerie.
            </p>

            <button
              onClick={handleClose}
              className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-bold hover:bg-gray-200 transition-all"
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
