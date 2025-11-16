import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingUp, Users, Mail, Phone, Target, DollarSign,
  Calendar, CheckCircle, XCircle, Clock, BarChart3,
  Activity, Zap, Database, Award, ArrowUp, ArrowDown, Loader2
} from 'lucide-react';
import api from '../api/axios';

export default function Statistics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30'); // jours

  useEffect(() => {
    loadStatistics();
  }, [timeRange]);

  const loadStatistics = async () => {
    try {
      setLoading(true);

      // Charger les stats en parallèle
      const [
        leadsRes,
        campaignsRes,
        statsRes
      ] = await Promise.all([
        api.get('/leads'),
        api.get('/campaigns'),
        api.get('/stats')
      ]);

      const leads = leadsRes.data.leads || [];
      const campaigns = campaignsRes.data.campaigns || [];
      const globalStats = statsRes.data || {};

      // Calculer les stats
      const now = new Date();
      const timeRangeDays = parseInt(timeRange);
      const cutoffDate = new Date(now.getTime() - timeRangeDays * 24 * 60 * 60 * 1000);

      // Leads stats
      const recentLeads = leads.filter(l => new Date(l.created_at) >= cutoffDate);
      const qualifiedLeads = leads.filter(l => l.status === 'qualifie' || l.status === 'tres_qualifie');
      const convertedLeads = leads.filter(l => l.status === 'gagne');

      // Campagnes stats
      const activeCampaigns = campaigns.filter(c => c.status === 'active');
      const completedCampaigns = campaigns.filter(c => c.status === 'completed');

      // Calculer taux de conversion
      const conversionRate = leads.length > 0
        ? ((convertedLeads.length / leads.length) * 100).toFixed(1)
        : 0;

      const qualificationRate = leads.length > 0
        ? ((qualifiedLeads.length / leads.length) * 100).toFixed(1)
        : 0;

      // Stats par statut
      const statusCounts = leads.reduce((acc, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
      }, {});

      // Stats par secteur
      const sectorCounts = leads.reduce((acc, lead) => {
        if (lead.sector) {
          acc[lead.sector] = (acc[lead.sector] || 0) + 1;
        }
        return acc;
      }, {});

      // Top secteurs
      const topSectors = Object.entries(sectorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      setStats({
        total_leads: leads.length,
        recent_leads: recentLeads.length,
        qualified_leads: qualifiedLeads.length,
        converted_leads: convertedLeads.length,
        conversion_rate: conversionRate,
        qualification_rate: qualificationRate,
        active_campaigns: activeCampaigns.length,
        completed_campaigns: completedCampaigns.length,
        total_campaigns: campaigns.length,
        status_counts: statusCounts,
        top_sectors: topSectors,
        ...globalStats
      });

    } catch (error) {
      console.error('Erreur chargement statistiques:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900">Erreur de chargement</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
              Statistiques & Analytics
            </h1>
            <p className="text-gray-700 text-lg font-medium">
              Vue d'ensemble de votre activité commerciale
            </p>
          </div>

          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white font-semibold"
          >
            <option value="7">7 derniers jours</option>
            <option value="30">30 derniers jours</option>
            <option value="90">90 derniers jours</option>
            <option value="365">12 derniers mois</option>
          </select>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Leads */}
          <Card className="shadow-xl border-2 border-gray-200 bg-gradient-to-br from-blue-500 to-blue-600 hover:scale-105 transition-all">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between text-white">
                <div>
                  <p className="text-sm font-medium opacity-90">Total Leads</p>
                  <p className="text-4xl font-bold mt-1">{stats.total_leads}</p>
                  <p className="text-xs opacity-75 mt-2 flex items-center gap-1">
                    <ArrowUp className="w-3 h-3" />
                    {stats.recent_leads} nouveaux
                  </p>
                </div>
                <Users className="w-16 h-16 opacity-30" />
              </div>
            </CardContent>
          </Card>

          {/* Taux de conversion */}
          <Card className="shadow-xl border-2 border-gray-200 bg-gradient-to-br from-green-500 to-green-600 hover:scale-105 transition-all">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between text-white">
                <div>
                  <p className="text-sm font-medium opacity-90">Taux Conversion</p>
                  <p className="text-4xl font-bold mt-1">{stats.conversion_rate}%</p>
                  <p className="text-xs opacity-75 mt-2">
                    {stats.converted_leads} leads gagnés
                  </p>
                </div>
                <TrendingUp className="w-16 h-16 opacity-30" />
              </div>
            </CardContent>
          </Card>

          {/* Leads qualifiés */}
          <Card className="shadow-xl border-2 border-gray-200 bg-gradient-to-br from-purple-500 to-purple-600 hover:scale-105 transition-all">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between text-white">
                <div>
                  <p className="text-sm font-medium opacity-90">Leads Qualifiés</p>
                  <p className="text-4xl font-bold mt-1">{stats.qualified_leads}</p>
                  <p className="text-xs opacity-75 mt-2">
                    {stats.qualification_rate}% du total
                  </p>
                </div>
                <Target className="w-16 h-16 opacity-30" />
              </div>
            </CardContent>
          </Card>

          {/* Campagnes actives */}
          <Card className="shadow-xl border-2 border-gray-200 bg-gradient-to-br from-orange-500 to-orange-600 hover:scale-105 transition-all">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between text-white">
                <div>
                  <p className="text-sm font-medium opacity-90">Campagnes Actives</p>
                  <p className="text-4xl font-bold mt-1">{stats.active_campaigns}</p>
                  <p className="text-xs opacity-75 mt-2">
                    {stats.total_campaigns} au total
                  </p>
                </div>
                <Zap className="w-16 h-16 opacity-30" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Statistiques détaillées */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Répartition par statut */}
          <Card className="shadow-xl border-2 border-gray-200">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                Répartition par Statut
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {Object.entries(stats.status_counts || {})
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count]) => {
                    const percentage = ((count / stats.total_leads) * 100).toFixed(1);
                    const statusLabels = {
                      'cold_call': 'Cold Call',
                      'leads_click': 'Leads Click',
                      'nrp': 'NRP',
                      'qualifie': 'Qualifié',
                      'relancer': 'À Relancer',
                      'tres_qualifie': 'Très Qualifié',
                      'proposition': 'Proposition',
                      'gagne': 'Gagné',
                      'hors_scope': 'Hors Scope'
                    };

                    const statusColors = {
                      'cold_call': 'bg-indigo-500',
                      'leads_click': 'bg-cyan-500',
                      'nrp': 'bg-gray-500',
                      'qualifie': 'bg-blue-500',
                      'relancer': 'bg-yellow-500',
                      'tres_qualifie': 'bg-green-500',
                      'proposition': 'bg-purple-500',
                      'gagne': 'bg-emerald-600',
                      'hors_scope': 'bg-orange-500'
                    };

                    return (
                      <div key={status} className="flex items-center gap-4">
                        <div className="w-32 text-sm font-medium text-gray-700">
                          {statusLabels[status] || status}
                        </div>
                        <div className="flex-1">
                          <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${statusColors[status] || 'bg-gray-400'} flex items-center justify-end pr-2 text-white text-xs font-bold transition-all`}
                              style={{ width: `${percentage}%` }}
                            >
                              {percentage}%
                            </div>
                          </div>
                        </div>
                        <div className="w-16 text-right text-sm font-bold text-gray-900">
                          {count}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          {/* Top Secteurs */}
          <Card className="shadow-xl border-2 border-gray-200">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-600" />
                Top 5 Secteurs
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {stats.top_sectors.map(([sector, count], index) => {
                  const percentage = ((count / stats.total_leads) * 100).toFixed(1);
                  const colors = [
                    'bg-purple-500',
                    'bg-pink-500',
                    'bg-blue-500',
                    'bg-indigo-500',
                    'bg-cyan-500'
                  ];

                  return (
                    <div key={sector} className="flex items-center gap-4">
                      <div className={`w-8 h-8 ${colors[index]} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700 capitalize">
                            {sector}
                          </span>
                          <span className="text-xs font-bold text-gray-900">
                            {count} leads ({percentage}%)
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${colors[index]} transition-all`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats globales - Emails, Appels, Activité */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Emails envoyés */}
          <Card className="shadow-xl border-2 border-gray-200 hover:shadow-2xl transition-all">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                Emails
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {stats.email_stats?.total_sent || 0}
              </div>
              <div className="text-sm text-gray-600 mb-3">
                Emails envoyés
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">📨 Ouverts</span>
                  <span className="font-bold text-green-600">
                    {stats.email_stats?.total_opened || 0} ({stats.email_stats?.open_rate || 0}%)
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">🖱️ Cliqués</span>
                  <span className="font-bold text-purple-600">
                    {stats.email_stats?.total_clicked || 0} ({stats.email_stats?.click_rate || 0}%)
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Appels */}
          <Card className="shadow-xl border-2 border-gray-200 hover:shadow-2xl transition-all">
            <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-green-600" />
                Appels
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {stats.call_stats?.total_calls || 0}
              </div>
              <div className="text-sm text-gray-600 mb-3">
                Appels effectués
              </div>
              {stats.call_stats?.total_calls > 0 && stats.call_stats?.avg_duration ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">⏱️ Durée moyenne</span>
                  <span className="font-bold text-blue-600">
                    {stats.call_stats.avg_duration} min
                  </span>
                </div>
              ) : (
                <div className="text-xs text-gray-500 italic">
                  Système d'appels bientôt disponible
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activité */}
          <Card className="shadow-xl border-2 border-gray-200 hover:shadow-2xl transition-all">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-orange-600" />
                Activité
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-orange-600 mb-2">
                {stats.activity_score !== undefined ? stats.activity_score : 0}/100
              </div>
              <div className="text-sm text-gray-600 mb-3">
                Score d'activité (30j)
              </div>
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all"
                    style={{ width: `${stats.activity_score || 0}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">⚡ Actions/jour</span>
                  <span className="font-bold text-purple-600">
                    {stats.daily_actions || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
