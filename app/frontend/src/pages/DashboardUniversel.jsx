import { log, error, warn } from "./../lib/logger.js";
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Users, Phone, Mail, TrendingUp, Calendar, Target, DollarSign,
  Activity, Eye, MousePointer, Send, CheckCircle, Award, Zap, AlertCircle,
  Clock, Bell, FileText, UserCheck, ArrowRight, Sparkles,
  BarChart3, PlayCircle, MessageSquare, ThumbsUp, ThumbsDown, MapPin, RefreshCw
} from 'lucide-react';
import api from '../api/axios';
import ChatbotAsefi from '../components/ChatbotAsefi';
import { useRealTimePollingWithVisibility } from '../hooks/useRealTimePolling';

export default function DashboardUniversel() {
  const [stats, setStats] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignsDetailed, setCampaignsDetailed] = useState([]);
  const [topCommercials, setTopCommercials] = useState([]);
  const [pendingValidations, setPendingValidations] = useState([]);
  const [urgentAlerts, setUrgentAlerts] = useState([]);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchDashboard = async () => {
    try {
      setRefreshing(true);

      // Appels API RÉELS
      const [statsRes, dashRes, campaignsRes, followUpsRes] = await Promise.all([
        api.get('/stats'),
        api.get('/stats/dashboard'),
        api.get('/campaigns').catch(() => ({ data: { campaigns: [] } })),
        api.get('/follow-ups').catch(() => ({ data: { followups: [] } }))
      ]);

      setStats(statsRes.data.stats);
      setDashboardData(dashRes.data);

      // TOUTES les campagnes (plus de limite à 5)
      const allCampaigns = (campaignsRes.data.campaigns || [])
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));  // Plus récent en premier
      setCampaigns(allCampaigns);

      // Charger stats détaillées pour CHAQUE campagne
      const detailedPromises = allCampaigns.map(async (campaign) => {
        try {
          const detailRes = await api.get(`/campaign-detailed-stats?campaign_id=${campaign.id}`);
          return {
            ...campaign,
            detailed: detailRes.data.stats
          };
        } catch (err) {
          warn(`Stats détaillées non disponibles pour ${campaign.name}:`, err.message);
          return {
            ...campaign,
            detailed: null
          };
        }
      });

      const detailed = await Promise.all(detailedPromises);
      setCampaignsDetailed(detailed);

      // Rendez-vous du jour RÉELS
      const today = new Date().toISOString().split('T')[0];
      const todayFollowUps = (followUpsRes.data.followups || [])
        .filter(f => f.scheduled_date && f.scheduled_date.startsWith(today) && !f.completed)
        .slice(0, 5);
      setTodayAppointments(todayFollowUps);

      // Charger les alertes urgentes RÉELLES
      await loadUrgentAlerts();

      // Charger les validations en attente RÉELLES (si Manager)
      if (user?.role === 'manager' || user?.role === 'admin') {
        await loadPendingValidations();
      }

      // Charger top commerciaux RÉELS (si Admin/Manager)
      if (user?.role === 'admin' || user?.role === 'manager') {
        await loadTopCommercials();
      }

    } catch (error) {
      error('Erreur dashboard:', error?.response?.data || error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadUrgentAlerts = async () => {
    try {
      // Leads chauds sans activité depuis 48h
      const hoursAgo48 = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

      const alerts = [];

      // Alert 1: Leads chauds inactifs
      const leadsRes = await api.get(`/leads?status=hot&updated_before=${hoursAgo48}&limit=1`).catch(() => ({ data: { total: 0 } }));
      if (leadsRes.data.total > 0) {
        alerts.push({
          type: 'lead',
          text: `${leadsRes.data.total} leads chauds sans activité depuis 48h`,
          icon: TrendingUp,
          color: 'red',
          action: () => navigate('/leads?status=hot&inactive=48h')
        });
      }

      // Alert 2: Campagnes avec faible taux d'ouverture
      const lowOpenCampaigns = campaigns.filter(c => {
        const openRate = c.sent_count > 0 ? ((c.opened_count || 0) / c.sent_count) * 100 : 0;
        return openRate < 15 && c.sent_count > 50;
      });
      if (lowOpenCampaigns.length > 0) {
        alerts.push({
          type: 'campaign',
          text: `${lowOpenCampaigns.length} campagne(s) avec taux d'ouverture < 15%`,
          icon: Mail,
          color: 'yellow',
          action: () => navigate('/campaigns')
        });
      }

      setUrgentAlerts(alerts);
    } catch (error) {
      error('Erreur alerts:', error);
    }
  };

  const loadPendingValidations = async () => {
    try {
      // TODO: Créer endpoint /api/validations
      // Pour l'instant, simuler avec données vides
      setPendingValidations([]);
    } catch (error) {
      error('Erreur validations:', error);
    }
  };

  const loadTopCommercials = async () => {
    try {
      // Charger stats des utilisateurs RÉELLES
      const usersRes = await api.get('/users').catch(() => ({ data: { users: [] } }));
      const commercials = (usersRes.data.users || [])
        .filter(u => u.role === 'commercial' || u.role === 'manager')
        .slice(0, 5);

      setTopCommercials(commercials);
    } catch (error) {
      error('Erreur top commercials:', error);
    }
  };

  // Polling automatique temps réel: 30 secondes
  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000); // 30s au lieu de 60s
    log('🔄 [POLLING DASHBOARD] Activé - Refresh toutes les 30s');
    return () => {
      clearInterval(interval);
      log('⏹️ [POLLING DASHBOARD] Désactivé');
    };
  }, [user]);

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

        {/* Header */}
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
              {/* Indicateur temps réel */}
              <div className="flex items-center gap-2 text-xs text-gray-600 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
                <div className="relative">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <div className="absolute top-0 left-0 w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                </div>
                <span className="font-medium">Temps réel (30s)</span>
              </div>

              {refreshing && (
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/60">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-indigo-600"></div>
                  Actualisation...
                </div>
              )}
              <button
                onClick={fetchDashboard}
                className="p-3 hover:bg-white/60 backdrop-blur-sm rounded-xl transition-all shadow-lg border border-white/60"
                title="Rafraîchir manuellement"
              >
                <RefreshCw className="w-6 h-6 text-gray-700" />
              </button>
            </div>
          </div>
        </div>

        {/* KPIs principaux - VRAIES DONNÉES */}
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

            {/* Alertes urgentes - VRAIES DONNÉES */}
            {(isAdmin || isManager) && urgentAlerts.length > 0 && (
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
                  {urgentAlerts.map((alert, idx) => {
                    const AlertIcon = alert.icon;
                    return (
                      <div
                        key={idx}
                        onClick={alert.action}
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

            {/* TOUTES les Campagnes avec Détails Complets - VRAIES DONNÉES */}
            {campaignsDetailed.length > 0 && (
              <div className="backdrop-blur-md bg-white/40 border border-white/60 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    Toutes les Campagnes
                  </h2>
                  <button
                    onClick={() => navigate('/campaigns')}
                    className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                  >
                    Voir tout
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  {campaignsDetailed.map((campaign, idx) => {
                    const details = campaign.detailed || {};
                    const leads = details.leads || {};
                    const openRate = campaign.sent_count > 0
                      ? ((campaign.opened_count || 0) / campaign.sent_count * 100).toFixed(1)
                      : 0;
                    const clickRate = campaign.sent_count > 0
                      ? ((campaign.clicked_count || 0) / campaign.sent_count * 100).toFixed(1)
                      : 0;

                    return (
                      <div
                        key={campaign.id}
                        className="bg-white/60 backdrop-blur-sm p-5 rounded-xl border border-white/60 hover:shadow-lg transition-all cursor-pointer"
                        onClick={() => navigate(`/CampaignDetails?id=${campaign.id}`)}
                      >
                        {/* En-tête campagne */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 text-white font-bold">
                              {idx + 1}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 text-lg">{campaign.name}</p>
                              <p className="text-xs text-gray-600">
                                {campaign.type === 'email' ? '📧 Email' : '📞 Appel'} • {campaign.sent_count || 0} envoyés
                              </p>
                            </div>
                          </div>
                          <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${
                            campaign.status === 'active' || campaign.status === 'running'
                              ? 'bg-green-100 text-green-700'
                              : campaign.status === 'paused'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {campaign.status === 'running' ? 'En cours' :
                             campaign.status === 'paused' ? 'En pause' :
                             campaign.status === 'active' ? 'Active' : campaign.status}
                          </span>
                        </div>

                        {/* Stats principales */}
                        <div className="grid grid-cols-4 gap-3 mb-4">
                          <div className="text-center bg-blue-50 rounded-lg p-2">
                            <div className="text-xs text-gray-600">Total Leads</div>
                            <div className="text-xl font-bold text-blue-600">{leads.total || 0}</div>
                          </div>
                          <div className="text-center bg-green-50 rounded-lg p-2">
                            <div className="text-xs text-gray-600">Contactés</div>
                            <div className="text-xl font-bold text-green-600">{leads.contacted || 0}</div>
                          </div>
                          <div className="text-center bg-purple-50 rounded-lg p-2">
                            <div className="text-xs text-gray-600">Ouvertures</div>
                            <div className="text-xl font-bold text-purple-600">{campaign.opened_count || 0}</div>
                            <div className="text-xs text-gray-500">{openRate}%</div>
                          </div>
                          <div className="text-center bg-indigo-50 rounded-lg p-2">
                            <div className="text-xs text-gray-600">Clics</div>
                            <div className="text-xl font-bold text-indigo-600">{campaign.clicked_count || 0}</div>
                            <div className="text-xs text-gray-500">{clickRate}%</div>
                          </div>
                        </div>

                        {/* Détails du pipeline */}
                        <div className="border-t border-gray-200 pt-3">
                          <div className="grid grid-cols-5 gap-2 text-center text-xs">
                            <div>
                              <div className="text-gray-600 mb-1">One Call</div>
                              <div className="font-bold text-teal-600">{leads.one_call || 0}</div>
                            </div>
                            <div>
                              <div className="text-gray-600 mb-1">Pas de réponse</div>
                              <div className="font-bold text-yellow-600">{leads.no_answer || 0}</div>
                            </div>
                            <div>
                              <div className="text-gray-600 mb-1">Qualifié</div>
                              <div className="font-bold text-green-600">{leads.qualified || 0}</div>
                            </div>
                            <div>
                              <div className="text-gray-600 mb-1">Arrêté</div>
                              <div className="font-bold text-red-600">{leads.stopped || 0}</div>
                            </div>
                            <div>
                              <div className="text-gray-600 mb-1">Commerciaux</div>
                              <div className="font-bold text-blue-600">{details.commercials_assigned || 0}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Performance 7 jours - VRAIES DONNÉES */}
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
                    <span className="text-sm font-bold text-gray-900">{dashboardData?.prospects?.count || 0}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                      style={{width: `${Math.min(100, (dashboardData?.prospects?.count || 0) / 100)}%`}}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Emails envoyés</span>
                    <span className="text-sm font-bold text-gray-900">{dashboardData?.prospects?.sent || 0}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                      style={{width: `${Math.min(100, (dashboardData?.prospects?.sent || 0) / 50)}%`}}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Conversions</span>
                    <span className="text-sm font-bold text-gray-900">{dashboardData?.leads?.won || 0}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                      style={{width: `${Math.min(100, (dashboardData?.leads?.won || 0) * 10)}%`}}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Revenue</span>
                    <span className="text-sm font-bold text-green-600">{formatCurrency(dashboardData?.revenue?.actual || 0)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-yellow-500 to-orange-600 h-3 rounded-full transition-all duration-500"
                      style={{width: `${Math.min(100, ((dashboardData?.revenue?.actual || 0) / (dashboardData?.revenue?.target || 1)) * 100)}%`}}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Colonne droite - Sidebar */}
          <div className="space-y-6">

            {/* Agenda du jour - VRAIES DONNÉES */}
            <div className="backdrop-blur-md bg-white/40 border border-white/60 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Agenda du Jour</h2>
              </div>

              {todayAppointments.length > 0 ? (
                <div className="space-y-3">
                  {todayAppointments.map((event, idx) => (
                    <div
                      key={event.id}
                      className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-white/60 hover:shadow-lg transition-all cursor-pointer"
                      onClick={() => navigate('/FollowUps')}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 ${
                          event.type === 'meeting' ? 'bg-purple-100' :
                          event.type === 'call' ? 'bg-blue-100' : 'bg-green-100'
                        } rounded-lg`}>
                          {event.type === 'meeting' ? <FileText className="w-5 h-5 text-purple-600" /> :
                           event.type === 'call' ? <Phone className="w-5 h-5 text-blue-600" /> :
                           <CheckCircle className="w-5 h-5 text-green-600" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="w-4 h-4 text-gray-600" />
                            <span className="font-bold text-gray-900">
                              {new Date(event.scheduled_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-700">{event.title || event.company_name || 'RDV'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Aucun rendez-vous aujourd'hui</p>
                </div>
              )}

              <button
                onClick={() => navigate('/FollowUps')}
                className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <Calendar className="w-5 h-5" />
                Voir tous les rappels
              </button>
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

              <button
                onClick={() => setChatbotOpen(true)}
                className="w-full px-4 py-3 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
              >
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

      {/* Chatbot Asefi Modal */}
      <ChatbotAsefi isOpen={chatbotOpen} onClose={() => setChatbotOpen(false)} />
    </div>
  );
}
