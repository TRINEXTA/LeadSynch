import { log, error, warn } from "../lib/logger.js";
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, FileText, Building, User, Euro, Calendar, Clock, ThumbsUp, Shield, Send } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'https://leadsynch-api.onrender.com';

export default function AcceptProposal() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [proposal, setProposal] = useState(null);
  const [error, setError] = useState(null);
  const [alreadyAccepted, setAlreadyAccepted] = useState(false);
  const [expired, setExpired] = useState(false);
  const [acceptedAt, setAcceptedAt] = useState(null);

  const [acceptorEmail, setAcceptorEmail] = useState('');
  const [acceptorName, setAcceptorName] = useState('');
  const [comments, setComments] = useState('');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadProposal();
  }, [token]);

  const loadProposal = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/proposal-accept/${token}`);

      setProposal(response.data.proposal);

      if (response.data.already_accepted) {
        setAlreadyAccepted(true);
        setAcceptedAt(response.data.accepted_at);
      }

      if (response.data.expired) {
        setExpired(true);
      }

      setLoading(false);
    } catch (err) {
      error('Erreur:', err);
      setError(err.response?.data?.error || 'Lien invalide ou expiré');
      setLoading(false);
    }
  };

  const handleAccept = async (e) => {
    e.preventDefault();

    if (!acceptorEmail) {
      toast.error('Veuillez entrer votre email');
      return;
    }

    setProcessing(true);
    try {
      await axios.post(`${API_URL}/api/proposal-accept/${token}`, {
        acceptor_email: acceptorEmail,
        acceptor_name: acceptorName,
        comments: comments
      });

      setSuccess(true);
      toast.success('Proposition acceptée avec succès !');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de l\'acceptation');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Chargement de la proposition...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Lien invalide</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Already accepted state
  if (alreadyAccepted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Proposition déjà acceptée</h1>
          <p className="text-gray-600 mb-8">
            Cette proposition a été acceptée le {acceptedAt ? new Date(acceptedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}.
          </p>

          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-600">Référence</span>
              <span className="font-bold text-gray-900">{proposal?.reference}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Montant TTC</span>
              <span className="text-2xl font-bold text-indigo-600">{proposal?.total_ttc?.toFixed(2)} €</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Expired state
  if (expired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full text-center">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-12 h-12 text-orange-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Proposition expirée</h1>
          <p className="text-gray-600 mb-8">
            Cette proposition n'est plus valide. Veuillez contacter le prestataire pour obtenir une nouvelle proposition.
          </p>

          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-600">Référence</span>
              <span className="font-bold text-gray-900">{proposal?.reference}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Expirée le</span>
              <span className="font-semibold text-orange-600">
                {proposal?.valid_until ? new Date(proposal.valid_until).toLocaleDateString('fr-FR') : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ThumbsUp className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Proposition acceptée !</h1>
          <p className="text-gray-600 mb-8">
            Merci pour votre confiance ! L'équipe commerciale va vous contacter dans les plus brefs délais pour la suite des étapes.
          </p>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-600">Référence</span>
              <span className="font-bold text-gray-900">{proposal?.reference}</span>
            </div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-600">Client</span>
              <span className="font-semibold text-gray-900">{proposal?.client?.company_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Montant TTC</span>
              <span className="text-2xl font-bold text-green-600">{proposal?.total_ttc?.toFixed(2)} €</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-green-600">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Bon pour accord enregistré</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Proposition commerciale</h1>
                <p className="text-indigo-100">Référence : {proposal?.reference}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Proposal details */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Détails de la proposition
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Provider info */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Building className="w-4 h-4" />
                Prestataire
              </h3>
              <p className="font-medium text-gray-900">{proposal?.provider?.name || 'N/A'}</p>
              {proposal?.provider?.address && (
                <p className="text-sm text-gray-600 mt-1">
                  {proposal.provider.address}<br />
                  {proposal.provider.postal_code} {proposal.provider.city}
                </p>
              )}
              {proposal?.provider?.siret && (
                <p className="text-xs text-gray-500 mt-2">SIRET: {proposal.provider.siret}</p>
              )}
            </div>

            {/* Client info */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Client
              </h3>
              <p className="font-medium text-gray-900">{proposal?.client?.company_name || 'N/A'}</p>
              {proposal?.client?.contact_name && (
                <p className="text-sm text-gray-600">{proposal.client.contact_name}</p>
              )}
              {proposal?.client?.address && (
                <p className="text-sm text-gray-600 mt-1">
                  {proposal.client.address}<br />
                  {proposal.client.postal_code} {proposal.client.city}
                </p>
              )}
            </div>
          </div>

          {/* Services table */}
          {proposal?.services && proposal.services.length > 0 && (
            <div className="mt-6 border-t pt-6">
              <h3 className="font-semibold text-gray-700 mb-4">Services proposés</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 text-sm font-medium text-gray-600">Description</th>
                      <th className="text-center py-2 text-sm font-medium text-gray-600">Qté</th>
                      <th className="text-right py-2 text-sm font-medium text-gray-600">Prix unit.</th>
                      <th className="text-right py-2 text-sm font-medium text-gray-600">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposal.services.map((service, index) => (
                      <tr key={index} className="border-b last:border-0">
                        <td className="py-3">
                          <p className="font-medium text-gray-900">{service.name || service.description}</p>
                          {service.description && service.name && (
                            <p className="text-sm text-gray-500">{service.description}</p>
                          )}
                        </td>
                        <td className="py-3 text-center text-gray-600">{service.quantity || 1}</td>
                        <td className="py-3 text-right text-gray-600">{parseFloat(service.unit_price || 0).toFixed(2)} €</td>
                        <td className="py-3 text-right font-medium text-gray-900">
                          {((service.quantity || 1) * parseFloat(service.unit_price || 0)).toFixed(2)} €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="mt-6 border-t pt-6">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total HT</span>
                  <span className="font-medium">{proposal?.total_ht?.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">TVA ({proposal?.tva_rate || 20}%)</span>
                  <span className="font-medium">{(proposal?.total_ht * (proposal?.tva_rate || 20) / 100)?.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-bold text-gray-900">Total TTC</span>
                  <span className="text-xl font-bold text-indigo-600">{proposal?.total_ttc?.toFixed(2)} €</span>
                </div>
              </div>
            </div>
          </div>

          {/* Validity */}
          {proposal?.valid_until && (
            <div className="mt-6 bg-amber-50 rounded-xl p-4 flex items-center gap-3">
              <Calendar className="w-5 h-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800">Validité de l'offre</p>
                <p className="text-sm text-amber-600">
                  Cette proposition est valable jusqu'au {new Date(proposal.valid_until).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          )}

          {/* Notes */}
          {proposal?.notes && (
            <div className="mt-6 bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-700 mb-2">Notes</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{proposal.notes}</p>
            </div>
          )}
        </div>

        {/* Acceptance form */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <form onSubmit={handleAccept}>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <ThumbsUp className="w-5 h-5 text-indigo-600" />
              Accepter la proposition
            </h2>

            <p className="text-gray-600 mb-6">
              En acceptant cette proposition, vous donnez votre accord ("Bon pour accord") pour les services décrits ci-dessus.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Votre nom complet
                </label>
                <input
                  type="text"
                  value={acceptorName}
                  onChange={(e) => setAcceptorName(e.target.value)}
                  placeholder="Jean Dupont"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Votre email *
                </label>
                <input
                  type="email"
                  required
                  value={acceptorEmail}
                  onChange={(e) => setAcceptorEmail(e.target.value)}
                  placeholder="jean.dupont@entreprise.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Commentaire (optionnel)
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Ajoutez un commentaire si nécessaire..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="bg-indigo-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-indigo-800">
                <strong>Bon pour accord :</strong> En cliquant sur "Accepter", vous confirmez votre accord pour cette proposition commerciale.
                Un email de confirmation sera envoyé à l'adresse indiquée.
              </p>
            </div>

            <button
              type="submit"
              disabled={processing}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Traitement en cours...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Accepter la proposition
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security notice */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 text-gray-500 text-sm">
            <Shield className="w-4 h-4" />
            <span>Acceptation sécurisée - Votre IP et horodatage sont enregistrés</span>
          </div>
        </div>
      </div>
    </div>
  );
}
