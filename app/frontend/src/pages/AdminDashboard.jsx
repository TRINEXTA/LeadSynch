import { log, error, warn } from "../lib/logger.js";
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  Users, TrendingUp, Target, DollarSign, Activity, RefreshCw,
  BarChart3, PieChart, Calendar, Clock, Mail, Phone, CheckCircle,
  XCircle, AlertCircle, Award, Zap, Eye, ArrowUp, ArrowDown, Shield,
  Headphones, Coffee, Play, Pause, PhoneCall, UserCheck, Flame,
  Timer, Radio, Wifi, WifiOff
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // États pour les données
  const [kpis, setKpis] = useState({});
  const [leadsEvolution, setLeadsEvolution] = useState([]);
  const [sectorDistribution, setSectorDistribution] = useState([]);
  const [commercialPerformance, setCommercialPerformance] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [topPerformers, setTopPerformers] = useState([]);
  const [conversionData, setConversionData] = useState([]);

  // NOUVEAUX ÉTATS - User Activity Tracking
  const [userActivityStatus, setUserActivityStatus] = useState([]);
  const [userActivityStats, setUserActivityStats] = useState({ online: 0, idle: 0, offline: 0, total: 0 });
  const [selectedUserHistory, setSelectedUserHistory] = useState(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // NOUVEAUX ÉTATS - Tracking temps réel
  const [teamCallStats, setTeamCallStats] = useState([]);
  const [todayCallStats, setTodayCallStats] = useState({
    totalSeconds: 0,
    totalLeads: 0,
    totalQualified: 0,
    totalRdv: 0,
    activeSessions: 0
  });
  const [liveUsers, setLiveUsers] = useState([]);

  // Vérification admin uniquement
  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast.error('Accès réservé aux administrateurs');
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadDashboardData();

      // Auto-refresh toutes les 15 secondes pour le temps réel
      const interval = setInterval(() => {
        loadDashboardData(true);
      }, 15000);

      return () => clearInterval(interval);
    }
  }, [user]);

  const loadDashboardData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setRefreshing(true);

      // Charger toutes les données en parallèle
      const [
        statsRes,
        leadsRes,
        campaignsRes,
        usersRes,
        followUpsRes,
        validationsRes,
        callStatsRes,
        activityRes
      ] = await Promise.all([
        api.get('/stats'),
        api.get('/leads'),
        api.get('/campaigns'),
        api.get('/users'),
        api.get('/follow-ups'),
        api.get('/validation-requests?status=pending'),
        api.get('/call-sessions', { params: { action: 'team-summary' } }).catch(() => ({ data: { team: [] } })),
        api.get('/activity/users-status').catch(() => ({ data: { users: [], stats: {} } }))
      ]);

      const leads = leadsRes.data.leads || [];
      const campaigns = campaignsRes.data.campaigns || [];
      const users = usersRes.data.users || [];
      const followUps = followUpsRes.data.followups || [];
      const validations = validationsRes.data.requests || [];
      const teamStats = callStatsRes.data.team || [];

      // === USER ACTIVITY STATUS (nouveau système) ===
      if (activityRes.data?.users) {
        setUserActivityStatus(activityRes.data.users);
        setUserActivityStats(activityRes.data.stats || { online: 0, idle: 0, offline: 0, total: 0 });
      }

      // === STATS D'APPELS EN TEMPS RÉEL ===
      setTeamCallStats(teamStats);

      // Calculer les totaux d'aujourd'hui
      const todayTotals = teamStats.reduce((acc, member) => ({
        totalSeconds: acc.totalSeconds + (parseInt(member.today_seconds) || 0),
        totalLeads: acc.totalLeads + (parseInt(member.today_leads) || 0),
        totalQualified: acc.totalQualified + (parseInt(member.today_qualified) || 0),
        totalRdv: acc.totalRdv + (parseInt(member.today_rdv) || 0),
        activeSessions: acc.activeSessions + (member.has_active_session ? 1 : 0)
      }), { totalSeconds: 0, totalLeads: 0, totalQualified: 0, totalRdv: 0, activeSessions: 0 });

      setTodayCallStats(todayTotals);

      // Utilisateurs actuellement en ligne (session active)
      const live = teamStats.filter(m => m.has_active_session);
      setLiveUsers(live);

      // === KPIs ===
      const convertedLeads = leads.filter(l => l.status === 'gagne' || l.status === 'won');
      const qualifiedLeads = leads.filter(l =>
        l.status === 'qualifie' || l.status === 'tres_qualifie'
      );

      setKpis({
        totalLeads: leads.length,
        convertedLeads: convertedLeads.length,
        conversionRate: leads.length > 0 ? ((convertedLeads.length / leads.length) * 100).toFixed(1) : 0,
        qualifiedLeads: qualifiedLeads.length,
        activeCampaigns: campaigns.filter(c => c.status === 'active' || c.status === 'running').length,
        totalCampaigns: campaigns.length,
        activeUsers: users.filter(u => u.is_active).length,
        totalUsers: users.length,
        pendingTasks: followUps.filter(f => !f.completed).length,
        pendingValidations: validations.length
      });

      // === Évolution des leads (30 derniers jours) ===
      const evolutionData = calculateLeadsEvolution(leads);
      setLeadsEvolution(evolutionData);

      // === Répartition par secteur ===
      const sectorData = calculateSectorDistribution(leads);
      setSectorDistribution(sectorData);

      // === Performance par commercial ===
      const perfData = calculateCommercialPerformance(leads, users);
      setCommercialPerformance(perfData);

      // === Données de conversion (par statut) ===
      const convData = calculateConversionFunnel(leads);
      setConversionData(convData);

      // === Activités récentes (limité à 10) ===
      const activities = followUps
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10);
      setRecentActivities(activities);

      // === Top performers ===
      const performers = calculateTopPerformers(leads, users);
      setTopPerformers(performers);

    } catch (err) {
      error('Erreur chargement dashboard admin:', err);
      if (!silent) {
        toast.error('Erreur lors du chargement des données');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Calculer l'évolution des leads sur 30 jours
  const calculateLeadsEvolution = (leads) => {
    const data = [];
    const now = new Date();

    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

      const count = leads.filter(l => {
        const createdDate = new Date(l.created_at);
        return createdDate.toDateString() === date.toDateString();
      }).length;

      data.push({ date: dateStr, leads: count });
    }

    return data;
  };

  // Répartition par secteur
  const calculateSectorDistribution = (leads) => {
    const sectors = {};
    leads.forEach(lead => {
      if (lead.sector) {
        sectors[lead.sector] = (sectors[lead.sector] || 0) + 1;
      }
    });

    return Object.entries(sectors)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  };

  // Performance par commercial
  const calculateCommercialPerformance = (leads, users) => {
    const commercials = users.filter(u =>
      u.role === 'user' || u.role === 'commercial'
    );

    return commercials.map(user => {
      const userLeads = leads.filter(l => l.assigned_to === user.id);
      const converted = userLeads.filter(l => l.status === 'gagne' || l.status === 'won').length;

      return {
        name: `${user.first_name} ${user.last_name}`,
        leads: userLeads.length,
        converted,
        rate: userLeads.length > 0 ? ((converted / userLeads.length) * 100).toFixed(1) : 0
      };
    }).sort((a, b) => b.converted - a.converted);
  };

  // Funnel de conversion
  const calculateConversionFunnel = (leads) => {
    const statuses = [
      { name: 'Cold Call', key: 'cold_call' },
      { name: 'Cliqué', key: 'leads_click' },
      { name: 'Qualifié', key: 'qualifie' },
      { name: 'Très Qualifié', key: 'tres_qualifie' },
      { name: 'Proposition', key: 'proposition' },
      { name: 'Gagné', key: 'gagne' }
    ];

    return statuses.map(status => ({
      name: status.name,
      count: leads.filter(l => l.status === status.key).length
    }));
  };

  // Top performers
  const calculateTopPerformers = (leads, users) => {
    const commercials = users.filter(u =>
      u.role === 'user' || u.role === 'commercial'
    );

    return commercials.map(user => {
      const userLeads = leads.filter(l => l.assigned_to === user.id);
      const converted = userLeads.filter(l => l.status === 'gagne' || l.status === 'won').length;

      return {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        avatar: `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`,
        leads: userLeads.length,
        converted,
        rate: userLeads.length > 0 ? ((converted / userLeads.length) * 100).toFixed(1) : 0
      };
    })
    .sort((a, b) => parseFloat(b.rate) - parseFloat(a.rate))
    .slice(0, 5);
  };

  // Charger l'historique d'activité d'un utilisateur
  const loadUserHistory = async (userId, userName) => {
    try {
      setLoadingLogs(true);
      setSelectedUserHistory({ id: userId, name: userName });
      setShowActivityModal(true);

      const response = await api.get(`/activity/user/${userId}/history?days=7`);
      setActivityLogs(response.data);
    } catch (err) {
      error('Erreur chargement historique:', err);
      toast.error('Erreur lors du chargement de l\'historique');
    } finally {
      setLoadingLogs(false);
    }
  };

  // Formater la date relative
  const formatRelativeTime = (date) => {
    if (!date) return 'Jamais';
    const now = new Date();
    const then = new Date(date);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins}min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return then.toLocaleDateString('fr-FR');
  };

  // Obtenir la couleur du statut
  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  // Obtenir le label du statut
  const getStatusLabel = (status) => {
    switch (status) {
      case 'online': return 'En ligne';
      case 'idle': return 'Inactif';
      default: return 'Hors ligne';
    }
  };

  // Formater la durée
  const formatDuration = (seconds) => {
    if (!seconds) return '0m';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  // Calculer le pourcentage d'objectif
  const getProgressPercent = (current, target) => {
    if (!target) return 0;
    return Math.min(Math.round((current / target) * 100), 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white font-medium">Chargement du centre de contrôle...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-[1900px] mx-auto">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">
                Centre de Contrôle Admin
              </h1>
              <p className="text-blue-200 flex items-center gap-2">
                <Radio className="w-4 h-4 text-green-400 animate-pulse" />
                Données en temps réel • Actualisé toutes les 15s
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Indicateur utilisateurs en ligne */}
            <div className="bg-green-500/20 border border-green-500/40 rounded-xl px-4 py-2 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-300 font-semibold">{liveUsers.length} en ligne</span>
            </div>

            <button
              onClick={() => loadDashboardData()}
              disabled={refreshing}
              className="flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl hover:bg-white/20 transition-all text-white font-semibold disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>
        </div>

        {/* NOUVELLE SECTION - Centre de Contrôle des Utilisateurs */}
        <div className="mb-6 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-indigo-400" />
              Centre de Contrôle Utilisateurs
              <span className="ml-2 px-2 py-0.5 bg-indigo-500 text-white text-xs rounded-full">TEMPS RÉEL</span>
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 rounded-lg">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-300 text-sm font-medium">{userActivityStats.online} en ligne</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 rounded-lg">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span className="text-yellow-300 text-sm font-medium">{userActivityStats.idle} inactifs</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-500/20 rounded-lg">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="text-gray-300 text-sm font-medium">{userActivityStats.offline} hors ligne</span>
              </div>
            </div>
          </div>

          {userActivityStatus.length === 0 ? (
            <div className="text-center py-8 text-white/60">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucune donnée d'activité disponible</p>
              <p className="text-xs mt-1">Exécutez la migration de base de données pour activer cette fonctionnalité</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-3 px-4 text-white/70 font-medium">Utilisateur</th>
                    <th className="text-center py-3 px-4 text-white/70 font-medium">Statut</th>
                    <th className="text-left py-3 px-4 text-white/70 font-medium">Page actuelle</th>
                    <th className="text-left py-3 px-4 text-white/70 font-medium">Dernière activité</th>
                    <th className="text-left py-3 px-4 text-white/70 font-medium">Dernière connexion</th>
                    <th className="text-center py-3 px-4 text-white/70 font-medium">Temps connecté (auj.)</th>
                    <th className="text-center py-3 px-4 text-white/70 font-medium">Actions (auj.)</th>
                    <th className="text-center py-3 px-4 text-white/70 font-medium">Détails</th>
                  </tr>
                </thead>
                <tbody>
                  {userActivityStatus.map((userActivity) => (
                    <tr key={userActivity.id} className="border-b border-white/10 hover:bg-white/5">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                              userActivity.presence_status === 'online' ? 'bg-gradient-to-br from-green-500 to-emerald-600' :
                              userActivity.presence_status === 'idle' ? 'bg-gradient-to-br from-yellow-500 to-orange-500' :
                              'bg-gradient-to-br from-gray-500 to-gray-600'
                            }`}>
                              {userActivity.first_name?.[0]}{userActivity.last_name?.[0]}
                            </div>
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-gray-900 ${getStatusColor(userActivity.presence_status)} ${userActivity.presence_status === 'online' ? 'animate-pulse' : ''}`}></div>
                          </div>
                          <div>
                            <p className="text-white font-medium">{userActivity.first_name} {userActivity.last_name}</p>
                            <p className="text-white/50 text-xs">{userActivity.email}</p>
                            <p className="text-indigo-300 text-xs capitalize">{userActivity.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          userActivity.presence_status === 'online' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                          userActivity.presence_status === 'idle' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                          'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                        }`}>
                          {userActivity.presence_status === 'online' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                          {getStatusLabel(userActivity.presence_status)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {userActivity.current_page ? (
                          <span className="text-blue-300 text-sm bg-blue-500/10 px-2 py-1 rounded">
                            {userActivity.current_page}
                          </span>
                        ) : (
                          <span className="text-gray-500 text-sm">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-sm ${
                          userActivity.presence_status === 'online' ? 'text-green-300' :
                          userActivity.presence_status === 'idle' ? 'text-yellow-300' :
                          'text-gray-400'
                        }`}>
                          {formatRelativeTime(userActivity.last_activity)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-white/70 text-sm">
                          {userActivity.last_login ? new Date(userActivity.last_login).toLocaleString('fr-FR', {
                            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                          }) : 'Jamais'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-purple-300 font-medium">
                          {formatDuration(userActivity.time_online_today)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-sm font-bold ${
                          userActivity.actions_today > 50 ? 'text-green-400' :
                          userActivity.actions_today > 20 ? 'text-blue-400' :
                          userActivity.actions_today > 0 ? 'text-white' :
                          'text-gray-500'
                        }`}>
                          {userActivity.actions_today || 0}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => loadUserHistory(userActivity.id, `${userActivity.first_name} ${userActivity.last_name}`)}
                          className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-white"
                          title="Voir l'historique"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Historique Utilisateur */}
        {showActivityModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-white/20 w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Historique d'activité - {selectedUserHistory?.name}
                  </h3>
                  <p className="text-white/60 text-sm">7 derniers jours</p>
                </div>
                <button
                  onClick={() => setShowActivityModal(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-all text-white"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[70vh]">
                {loadingLogs ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Sessions */}
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-400" />
                        Sessions récentes
                      </h4>
                      <div className="grid gap-2">
                        {activityLogs.sessions?.length > 0 ? activityLogs.sessions.slice(0, 10).map((session, idx) => (
                          <div key={idx} className="bg-white/5 rounded-lg p-3 border border-white/10">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${session.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                                <span className="text-white text-sm">
                                  {new Date(session.login_at).toLocaleString('fr-FR')}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <span className="text-blue-300">{session.browser}</span>
                                <span className="text-purple-300">{session.device_type}</span>
                                <span className="text-white/60">{formatDuration(session.duration)}</span>
                              </div>
                            </div>
                          </div>
                        )) : (
                          <p className="text-white/50 text-center py-4">Aucune session récente</p>
                        )}
                      </div>
                    </div>

                    {/* Actions récentes */}
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-green-400" />
                        Actions récentes
                      </h4>
                      <div className="grid gap-2">
                        {activityLogs.actions?.length > 0 ? activityLogs.actions.slice(0, 20).map((action, idx) => (
                          <div key={idx} className="bg-white/5 rounded-lg p-3 border border-white/10">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  action.category === 'auth' ? 'bg-blue-500/20 text-blue-300' :
                                  action.category === 'lead' ? 'bg-green-500/20 text-green-300' :
                                  action.category === 'campaign' ? 'bg-purple-500/20 text-purple-300' :
                                  'bg-gray-500/20 text-gray-300'
                                }`}>
                                  {action.action}
                                </span>
                                {action.resource_name && (
                                  <span className="text-white text-sm">{action.resource_name}</span>
                                )}
                              </div>
                              <span className="text-white/50 text-xs">
                                {new Date(action.created_at).toLocaleString('fr-FR')}
                              </span>
                            </div>
                          </div>
                        )) : (
                          <p className="text-white/50 text-center py-4">Aucune action récente</p>
                        )}
                      </div>
                    </div>

                    {/* Stats journalières */}
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-yellow-400" />
                        Activité par jour
                      </h4>
                      <div className="grid grid-cols-7 gap-2">
                        {activityLogs.daily_stats?.length > 0 ? activityLogs.daily_stats.map((day, idx) => (
                          <div key={idx} className="bg-white/5 rounded-lg p-3 border border-white/10 text-center">
                            <p className="text-white/60 text-xs mb-1">{new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}</p>
                            <p className="text-white font-bold text-lg">{day.total_actions}</p>
                            <p className="text-white/50 text-xs">actions</p>
                          </div>
                        )) : (
                          <p className="col-span-7 text-white/50 text-center py-4">Aucune donnée</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ANCIENNE SECTION - Commerciaux en Prospection */}
        {liveUsers.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-4">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Headphones className="w-5 h-5 text-green-400" />
              Commerciaux en Prospection
              <span className="ml-2 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full animate-pulse">LIVE</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {liveUsers.map((member) => (
                <div key={member.user_id} className="bg-white/10 rounded-xl p-3 border border-white/20">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm animate-pulse">
                      {member.first_name?.[0]}{member.last_name?.[0]}
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{member.first_name}</p>
                      <p className="text-green-300 text-xs flex items-center gap-1">
                        <PhoneCall className="w-3 h-3" /> En appel
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KPIs Appels d'aujourd'hui */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
          {/* Temps d'appel aujourd'hui */}
          <div className="bg-gradient-to-br from-purple-600/30 to-purple-800/30 backdrop-blur-md border border-purple-500/30 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-500/30 rounded-xl">
                <Timer className="w-6 h-6 text-purple-300" />
              </div>
              <span className="text-purple-200 text-sm font-medium">Temps Appels Aujourd'hui</span>
            </div>
            <p className="text-4xl font-bold text-white">{formatDuration(todayCallStats.totalSeconds)}</p>
            <p className="text-xs text-purple-300 mt-1">{todayCallStats.activeSessions} sessions actives</p>
          </div>

          {/* Leads traités */}
          <div className="bg-gradient-to-br from-blue-600/30 to-blue-800/30 backdrop-blur-md border border-blue-500/30 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-500/30 rounded-xl">
                <Target className="w-6 h-6 text-blue-300" />
              </div>
              <span className="text-blue-200 text-sm font-medium">Leads Traités</span>
            </div>
            <p className="text-4xl font-bold text-white">{todayCallStats.totalLeads}</p>
            <p className="text-xs text-blue-300 mt-1">Aujourd'hui</p>
          </div>

          {/* Leads qualifiés */}
          <div className="bg-gradient-to-br from-green-600/30 to-green-800/30 backdrop-blur-md border border-green-500/30 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-500/30 rounded-xl">
                <UserCheck className="w-6 h-6 text-green-300" />
              </div>
              <span className="text-green-200 text-sm font-medium">Qualifiés</span>
            </div>
            <p className="text-4xl font-bold text-white">{todayCallStats.totalQualified}</p>
            <p className="text-xs text-green-300 mt-1">Leads chauds</p>
          </div>

          {/* RDV planifiés */}
          <div className="bg-gradient-to-br from-orange-600/30 to-orange-800/30 backdrop-blur-md border border-orange-500/30 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-orange-500/30 rounded-xl">
                <Flame className="w-6 h-6 text-orange-300" />
              </div>
              <span className="text-orange-200 text-sm font-medium">RDV Planifiés</span>
            </div>
            <p className="text-4xl font-bold text-white">{todayCallStats.totalRdv}</p>
            <p className="text-xs text-orange-300 mt-1">Aujourd'hui</p>
          </div>

          {/* Total Leads */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Users className="w-6 h-6 text-white" />
              </div>
              <span className="text-white/70 text-sm font-medium">Total Leads</span>
            </div>
            <p className="text-4xl font-bold text-white">{kpis.totalLeads || 0}</p>
            <p className="text-xs text-white/50 mt-1">Base complète</p>
          </div>
        </div>

        {/* TABLEAU DE BORD ÉQUIPE - Performance Appels par Utilisateur */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 mb-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-300" />
            Performance Équipe Aujourd'hui
          </h3>

          {teamCallStats.length === 0 ? (
            <div className="text-center py-8 text-white/60">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucune donnée d'équipe disponible</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-3 px-4 text-white/70 font-medium">Commercial</th>
                    <th className="text-center py-3 px-4 text-white/70 font-medium">Statut</th>
                    <th className="text-right py-3 px-4 text-white/70 font-medium">Temps Aujourd'hui</th>
                    <th className="text-right py-3 px-4 text-white/70 font-medium">Objectif</th>
                    <th className="text-center py-3 px-4 text-white/70 font-medium">Progression</th>
                    <th className="text-right py-3 px-4 text-white/70 font-medium">Semaine</th>
                    <th className="text-right py-3 px-4 text-white/70 font-medium">Mois</th>
                    <th className="text-right py-3 px-4 text-white/70 font-medium">Leads</th>
                    <th className="text-right py-3 px-4 text-white/70 font-medium">Qualifiés</th>
                    <th className="text-right py-3 px-4 text-white/70 font-medium">RDV</th>
                  </tr>
                </thead>
                <tbody>
                  {teamCallStats.map((member) => {
                    const progress = getProgressPercent(member.today_seconds, member.daily_target_seconds);

                    return (
                      <tr key={member.user_id} className="border-b border-white/10 hover:bg-white/5">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                              member.has_active_session ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
                            }`}>
                              {member.first_name?.[0]}{member.last_name?.[0]}
                            </div>
                            <div>
                              <p className="text-white font-medium">{member.first_name} {member.last_name}</p>
                              <p className="text-white/50 text-xs">{member.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {member.has_active_session ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-300 rounded-full text-xs font-medium">
                              <Wifi className="w-3 h-3" /> En ligne
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-500/20 text-gray-400 rounded-full text-xs font-medium">
                              <WifiOff className="w-3 h-3" /> Hors ligne
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-white font-bold">{formatDuration(member.today_seconds)}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-white/70">{formatDuration(member.daily_target_seconds)}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-white/10 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  progress >= 100 ? 'bg-green-500' :
                                  progress >= 75 ? 'bg-blue-500' :
                                  progress >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                            <span className={`text-xs font-bold ${
                              progress >= 100 ? 'text-green-400' :
                              progress >= 50 ? 'text-yellow-400' : 'text-red-400'
                            }`}>{progress}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-blue-300">{formatDuration(member.week_seconds)}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-purple-300">{formatDuration(member.month_seconds)}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-white">{member.today_leads || 0}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-green-400 font-medium">{member.today_qualified || 0}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-orange-400 font-medium">{member.today_rdv || 0}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Graphiques principaux */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Évolution des leads */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-300" />
              Évolution des Leads (30 derniers jours)
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={leadsEvolution}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                <XAxis dataKey="date" stroke="#ffffff60" />
                <YAxis stroke="#ffffff60" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="leads"
                  stroke="#3B82F6"
                  fillOpacity={1}
                  fill="url(#colorLeads)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Funnel de conversion */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-300" />
              Funnel de Conversion
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={conversionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                <XAxis type="number" stroke="#ffffff60" />
                <YAxis dataKey="name" type="category" stroke="#ffffff60" width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="count" fill="#10B981" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Deuxième ligne de graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

          {/* Répartition par secteur */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-purple-300" />
              Par Secteur
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <RePieChart>
                <Pie
                  data={sectorDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sectorDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RePieChart>
            </ResponsiveContainer>
          </div>

          {/* Performance commerciaux */}
          <div className="lg:col-span-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-300" />
              Performance par Commercial (Leads)
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={commercialPerformance.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                <XAxis dataKey="name" stroke="#ffffff60" />
                <YAxis stroke="#ffffff60" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="leads" fill="#3B82F6" name="Leads" radius={[8, 8, 0, 0]} />
                <Bar dataKey="converted" fill="#10B981" name="Convertis" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activités et Top Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Activités récentes */}
          <div className="lg:col-span-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-300" />
              Activités Récentes
            </h3>
            <div className="space-y-3 max-h-[350px] overflow-y-auto">
              {recentActivities.length === 0 ? (
                <p className="text-white/60 text-center py-8">Aucune activité récente</p>
              ) : (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        activity.type === 'call' ? 'bg-blue-500/20' : 'bg-green-500/20'
                      }`}>
                        {activity.type === 'call' ? (
                          <Phone className="w-4 h-4 text-blue-300" />
                        ) : (
                          <Mail className="w-4 h-4 text-green-300" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-white text-sm">
                          {activity.title || activity.notes || 'Tâche programmée'}
                        </p>
                        <p className="text-xs text-white/60 mt-1">
                          {activity.user_name} • {new Date(activity.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      {activity.completed && (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Performers */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-300" />
              Top Performers
            </h3>
            <div className="space-y-3">
              {topPerformers.map((performer, index) => (
                <div key={performer.id} className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/10">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-white text-sm">{performer.name}</p>
                    <p className="text-xs text-white/60">
                      {performer.converted}/{performer.leads} leads • {performer.rate}%
                    </p>
                  </div>
                  <Award className="w-5 h-5 text-yellow-400" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Alertes */}
        {(kpis.pendingTasks > 0 || kpis.pendingValidations > 0) && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {kpis.pendingTasks > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6">
                <div className="flex items-center gap-3">
                  <Clock className="w-6 h-6 text-yellow-400" />
                  <div>
                    <p className="font-bold text-white">
                      {kpis.pendingTasks} tâches en attente
                    </p>
                    <p className="text-sm text-yellow-200">
                      Des tâches nécessitent votre attention
                    </p>
                  </div>
                </div>
              </div>
            )}

            {kpis.pendingValidations > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                  <div>
                    <p className="font-bold text-white">
                      {kpis.pendingValidations} demandes de validation
                    </p>
                    <p className="text-sm text-red-200">
                      Demandes en attente de traitement
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
