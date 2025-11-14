import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingUp, Users, Mail, Phone, Target, DollarSign,
  Calendar, CheckCircle, XCircle, Clock, BarChart3,
  Activity, Zap, Database, Award, ArrowUp, ArrowDown, Loader2,
  TrendingDown, Percent, Eye, MousePointer
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
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-400 mx-auto mb-4" />
          <p className="text-white text-lg font-semibold">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-4 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-white">Erreur de chargement</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header - Plus compact */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-1 animate-pulse">
              📊 Analytics Dashboard
            </h1>
            <p className="text-gray-300 text-sm font-medium">
              Vue temps réel de votre performance commerciale
            </p>
          </div>

          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border-2 border-purple-500 rounded-xl focus:ring-2 focus:ring-purple-400 bg-slate-800 text-white font-semibold text-sm hover:bg-slate-700 transition-all cursor-pointer"
          >
            <option value="7">7 jours</option>
            <option value="30">30 jours</option>
            <option value="90">90 jours</option>
            <option value="365">365 jours</option>
          </select>
        </div>

        {/* KPI Cards - Plus compactes avec animations */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {/* Total Leads */}
          <Card className="relative overflow-hidden shadow-2xl border-0" style={{background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'}}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000"></div>
            <CardContent className="pt-4 pb-4 relative z-10">
              <div className="flex items-start justify-between text-white">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 opacity-80" />
                    <p className="text-xs font-bold opacity-90 uppercase tracking-wide">Total Leads</p>
                  </div>
                  <p className="text-5xl font-black mb-1">{stats.total_leads}</p>
                  <div className="flex items-center gap-2 text-xs opacity-90">
                    <div className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full">
                      <ArrowUp className="w-3 h-3" />
                      <span className="font-bold">{stats.recent_leads}</span>
                    </div>
                    <span>récents</span>
                  </div>
                </div>
                <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm">
                  <Database className="w-8 h-8" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Taux de conversion avec graphique circulaire */}
          <Card className="relative overflow-hidden shadow-2xl border-0" style={{background: 'linear-gradient(135deg, #059669 0%, #047857 100%)'}}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000"></div>
            <CardContent className="pt-4 pb-4 relative z-10">
              <div className="flex items-start justify-between text-white">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 opacity-80" />
                    <p className="text-xs font-bold opacity-90 uppercase tracking-wide">Conversion</p>
                  </div>
                  <p className="text-5xl font-black mb-1">{stats.conversion_rate}%</p>
                  <div className="text-xs opacity-90 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    <span className="font-bold">{stats.converted_leads}</span>
                    <span>gagnés</span>
                  </div>
                </div>
                <div className="relative">
                  {/* Mini graphique circulaire */}
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      fill="none"
                      stroke="white"
                      strokeWidth="6"
                      strokeDasharray={`${stats.conversion_rate * 2} 200`}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Target className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leads qualifiés */}
          <Card className="relative overflow-hidden shadow-2xl border-0" style={{background: 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)'}}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000"></div>
            <CardContent className="pt-4 pb-4 relative z-10">
              <div className="flex items-start justify-between text-white">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="w-4 h-4 opacity-80" />
                    <p className="text-xs font-bold opacity-90 uppercase tracking-wide">Qualifiés</p>
                  </div>
                  <p className="text-5xl font-black mb-1">{stats.qualified_leads}</p>
                  <div className="text-xs opacity-90 flex items-center gap-1">
                    <Percent className="w-3 h-3" />
                    <span className="font-bold">{stats.qualification_rate}%</span>
                    <span>du total</span>
                  </div>
                </div>
                <div className="relative">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      fill="none"
                      stroke="white"
                      strokeWidth="6"
                      strokeDasharray={`${stats.qualification_rate * 2} 200`}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Award className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Campagnes actives */}
          <Card className="relative overflow-hidden shadow-2xl border-0" style={{background: 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)'}}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000"></div>
            <CardContent className="pt-4 pb-4 relative z-10">
              <div className="flex items-start justify-between text-white">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 opacity-80" />
                    <p className="text-xs font-bold opacity-90 uppercase tracking-wide">Campagnes</p>
                  </div>
                  <p className="text-5xl font-black mb-1">{stats.active_campaigns}</p>
                  <div className="text-xs opacity-90 flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    <span className="font-bold">{stats.total_campaigns}</span>
                    <span>total</span>
                  </div>
                </div>
                <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm">
                  <Zap className="w-8 h-8" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Statistiques détaillées - Plus compactes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
          {/* Répartition par statut */}
          <Card className="shadow-2xl border-0 bg-slate-800/90 backdrop-blur-lg hover:shadow-purple-500/30 transition-all">
            <CardHeader className="bg-gradient-to-r from-purple-600/50 to-blue-600/50 border-b border-slate-700 py-3">
              <CardTitle className="flex items-center gap-2 text-white text-base">
                <BarChart3 className="w-5 h-5" />
                Répartition par Statut
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-4">
              <div className="space-y-2.5">
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
                      'cold_call': 'from-indigo-500 to-indigo-600',
                      'leads_click': 'from-cyan-500 to-cyan-600',
                      'nrp': 'from-gray-500 to-gray-600',
                      'qualifie': 'from-blue-500 to-blue-600',
                      'relancer': 'from-yellow-500 to-yellow-600',
                      'tres_qualifie': 'from-green-500 to-green-600',
                      'proposition': 'from-purple-500 to-purple-600',
                      'gagne': 'from-emerald-500 to-emerald-600',
                      'hors_scope': 'from-orange-500 to-orange-600'
                    };

                    return (
                      <div key={status} className="flex items-center gap-3 group">
                        <div className="w-28 text-xs font-bold text-gray-300">
                          {statusLabels[status] || status}
                        </div>
                        <div className="flex-1">
                          <div className="h-5 bg-slate-700 rounded-full overflow-hidden relative">
                            <div
                              className={`h-full bg-gradient-to-r ${statusColors[status] || 'from-gray-400 to-gray-500'} flex items-center justify-end px-2 text-white text-xs font-bold transition-all duration-500 group-hover:brightness-125`}
                              style={{ width: `${percentage}%` }}
                            >
                              {percentage > 5 && `${percentage}%`}
                            </div>
                          </div>
                        </div>
                        <div className="w-14 text-right text-sm font-black text-white">
                          {count}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          {/* Top Secteurs */}
          <Card className="shadow-2xl border-0 bg-slate-800/90 backdrop-blur-lg hover:shadow-pink-500/30 transition-all">
            <CardHeader className="bg-gradient-to-r from-pink-600/50 to-purple-600/50 border-b border-slate-700 py-3">
              <CardTitle className="flex items-center gap-2 text-white text-base">
                <Award className="w-5 h-5" />
                Top 5 Secteurs d'Activité
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-4">
              <div className="space-y-3">
                {stats.top_sectors.map(([sector, count], index) => {
                  const percentage = ((count / stats.total_leads) * 100).toFixed(1);
                  const gradients = [
                    'from-purple-500 to-pink-500',
                    'from-pink-500 to-rose-500',
                    'from-blue-500 to-cyan-500',
                    'from-indigo-500 to-purple-500',
                    'from-cyan-500 to-teal-500'
                  ];

                  return (
                    <div key={sector} className="flex items-center gap-3 group cursor-pointer">
                      <div className={`w-9 h-9 bg-gradient-to-br ${gradients[index]} rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg group-hover:scale-110 transition-transform`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold text-white capitalize">
                            {sector}
                          </span>
                          <span className="text-xs font-black text-gray-300">
                            {count} • {percentage}%
                          </span>
                        </div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${gradients[index]} transition-all duration-500 group-hover:brightness-125`}
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

        {/* Stats globales - Plus compactes */}
        {stats.email_stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Emails envoyés */}
            <Card className="shadow-2xl border-0 hover:scale-105 transition-all" style={{background: 'linear-gradient(135deg, #2563eb 0%, #0891b2 100%)'}}>
              <CardHeader className="bg-white/10 border-b border-white/20 py-3">
                <CardTitle className="flex items-center gap-2 text-white text-base">
                  <Mail className="w-5 h-5" />
                  Emails
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 pb-4">
                <div className="text-4xl font-black text-white mb-1">
                  {stats.email_stats.total_sent || 0}
                </div>
                <div className="text-xs text-white/80 font-semibold mb-3">
                  Emails envoyés
                </div>
                {stats.email_stats.open_rate && (
                  <div className="pt-2 border-t border-white/20">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-white/90">
                        <Eye className="w-4 h-4" />
                        <span className="font-semibold">Taux d'ouverture</span>
                      </div>
                      <span className="font-black text-white text-lg">
                        {stats.email_stats.open_rate}%
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Appels */}
            <Card className="shadow-2xl border-0 hover:scale-105 transition-all" style={{background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)'}}>
              <CardHeader className="bg-white/10 border-b border-white/20 py-3">
                <CardTitle className="flex items-center gap-2 text-white text-base">
                  <Phone className="w-5 h-5" />
                  Appels Téléphoniques
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 pb-4">
                <div className="text-4xl font-black text-white mb-1">
                  {stats.call_stats?.total_calls || 0}
                </div>
                <div className="text-xs text-white/80 font-semibold mb-3">
                  Appels effectués
                </div>
                {stats.call_stats?.avg_duration && (
                  <div className="pt-2 border-t border-white/20">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-white/90">
                        <Clock className="w-4 h-4" />
                        <span className="font-semibold">Durée moyenne</span>
                      </div>
                      <span className="font-black text-white text-lg">
                        {stats.call_stats.avg_duration}m
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activité */}
            <Card className="shadow-2xl border-0 hover:scale-105 transition-all" style={{background: 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)'}}>
              <CardHeader className="bg-white/10 border-b border-white/20 py-3">
                <CardTitle className="flex items-center gap-2 text-white text-base">
                  <Activity className="w-5 h-5" />
                  Score d'Activité
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 pb-4">
                <div className="text-4xl font-black text-white mb-1">
                  {stats.activity_score || 'N/A'}
                </div>
                <div className="text-xs text-white/80 font-semibold mb-3">
                  Score global
                </div>
                <div className="pt-2 border-t border-white/20">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-white/90">
                      <Zap className="w-4 h-4" />
                      <span className="font-semibold">Actions/jour</span>
                    </div>
                    <span className="font-black text-white text-lg">
                      {stats.daily_actions || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
