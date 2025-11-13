import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CreditCard, Check, X, Zap, TrendingUp, Users, Mail,
  Crown, Rocket, Building, Loader2, ExternalLink
} from 'lucide-react';
import api from '../../api/axios';

const PLANS = {
  FREE: {
    name: 'Gratuit',
    price: 0,
    icon: Zap,
    color: 'from-gray-600 to-gray-700',
    features: [
      { text: '60 leads Google Maps', included: true },
      { text: '100 emails/mois', included: true },
      { text: '1 campagne active', included: true },
      { text: '3 pièces jointes', included: true },
      { text: 'Support email', included: true },
      { text: 'Templates basiques', included: true },
      { text: 'Lead scoring', included: false },
      { text: 'Export CSV/PDF', included: false }
    ]
  },
  BASIC: {
    name: 'Basic',
    price: 49,
    icon: TrendingUp,
    color: 'from-blue-600 to-cyan-600',
    popular: false,
    features: [
      { text: '1 000 leads Google Maps', included: true },
      { text: '5 000 emails/mois', included: true },
      { text: '5 campagnes actives', included: true },
      { text: '5 pièces jointes', included: true },
      { text: 'Support prioritaire', included: true },
      { text: 'Templates avancés', included: true },
      { text: 'Lead scoring', included: true },
      { text: 'Export CSV/PDF', included: true }
    ]
  },
  PRO: {
    name: 'Pro',
    price: 149,
    icon: Crown,
    color: 'from-purple-600 to-pink-600',
    popular: true,
    features: [
      { text: '10 000 leads Google Maps', included: true },
      { text: '50 000 emails/mois', included: true },
      { text: 'Campagnes illimitées', included: true },
      { text: '10 pièces jointes', included: true },
      { text: 'Support premium 24/7', included: true },
      { text: 'Tous les templates', included: true },
      { text: 'Lead scoring avancé', included: true },
      { text: 'Export + API', included: true },
      { text: 'Automation avancée', included: true },
      { text: 'Multi-utilisateurs', included: true }
    ]
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 499,
    icon: Building,
    color: 'from-orange-600 to-red-600',
    features: [
      { text: 'Leads illimités', included: true },
      { text: 'Emails illimités', included: true },
      { text: 'Tout illimité', included: true },
      { text: '20 pièces jointes', included: true },
      { text: 'Account manager dédié', included: true },
      { text: 'Templates personnalisés', included: true },
      { text: 'IA & prédictions', included: true },
      { text: 'Intégrations sur mesure', included: true },
      { text: 'Formation équipe', included: true },
      { text: 'SLA garanti', included: true }
    ]
  }
};

export default function Billing() {
  const [currentPlan, setCurrentPlan] = useState('FREE');
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const { data } = await api.get('/billing/subscription');
      setCurrentPlan(data.subscription.plan);
      setSubscription(data.subscription);
    } catch (error) {
      console.error('Erreur chargement abonnement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (plan) => {
    try {
      const { data } = await api.post('/billing/create-checkout-session', { plan });
      // Rediriger vers Stripe Checkout
      window.location.href = data.url;
    } catch (error) {
      console.error('Erreur création session:', error);
      alert('Erreur lors de la création de la session de paiement');
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
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Choisissez votre plan
          </h1>
          <p className="text-gray-700 text-lg font-medium">
            Déverrouillez tout le potentiel de LeadSynch
          </p>
          <div className="mt-4 inline-flex items-center gap-2 bg-white px-6 py-3 rounded-full shadow-md">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            <span className="font-semibold text-gray-700">
              Votre plan actuel : <span className="text-indigo-600">{PLANS[currentPlan]?.name}</span>
            </span>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {Object.entries(PLANS).map(([key, plan]) => {
            const PlanIcon = plan.icon;
            const isCurrentPlan = key === currentPlan;

            return (
              <Card
                key={key}
                className={`relative overflow-hidden transition-all duration-300 ${
                  plan.popular
                    ? 'ring-4 ring-purple-400 shadow-2xl scale-105'
                    : 'shadow-xl hover:shadow-2xl hover:scale-105'
                } ${isCurrentPlan ? 'border-4 border-green-500' : 'border-2 border-gray-200'}`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1 text-xs font-bold rounded-bl-lg">
                    ⭐ POPULAIRE
                  </div>
                )}

                {isCurrentPlan && (
                  <div className="absolute top-0 left-0 bg-gradient-to-r from-green-600 to-teal-600 text-white px-4 py-1 text-xs font-bold rounded-br-lg">
                    ✓ ACTUEL
                  </div>
                )}

                <CardHeader className={`bg-gradient-to-r ${plan.color} text-white pb-8 pt-8`}>
                  <div className="flex items-center justify-between mb-4">
                    <PlanIcon className="w-10 h-10" />
                    <div className="text-right">
                      <div className="text-4xl font-bold">{plan.price}€</div>
                      <div className="text-sm opacity-90">/ mois</div>
                    </div>
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                </CardHeader>

                <CardContent className="pt-6">
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        {feature.included ? (
                          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <X className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        )}
                        <span
                          className={`text-sm ${
                            feature.included ? 'text-gray-900 font-medium' : 'text-gray-400'
                          }`}
                        >
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {isCurrentPlan ? (
                    <button
                      disabled
                      className="w-full bg-gray-200 text-gray-500 py-3 px-4 rounded-lg font-semibold cursor-not-allowed"
                    >
                      Plan actuel
                    </button>
                  ) : key === 'FREE' ? (
                    <button
                      disabled
                      className="w-full bg-gray-100 text-gray-400 py-3 px-4 rounded-lg font-semibold cursor-not-allowed"
                    >
                      Plan gratuit
                    </button>
                  ) : currentPlan === 'FREE' || PLANS[key].price > PLANS[currentPlan]?.price ? (
                    <button
                      onClick={() => handleUpgrade(key)}
                      className={`w-full bg-gradient-to-r ${plan.color} text-white py-3 px-4 rounded-lg font-semibold hover:opacity-90 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2`}
                    >
                      <Rocket className="w-5 h-5" />
                      Upgrader
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full bg-gray-200 text-gray-500 py-3 px-4 rounded-lg font-semibold cursor-not-allowed"
                    >
                      Plan inférieur
                    </button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ & Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-xl border-2 border-gray-200">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-blue-600" />
                Questions fréquentes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Puis-je changer de plan ?</h3>
                  <p className="text-sm text-gray-600">
                    Oui, vous pouvez upgrader ou downgrader à tout moment. Les changements prennent effet immédiatement.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Comment annuler mon abonnement ?</h3>
                  <p className="text-sm text-gray-600">
                    Vous pouvez annuler depuis votre espace client. L'accès reste actif jusqu'à la fin de la période payée.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Quels moyens de paiement acceptez-vous ?</h3>
                  <p className="text-sm text-gray-600">
                    Carte bancaire, virement SEPA. Paiements sécurisés par Stripe.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-2 border-gray-200 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Crown className="w-6 h-6" />
                Besoin d'aide ?
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <p className="mb-4 text-indigo-100">
                Notre équipe est là pour vous aider à choisir le plan adapté à vos besoins.
              </p>
              <div className="space-y-3">
                <a
                  href="mailto:contact@leadsynch.com"
                  className="block bg-white text-indigo-600 py-3 px-4 rounded-lg font-semibold text-center hover:bg-indigo-50 transition-all"
                >
                  📧 contact@leadsynch.com
                </a>
                <a
                  href="tel:+33123456789"
                  className="block bg-white text-indigo-600 py-3 px-4 rounded-lg font-semibold text-center hover:bg-indigo-50 transition-all"
                >
                  📞 +33 1 23 45 67 89
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
