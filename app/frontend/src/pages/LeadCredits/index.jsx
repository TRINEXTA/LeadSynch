import { log, error, warn } from "../../lib/logger.js";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CreditCard, ShoppingCart, TrendingUp, Clock, Loader2, Zap, AlertCircle
} from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const PRICE_PER_PROSPECT = 0.10; // Prix fixe par prospect

export default function LeadCredits() {
  const [credits, setCredits] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [usage, setUsage] = useState({ usage: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  // Formulaire d'achat
  const [prospectCount, setProspectCount] = useState('');
  const totalPrice = prospectCount ? (parseFloat(prospectCount) * PRICE_PER_PROSPECT).toFixed(2) : '0.00';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [creditsRes, purchasesRes, usageRes] = await Promise.all([
        api.get('/lead-credits'),
        api.get('/lead-credits/history'),
        api.get('/lead-credits/usage?limit=50')
      ]);

      setCredits(creditsRes.data.credits);
      setPurchases(purchasesRes.data.purchases);
      setUsage(usageRes.data);
    } catch (err) {
      error('Erreur chargement crédits:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (e) => {
    e.preventDefault();

    const count = parseInt(prospectCount);
    if (!count || count <= 0) {
      toast.error('Veuillez entrer un nombre de prospects valide');
      return;
    }

    const price = count * PRICE_PER_PROSPECT;

    if (!confirm(`Acheter ${count} prospects pour ${price.toFixed(2)}€ ?`)) {
      return;
    }

    setPurchasing(true);

    try {
      const { data } = await api.post('/lead-credits/purchase', {
        credits_amount: count,
        payment_method: 'demo'
      });

      toast.success(`Achat complété ! ${data.credits_added} prospects ajoutés. Solde actuel : ${data.credits_remaining} prospects`);

      setProspectCount('');
      await fetchData();
    } catch (err) {
      error('Erreur achat:', err);
      const errorMsg = err.response?.data?.message || 'Erreur lors de l\'achat des prospects';
      toast.error(`Erreur : ${errorMsg}`);
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Fiches Prospects
          </h1>
          <p className="text-gray-700 text-lg font-medium">
            Achetez des fiches prospects qualifiées pour développer votre activité
          </p>
        </div>

        {/* Balance Card */}
        <Card className="mb-8 shadow-2xl border-0" style={{background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)'}}>
          <CardContent className="pt-8 pb-8">
            <div className="flex items-center justify-between text-white">
              <div className="flex-1">
                <p className="text-indigo-100 text-lg mb-2 font-semibold">Vos prospects disponibles</p>
                <div className="flex items-baseline gap-3">
                  <span className="text-7xl font-black">
                    {credits?.credits_remaining || 0}
                  </span>
                  <span className="text-3xl text-indigo-200 font-bold">prospects</span>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <p className="text-indigo-200 text-sm font-semibold mb-1">Total acheté</p>
                    <p className="text-2xl font-black">{credits?.credits_purchased || 0}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <p className="text-indigo-200 text-sm font-semibold mb-1">Total utilisé</p>
                    <p className="text-2xl font-black">{credits?.credits_used || 0}</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <CreditCard className="w-32 h-32 text-white opacity-20" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Achat de prospects */}
          <Card className="shadow-xl border-2 border-gray-200">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <ShoppingCart className="w-7 h-7 text-indigo-600" />
                Acheter des prospects
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handlePurchase} className="space-y-6">
                {/* Prix fixe */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-5 rounded-xl border-2 border-green-200">
                  <p className="text-sm font-bold text-green-700 mb-2">💰 Tarif unique</p>
                  <p className="text-5xl font-black text-green-600 mb-1">0,10€</p>
                  <p className="text-sm text-green-700 font-semibold">par fiche prospect</p>
                </div>

                {/* Champ nombre de prospects */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Combien de prospects souhaitez-vous ?
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={prospectCount}
                    onChange={(e) => setProspectCount(e.target.value)}
                    placeholder="Ex: 100"
                    className="w-full px-6 py-4 border-2 border-gray-300 rounded-xl text-2xl font-bold text-center focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>

                {/* Calcul du total */}
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-5 rounded-xl border-2 border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-700">Total à payer :</span>
                    <span className="text-4xl font-black text-blue-600">{totalPrice}€</span>
                  </div>
                  {prospectCount && (
                    <p className="text-sm text-blue-700 mt-2 font-semibold">
                      {prospectCount} prospects × 0,10€ = {totalPrice}€
                    </p>
                  )}
                </div>

                {/* Bouton d'achat */}
                <button
                  type="submit"
                  disabled={purchasing || !prospectCount}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-5 px-6 rounded-xl font-bold text-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {purchasing ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Achat en cours...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-6 h-6" />
                      Acheter maintenant
                    </>
                  )}
                </button>
              </form>
            </CardContent>
          </Card>

          {/* Comment ça marche */}
          <Card className="shadow-xl border-2 border-gray-200">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Zap className="w-7 h-7 text-purple-600" />
                Comment ça marche ?
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-black text-xl flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1 text-lg">Prix fixe et transparent</h3>
                    <p className="text-gray-600 text-sm">
                      Chaque fiche prospect coûte <strong>0,10€</strong>, quel que soit le nombre acheté. Simple et clair.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-black text-xl flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1 text-lg">Recherche intelligente</h3>
                    <p className="text-gray-600 text-sm">
                      Nous cherchons d'abord dans notre base de données, puis lançons une recherche Google Maps si nécessaire.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-red-500 rounded-full flex items-center justify-center text-white font-black text-xl flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1 text-lg">Prospects qualifiés</h3>
                    <p className="text-gray-600 text-sm">
                      Vous recevez des fiches complètes avec nom, email, téléphone, adresse et informations pertinentes.
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-900 font-medium">
                      <strong>Bon à savoir :</strong> Les prospects sont ajoutés instantanément à votre compte et ne périment jamais.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Historique des achats */}
        <Card className="shadow-xl border-2 border-gray-200">
          <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 border-b">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Clock className="w-7 h-7 text-green-600" />
              Historique des achats
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {purchases.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium text-lg">
                  Aucun achat pour le moment
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Vos achats de prospects apparaîtront ici
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {purchases.map((purchase) => (
                  <div
                    key={purchase.id}
                    className="p-5 rounded-xl border-2 border-gray-200 hover:border-green-300 hover:shadow-lg transition-all bg-white"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-2xl font-black text-gray-900">
                          {purchase.amount_credits} prospects
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(purchase.created_at).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <span className={`px-4 py-2 rounded-full text-sm font-black shadow-md ${
                        purchase.status === 'completed'
                          ? 'bg-green-500 text-white'
                          : purchase.status === 'pending'
                          ? 'bg-yellow-500 text-white'
                          : 'bg-red-500 text-white'
                      }`}>
                        {purchase.status === 'completed' ? '✓ PAYÉ' :
                         purchase.status === 'pending' ? '⏳ EN ATTENTE' : '✗ ÉCHOUÉ'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <span className="text-3xl font-black text-green-600">
                        {purchase.amount_euros}€
                      </span>
                      <span className="text-sm text-gray-600 font-semibold">
                        0,10€ par prospect
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
