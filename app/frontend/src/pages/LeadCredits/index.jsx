import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CreditCard, ShoppingCart, TrendingUp, DollarSign, Zap, Package,
  Clock, CheckCircle, Loader2, ArrowRight, Star, Database, MapPin
} from 'lucide-react';
import api from '../../api/axios';

const CREDIT_PACKS = [
  {
    credits: 100,
    price: 6,
    pricePerLead: 0.06,
    savings: 0,
    popular: false,
    color: 'from-blue-600 to-cyan-600'
  },
  {
    credits: 500,
    price: 27,
    pricePerLead: 0.054,
    savings: 10,
    popular: true,
    color: 'from-purple-600 to-pink-600'
  },
  {
    credits: 1000,
    price: 48,
    pricePerLead: 0.048,
    savings: 20,
    popular: false,
    color: 'from-orange-600 to-red-600'
  },
  {
    credits: 5000,
    price: 210,
    pricePerLead: 0.042,
    savings: 30,
    popular: false,
    color: 'from-green-600 to-teal-600'
  }
];

export default function LeadCredits() {
  const [credits, setCredits] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [usage, setUsage] = useState({ usage: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPack, setSelectedPack] = useState(null);

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
    } catch (error) {
      console.error('Erreur chargement crédits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (pack) => {
    if (!confirm(`Acheter ${pack.credits} crédits pour ${pack.price}€ ?`)) {
      return;
    }

    setPurchasing(true);
    setSelectedPack(pack);

    try {
      const { data } = await api.post('/lead-credits/purchase', {
        credits_amount: pack.credits,
        payment_method: 'demo'
      });

      alert(`✅ Achat complété avec succès !\n\n${data.credits_added} crédits ajoutés\nSolde actuel : ${data.credits_remaining} crédits`);

      // Recharger les données
      await fetchData();
    } catch (error) {
      console.error('Erreur achat:', error);
      const errorMsg = error.response?.data?.message || 'Erreur lors de l\'achat des crédits';
      alert(`❌ Erreur : ${errorMsg}`);
    } finally {
      setPurchasing(false);
      setSelectedPack(null);
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Crédits Leads
          </h1>
          <p className="text-gray-700 text-lg font-medium">
            Achetez des crédits pour générer des leads qualifiés
          </p>
        </div>

        {/* Balance Card */}
        <Card className="mb-8 shadow-2xl border-4 border-indigo-500 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">
          <CardContent className="pt-8 pb-8">
            <div className="flex items-center justify-between text-white">
              <div>
                <p className="text-indigo-100 text-lg mb-2">Crédits disponibles</p>
                <div className="flex items-baseline gap-3">
                  <span className="text-6xl font-bold">
                    {credits?.credits_remaining || 0}
                  </span>
                  <span className="text-2xl text-indigo-200">crédits</span>
                </div>
                <div className="mt-4 space-y-1">
                  <p className="text-indigo-200 text-sm">
                    💰 Total acheté: {credits?.credits_purchased || 0} crédits
                  </p>
                  <p className="text-indigo-200 text-sm">
                    📊 Total utilisé: {credits?.credits_used || 0} crédits
                  </p>
                </div>
              </div>
              <div className="text-right">
                <CreditCard className="w-24 h-24 text-white opacity-50" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="shadow-xl border-2 border-gray-200">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                Leads depuis la base de données
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-bold text-blue-600">0.03€</span>
                <span className="text-gray-600">par lead</span>
              </div>
              <p className="text-sm text-gray-600">
                Leads déjà présents dans notre base de données enrichie. Plus rapide et moins cher.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-2 border-gray-200">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-orange-600" />
                Leads depuis Google Maps
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-bold text-orange-600">0.06€</span>
                <span className="text-gray-600">par lead</span>
              </div>
              <p className="text-sm text-gray-600">
                Leads récupérés en temps réel via l'API Google Maps. Données fraîches et géolocalisées.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Credit Packs */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Packs de crédits</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {CREDIT_PACKS.map((pack, idx) => (
              <Card
                key={idx}
                className={`relative overflow-hidden transition-all duration-300 ${
                  pack.popular
                    ? 'ring-4 ring-purple-400 shadow-2xl scale-105'
                    : 'shadow-xl hover:shadow-2xl hover:scale-105'
                } border-2 border-gray-200`}
              >
                {pack.popular && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1 text-xs font-bold rounded-bl-lg">
                    ⭐ POPULAIRE
                  </div>
                )}

                {pack.savings > 0 && (
                  <div className="absolute top-0 left-0 bg-green-500 text-white px-3 py-1 text-xs font-bold rounded-br-lg">
                    -{pack.savings}%
                  </div>
                )}

                <CardHeader className={`bg-gradient-to-r ${pack.color} text-white pb-8 pt-8`}>
                  <div className="text-center">
                    <Package className="w-12 h-12 mx-auto mb-3" />
                    <div className="text-4xl font-bold mb-1">{pack.credits}</div>
                    <div className="text-sm opacity-90">crédits</div>
                  </div>
                </CardHeader>

                <CardContent className="pt-6">
                  <div className="text-center mb-4">
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                      {pack.price}€
                    </div>
                    <div className="text-sm text-gray-600">
                      {pack.pricePerLead}€ / crédit
                    </div>
                  </div>

                  <button
                    onClick={() => handlePurchase(pack)}
                    disabled={purchasing}
                    className={`w-full bg-gradient-to-r ${pack.color} text-white py-3 px-4 rounded-lg font-semibold hover:opacity-90 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50`}
                  >
                    {purchasing && selectedPack === pack ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Achat...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-5 h-5" />
                        Acheter
                      </>
                    )}
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Purchase History & Usage Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Purchase History */}
          <Card className="shadow-xl border-2 border-gray-200">
            <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 border-b">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Clock className="w-6 h-6 text-green-600" />
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
                    Vos achats de crédits apparaîtront ici
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
                          <span className="text-xl font-black text-gray-900">
                            {purchase.amount_credits} crédits
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
                        <span className="text-2xl font-bold text-green-600">
                          {purchase.amount_euros}€
                        </span>
                        <span className="text-sm text-gray-600 font-medium">
                          {(purchase.amount_euros / purchase.amount_credits).toFixed(3)}€ / crédit
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Usage Statistics */}
          <Card className="shadow-xl border-2 border-gray-200">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Statistiques d'utilisation
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {usage.stats && Object.keys(usage.stats).length > 0 ? (
                <div className="space-y-4">
                  {usage.stats.database && (
                    <div className="p-4 rounded-lg bg-blue-50 border-2 border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="w-5 h-5 text-blue-600" />
                        <span className="font-semibold text-blue-900">Base de données</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-blue-700">
                          {usage.stats.database.count} leads
                        </span>
                        <span className="font-bold text-blue-900">
                          {parseFloat(usage.stats.database.total_cost).toFixed(2)}€
                        </span>
                      </div>
                    </div>
                  )}

                  {usage.stats.google_maps && (
                    <div className="p-4 rounded-lg bg-orange-50 border-2 border-orange-200">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-5 h-5 text-orange-600" />
                        <span className="font-semibold text-orange-900">Google Maps</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-orange-700">
                          {usage.stats.google_maps.count} leads
                        </span>
                        <span className="font-bold text-orange-900">
                          {parseFloat(usage.stats.google_maps.total_cost).toFixed(2)}€
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t-2 border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900">Total dépensé</span>
                      <span className="text-2xl font-bold text-indigo-600">
                        {(
                          (usage.stats.database?.total_cost || 0) +
                          (usage.stats.google_maps?.total_cost || 0)
                        ).toFixed(2)}€
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Aucune utilisation pour le moment
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* How it works */}
        <Card className="mt-8 shadow-xl border-2 border-gray-200">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-600" />
              Comment ça marche ?
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-indigo-600">1</span>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Achetez des crédits</h3>
                <p className="text-sm text-gray-600">
                  Choisissez un pack adapté à vos besoins. Plus vous achetez, plus c'est avantageux.
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-purple-600">2</span>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Générez des leads</h3>
                <p className="text-sm text-gray-600">
                  Notre système cherche d'abord dans notre base (0.03€), puis sur Google Maps (0.06€).
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-pink-600">3</span>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Payez ce que vous utilisez</h3>
                <p className="text-sm text-gray-600">
                  Les crédits sont consommés uniquement quand vous générez des leads.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
