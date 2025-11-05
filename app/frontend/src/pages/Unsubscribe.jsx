import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Mail, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import api from '../api/axios';

export default function Unsubscribe() {
  const { lead_id } = useParams();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [lead, setLead] = useState(null);
  const [unsubscribed, setUnsubscribed] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadLead();
  }, [lead_id]);

  const loadLead = async () => {
    try {
      const response = await api.get(`/unsubscribe/${lead_id}`);
      setLead(response.data.lead);
      
      if (response.data.lead.already_unsubscribed) {
        setUnsubscribed(true);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      setError('Lead introuvable');
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setProcessing(true);
    try {
      await api.post(`/unsubscribe/${lead_id}`, { reason });
      setUnsubscribed(true);
    } catch (error) {
      console.error('Erreur:', error);
      setError('Erreur lors du désabonnement');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <Loader className="w-12 h-12 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Erreur</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (unsubscribed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Désabonnement confirmé</h1>
          <p className="text-gray-600 mb-6">
            Vous ne recevrez plus d'emails de notre part à l'adresse <strong>{lead?.email}</strong>
          </p>
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-left">
            <p className="text-sm text-gray-700">
              <strong>Note :</strong> Il peut falloir jusqu'à 24h pour que le désabonnement soit effectif.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="bg-purple-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-12 h-12 text-purple-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Se désabonner</h1>
          <p className="text-gray-600">
            Vous êtes sur le point de vous désabonner de nos communications email
          </p>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-semibold text-gray-700">Email concerné :</span>
          </div>
          <p className="text-gray-900 font-medium">{lead?.email}</p>
          {lead?.name && (
            <p className="text-sm text-gray-600 mt-1">{lead.name}</p>
          )}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Pourquoi vous désabonnez-vous ? (optionnel)
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Sélectionnez une raison...</option>
            <option value="too_many_emails">Trop d'emails</option>
            <option value="not_relevant">Contenu non pertinent</option>
            <option value="never_subscribed">Je ne me suis jamais inscrit</option>
            <option value="spam">C'est du spam</option>
            <option value="other">Autre raison</option>
          </select>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleUnsubscribe}
            disabled={processing}
            className="w-full px-6 py-4 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl font-bold hover:from-red-700 hover:to-pink-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? (
              <span className="flex items-center justify-center gap-2">
                <Loader className="w-5 h-5 animate-spin" />
                Traitement...
              </span>
            ) : (
              'Confirmer le désabonnement'
            )}
          </button>

          <p className="text-xs text-center text-gray-500">
            En vous désabonnant, vous ne recevrez plus aucun email marketing de notre part.
          </p>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-center text-gray-600">
            Vous avez des questions ? Contactez-nous à <a href="mailto:support@leadsynch.com" className="text-purple-600 hover:underline">support@leadsynch.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}

