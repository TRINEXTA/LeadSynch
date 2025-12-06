<<<<<<< HEAD
import { log, error, warn } from "./../../lib/logger.js";
=======
import { log, error, warn } from "../lib/logger.js";
>>>>>>> origin/main
import React, { useState, useEffect } from 'react';
import { X, FileCheck, Save, Send, AlertCircle, Download, Mail, Loader2, Sparkles, ClipboardCheck, Shield } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

// Fallback hardcoded offers (used if no custom products configured)
const TRINEXTA_OFFERS = [
  {
    id: 'essentielle',
    name: 'Offre Essentielle',
    description: 'Assistance utilisateur illimitée + Sécurité de base + Maintenance proactive',
    prices: {
      sans_engagement: 149,
      avec_engagement_mensuel: 129,
      avec_engagement_annuel: 119
    },
    services: [
      'Assistance Utilisateur Illimitée (téléphone, email, prise en main à distance)',
      'Sécurité de Base (antivirus + surveillance)',
      'Maintenance Proactive (mises à jour système et logicielles)',
      'Garantie de Réactivité (prise en charge sous 4h)',
      'Prêt de Matériel (ordinateur portable de prêt)',
      'Système de Ticketing'
    ],
    url: 'https://trinexta.com/offre-essentielle/'
  },
  {
    id: 'serenite',
    name: 'Offre Sérénité',
    description: 'Tout Essentielle + Sécurité avancée + Supervision réseau + Comité de pilotage',
    price: 299,
    services: [
      'Tous les services de l\'Offre Essentielle',
      'Sécurité Avancée (protection serveurs et messagerie)',
      'Supervision Réseau (routeurs, switchs)',
      'Comité de Pilotage IT trimestriel sur site'
    ],
    url: 'https://trinexta.com/offre-serenite/'
  },
  {
    id: 'impulsion',
    name: 'Offre Impulsion',
    description: 'Mise à disposition de techniciens qualifiés',
    price: null,
    services: [
      'Mise à disposition de techniciens IT qualifiés',
      'Support technique sur site ou à distance',
      'Gestion de projets informatiques',
      'Maintenance et assistance personnalisée'
    ],
    url: 'https://trinexta.com/offre-impulsion/'
  }
];

const CONTRACT_TYPES = [
  { id: 'sans_engagement', label: 'Sans engagement', description: 'Résiliation à tout moment' },
  { id: 'avec_engagement_12', label: 'Avec engagement 12 mois', description: 'Tarif préférentiel' }
];

const PAYMENT_FREQUENCIES = [
  { id: 'mensuel', label: 'Paiement mensuel' },
  { id: 'annuel', label: 'Paiement annuel', discount: true }
];

export default function QuickContractModal({ lead, onClose, onSuccess, fromProposal = null }) {
  const { user } = useAuth();
  const [selectedOffer, setSelectedOffer] = useState('');
  const [contractType, setContractType] = useState('avec_engagement_12');
  const [paymentFrequency, setPaymentFrequency] = useState('mensuel');
  const [userCount, setUserCount] = useState(1);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    return date.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [createdContract, setCreatedContract] = useState(null);
  const [step, setStep] = useState('create'); // 'create' | 'actions'

  // State for dynamic products loaded from database
  const [customProducts, setCustomProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [offers, setOffers] = useState(TRINEXTA_OFFERS);

  // Check if user can send directly (admin, manager) or needs manager validation (commercial)
  const canSendDirectly = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'super_admin';
  const isCommercial = user?.role === 'commercial' || user?.role === 'user';

  // Load custom products from database
  useEffect(() => {
    const loadCustomProducts = async () => {
      try {
        setLoadingProducts(true);
        const response = await api.get('/business-config/products?active_only=true');

        if (response.data?.products && response.data.products.length > 0) {
          const formattedOffers = response.data.products.map(product => {
            const offer = {
              id: product.id,
              name: product.name,
              description: product.description || '',
              services: Array.isArray(product.features) ? product.features : [],
              url: product.url || null
            };

            if (product.type === 'quote') {
              offer.price = null;
            } else if (product.has_commitment_options && product.price_no_commitment) {
              offer.prices = {
                sans_engagement: parseFloat(product.price_no_commitment),
                avec_engagement_mensuel: parseFloat(product.price),
                avec_engagement_annuel: parseFloat(product.price)
              };
            } else {
              offer.price = parseFloat(product.price);
            }

            return offer;
          });

          setCustomProducts(formattedOffers);
          setOffers(formattedOffers);
        } else {
          setOffers(TRINEXTA_OFFERS);
        }
      } catch (error) {
        error('Error loading custom products:', error);
        setOffers(TRINEXTA_OFFERS);
      } finally {
        setLoadingProducts(false);
      }
    };

    loadCustomProducts();
  }, []);

  // Pre-fill from proposal if provided
  useEffect(() => {
    if (fromProposal) {
      if (fromProposal.offer_type) {
        setSelectedOffer(fromProposal.offer_type);
      }
      if (fromProposal.notes) {
        setNotes(fromProposal.notes);
      }
    }
  }, [fromProposal]);

  const getSelectedOfferDetails = () => {
    return offers.find(o => o.id === selectedOffer);
  };

  const calculatePrice = () => {
    const offer = getSelectedOfferDetails();
    if (!offer) return 0;

    if (offer.id === 'impulsion' || offer.price === null) return 'Sur proposition';

    if (offer.prices) {
      const engagement = contractType === 'sans_engagement' ? 'sans_engagement' :
                        paymentFrequency === 'annuel' ? 'avec_engagement_annuel' : 'avec_engagement_mensuel';
      return offer.prices[engagement];
    }

    return offer.price;
  };

  const handleSave = async (action = 'draft') => {
    if (!selectedOffer) {
      alert('Veuillez sélectionner une offre');
      return;
    }

    const offer = getSelectedOfferDetails();
    const price = calculatePrice();

    if (price === 'Sur proposition') {
      alert('Cette offre nécessite une proposition personnalisée. Veuillez créer une proposition d\'abord.');
      return;
    }

    setSaving(true);
    try {
      const numericPrice = Number(price) || 0;
      const contractData = {
        pipeline_lead_id: lead.id,
        lead_id: lead.lead_id || lead.id,
        proposal_id: fromProposal?.id || null,
        offer_type: offer.id,
        offer_name: offer.name,
        services: offer.services,
        contract_type: contractType,
        payment_frequency: paymentFrequency,
        user_count: Number(userCount) || 1,
        monthly_price: numericPrice,
        total_amount: paymentFrequency === 'annuel' ? numericPrice * 12 : numericPrice,
        start_date: startDate,
        notes,
        send_for_signature: false // Will be handled separately
      };

      const response = await api.post('/contracts', contractData);
      setCreatedContract(response.data.contract);
      setStep('actions');

      if (action === 'download') {
        await handleDownloadPDF(response.data.contract.id);
      } else if (action === 'request_validation') {
        await handleRequestValidation(response.data.contract);
      } else if (action === 'send' && canSendDirectly) {
        await handleSendForSignature(response.data.contract.id);
      }

    } catch (error) {
      error('Erreur:', error);
      alert('Erreur lors de la création du contrat');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = async (contractId = createdContract?.id) => {
    if (!contractId) return;

    setDownloading(true);
    try {
      const response = await api.get(`/contracts/${contractId}?action=pdf`);

      if (response.data.pdf_base64) {
        const byteCharacters = atob(response.data.pdf_base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = response.data.filename || `contrat-${contractId}.pdf`;
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

  const handleRequestValidation = async (contract = createdContract) => {
    if (!contract) return;

    try {
      // Create a task for manager/admin to validate
      await api.post('/tasks', {
        title: `Validation contrat: ${lead.company_name}`,
        description: `Le commercial ${user?.first_name || ''} ${user?.last_name || ''} demande la validation du contrat ${contract.reference || contract.id} pour ${lead.company_name}.\n\nOffre: ${getSelectedOfferDetails()?.name}\nMontant: ${calculatePrice()}€ HT/mois`,
        type: 'contract_validation',
        priority: 'high',
        related_to: 'contract',
        related_id: contract.id,
        lead_id: lead.lead_id || lead.id,
        pipeline_lead_id: lead.id
      });

      alert('Demande de validation envoyée au manager. Vous serez notifié une fois le contrat validé.');

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      error('Erreur:', error);
      // If task creation fails, still show success for contract
      alert('Contrat créé. La validation sera demandée manuellement.');
      if (onSuccess) onSuccess();
      onClose();
    }
  };

  const handleSendForSignature = async (contractId = createdContract?.id) => {
    if (!contractId) return;

    setSendingEmail(true);
    try {
      // Download PDF first
      await handleDownloadPDF(contractId);

      // Generate email with Asefi
      let emailBody = '';
      let emailSubject = `Contrat - ${lead.company_name}`;

      try {
        const asefiResponse = await api.post('/asefi', {
          prompt: `Génère un email professionnel court pour accompagner l'envoi d'un contrat à signer.

Entreprise destinataire: ${lead.company_name}
Contact: ${lead.contact_name || 'le responsable'}
Offre: ${getSelectedOfferDetails()?.name}
Montant mensuel HT: ${calculatePrice()}€

L'email doit:
- Être professionnel et chaleureux
- Mentionner le contrat en pièce jointe
- Expliquer brièvement le processus de signature
- Inviter à prendre contact pour toute question
- Être signé "L'équipe Trinexta"

Réponds uniquement avec le corps de l'email.`
        });

        if (asefiResponse.data.content) {
          emailBody = asefiResponse.data.content;
        }
      } catch (asefiError) {
        warn('Asefi non disponible, email par défaut');
        emailBody = `Bonjour ${lead.contact_name || ''},

Veuillez trouver ci-joint votre contrat pour l'${getSelectedOfferDetails()?.name}.

Montant: ${calculatePrice()}€ HT/mois

Merci de bien vouloir signer le contrat en pièce jointe et nous le retourner.

Cordialement,
L'équipe Trinexta`;
      }

      // Open mailto
      const mailtoLink = `mailto:${lead.email || ''}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
      window.location.href = mailtoLink;

      // Update contract status
      try {
        await api.put(`/contracts/${contractId}`, { status: 'sent' });
      } catch (e) {
        warn('Could not update contract status');
      }

      if (onSuccess) onSuccess();

    } catch (error) {
      error('Erreur:', error);
      alert('Erreur lors de la préparation de l\'email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleClose = () => {
    if (createdContract && onSuccess) {
      onSuccess();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8">

        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-red-600 text-white p-6 rounded-t-2xl flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <FileCheck className="w-6 h-6" />
            <div>
              <h2 className="text-2xl font-bold">
                {step === 'create' ? 'Créer un contrat' : 'Contrat créé !'}
              </h2>
              <p className="text-orange-100 text-sm mt-1">{lead.company_name}</p>
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
          <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">

            {/* Role indicator for commercial */}
            {isCommercial && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 flex gap-3">
                <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold mb-1">Mode Commercial</p>
                  <p>Les contrats doivent être validés par un manager avant envoi. Vous pouvez créer le contrat et demander une validation.</p>
                </div>
              </div>
            )}

            {/* From proposal indicator */}
            {fromProposal && (
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 flex gap-3">
                <ClipboardCheck className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-800">
                  <p className="font-semibold mb-1">Conversion de devis</p>
                  <p>Ce contrat est généré à partir du devis {fromProposal.reference}.</p>
                </div>
              </div>
            )}

            {/* Sélection Offre */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">
                {customProducts.length > 0 ? 'Sélectionner un produit *' : 'Sélectionner une offre Trinexta *'}
              </label>
              {loadingProducts ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                  <span className="ml-3 text-gray-600">Chargement des produits...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {offers.map(offer => (
                  <button
                    key={offer.id}
                    onClick={() => setSelectedOffer(offer.id)}
                    className={`p-5 rounded-xl border-2 transition-all text-left ${
                      selectedOffer === offer.id
                        ? 'border-orange-500 bg-orange-50 shadow-lg'
                        : 'border-gray-200 hover:border-orange-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-900 mb-1">{offer.name}</h3>
                        <p className="text-sm text-gray-600">{offer.description}</p>
                      </div>
                      <div className="text-right ml-4">
                        {offer.price ? (
                          <p className="text-2xl font-bold text-orange-600">{offer.price}€<span className="text-sm"> HT/mois</span></p>
                        ) : offer.prices ? (
                          <p className="text-lg font-bold text-orange-600">Dès {offer.prices.avec_engagement_annuel}€<span className="text-sm"> HT/mois</span></p>
                        ) : (
                          <p className="text-sm font-semibold text-gray-600">Sur devis</p>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-3 mt-3">
                      <p className="text-xs font-semibold text-gray-700 mb-2">Services inclus :</p>
                      <ul className="grid grid-cols-2 gap-2">
                        {offer.services.slice(0, 4).map((service, idx) => (
                          <li key={idx} className="text-xs text-gray-600 flex items-start gap-1">
                            <span className="text-green-500 flex-shrink-0">✓</span>
                            <span>{service}</span>
                          </li>
                        ))}
                      </ul>
                      {offer.services.length > 4 && (
                        <p className="text-xs text-orange-600 font-semibold mt-2">+ {offer.services.length - 4} autres services</p>
                      )}
                    </div>
                  </button>
                ))}
                </div>
              )}
            </div>

            {/* Type de contrat */}
            {selectedOffer && getSelectedOfferDetails()?.prices && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Type de contrat
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {CONTRACT_TYPES.map(type => (
                    <button
                      key={type.id}
                      onClick={() => setContractType(type.id)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        contractType === type.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <p className="font-bold text-gray-900">{type.label}</p>
                      <p className="text-xs text-gray-600 mt-1">{type.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Fréquence de paiement */}
            {selectedOffer && getSelectedOfferDetails()?.prices && contractType !== 'sans_engagement' && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Fréquence de paiement
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {PAYMENT_FREQUENCIES.map(freq => (
                    <button
                      key={freq.id}
                      onClick={() => setPaymentFrequency(freq.id)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        paymentFrequency === freq.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-green-300'
                      }`}
                    >
                      <p className="font-bold text-gray-900">{freq.label}</p>
                      {freq.discount && (
                        <span className="inline-block bg-green-500 text-white text-xs px-2 py-1 rounded-full mt-2 font-semibold">
                          Meilleur tarif
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Nombre d'utilisateurs */}
            {selectedOffer === 'serenite' && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Nombre d'utilisateurs
                </label>
                <input
                  type="number"
                  value={userCount}
                  onChange={(e) => setUserCount(parseInt(e.target.value) || 1)}
                  min="1"
                  max="5"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-xs text-gray-500 mt-1">Forfait jusqu'à 5 utilisateurs : 299 € HT/mois</p>
              </div>
            )}

            {/* Date de début */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Date de début du contrat
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
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
                placeholder="Notes pour le contrat..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 resize-none"
              />
            </div>

            {/* Récapitulatif */}
            {selectedOffer && (
              <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-5 border-2 border-orange-200">
                <h3 className="font-bold text-lg text-gray-900 mb-3">Récapitulatif</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Offre :</span>
                    <span className="font-bold text-gray-900">{getSelectedOfferDetails()?.name}</span>
                  </div>
                  {getSelectedOfferDetails()?.prices && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Type :</span>
                        <span className="font-bold text-gray-900">
                          {CONTRACT_TYPES.find(t => t.id === contractType)?.label}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Paiement :</span>
                        <span className="font-bold text-gray-900">
                          {PAYMENT_FREQUENCIES.find(f => f.id === paymentFrequency)?.label}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="border-t border-orange-300 pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">Tarif mensuel :</span>
                      <span className="text-3xl font-bold text-orange-600">
                        {calculatePrice()} {typeof calculatePrice() === 'number' ? '€ HT/mois' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-4 border-t border-gray-200">
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

                {isCommercial ? (
                  <button
                    onClick={() => handleSave('request_validation')}
                    disabled={saving}
                    className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 px-6 rounded-xl font-bold hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <ClipboardCheck className="w-5 h-5" />
                    Demander validation
                  </button>
                ) : (
                  <button
                    onClick={() => handleSave('send')}
                    disabled={saving}
                    className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 text-white py-3 px-6 rounded-xl font-bold hover:from-orange-700 hover:to-red-700 disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Mail className="w-5 h-5" />
                    <Sparkles className="w-4 h-4" />
                    Créer et envoyer (Asefi)
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Actions after creation */
          <div className="p-6 space-y-6">
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileCheck className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-green-800 mb-2">Contrat créé avec succès !</h3>
              <p className="text-green-600">Référence: {createdContract?.reference}</p>
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

              {isCommercial ? (
                <button
                  onClick={() => handleRequestValidation()}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4 px-6 rounded-xl font-bold hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg flex items-center justify-center gap-3"
                >
                  <ClipboardCheck className="w-5 h-5" />
                  Demander validation manager
                </button>
              ) : (
                <button
                  onClick={() => handleSendForSignature()}
                  disabled={sendingEmail}
                  className="bg-gradient-to-r from-orange-600 to-red-600 text-white py-4 px-6 rounded-xl font-bold hover:from-orange-700 hover:to-red-700 disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-3"
                >
                  {sendingEmail ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Mail className="w-5 h-5" />
                      <Sparkles className="w-4 h-4" />
                    </>
                  )}
                  Envoyer pour signature (Asefi)
                </button>
              )}
            </div>

            <p className="text-sm text-gray-500 text-center">
              Le PDF sera téléchargé sur votre ordinateur. {canSendDirectly ? 'Vous pourrez ensuite l\'envoyer par email avec un message généré par Asefi.' : 'Une fois validé par le manager, vous pourrez l\'envoyer pour signature.'}
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
