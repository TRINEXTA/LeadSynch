import React, { useState } from 'react';
import { X, FileCheck, Save, Send, AlertCircle } from 'lucide-react';
import api from '../../api/axios';

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

export default function QuickContractModal({ lead, onClose, onSuccess }) {
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

  const getSelectedOfferDetails = () => {
    return TRINEXTA_OFFERS.find(o => o.id === selectedOffer);
  };

  const calculatePrice = () => {
    const offer = getSelectedOfferDetails();
    if (!offer) return 0;

    if (offer.id === 'impulsion') return 'Sur devis';

    if (offer.id === 'essentielle') {
      const engagement = contractType === 'sans_engagement' ? 'sans_engagement' : 
                        paymentFrequency === 'annuel' ? 'avec_engagement_annuel' : 'avec_engagement_mensuel';
      return offer.prices[engagement];
    }

    return offer.price;
  };

  const handleSave = async (sendForSignature = false) => {
    if (!selectedOffer) {
      alert('Veuillez sélectionner une offre');
      return;
    }

    const offer = getSelectedOfferDetails();
    const price = calculatePrice();

    if (price === 'Sur devis') {
      alert('L\'offre Impulsion nécessite un devis personnalisé. Veuillez créer un devis d\'abord.');
      return;
    }

    setSaving(true);
    try {
      const contractData = {
        pipeline_lead_id: lead.id,
        lead_id: lead.lead_id || lead.id,
        offer_type: offer.id,
        offer_name: offer.name,
        services: offer.services,
        contract_type: contractType,
        payment_frequency: paymentFrequency,
        user_count: userCount,
        monthly_price: price,
        total_amount: paymentFrequency === 'annuel' ? price * 12 : price,
        start_date: startDate,
        notes,
        send_for_signature: sendForSignature
      };

      const response = await api.post('/contracts', contractData);

      if (sendForSignature) {
        alert('✅ Contrat créé et envoyé pour signature !');
      } else {
        alert('✅ Contrat créé en brouillon !');
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('❌ Erreur:', error);
      alert('Erreur lors de la création du contrat');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8">
        
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-red-600 text-white p-6 rounded-t-2xl flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <FileCheck className="w-6 h-6" />
            <div>
              <h2 className="text-2xl font-bold">Créer un contrat</h2>
              <p className="text-orange-100 text-sm mt-1">{lead.company_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          
          {/* Sélection Offre */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Sélectionner une offre Trinexta *
            </label>
            <div className="grid grid-cols-1 gap-3">
              {TRINEXTA_OFFERS.map(offer => (
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
          </div>

          {/* Type de contrat (si Essentielle) */}
          {selectedOffer === 'essentielle' && (
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

          {/* Fréquence de paiement (si engagement) */}
          {selectedOffer === 'essentielle' && contractType !== 'sans_engagement' && (
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
                        💰 Meilleur tarif
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Nombre d'utilisateurs (si Sérénité) */}
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
              <h3 className="font-bold text-lg text-gray-900 mb-3">📋 Récapitulatif</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-700">Offre :</span>
                  <span className="font-bold text-gray-900">{getSelectedOfferDetails()?.name}</span>
                </div>
                {selectedOffer === 'essentielle' && (
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

          {/* Info importante */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">📧 Signature électronique</p>
              <p>Le contrat sera envoyé par email au client avec un lien de signature sécurisé (validation par code OTP).</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-bold hover:bg-gray-200 transition-all"
            >
              Annuler
            </button>
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 px-6 rounded-xl font-bold hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Création...' : 'Créer en brouillon'}
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 text-white py-3 px-6 rounded-xl font-bold hover:from-orange-700 hover:to-red-700 disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              {saving ? 'Envoi...' : 'Créer et envoyer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}