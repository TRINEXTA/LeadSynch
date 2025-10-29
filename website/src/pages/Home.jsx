import React from 'react';
import { Link } from 'react-router-dom';
import { Target, Zap, Mail, Phone, BarChart3, Users, ArrowRight, CheckCircle, Star } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 via-white to-secondary-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Automatisez votre prospection B2B avec{' '}
              <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                l'IA Asefi
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              LeadSynch : La solution tout-en-un pour générer, qualifier et convertir vos leads automatiquement
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/register" 
                className="px-8 py-4 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
              >
                Démarrer gratuitement 
              </Link>
              <a 
                href="http://localhost:5173" 
                className="px-8 py-4 bg-white border-2 border-gray-300 hover:border-primary-600 text-gray-700 hover:text-primary-600 rounded-lg font-semibold text-lg transition-all"
              >
                Voir une démo
              </a>
            </div>
            <p className="text-sm text-gray-500 mt-4"> Sans carte bancaire   100 leads gratuits   Setup en 2 minutes</p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary-600 mb-2">10,000+</div>
              <div className="text-gray-600">Leads générés</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-secondary-600 mb-2">95%</div>
              <div className="text-gray-600">Satisfaction client</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-600 mb-2">3x</div>
              <div className="text-gray-600">Plus de conversions</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-orange-600 mb-2">+250%</div>
              <div className="text-gray-600">ROI moyen</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Tout ce dont vous avez besoin pour réussir
            </h2>
            <p className="text-xl text-gray-600">
              Une suite complète d'outils pour votre prospection B2B
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-all">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Génération de leads IA</h3>
              <p className="text-gray-600 mb-4">
                Trouvez vos prospects idéaux grâce à Google Maps et enrichissez automatiquement leurs données.
              </p>
              <Link to="/features" className="text-primary-600 font-semibold flex items-center gap-2 hover:gap-3 transition-all">
                En savoir plus <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-all">
              <div className="w-12 h-12 bg-secondary-100 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-secondary-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Assistant IA Asefi</h3>
              <p className="text-gray-600 mb-4">
                Générez des emails personnalisés et améliore vos messages avec l'intelligence artificielle.
              </p>
              <Link to="/features" className="text-secondary-600 font-semibold flex items-center gap-2 hover:gap-3 transition-all">
                En savoir plus <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-all">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Phone className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Mode Prospection</h3>
              <p className="text-gray-600 mb-4">
                Pipeline interactif pour gérer vos appels, emails et suivis en un seul endroit.
              </p>
              <Link to="/features" className="text-green-600 font-semibold flex items-center gap-2 hover:gap-3 transition-all">
                En savoir plus <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Feature 4 */}
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-all">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Campagnes Email</h3>
              <p className="text-gray-600 mb-4">
                Créez et envoyez des campagnes email personnalisées avec suivi des performances.
              </p>
              <Link to="/features" className="text-orange-600 font-semibold flex items-center gap-2 hover:gap-3 transition-all">
                En savoir plus <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Feature 5 */}
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-all">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Analytics temps réel</h3>
              <p className="text-gray-600 mb-4">
                Suivez vos performances avec des tableaux de bord détaillés et des rapports personnalisés.
              </p>
              <Link to="/features" className="text-blue-600 font-semibold flex items-center gap-2 hover:gap-3 transition-all">
                En savoir plus <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Feature 6 */}
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-all">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Gestion d'équipe</h3>
              <p className="text-gray-600 mb-4">
                Gérez plusieurs utilisateurs avec des rôles et permissions personnalisables.
              </p>
              <Link to="/features" className="text-purple-600 font-semibold flex items-center gap-2 hover:gap-3 transition-all">
                En savoir plus <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-secondary-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Prêt à transformer votre prospection ?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Rejoignez 1000+ entreprises qui prospectent mieux avec LeadSynch
          </p>
          <Link 
            to="/register" 
            className="inline-block px-8 py-4 bg-white text-primary-600 hover:bg-gray-100 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
          >
            Commencer gratuitement maintenant 
          </Link>
        </div>
      </section>
    </div>
  );
}
