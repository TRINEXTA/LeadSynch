import { log, error, warn } from "../lib/logger.js";
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  Users, TrendingUp, Target, DollarSign, Activity, RefreshCw,
  BarChart3, PieChart, Calendar, Clock, Mail, Phone, CheckCircle,
  XCircle, AlertCircle, Award, Zap, Eye, ArrowUp, ArrowDown, Shield
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

      // Auto-refresh toutes les 30 secondes
      const interval = setInterval(() => {
        loadDashboardData(true);
      }, 30000);

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
        validationsRes
      ] = await Promise.all([
        api.get('/stats'),
        api.get('/leads'),
        api.get('/campaigns'),
        api.get('/users'),
        api.get('/follow-ups'),
        api.get('/validation-requests?status=pending')
      ]);

      const leads = leadsRes.data.leads || [];
      const campaigns = campaignsRes.data.campaigns || [];
      const users = usersRes.data.users || [];
      const followUps = followUpsRes.data.followups || [];
      const validations = validationsRes.data.requests || [];

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

    } catch (error) {
      error('Erreur chargement dashboard admin:', error);
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
        avatar: `${user.first_name[0]}${user.last_name[0]}`,
        leads: userLeads.length,
        converted,
        rate: userLeads.length > 0 ? ((converted / userLeads.length) * 100).toFixed(1) : 0
      };
    })
    .sort((a, b) => parseFloat(b.rate) - parseFloat(a.rate))
    .slice(0, 5);
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
      <div className="max-w-[1800px] mx-auto">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-1">
                Centre de Contrôle Admin
              </h1>
              <p className="text-blue-200">
                Vue d'ensemble en temps réel de toute l'organisation
              </p>
            </div>
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

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">

          {/* Total Leads */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <Users className="w-6 h-6 text-blue-300" />
              </div>
              <ArrowUp className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-blue-200 text-sm font-medium mb-1">Total Leads</p>
            <p className="text-4xl font-bold text-white">{kpis.totalLeads || 0}</p>
            <p className="text-xs text-blue-300 mt-2">Tous les prospects</p>
          </div>

          {/* Taux Conversion */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/20 rounded-xl">
                <TrendingUp className="w-6 h-6 text-green-300" />
              </div>
              <span className="text-xs text-green-400 font-bold">+{kpis.conversionRate}%</span>
            </div>
            <p className="text-green-200 text-sm font-medium mb-1">Taux Conversion</p>
            <p className="text-4xl font-bold text-white">{kpis.conversionRate}%</p>
            <p className="text-xs text-green-300 mt-2">{kpis.convertedLeads} leads gagnés</p>
          </div>

          {/* Leads Qualifiés */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <Target className="w-6 h-6 text-purple-300" />
              </div>
            </div>
            <p className="text-purple-200 text-sm font-medium mb-1">Leads Qualifiés</p>
            <p className="text-4xl font-bold text-white">{kpis.qualifiedLeads || 0}</p>
            <p className="text-xs text-purple-300 mt-2">Chauds et très chauds</p>
          </div>

          {/* Campagnes */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-500/20 rounded-xl">
                <Zap className="w-6 h-6 text-orange-300" />
              </div>
            </div>
            <p className="text-orange-200 text-sm font-medium mb-1">Campagnes</p>
            <p className="text-4xl font-bold text-white">{kpis.activeCampaigns || 0}</p>
            <p className="text-xs text-orange-300 mt-2">{kpis.totalCampaigns} au total</p>
          </div>

          {/* Équipe */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-pink-500/20 rounded-xl">
                <Activity className="w-6 h-6 text-pink-300" />
              </div>
            </div>
            <p className="text-pink-200 text-sm font-medium mb-1">Équipe Active</p>
            <p className="text-4xl font-bold text-white">{kpis.activeUsers || 0}</p>
            <p className="text-xs text-pink-300 mt-2">{kpis.totalUsers} commerciaux</p>
          </div>
        </div>

        {/* Graphiques principaux */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

          {/* Évolution des leads */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-300" />
              Évolution des Leads (30 derniers jours)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
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
            <ResponsiveContainer width="100%" height={300}>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          {/* Répartition par secteur */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-purple-300" />
              Par Secteur
            </h3>
            <ResponsiveContainer width="100%" height={250}>
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
              Performance par Commercial
            </h3>
            <ResponsiveContainer width="100%" height={250}>
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
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
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
