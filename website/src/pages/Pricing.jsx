import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, Zap, Crown, Rocket, Gift } from 'lucide-react';

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState('monthly'); // monthly or annual

  const plans = [
    {
      id: 'free',
      name: 'Free',
      icon: Gift,
      iconColor: 'text-gray-600',
      iconBg: 'bg-gray-100',
      price: { monthly: 0, annual: 0 },
      description: 'Parfait pour découvrir LeadSynch',
      badge: null,
      features: [
        { text: '60 leads max (10 générés IA + 50 importés)', included: true },
        { text: '1 utilisateur', included: true },
        { text: '100 emails/mois', included: true },
        { text: '1 campagne active', included: true },
        { text: 'Génération de leads IA (limitée)', included: true },
        { text: 'Pipeline basique', included: true },
        { text: 'Import CSV', included: true },
        { text: 'Support email', included: true },
        { text: 'Asefi IA', included: false },
        { text: 'Campagnes illimitées', included: false },
        { text: 'Analytics avancés', included: false },
        { text: 'API', included: false },
      ],
      cta: 'Démarrer gratuitement',
      ctaLink: '/register',
      buttonStyle: 'border-2 border-gray-300 text-gray-700 hover:border-primary-500 hover:text-primary-600'
    },
    {
      id: 'basic',
      name: 'Basic',
      icon: Zap,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
      price: { monthly: 49, annual: 39 },
      description: 'Pour les entrepreneurs et petites équipes',
      badge: null,
      features: [
        { text: '1,000 leads', included: true },
        { text: '3 utilisateurs', included: true },
        { text: '5,000 emails/mois', included: true },
        { text: '5 campagnes actives', included: true },
        { text: 'Génération de leads IA illimitée', included: true },
        { text: 'Pipeline avancé', included: true },
        { text: 'Mode Prospection', included: true },
        { text: 'Asefi IA Basic (500 caractères)', included: true },
        { text: 'Templates email', included: true },
        { text: 'Import CSV illimité', included: true },
        { text: 'Support email + chat', included: true },
        { text: 'Analytics de base', included: true },
        { text: 'API', included: false },
      ],
      cta: 'Choisir Basic',
      ctaLink: '/register?plan=basic',
      buttonStyle: 'bg-blue-600 text-white hover:bg-blue-700'
    },
    {
      id: 'pro',
      name: 'Pro',
      icon: Rocket,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-100',
      price: { monthly: 99, annual: 79 },
      description: 'Pour les équipes commerciales performantes',
      badge: ' Plus populaire',
      badgeColor: 'bg-gradient-to-r from-purple-600 to-pink-600',
      features: [
        { text: '10,000 leads', included: true },
        { text: '10 utilisateurs', included: true },
        { text: '50,000 emails/mois', included: true },
        { text: 'Campagnes illimitées', included: true },
        { text: 'Génération de leads IA illimitée', included: true },
        { text: 'Pipeline personnalisable', included: true },
        { text: 'Mode Prospection avancé', included: true },
        { text: 'Asefi IA Pro (2000 caractères)', included: true },
        { text: 'Templates illimités + IA', included: true },
        { text: 'Scoring automatique des leads', included: true },
        { text: 'Support prioritaire 24/7', included: true },
        { text: 'Analytics avancés + rapports', included: true },
        { text: 'API complète', included: true },
        { text: 'Intégrations (Zapier, Make)', included: true },
        { text: 'Webhooks', included: true },
      ],
      cta: 'Choisir Pro',
      ctaLink: '/register?plan=pro',
      buttonStyle: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-lg'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      icon: Crown,
      iconColor: 'text-orange-600',
      iconBg: 'bg-orange-100',
      price: { monthly: 'Sur mesure', annual: 'Sur mesure' },
      description: 'Pour les grandes organisations',
      badge: null,
      features: [
        { text: 'Leads illimités', included: true },
        { text: 'Utilisateurs illimités', included: true },
        { text: 'Emails illimités', included: true },
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
        { text: 'White label (optionnel)', included: true },
      ],
      cta: 'Nous contacter',
      ctaLink: '/contact?plan=enterprise',
      buttonStyle: 'bg-gradient-to-r from-orange-600 to-red-600 text-white hover:from-orange-700 hover:to-red-700'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Hero Section */}
      <section className="pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Des tarifs simples et transparents
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Choisissez le plan qui correspond à vos besoins. Pas de frais cachés, pas d'engagement.
          </p>

          {/* Toggle Mensuel/Annuel */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <span className={`font-medium ${billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
              Mensuel
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
              className="relative w-16 h-8 bg-gray-300 rounded-full transition-colors duration-300 focus:outline-none"
              style={{ backgroundColor: billingCycle === 'annual' ? '#3B82F6' : '#d1d5db' }}
            >
              <span
                className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300"
                style={{ transform: billingCycle === 'annual' ? 'translateX(32px)' : 'translateX(0)' }}
              />
            </button>
            <span className={`font-medium ${billingCycle === 'annual' ? 'text-gray-900' : 'text-gray-500'}`}>
              Annuel
            </span>
            {billingCycle === 'annual' && (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                 -20%
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <section className="pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {plans.map((plan) => {
              const Icon = plan.icon;
              const isPopular = plan.badge;

              return (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 ${
                    isPopular ? 'ring-4 ring-purple-500 scale-105' : ''
                  }`}
                >
                  {/* Badge Popular */}
                  {isPopular && (
                    <div className={`absolute -top-4 left-1/2 transform -translate-x-1/2 ${plan.badgeColor} text-white px-4 py-1 rounded-full text-sm font-semibold shadow-lg`}>
                      {plan.badge}
                    </div>
                  )}

                  {/* Icon */}
                  <div className={`w-14 h-14 ${plan.iconBg} rounded-xl flex items-center justify-center mb-4`}>
                    <Icon className={`w-7 h-7 ${plan.iconColor}`} />
                  </div>

                  {/* Plan Name */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 text-sm mb-6">{plan.description}</p>

                  {/* Price */}
                  <div className="mb-6">
                    {typeof plan.price[billingCycle] === 'number' ? (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-bold text-gray-900">
                            {plan.price[billingCycle]}€
                          </span>
                          <span className="text-gray-600">/mois</span>
                        </div>
                        {billingCycle === 'annual' && plan.price.monthly > 0 && (
                          <p className="text-sm text-gray-500 mt-1">
                            Soit {plan.price.annual * 12}€/an (au lieu de {plan.price.monthly * 12}€)
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="text-2xl font-bold text-gray-900">
                        {plan.price[billingCycle]}
                      </div>
                    )}
                  </div>

                  {/* CTA Button */}
                  <Link
                    to={plan.ctaLink}
                    className={`block w-full text-center px-6 py-3 rounded-lg font-semibold transition-all mb-8 ${plan.buttonStyle}`}
                  >
                    {plan.cta}
                  </Link>

                  {/* Features List */}
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        {feature.included ? (
                          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <X className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" />
                        )}
                        <span className={`text-sm ${feature.included ? 'text-gray-900' : 'text-gray-400'}`}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Questions fréquentes
          </h2>

          <div className="space-y-6">
            {[
              {
                q: "Puis-je changer de plan à tout moment ?",
                a: "Oui ! Vous pouvez upgrader ou downgrader votre plan à tout moment. Les changements sont effectifs immédiatement et facturés au prorata."
              },
              {
                q: "Le plan Free nécessite-t-il une carte bancaire ?",
                a: "Non ! Le plan Free est 100% gratuit, sans carte bancaire requise. Vous avez 60 leads (10 générés + 50 importés) et 100 emails/mois gratuitement."
              },
              {
                q: "Que se passe-t-il si je dépasse mes quotas ?",
                a: "Nous vous préviendrons par email avant d'atteindre vos limites. Vous pourrez alors upgrader votre plan ou attendre le mois suivant. Aucune interruption de service."
              },
              {
                q: "Y a-t-il un engagement ?",
                a: "Aucun engagement ! Vous pouvez annuler à tout moment. Les plans mensuels se renouvellent chaque mois, les plans annuels sont payés d'avance mais restent annulables."
              },
              {
                q: "Proposez-vous des réductions pour les associations ?",
                a: "Oui ! Nous offrons -50% sur tous nos plans payants pour les associations et ONG. Contactez-nous avec votre numéro SIRET pour en bénéficier."
              },
              {
                q: "Comment fonctionne Asefi IA ?",
                a: "Asefi est notre assistant IA qui améliore vos emails et génère des templates personnalisés. Les limites de caractères varient selon votre plan (Basic: 500, Pro: 2000, Enterprise: 10000)."
              }
            ].map((faq, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Prêt à démarrer ?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Rejoignez 1000+ entreprises qui font confiance à LeadSynch
          </p>
          <Link
            to="/register"
            className="inline-block px-8 py-4 bg-white text-purple-600 hover:bg-gray-100 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
          >
            Commencer gratuitement 
          </Link>
          <p className="text-white/80 text-sm mt-4"> Sans carte bancaire   60 leads gratuits   100 emails/mois</p>
        </div>
      </section>
    </div>
  );
}
