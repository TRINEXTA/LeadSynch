<<<<<<< HEAD
import { log, error, warn } from "./../../lib/logger.js";
=======
import { log, error, warn } from "../lib/logger.js";
>>>>>>> origin/main
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
      { text: '30 leads/emails', included: true },
      { text: '2 recherches Google Maps', included: true },
      { text: '1 devis/mois', included: true },
      { text: '0 contrats', included: true },
      { text: '1 utilisateur', included: true },
      { text: '1 campagne active', included: true },
      { text: 'Pipeline basique', included: true },
      { text: 'Import CSV', included: true },
      { text: 'Support email', included: true },
      { text: 'Asefi IA', included: false },
      { text: 'API', included: false }
    ]
  },
  BASIC: {
    name: 'Starter',
    price: 49,
    icon: TrendingUp,
    color: 'from-blue-600 to-cyan-600',
    popular: false,
    features: [
      { text: '5,000 leads/emails', included: true },
      { text: 'Max 1,000 prospects Google Maps', included: true },
      { text: '50 devis/mois', included: true },
      { text: '30 contrats/mois', included: true },
      { text: '3 utilisateurs', included: true },
      { text: '5 campagnes actives', included: true },
      { text: 'Pipeline avancé', included: true },
      { text: 'Mode Prospection', included: true },
      { text: 'Asefi IA Basic (500 caractères)', included: true },
      { text: 'Templates email', included: true },
      { text: 'Import CSV illimité', included: true },
      { text: 'Support email + chat', included: true },
      { text: 'Analytics de base', included: true },
      { text: 'API', included: false }
    ]
  },
  PRO: {
    name: 'Pro',
    price: 99,
    icon: Crown,
    color: 'from-purple-600 to-pink-600',
    popular: true,
    features: [
      { text: '20,000 leads/emails', included: true },
      { text: '2,500 générations Google Maps', included: true },
      { text: '500 devis/mois', included: true },
      { text: '200 contrats/mois', included: true },
      { text: '10 utilisateurs', included: true },
      { text: 'Campagnes illimitées', included: true },
      { text: 'Pipeline personnalisable', included: true },
      { text: 'Mode Prospection avancé', included: true },
      { text: 'Asefi IA Pro (2000 caractères)', included: true },
      { text: 'Templates illimités + IA', included: true },
      { text: 'Scoring automatique des leads', included: true },
      { text: 'Support prioritaire 24/7', included: true },
      { text: 'Analytics avancés + rapports', included: true },
      { text: 'API complète', included: true },
      { text: 'Intégrations (Zapier, Make)', included: true },
      { text: 'Webhooks', included: true }
    ]
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 'Sur mesure',
    icon: Building,
    color: 'from-orange-600 to-red-600',
    features: [
      { text: 'Quotas personnalisés selon vos besoins', included: true },
      { text: 'Utilisateurs selon votre équipe', included: true },
      { text: 'Volume emails adapté (protection anti-abus)', included: true },
      { text: 'Devis & contrats personnalisés', included: true },
      { text: 'Tout du plan Pro +', included: true },
      { text: 'Asefi IA Enterprise (10k caractères)', included: true },
      { text: 'Infrastructure dédiée', included: true },
      { text: 'Onboarding personnalisé', included: true },
      { text: 'Formation équipe complète', included: true },
      { text: 'Support dédié 24/7', included: true },
      { text: 'Account manager dédié', included: true },
      { text: 'SSO & sécurité avancée', included: true },
      { text: 'SLA garanti 99.9%', included: true },
      { text: 'Développements sur-mesure', included: true },
      { text: 'White label (optionnel)', included: true }
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
      error('Erreur chargement abonnement:', error);
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
      error('Erreur création session:', error);
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
        <div className="mb-12 text-center">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            Choisissez votre plan
          </h1>
          <p className="text-gray-700 text-xl font-medium mb-6">
            Déverrouillez tout le potentiel de LeadSynch
          </p>
          <div className="inline-flex items-center gap-3 bg-white px-8 py-4 rounded-full shadow-lg border-2 border-indigo-100">
            <CreditCard className="w-6 h-6 text-indigo-600" />
            <span className="font-semibold text-gray-700 text-lg">
              Votre plan actuel : <span className="text-indigo-600 font-bold">{PLANS[currentPlan]?.name}</span>
            </span>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-12">
          {Object.entries(PLANS).map(([key, plan]) => {
            const PlanIcon = plan.icon;
            const isCurrentPlan = key === currentPlan;

            return (
              <Card
                key={key}
                className={`relative overflow-hidden transition-all duration-300 flex flex-col h-full ${
                  plan.popular
                    ? 'ring-4 ring-purple-400 shadow-2xl transform hover:scale-105'
                    : 'shadow-xl hover:shadow-2xl transform hover:scale-105'
                } ${isCurrentPlan ? 'border-4 border-green-500' : 'border-2 border-gray-200'}`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 text-xs font-bold rounded-bl-lg shadow-lg z-10">
                    ⭐ POPULAIRE
                  </div>
                )}

                {isCurrentPlan && (
                  <div className="absolute top-0 left-0 bg-gradient-to-r from-green-600 to-teal-600 text-white px-4 py-2 text-xs font-bold rounded-br-lg shadow-lg z-10">
                    ✓ ACTUEL
                  </div>
                )}

                <CardHeader className={`bg-gradient-to-br ${plan.color} text-white pb-8 pt-10`}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                      <PlanIcon className="w-8 h-8" />
                    </div>
                    <div className="text-right">
                      {typeof plan.price === 'number' ? (
                        <>
                          <div className="text-5xl font-black tracking-tight">{plan.price}€</div>
                          <div className="text-sm opacity-90 font-medium">par mois</div>
                        </>
                      ) : (
                        <div className="text-2xl font-bold">{plan.price}</div>
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                </CardHeader>

                <CardContent className="pt-6 flex-1 flex flex-col">
                  <ul className="space-y-3 mb-6 flex-1">
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

                  <div className="mt-auto">

                  {isCurrentPlan ? (
                    <button
                      disabled
                      className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white py-4 px-6 rounded-xl font-bold cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
                    >
                      <Check className="w-5 h-5" />
                      Plan actuel
                    </button>
                  ) : key === 'FREE' ? (
                    <button
                      disabled
                      className="w-full bg-gray-100 text-gray-400 py-4 px-6 rounded-xl font-bold cursor-not-allowed"
                    >
                      Plan gratuit
                    </button>
                  ) : key === 'ENTERPRISE' ? (
                    <button
                      onClick={() => handleUpgrade(key)}
                      className={`w-full bg-gradient-to-r ${plan.color} text-white py-4 px-6 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2`}
                    >
                      <Rocket className="w-5 h-5" />
                      Nous contacter
                    </button>
                  ) : currentPlan === 'FREE' || (typeof PLANS[key].price === 'number' && typeof PLANS[currentPlan]?.price === 'number' && PLANS[key].price > PLANS[currentPlan]?.price) ? (
                    <button
                      onClick={() => handleUpgrade(key)}
                      className={`w-full bg-gradient-to-r ${plan.color} text-white py-4 px-6 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2`}
                    >
                      <Rocket className="w-5 h-5" />
                      Upgrader
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full bg-gray-200 text-gray-500 py-4 px-6 rounded-xl font-bold cursor-not-allowed"
                    >
                      Plan inférieur
                    </button>
                  )}
                  </div>
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
              <a
                href="mailto:contact@leadsynch.com"
                className="block bg-white text-indigo-600 py-3 px-4 rounded-lg font-semibold text-center hover:bg-indigo-50 transition-all shadow-md"
              >
                📧 contact@leadsynch.com
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
