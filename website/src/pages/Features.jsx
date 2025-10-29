import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Target, 
  Zap, 
  Mail, 
  Phone, 
  BarChart3, 
  Users, 
  MapPin,
  Sparkles,
  Database,
  TrendingUp,
  Calendar,
  FileText,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

export default function Features() {
  const mainFeatures = [
    {
      icon: Target,
      title: "Génération de leads IA",
      description: "Trouvez vos prospects idéaux automatiquement grâce à notre moteur de recherche intelligent connecté à Google Maps.",
      bgColor: "bg-gradient-to-br from-blue-100 to-blue-200",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      benefits: [
        "Recherche par secteur, localisation et taille d'entreprise",
        "Enrichissement automatique des données (email, téléphone, SIRET)",
        "Qualification intelligente des leads",
        "Export CSV et synchronisation CRM"
      ],
      image: ""
    },
    {
      icon: Sparkles,
      title: "Assistant IA Asefi",
      description: "Notre IA propulsée par Claude génère des emails personnalisés et améliore vos messages de prospection en temps réel.",
      bgColor: "bg-gradient-to-br from-purple-100 to-purple-200",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      benefits: [
        "Génération d'emails contextuels et personnalisés",
        "Amélioration automatique de vos messages",
        "Suggestions de sujets accrocheurs",
        "Templates intelligents adaptés à votre secteur"
      ],
      image: ""
    },
    {
      icon: Phone,
      title: "Mode Prospection",
      description: "Pipeline interactif pour gérer vos appels, emails et suivis. Organisez votre prospection comme un pro.",
      bgColor: "bg-gradient-to-br from-green-100 to-green-200",
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      benefits: [
        "Pipeline drag & drop intuitif",
        "Suivi des interactions (appels, emails, rendez-vous)",
        "Rappels automatiques et follow-ups",
        "Notes et historique complet par lead"
      ],
      image: ""
    },
    {
      icon: Mail,
      title: "Campagnes Email",
      description: "Créez et lancez des campagnes email personnalisées avec suivi des performances en temps réel.",
      bgColor: "bg-gradient-to-br from-orange-100 to-orange-200",
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      benefits: [
        "Éditeur de templates intuitif",
        "Variables dynamiques et personnalisation",
        "Envoi automatisé et planifié",
        "Tracking d'ouvertures et de clics"
      ],
      image: ""
    },
    {
      icon: BarChart3,
      title: "Analytics Avancés",
      description: "Tableaux de bord en temps réel pour suivre vos performances et optimiser votre stratégie.",
      bgColor: "bg-gradient-to-br from-blue-100 to-indigo-200",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      benefits: [
        "Dashboard en temps réel",
        "Taux de conversion par campagne",
        "ROI et métriques de performance",
        "Rapports exportables (PDF, Excel)"
      ],
      image: ""
    },
    {
      icon: Users,
      title: "Gestion d'Équipe",
      description: "Gérez plusieurs utilisateurs, assignez des leads et suivez les performances de votre équipe.",
      bgColor: "bg-gradient-to-br from-purple-100 to-pink-200",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      benefits: [
        "Gestion multi-utilisateurs",
        "Rôles et permissions personnalisables",
        "Attribution automatique des leads",
        "Leaderboard et gamification"
      ],
      image: ""
    }
  ];

  const additionalFeatures = [
    { icon: MapPin, title: "Google Maps intégré", description: "Recherche géolocalisée" },
    { icon: Database, title: "Import/Export CSV", description: "Gestion de données flexible" },
    { icon: TrendingUp, title: "Scoring automatique", description: "Qualification intelligente" },
    { icon: Calendar, title: "Intégrations calendrier", description: "Google Calendar, Outlook" },
    { icon: FileText, title: "Templates illimités", description: "Bibliothèque personnalisable" },
    { icon: Zap, title: "API REST", description: "Intégrations Zapier, Make.com" }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-purple-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Tout ce dont vous avez besoin pour
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                réussir votre prospection B2B
              </span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              LeadSynch combine la puissance de l'intelligence artificielle avec des outils de prospection éprouvés pour vous faire gagner du temps et augmenter vos conversions.
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                to="/register"
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
              >
                Démarrer gratuitement 
              </Link>
              <Link
                to="/pricing"
                className="px-8 py-4 bg-white border-2 border-gray-300 hover:border-blue-600 text-gray-700 hover:text-blue-600 rounded-lg font-semibold text-lg transition-all"
              >
                Voir les tarifs
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">10k+</div>
              <div className="text-gray-600">Leads générés</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 mb-2">95%</div>
              <div className="text-gray-600">Satisfaction</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">3x</div>
              <div className="text-gray-600">Plus de conversions</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-600 mb-2">+250%</div>
              <div className="text-gray-600">ROI moyen</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Fonctionnalités principales
            </h2>
            <p className="text-xl text-gray-600">
              Des outils puissants pour automatiser et optimiser votre prospection
            </p>
          </div>

          <div className="space-y-24">
            {mainFeatures.map((feature, index) => {
              const Icon = feature.icon;
              const isEven = index % 2 === 0;

              return (
                <div
                  key={index}
                  className={`flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-12`}
                >
                  {/* Image/Icon */}
                  <div className="flex-1">
                    <div className={`w-full aspect-square ${feature.bgColor} rounded-3xl flex items-center justify-center text-9xl shadow-2xl`}>
                      {feature.image}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className={`inline-flex items-center justify-center w-16 h-16 ${feature.iconBg} rounded-2xl mb-6`}>
                      <Icon className={`w-8 h-8 ${feature.iconColor}`} />
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-4">
                      {feature.title}
                    </h3>
                    <p className="text-lg text-gray-600 mb-6">
                      {feature.description}
                    </p>
                    <ul className="space-y-3">
                      {feature.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Additional Features Grid */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Et bien plus encore...
            </h2>
            <p className="text-xl text-gray-600">
              Des dizaines de fonctionnalités pour booster votre productivité
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {additionalFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Prêt à transformer votre prospection ?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Rejoignez 1000+ entreprises qui prospectent mieux avec LeadSynch
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-purple-600 hover:bg-gray-100 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
            >
              Commencer gratuitement
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold text-lg transition-all border-2 border-white/30"
            >
              Voir tous les plans
            </Link>
          </div>
          <p className="text-white/80 text-sm mt-6">
             Sans carte bancaire   60 leads gratuits   Setup en 2 minutes
          </p>
        </div>
      </section>
    </div>
  );
}
