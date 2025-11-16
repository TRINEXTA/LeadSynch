import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Users, Briefcase, Phone, Mail, TrendingUp, Calendar, Target, DollarSign,
  Activity, Eye, MousePointer, Send, CheckCircle, Award, Zap, AlertCircle,
  Clock, Bell, FileText, UserCheck, TrendingDown, ArrowRight, Sparkles,
  BarChart3, PlayCircle, PauseCircle, MessageSquare, ThumbsUp, ThumbsDown
} from 'lucide-react';
import api from '../api/axios';

export default function DashboardUniversel() {
  const [stats, setStats] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchDashboard = async () => {
    try {
      setRefreshing(true);
      const [statsRes, dashRes] = await Promise.all([
        api.get('/stats'),
        api.get('/stats/dashboard')
      ]);
      setStats(statsRes.data.stats);
      setDashboardData(dashRes.data);
    } catch (error) {
      console.error('Erreur dashboard:', error?.response?.data || error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-indigo-600 mx-auto"></div>
          <p className="mt-6 text-gray-700 font-semibold text-lg">Chargement du dashboard...</p>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const isCommercial = user?.role === 'commercial';

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toLocaleString('fr-FR');
  };

  const formatCurrency = (num) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num || 0);
  };

  // Widget glassmorphism cliquable
  const GlassWidget = ({ title, value, subtitle, icon: Icon, color, onClick, gradient }) => (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl rounded-2xl p-6 backdrop-blur-md bg-white/40 border border-white/60 shadow-xl`}
      style={{
        background: gradient || `linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.2) 100%)`
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${color} shadow-lg`}>
            <Icon className="w-7 h-7 text-white" />
          </div>
          <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-gray-700 group-hover:translate-x-1 transition-all" />
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-600 mb-1">{title}</p>
          <p className="text-4xl font-bold text-gray-900 mb-2">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-600 font-medium">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Effet de brillance */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-[1800px] mx-auto">

        {/* Header avec gradient */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-6xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                Dashboard {isManager ? 'Manager' : isCommercial ? 'Commercial' : 'Universel'}
              </h1>
              <p className="text-gray-700 text-lg font-medium">
                Bienvenue {user?.first_name} • {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {refreshing && (
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/60">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-indigo-600"></div>
                  Actualisation...
                </div>
              )}
              <button
                onClick={fetchDashboard}
                className="p-3 hover:bg-white/60 backdrop-blur-sm rounded-xl transition-all shadow-lg border border-white/60"
                title="Rafraîchir"
              >
                <Activity className="w-6 h-6 text-gray-700" />
              </button>
            </div>
          </div>
        </div>

        {/* KPIs principaux en glassmorphism */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <GlassWidget
            title="Prospects Actifs"
            value={formatNumber(dashboardData?.prospects?.count || 0)}
            subtitle={`${dashboardData?.prospects?.clicked || 0} ont cliqué`}
            icon={Send}
            color="from-blue-500 to-blue-600"
            onClick={() => navigate('/lead-databases')}
          />

          <GlassWidget
            title="Pipeline"
            value={formatNumber(dashboardData?.leads?.count || 0)}
            subtitle={`${dashboardData?.leads?.qualified || 0} qualifiés`}
            icon={Target}
            color="from-green-500 to-green-600"
            onClick={() => navigate('/pipeline')}
          />

          <GlassWidget
            title="Campagnes Actives"
            value={`${dashboardData?.campaigns?.active || 0}/${dashboardData?.campaigns?.count || 0}`}
            subtitle={`${dashboardData?.campaigns?.avgOpenRate || 0}% taux ouverture`}
            icon={Mail}
            color="from-purple-500 to-purple-600"
            onClick={() => navigate('/campaigns')}
          />

          <GlassWidget
            title="Taux Conversion"
            value={`${dashboardData?.conversionRate?.winRate || 0}%`}
            subtitle={`${dashboardData?.leads?.won || 0} deals gagnés`}
            icon={TrendingUp}
            color="from-pink-500 to-pink-600"
            onClick={() => navigate('/statistics')}
          />
        </div>

        {/* Layout principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Colonne gauche - Large */}
          <div className="lg:col-span-2 space-y-6">

            {/* Alertes urgentes */}
            {(isAdmin || isManager) && (
              <div className="backdrop-blur-md bg-gradient-to-br from-red-50/80 to-orange-50/80 border-2 border-red-200 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500 rounded-lg animate-pulse">
                      <AlertCircle className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Alertes Urgentes</h2>
                  </div>
                  <Bell className="w-6 h-6 text-red-600 animate-bounce" />
                </div>

                <div className="space-y-3">
                  {[
                    { type: 'validation', text: '3 devis en attente de validation', icon: FileText, color: 'orange' },
                    { type: 'lead', text: '12 leads chauds sans activité depuis 48h', icon: TrendingUp, color: 'red' },
                    { type: 'campaign', text: 'Campagne "IT Services" - Taux ouverture faible (12%)', icon: Mail, color: 'yellow' }
                  ].map((alert, idx) => {
                    const AlertIcon = alert.icon;
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-3 bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-white/60 hover:shadow-lg transition-all cursor-pointer"
                      >
                        <div className={`p-2 bg-${alert.color}-100 rounded-lg`}>
                          <AlertIcon className={`w-5 h-5 text-${alert.color}-600`} />
                        </div>
                        <span className="flex-1 font-medium text-gray-800">{alert.text}</span>
                        <ArrowRight className="w-5 h-5 text-gray-400" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Validations Manager */}
            {isManager && (
              <div className="backdrop-blur-md bg-white/40 border border-white/60 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    Validations en attente
                  </h2>
                  <span className="px-4 py-2 bg-red-500 text-white rounded-full font-bold text-sm">3</span>
                </div>

                <div className="space-y-4">
                  {[
                    { type: 'Devis', client: 'Entreprise ABC', amount: '15 000 €', commercial: 'Jean Dupont', urgent: true },
                    { type: 'Contrat', client: 'Société XYZ', amount: '25 000 €', commercial: 'Marie Martin', urgent: false },
                    { type: 'Devis', client: 'SARL Tech', amount: '8 500 €', commercial: 'Pierre Durand', urgent: true }
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-white/60 backdrop-blur-sm p-5 rounded-xl border border-white/60 hover:shadow-xl transition-all"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            item.type === 'Devis' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {item.type}
                          </span>
                          {item.urgent && (
                            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold animate-pulse">
                              URGENT
                            </span>
                          )}
                        </div>
                        <span className="text-xl font-bold text-gray-900">{item.amount}</span>
                      </div>

                      <div className="mb-4">
                        <p className="font-bold text-gray-900 text-lg">{item.client}</p>
                        <p className="text-sm text-gray-600">Par {item.commercial}</p>
                      </div>

                      <div className="flex gap-3">
                        <button className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2">
                          <ThumbsUp className="w-4 h-4" />
                          Approuver
                        </button>
                        <button className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2">
                          <ThumbsDown className="w-4 h-4" />
                          Refuser
                        </button>
                        <button className="px-4 py-2 bg-white/60 border border-gray-300 rounded-lg font-semibold hover:bg-white/80 transition-all">
                          Détails
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top 5 Campagnes */}
            <div className="backdrop-blur-md bg-white/40 border border-white/60 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  Top 5 Campagnes Actives
                </h2>
                <button
                  onClick={() => navigate('/campaigns')}
                  className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                >
                  Voir tout
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {[
                  { name: 'IT Services - Paris', sent: 1250, opened: 520, clicked: 95, rate: 41.6, status: 'active' },
                  { name: 'Juridique - Lyon', sent: 850, opened: 380, clicked: 72, rate: 44.7, status: 'active' },
                  { name: 'Marketing - Bordeaux', sent: 650, opened: 195, clicked: 38, rate: 30.0, status: 'active' },
                  { name: 'Finance - Toulouse', sent: 420, opened: 168, clicked: 31, rate: 40.0, status: 'paused' },
                  { name: 'RH - Lille', sent: 380, opened: 145, clicked: 25, rate: 38.2, status: 'active' }
                ].map((campaign, idx) => (
                  <div
                    key={idx}
                    className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-white/60 hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => navigate('/campaigns')}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 text-white font-bold text-sm">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{campaign.name}</p>
                          <p className="text-xs text-gray-600">{campaign.sent} envoyés</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        campaign.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {campaign.status === 'active' ? 'Active' : 'Pause'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-xs text-gray-600">Ouvertures</div>
                        <div className="text-lg font-bold text-green-600">{campaign.opened}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600">Clics</div>
                        <div className="text-lg font-bold text-blue-600">{campaign.clicked}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600">Taux</div>
                        <div className="text-lg font-bold text-purple-600">{campaign.rate}%</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top 5 Commerciaux */}
            {(isAdmin || isManager) && (
              <div className="backdrop-blur-md bg-white/40 border border-white/60 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg">
                      <Award className="w-6 h-6 text-white" />
                    </div>
                    Top 5 Commerciaux du Mois
                  </h2>
                </div>

                <div className="space-y-3">
                  {[
                    { name: 'Jean Dupont', deals: 12, revenue: 145000, conversion: 42 },
                    { name: 'Marie Martin', deals: 10, revenue: 128000, conversion: 38 },
                    { name: 'Pierre Durand', deals: 9, revenue: 98000, conversion: 35 },
                    { name: 'Sophie Bernard', deals: 8, revenue: 87000, conversion: 32 },
                    { name: 'Luc Moreau', deals: 7, revenue: 76000, conversion: 30 }
                  ].map((commercial, idx) => (
                    <div
                      key={idx}
                      className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-white/60 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-white ${
                            idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-lg' :
                            idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                            idx === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                            'bg-gradient-to-br from-blue-400 to-blue-600'
                          }`}>
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{commercial.name}</p>
                            <p className="text-sm text-gray-600">{commercial.deals} deals • {commercial.conversion}% conversion</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">{formatCurrency(commercial.revenue)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Colonne droite - Sidebar */}
          <div className="space-y-6">

            {/* Agenda du jour */}
            <div className="backdrop-blur-md bg-white/40 border border-white/60 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Agenda du Jour</h2>
              </div>

              <div className="space-y-3">
                {[
                  { time: '10:00', type: 'RDV', title: 'Entreprise ABC', icon: Phone, color: 'blue' },
                  { time: '14:30', type: 'Appel', title: 'Société XYZ - Relance', icon: Phone, color: 'green' },
                  { time: '16:00', type: 'RDV', title: 'SARL Tech - Signature', icon: FileText, color: 'purple' }
                ].map((event, idx) => {
                  const EventIcon = event.icon;
                  return (
                    <div
                      key={idx}
                      className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-white/60 hover:shadow-lg transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 bg-${event.color}-100 rounded-lg`}>
                          <EventIcon className={`w-5 h-5 text-${event.color}-600`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="w-4 h-4 text-gray-600" />
                            <span className="font-bold text-gray-900">{event.time}</span>
                          </div>
                          <p className="text-sm font-medium text-gray-700">{event.title}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => navigate('/FollowUps')}
                className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <Calendar className="w-5 h-5" />
                Voir tous les rappels
              </button>
            </div>

            {/* Performances 7 jours */}
            <div className="backdrop-blur-md bg-white/40 border border-white/60 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Performance 7 Jours</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Leads générés</span>
                    <span className="text-sm font-bold text-gray-900">+156</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full" style={{width: '78%'}} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Emails envoyés</span>
                    <span className="text-sm font-bold text-gray-900">2,340</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full" style={{width: '92%'}} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Conversions</span>
                    <span className="text-sm font-bold text-gray-900">23</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full" style={{width: '45%'}} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Revenue</span>
                    <span className="text-sm font-bold text-green-600">{formatCurrency(128500)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-gradient-to-r from-yellow-500 to-orange-600 h-3 rounded-full" style={{width: '65%'}} />
                  </div>
                </div>
              </div>
            </div>

            {/* Asefi Assistant */}
            <div className="backdrop-blur-md bg-gradient-to-br from-indigo-500/40 to-purple-600/40 border-2 border-white/60 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-white rounded-xl">
                  <Sparkles className="w-7 h-7 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Asefi</h2>
                  <p className="text-sm text-indigo-100">Votre assistant IA</p>
                </div>
              </div>

              <p className="text-white/90 text-sm mb-4">
                Besoin d'aide ? Posez-moi vos questions sur vos leads, campagnes ou statistiques.
              </p>

              <button className="w-full px-4 py-3 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Discuter avec Asefi
              </button>
            </div>

            {/* Statut système */}
            <div className="backdrop-blur-md bg-white/40 border border-white/60 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Statut Système</h2>

              <div className="space-y-3">
                {[
                  { label: 'Base de données', status: 'operational', color: 'green' },
                  { label: 'Email (Elastic)', status: 'operational', color: 'green' },
                  { label: 'API Claude', status: 'operational', color: 'green' },
                  { label: 'Workers', status: 'operational', color: 'green' }
                ].map((system, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{system.label}</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full bg-${system.color}-500 animate-pulse`} />
                      <span className="text-xs font-semibold text-green-600">Opérationnel</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer TRINEXTA */}
        <div className="mt-12 pb-6 flex items-center justify-center">
          <div className="flex items-center gap-3 text-gray-600 text-sm backdrop-blur-md bg-white/60 px-8 py-4 rounded-full shadow-xl border border-white/60">
            <span className="font-semibold">Propulsé par</span>
            <a
              href="https://trinexta.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-all hover:scale-110"
            >
              <img
                src="https://trinexta.com/wp-content/uploads/2025/07/Logosignaturetrinexta-e1752825280915.png"
                alt="TRINEXTA - TrusTech IT Support"
                className="h-10"
              />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
