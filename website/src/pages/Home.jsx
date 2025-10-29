import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Target, TrendingUp, Users, Mail, Database, BarChart3, Sparkles, CheckCircle2, Star } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* Hero Section avec animations */}
      <section className="relative overflow-hidden pt-20 pb-32">
        {/* Formes géométriques animées en arrière-plan */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-40 right-1/4 w-64 h-64 bg-pink-400/10 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            {/* Badge nouveau */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-6 animate-bounce">
              <Sparkles className="w-4 h-4" />
              <span>Nouveau : IA Asefi intégrée !</span>
            </div>

            {/* Titre principal */}
            <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 leading-tight">
              Transformez vos prospects en{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 animate-gradient">
                clients qualifiés
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto">
              La plateforme CRM intelligente qui automatise votre prospection B2B et multiplie vos résultats par 10
            </p>

            {/* CTA Buttons avec meilleur contraste */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/register"
                className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold text-lg shadow-2xl hover:shadow-blue-500/50 transition-all hover:scale-105 flex items-center gap-2"
              >
                <span>Démarrer gratuitement</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/features"
                className="px-8 py-4 bg-white text-gray-900 border-2 border-gray-300 rounded-xl font-bold text-lg hover:border-blue-600 hover:text-blue-600 transition-all hover:scale-105 flex items-center gap-2 shadow-lg"
              >
                Découvrir les fonctionnalités
              </Link>
            </div>

            {/* Social Proof */}
            <div className="mt-12 flex items-center justify-center gap-8 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                <span className="font-semibold">4.9/5 sur Trustpilot</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="font-semibold">500+ entreprises nous font confiance</span>
              </div>
            </div>
          </div>

          {/* Dashboard animé avec cards */}
          <div className="relative">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1 - Leads générés */}
              <div className="bg-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-2 border border-gray-100 group">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-2xl">📈</span>
                </div>
                <div className="text-4xl font-bold text-gray-900 mb-2">1,247</div>
                <div className="text-gray-600 font-medium">Leads générés ce mois</div>
                <div className="mt-4 flex items-center gap-2 text-green-600 text-sm font-semibold">
                  <TrendingUp className="w-4 h-4" />
                  <span>+34% vs mois dernier</span>
                </div>
              </div>

              {/* Card 2 - Emails envoyés */}
              <div className="bg-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-2 border border-gray-100 group">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-2xl">✉️</span>
                </div>
                <div className="text-4xl font-bold text-gray-900 mb-2">12,458</div>
                <div className="text-gray-600 font-medium">Emails envoyés</div>
                <div className="mt-4 flex items-center gap-2 text-green-600 text-sm font-semibold">
                  <TrendingUp className="w-4 h-4" />
                  <span>Taux d ouverture 42%</span>
                </div>
              </div>

              {/* Card 3 - Taux de conversion */}
              <div className="bg-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-2 border border-gray-100 group">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-2xl">🎯</span>
                </div>
                <div className="text-4xl font-bold text-gray-900 mb-2">85%</div>
                <div className="text-gray-600 font-medium">Taux de conversion</div>
                <div className="mt-4 flex items-center gap-2 text-green-600 text-sm font-semibold">
                  <TrendingUp className="w-4 h-4" />
                  <span>+12% ce trimestre</span>
                </div>
              </div>
            </div>

            {/* Mini graphique animé en dessous */}
            <div className="mt-8 bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Performance de vos campagnes</h3>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                  En temps réel
                </span>
              </div>
              <div className="grid grid-cols-7 gap-2 h-32 items-end">
                {[65, 78, 82, 90, 85, 95, 88].map((height, index) => (
                  <div
                    key={index}
                    className="bg-gradient-to-t from-blue-600 to-purple-600 rounded-t-lg hover:scale-110 transition-transform cursor-pointer"
                    style={{ height: `${height}%` }}
                  ></div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2 mt-2 text-xs text-gray-500 text-center">
                <span>Lun</span>
                <span>Mar</span>
                <span>Mer</span>
                <span>Jeu</span>
                <span>Ven</span>
                <span>Sam</span>
                <span>Dim</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section Statistiques */}
      <section className="py-20 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { icon: Target, value: '10x', label: 'Plus de leads qualifiés' },
              { icon: TrendingUp, value: '85%', label: 'Taux de conversion moyen' },
              { icon: Zap, value: '5h', label: 'Économisées par semaine' },
              { icon: Users, value: '500+', label: 'Entreprises satisfaites' }
            ].map((stat, index) => (
              <div key={index} className="text-center group hover:scale-110 transition-transform">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4 group-hover:rotate-12 transition-transform">
                  <stat.icon className="w-8 h-8 text-white" />
                </div>
                <div className="text-4xl font-bold text-gray-900 mb-2">{stat.value}</div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fonctionnalités principales */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Tout ce dont vous avez besoin pour{' '}
              <span className="text-blue-600">réussir</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Des outils puissants qui automatisent votre prospection de A à Z
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Database,
                title: 'Base de données enrichie',
                description: 'Accédez à des millions de contacts B2B qualifiés et à jour',
                color: 'from-blue-500 to-cyan-500'
              },
              {
                icon: Mail,
                title: 'Campagnes email automatisées',
                description: 'Envoyez des emails personnalisés à grande échelle avec suivi',
                color: 'from-purple-500 to-pink-500'
              },
              {
                icon: Sparkles,
                title: 'IA Asefi intégrée',
                description: 'Assistant IA qui génère vos messages et optimise vos campagnes',
                color: 'from-orange-500 to-red-500'
              },
              {
                icon: BarChart3,
                title: 'Analytics avancés',
                description: 'Suivez vos performances en temps réel et optimisez vos résultats',
                color: 'from-green-500 to-teal-500'
              },
              {
                icon: Target,
                title: 'Ciblage intelligent',
                description: 'Trouvez vos prospects idéaux grâce à nos filtres avancés',
                color: 'from-indigo-500 to-blue-500'
              },
              {
                icon: TrendingUp,
                title: 'Scoring automatique',
                description: 'Priorisez les leads les plus prometteurs avec notre IA',
                color: 'from-pink-500 to-rose-500'
              }
            ].map((feature, index) => (
              <div key={index} className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-2 border border-gray-100">
                <div className={`inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br ${feature.color} rounded-xl mb-6 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section Témoignages */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-purple-700 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Ils ont multiplié leurs résultats avec LeadSynch
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: 'Sophie Martin', company: 'Tech Solutions', text: 'LeadSynch a transformé notre prospection. Nous avons généré 250 leads qualifiés en 1 mois !' },
              { name: 'Thomas Dubois', company: 'Digital Agency', text: 'L IA Asefi est bluffante. Elle rédige des emails personnalisés qui convertissent à 35% !' },
              { name: 'Marie Lefebvre', company: 'SaaS Startup', text: 'Un ROI incroyable ! Nous avons économisé 20h par semaine sur la prospection.' }
            ].map((testimonial, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 hover:bg-white/20 transition-all">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-lg mb-6 italic">{testimonial.text}</p>
                <div>
                  <div className="font-bold">{testimonial.name}</div>
                  <div className="text-blue-200">{testimonial.company}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 bg-gradient-to-r from-gray-900 to-gray-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Prêt à transformer votre prospection ?
          </h2>
          <p className="text-xl text-gray-300 mb-10">
            Rejoignez les 500+ entreprises qui génèrent plus de leads avec LeadSynch
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="group px-10 py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold text-xl shadow-2xl hover:shadow-blue-500/50 transition-all hover:scale-105 flex items-center justify-center gap-2"
            >
              <span>Commencer gratuitement</span>
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/pricing"
              className="px-10 py-5 bg-white text-gray-900 rounded-xl font-bold text-xl hover:bg-gray-100 transition-all hover:scale-105"
            >
              Voir les tarifs
            </Link>
          </div>
          <p className="text-sm text-gray-400 mt-8">
            <CheckCircle2 className="w-4 h-4 inline mr-2" />
            Sans engagement • Sans carte bancaire • Plan gratuit disponible
          </p>
        </div>
      </section>
    </div>
  );
}