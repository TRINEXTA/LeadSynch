import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  FileText, Download, Calendar, Users, Target, Phone,
  Mail, CheckCircle, XCircle, TrendingUp, Clock, Award,
  BarChart3, Eye, Filter, RefreshCw, FileSpreadsheet,
  ChevronDown, User, Activity, Briefcase, ArrowUp, ArrowDown,
  Bell, AlertTriangle, Trophy, Medal, Zap, Timer, PieChart
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell
} from 'recharts';

const PERIODS = [
  { value: 'today', label: "Aujourd'hui", icon: Calendar },
  { value: '7days', label: '7 derniers jours', icon: Calendar },
  { value: '30days', label: '30 derniers jours', icon: Calendar },
  { value: 'quarter', label: 'Trimestre (90 jours)', icon: Calendar },
  { value: 'semester', label: 'Semestre (180 jours)', icon: Calendar },
  { value: 'year', label: 'Année (365 jours)', icon: Calendar }
];

// Tabs for the report page
const REPORT_TABS = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
  { id: 'rappels', label: 'Rappels & Suivi', icon: Bell },
  { id: 'performance', label: 'Performance', icon: Trophy },
  { id: 'evolution', label: 'Évolution', icon: TrendingUp }
];

// Colors for charts
const CHART_COLORS = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

export default function UserReports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30days');
  const [reportData, setReportData] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [exporting, setExporting] = useState(false);

  // New states for enhanced reports
  const [activeTab, setActiveTab] = useState('overview');
  const [rappelsStats, setRappelsStats] = useState(null);
  const [performanceScores, setPerformanceScores] = useState(null);
  const [evolutionData, setEvolutionData] = useState(null);
  const [loadingRappels, setLoadingRappels] = useState(false);
  const [loadingPerformance, setLoadingPerformance] = useState(false);
  const [loadingEvolution, setLoadingEvolution] = useState(false);

  useEffect(() => {
    loadReportData();
    loadRappelsStats();
    loadPerformanceScores();
    loadEvolutionData();
  }, [period]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/user-reports/summary?period=${period}`);
      setReportData(response.data);
    } catch (err) {
      console.error('Error loading report:', err);
      toast.error('Erreur lors du chargement du rapport');
    } finally {
      setLoading(false);
    }
  };

  const loadRappelsStats = async () => {
    try {
      setLoadingRappels(true);
      const response = await api.get(`/user-reports/rappels-stats?period=${period}`);
      setRappelsStats(response.data);
    } catch (err) {
      console.error('Error loading rappels stats:', err);
    } finally {
      setLoadingRappels(false);
    }
  };

  const loadPerformanceScores = async () => {
    try {
      setLoadingPerformance(true);
      const response = await api.get(`/user-reports/performance-score?period=${period}`);
      setPerformanceScores(response.data);
    } catch (err) {
      console.error('Error loading performance scores:', err);
    } finally {
      setLoadingPerformance(false);
    }
  };

  const loadEvolutionData = async () => {
    try {
      setLoadingEvolution(true);
      const response = await api.get(`/user-reports/evolution?period=${period}`);
      setEvolutionData(response.data);
    } catch (err) {
      console.error('Error loading evolution data:', err);
    } finally {
      setLoadingEvolution(false);
    }
  };

  const loadUserDetail = async (userId, userName) => {
    try {
      setLoadingDetail(true);
      setSelectedUser({ id: userId, name: userName });
      const response = await api.get(`/user-reports/user/${userId}?period=${period}`);
      setUserDetail(response.data);
    } catch (err) {
      console.error('Error loading user detail:', err);
      toast.error('Erreur lors du chargement des détails');
    } finally {
      setLoadingDetail(false);
    }
  };

  const exportToCSV = async () => {
    try {
      setExporting(true);
      const response = await api.get(`/user-reports/export?period=${period}`);
      const { export_data } = response.data;

      // Create CSV content
      const headers = [
        'Nom', 'Email', 'Rôle', 'Actif',
        'Leads Assignés', 'Leads Contactés', 'Leads Qualifiés',
        'Propositions', 'Deals Gagnés', 'Deals Perdus',
        'Tâches Complétées', 'Sessions Appel', 'Temps Appel (min)'
      ];

      const rows = export_data.data.map(row => [
        row.nom_complet,
        row.email,
        row.role,
        row.actif ? 'Oui' : 'Non',
        row.leads_assignes,
        row.leads_contactes,
        row.leads_qualifies,
        row.propositions_envoyees,
        row.deals_gagnes,
        row.deals_perdus,
        row.taches_completees,
        row.sessions_appel,
        Math.round(row.temps_appel_secondes / 60)
      ]);

      const csvContent = [
        `Rapport de Performance - ${export_data.company}`,
        `Période: ${export_data.period_label} (${export_data.date_range.start} - ${export_data.date_range.end})`,
        `Généré le: ${export_data.generated_at}`,
        '',
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `rapport-performance-${period}-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      toast.success('Rapport exporté avec succès');
    } catch (err) {
      console.error('Export error:', err);
      toast.error("Erreur lors de l'export");
    } finally {
      setExporting(false);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0h';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const getPerformanceColor = (value, thresholds = { good: 70, medium: 40 }) => {
    if (value >= thresholds.good) return 'text-emerald-400';
    if (value >= thresholds.medium) return 'text-amber-400';
    return 'text-red-400';
  };

  if (loading && !reportData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white font-medium">Chargement des rapports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-[1800px] mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg shadow-violet-500/30">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Rapports de Performance</h1>
                <p className="text-slate-400 mt-1">
                  Analyse détaillée de la performance des utilisateurs
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Period Selector */}
              <div className="relative">
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/50 cursor-pointer min-w-[200px]"
                >
                  {PERIODS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>

              {/* Refresh Button */}
              <button
                onClick={loadReportData}
                disabled={loading}
                className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>

              {/* Export Button */}
              <button
                onClick={exportToCSV}
                disabled={exporting}
                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-50"
              >
                <FileSpreadsheet className="w-5 h-5" />
                {exporting ? 'Export...' : 'Exporter CSV'}
              </button>
            </div>
          </div>

          {/* Date Range Info */}
          {reportData?.date_range && (
            <div className="mt-4 flex items-center gap-2 text-slate-400">
              <Calendar className="w-4 h-4" />
              <span>
                Période: {new Date(reportData.date_range.start).toLocaleDateString('fr-FR')} -
                {' '}{new Date(reportData.date_range.end).toLocaleDateString('fr-FR')}
              </span>
            </div>
          )}
        </div>

        {/* Tabs Navigation */}
        <div className="mb-6 flex flex-wrap gap-2 bg-slate-800/50 backdrop-blur-xl rounded-xl p-2 border border-slate-700/50">
          {REPORT_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Summary Cards */}
        {reportData?.totals && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
            <SummaryCard
              icon={Target}
              label="Leads Assignés"
              value={reportData.totals.leads_assigned}
              color="blue"
            />
            <SummaryCard
              icon={Phone}
              label="Leads Contactés"
              value={reportData.totals.leads_contacted}
              color="cyan"
            />
            <SummaryCard
              icon={TrendingUp}
              label="Leads Qualifiés"
              value={reportData.totals.leads_qualified}
              color="violet"
            />
            <SummaryCard
              icon={CheckCircle}
              label="Deals Gagnés"
              value={reportData.totals.deals_won}
              color="emerald"
            />
            <SummaryCard
              icon={XCircle}
              label="Deals Perdus"
              value={reportData.totals.deals_lost}
              color="red"
            />
            <SummaryCard
              icon={Activity}
              label="Taux Conversion"
              value={`${reportData.totals.conversion_rate}%`}
              color="amber"
            />
          </div>
        )}

        {/* Users Performance Table */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-slate-700/50 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-violet-400" />
              Performance par Utilisateur
            </h2>
            <span className="text-slate-400 text-sm">
              {reportData?.users?.length || 0} utilisateurs
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-900/50">
                  <th className="text-left py-4 px-5 text-slate-400 font-semibold text-sm">Utilisateur</th>
                  <th className="text-center py-4 px-3 text-slate-400 font-semibold text-sm">Leads</th>
                  <th className="text-center py-4 px-3 text-slate-400 font-semibold text-sm">Contactés</th>
                  <th className="text-center py-4 px-3 text-slate-400 font-semibold text-sm">Qualifiés</th>
                  <th className="text-center py-4 px-3 text-slate-400 font-semibold text-sm">Propositions</th>
                  <th className="text-center py-4 px-3 text-slate-400 font-semibold text-sm">Gagnés</th>
                  <th className="text-center py-4 px-3 text-slate-400 font-semibold text-sm">Perdus</th>
                  <th className="text-center py-4 px-3 text-slate-400 font-semibold text-sm">Taux Conv.</th>
                  <th className="text-center py-4 px-3 text-slate-400 font-semibold text-sm">Tâches</th>
                  <th className="text-center py-4 px-3 text-slate-400 font-semibold text-sm">Temps Appel</th>
                  <th className="text-center py-4 px-3 text-slate-400 font-semibold text-sm">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {reportData?.users?.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white ${
                          u.is_active ? 'bg-gradient-to-br from-violet-500 to-purple-600' : 'bg-slate-600'
                        }`}>
                          {u.first_name?.[0]}{u.last_name?.[0]}
                        </div>
                        <div>
                          <p className="text-white font-medium">{u.first_name} {u.last_name}</p>
                          <p className="text-slate-500 text-xs">{u.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-3 text-center">
                      <span className="text-white font-semibold">{u.leads_assigned || 0}</span>
                    </td>
                    <td className="py-4 px-3 text-center">
                      <span className="text-cyan-400 font-semibold">{u.leads_contacted || 0}</span>
                    </td>
                    <td className="py-4 px-3 text-center">
                      <span className="text-violet-400 font-semibold">{u.leads_qualified || 0}</span>
                    </td>
                    <td className="py-4 px-3 text-center">
                      <span className="text-blue-400 font-semibold">{u.proposals_sent || 0}</span>
                    </td>
                    <td className="py-4 px-3 text-center">
                      <span className="text-emerald-400 font-bold">{u.deals_won || 0}</span>
                    </td>
                    <td className="py-4 px-3 text-center">
                      <span className="text-red-400 font-semibold">{u.deals_lost || 0}</span>
                    </td>
                    <td className="py-4 px-3 text-center">
                      <span className={`font-bold ${getPerformanceColor(parseFloat(u.conversion_rate || 0), { good: 20, medium: 10 })}`}>
                        {u.conversion_rate || 0}%
                      </span>
                    </td>
                    <td className="py-4 px-3 text-center">
                      <span className="text-amber-400 font-semibold">{u.tasks_completed || 0}</span>
                    </td>
                    <td className="py-4 px-3 text-center">
                      <span className="text-slate-300">{formatDuration(u.total_call_seconds)}</span>
                    </td>
                    <td className="py-4 px-3 text-center">
                      <button
                        onClick={() => loadUserDetail(u.id, `${u.first_name} ${u.last_name}`)}
                        className="p-2 bg-violet-500/20 hover:bg-violet-500/40 border border-violet-500/30 rounded-xl text-violet-400 hover:text-white transition-all"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
          </>
        )}

        {/* Rappels Tab */}
        {activeTab === 'rappels' && (
          <RappelsTab
            data={rappelsStats}
            loading={loadingRappels}
            formatDuration={formatDuration}
          />
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <PerformanceTab
            data={performanceScores}
            loading={loadingPerformance}
          />
        )}

        {/* Evolution Tab */}
        {activeTab === 'evolution' && (
          <EvolutionTab
            data={evolutionData}
            loading={loadingEvolution}
          />
        )}

        {/* User Detail Modal */}
        {selectedUser && (
          <UserDetailModal
            user={selectedUser}
            detail={userDetail}
            loading={loadingDetail}
            period={period}
            onClose={() => {
              setSelectedUser(null);
              setUserDetail(null);
            }}
            formatDuration={formatDuration}
          />
        )}
      </div>
    </div>
  );
}

// Summary Card Component
function SummaryCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400',
    cyan: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30 text-cyan-400',
    violet: 'from-violet-500/20 to-violet-600/10 border-violet-500/30 text-violet-400',
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400',
    red: 'from-red-500/20 to-red-600/10 border-red-500/30 text-red-400',
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400'
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-2xl p-5`}>
      <div className="flex items-center gap-3 mb-2">
        <Icon className="w-5 h-5" />
        <span className="text-slate-400 text-sm font-medium">{label}</span>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

// User Detail Modal
function UserDetailModal({ user, detail, loading, period, onClose, formatDuration }) {
  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{user.name}</h3>
              <p className="text-slate-400">Rapport détaillé - {PERIODS.find(p => p.value === period)?.label}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : detail ? (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatBox label="Sessions d'appel" value={detail.statistics.calls?.total_sessions || 0} icon={Phone} />
                <StatBox label="Temps total appels" value={formatDuration(detail.statistics.calls?.total_seconds)} icon={Clock} />
                <StatBox label="Leads contactés" value={detail.statistics.calls?.leads_contacted || 0} icon={Users} />
                <StatBox label="Leads qualifiés" value={detail.statistics.calls?.leads_qualified || 0} icon={TrendingUp} />
              </div>

              {/* Leads by Status */}
              {detail.statistics.leads_by_status?.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Target className="w-5 h-5 text-violet-400" />
                    Répartition des Leads par Statut
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {detail.statistics.leads_by_status.map((item, idx) => (
                      <div key={idx} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                        <p className="text-slate-400 text-sm capitalize">{item.status?.replace(/_/g, ' ')}</p>
                        <p className="text-2xl font-bold text-white">{item.count}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Daily Activity */}
              {detail.statistics.daily_activity?.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-400" />
                    Activité Quotidienne
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {detail.statistics.daily_activity.slice(0, 14).map((day, idx) => (
                      <div key={idx} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 text-center min-w-[80px]">
                        <p className="text-slate-500 text-xs">
                          {new Date(day.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                        </p>
                        <p className="text-lg font-bold text-white">{day.actions}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Activities */}
              {detail.recent_activities?.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-400" />
                    Activités Récentes
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {detail.recent_activities.slice(0, 20).map((act, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            act.category === 'lead' ? 'bg-blue-500/20 text-blue-300' :
                            act.category === 'call' ? 'bg-green-500/20 text-green-300' :
                            act.category === 'auth' ? 'bg-purple-500/20 text-purple-300' :
                            'bg-slate-500/20 text-slate-300'
                          }`}>
                            {act.action}
                          </span>
                          {act.resource_name && <span className="text-slate-400 text-sm">{act.resource_name}</span>}
                        </div>
                        <span className="text-slate-500 text-xs">
                          {new Date(act.created_at).toLocaleString('fr-FR')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-slate-400 py-12">Aucune donnée disponible</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, icon: Icon }) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-slate-400" />
        <span className="text-slate-400 text-sm">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

// ================================
// RAPPELS TAB COMPONENT
// ================================
function RappelsTab({ data, loading, formatDuration }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!data) return null;

  const getOverdueColor = (rate) => {
    if (rate <= 10) return 'text-emerald-400';
    if (rate <= 30) return 'text-amber-400';
    return 'text-red-400';
  };

  const getCompletionColor = (rate) => {
    if (rate >= 80) return 'text-emerald-400';
    if (rate >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Global Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-violet-500/20 to-purple-600/10 border border-violet-500/30 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <Bell className="w-5 h-5 text-violet-400" />
            <span className="text-slate-400 text-sm">Total Rappels</span>
          </div>
          <p className="text-3xl font-bold text-white">{data.totals?.total_rappels || 0}</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500/20 to-green-600/10 border border-emerald-500/30 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="text-slate-400 text-sm">Complétés</span>
          </div>
          <p className="text-3xl font-bold text-white">{data.totals?.completed_rappels || 0}</p>
          <p className={`text-sm font-semibold ${getCompletionColor(data.totals?.completion_rate)}`}>
            {data.totals?.completion_rate}% taux
          </p>
        </div>

        <div className="bg-gradient-to-br from-amber-500/20 to-orange-600/10 border border-amber-500/30 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <span className="text-slate-400 text-sm">En attente</span>
          </div>
          <p className="text-3xl font-bold text-white">{data.totals?.pending_rappels || 0}</p>
        </div>

        <div className="bg-gradient-to-br from-red-500/20 to-rose-600/10 border border-red-500/30 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-slate-400 text-sm">En retard</span>
          </div>
          <p className="text-3xl font-bold text-white">{data.totals?.overdue_rappels || 0}</p>
          <p className={`text-sm font-semibold ${getOverdueColor(100 - data.totals?.overdue_rate)}`}>
            {data.totals?.overdue_rate}% du pending
          </p>
        </div>
      </div>

      {/* Rappels by User */}
      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-700/50">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-violet-400" />
            Performance Rappels par Utilisateur
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-900/50">
                <th className="text-left py-4 px-5 text-slate-400 font-semibold text-sm">Utilisateur</th>
                <th className="text-center py-4 px-3 text-slate-400 font-semibold text-sm">Total</th>
                <th className="text-center py-4 px-3 text-slate-400 font-semibold text-sm">Complétés</th>
                <th className="text-center py-4 px-3 text-slate-400 font-semibold text-sm">En attente</th>
                <th className="text-center py-4 px-3 text-slate-400 font-semibold text-sm">En retard</th>
                <th className="text-center py-4 px-3 text-slate-400 font-semibold text-sm">Taux Complétion</th>
                <th className="text-center py-4 px-3 text-slate-400 font-semibold text-sm">Taux Retard</th>
                <th className="text-center py-4 px-3 text-slate-400 font-semibold text-sm">Temps Réponse</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {data.by_user?.map((user, idx) => (
                <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center font-bold text-white">
                        {user.first_name?.[0]}{user.last_name?.[0]}
                      </div>
                      <div>
                        <p className="text-white font-medium">{user.first_name} {user.last_name}</p>
                        <p className="text-slate-500 text-xs">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-3 text-center">
                    <span className="text-white font-semibold">{user.total_rappels || 0}</span>
                  </td>
                  <td className="py-4 px-3 text-center">
                    <span className="text-emerald-400 font-semibold">{user.completed_rappels || 0}</span>
                  </td>
                  <td className="py-4 px-3 text-center">
                    <span className="text-amber-400 font-semibold">{user.pending_rappels || 0}</span>
                  </td>
                  <td className="py-4 px-3 text-center">
                    <span className={`font-bold ${parseInt(user.overdue_rappels) > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                      {user.overdue_rappels || 0}
                    </span>
                  </td>
                  <td className="py-4 px-3 text-center">
                    <span className={`font-bold ${getCompletionColor(parseFloat(user.completion_rate || 0))}`}>
                      {user.completion_rate || 0}%
                    </span>
                  </td>
                  <td className="py-4 px-3 text-center">
                    <span className={`font-bold ${getOverdueColor(100 - parseFloat(user.overdue_rate || 0))}`}>
                      {user.overdue_rate || 0}%
                    </span>
                  </td>
                  <td className="py-4 px-3 text-center">
                    <span className="text-slate-300">
                      {user.avg_response_hours ? `${user.avg_response_hours}h` : '-'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Overdue Rappels List */}
      {data.overdue_list?.length > 0 && (
        <div className="bg-slate-800/50 backdrop-blur-xl border border-red-500/30 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-700/50 bg-red-500/10">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              Rappels en Retard (Top 20)
            </h3>
          </div>
          <div className="divide-y divide-slate-700/30 max-h-96 overflow-y-auto">
            {data.overdue_list.map((rappel, idx) => (
              <div key={idx} className="p-4 hover:bg-slate-700/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 bg-red-500/20 text-red-300 rounded text-xs font-medium">
                        {rappel.hours_overdue}h en retard
                      </span>
                      <span className="text-white font-medium">{rappel.title || 'Rappel'}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                      <span>👤 {rappel.user_name}</span>
                      <span>🏢 {rappel.lead_name || 'Lead inconnu'}</span>
                      <span>📅 {new Date(rappel.scheduled_date).toLocaleString('fr-FR')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rappels by Type */}
      {data.by_type?.length > 0 && (
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <PieChart className="w-6 h-6 text-cyan-400" />
            Répartition par Type
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.by_type.map((type, idx) => (
              <div key={idx} className="bg-slate-700/50 rounded-xl p-4 border border-slate-600/50">
                <p className="text-slate-400 text-sm capitalize">{type.type?.replace(/_/g, ' ')}</p>
                <p className="text-2xl font-bold text-white">{type.count}</p>
                <div className="flex gap-2 mt-2 text-xs">
                  <span className="text-emerald-400">{type.completed} ✓</span>
                  <span className="text-red-400">{type.overdue} ⏰</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ================================
// PERFORMANCE TAB COMPONENT
// ================================
function PerformanceTab({ data, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!data) return null;

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-emerald-400';
    if (score >= 40) return 'text-amber-400';
    return 'text-red-400';
  };

  const getScoreBg = (score) => {
    if (score >= 70) return 'from-emerald-500/20 to-green-600/10 border-emerald-500/30';
    if (score >= 40) return 'from-amber-500/20 to-orange-600/10 border-amber-500/30';
    return 'from-red-500/20 to-rose-600/10 border-red-500/30';
  };

  return (
    <div className="space-y-6">
      {/* Score Breakdown */}
      {data.score_breakdown && (
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-400" />
            Composition du Score de Performance
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(data.score_breakdown).map(([key, info], idx) => (
              <div key={key} className="bg-slate-700/50 rounded-xl p-4 border border-slate-600/50">
                <p className="text-slate-400 text-sm">{info.description}</p>
                <p className={`text-lg font-bold mt-1 ${info.max < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {info.max > 0 ? `+${info.max}` : info.max} pts max
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Performer */}
      {data.top_performer && (
        <div className="bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-orange-500/20 border border-amber-500/50 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-3xl shadow-lg shadow-amber-500/30">
              🏆
            </div>
            <div className="flex-1">
              <p className="text-amber-300 text-sm font-medium">Meilleur Performeur</p>
              <h3 className="text-2xl font-bold text-white">
                {data.top_performer.first_name} {data.top_performer.last_name}
              </h3>
              <p className="text-slate-400">{data.top_performer.email}</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-amber-400">{data.top_performer.total_score}</p>
              <p className="text-slate-400 text-sm">points</p>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-700/50">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            Classement des Performances
          </h3>
        </div>
        <div className="divide-y divide-slate-700/30">
          {data.users?.map((user, idx) => (
            <div key={idx} className={`p-5 hover:bg-slate-700/30 transition-colors ${idx < 3 ? 'bg-slate-700/20' : ''}`}>
              <div className="flex items-center gap-4">
                {/* Rank */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl ${
                  idx === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' :
                  idx === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-slate-800' :
                  idx === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white' :
                  'bg-slate-700 text-slate-400'
                }`}>
                  {user.medal || `#${user.rank}`}
                </div>

                {/* User Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold">{user.first_name} {user.last_name}</p>
                    <span className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-xs">{user.role}</span>
                  </div>
                  <p className="text-slate-500 text-sm">{user.email}</p>
                </div>

                {/* Score Breakdown */}
                <div className="hidden md:flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-slate-400">Conversion</p>
                    <p className="text-emerald-400 font-semibold">+{user.conversion_score}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-400">Rappels</p>
                    <p className="text-cyan-400 font-semibold">+{user.rappels_score}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-400">Activité</p>
                    <p className="text-violet-400 font-semibold">+{user.activity_score}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-400">Pipeline</p>
                    <p className="text-amber-400 font-semibold">+{user.pipeline_score}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-400">Retards</p>
                    <p className="text-red-400 font-semibold">-{user.overdue_penalty}</p>
                  </div>
                </div>

                {/* Total Score */}
                <div className={`px-4 py-2 rounded-xl bg-gradient-to-br ${getScoreBg(parseFloat(user.total_score))} border`}>
                  <p className={`text-2xl font-bold ${getScoreColor(parseFloat(user.total_score))}`}>
                    {user.total_score}
                  </p>
                  <p className="text-slate-400 text-xs text-center">pts</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ================================
// EVOLUTION TAB COMPONENT
// ================================
function EvolutionTab({ data, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!data?.evolution) return null;

  const formatPeriodLabel = (period) => {
    if (period.includes('W')) {
      // Week format: 2024-W01
      return `S${period.split('-W')[1]}`;
    }
    if (period.length === 7) {
      // Month format: 2024-01
      const [year, month] = period.split('-');
      const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
      return months[parseInt(month) - 1];
    }
    // Day format: 2024-01-15
    const date = new Date(period);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  // Prepare chart data
  const leadsChartData = data.evolution.leads?.map(item => ({
    period: formatPeriodLabel(item.period),
    leads: parseInt(item.leads_created) || 0,
    qualifies: parseInt(item.leads_qualified) || 0,
    gagnes: parseInt(item.deals_won) || 0
  })) || [];

  const rappelsChartData = data.evolution.rappels?.map(item => ({
    period: formatPeriodLabel(item.period),
    crees: parseInt(item.rappels_created) || 0,
    completes: parseInt(item.rappels_completed) || 0,
    retard: parseInt(item.rappels_overdue) || 0
  })) || [];

  const activityChartData = data.evolution.activity?.map(item => ({
    period: formatPeriodLabel(item.period),
    actions: parseInt(item.total_actions) || 0,
    appels: parseInt(item.call_actions) || 0,
    emails: parseInt(item.email_actions) || 0
  })) || [];

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 flex items-center gap-3">
        <div className="p-2 bg-violet-500/20 rounded-lg">
          <TrendingUp className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <p className="text-white font-medium">Évolution sur la période</p>
          <p className="text-slate-400 text-sm">
            Intervalle: {data.interval === 'day' ? 'Quotidien' : data.interval === 'week' ? 'Hebdomadaire' : 'Mensuel'}
          </p>
        </div>
      </div>

      {/* Leads Evolution Chart */}
      {leadsChartData.length > 0 && (
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Target className="w-6 h-6 text-violet-400" />
            Évolution des Leads
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={leadsChartData}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorQualifies" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorGagnes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="period" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #475569',
                    borderRadius: '12px',
                    color: '#fff'
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="leads"
                  name="Leads créés"
                  stroke="#8B5CF6"
                  fillOpacity={1}
                  fill="url(#colorLeads)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="qualifies"
                  name="Qualifiés"
                  stroke="#06B6D4"
                  fillOpacity={1}
                  fill="url(#colorQualifies)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="gagnes"
                  name="Gagnés"
                  stroke="#10B981"
                  fillOpacity={1}
                  fill="url(#colorGagnes)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Rappels Evolution Chart */}
      {rappelsChartData.length > 0 && (
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Bell className="w-6 h-6 text-amber-400" />
            Évolution des Rappels
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rappelsChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="period" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #475569',
                    borderRadius: '12px',
                    color: '#fff'
                  }}
                />
                <Legend />
                <Bar dataKey="crees" name="Créés" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completes" name="Complétés" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="retard" name="En retard" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Activity Evolution Chart */}
      {activityChartData.length > 0 && (
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-400" />
            Évolution de l'Activité
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="period" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #475569',
                    borderRadius: '12px',
                    color: '#fff'
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="actions"
                  name="Total actions"
                  stroke="#8B5CF6"
                  strokeWidth={3}
                  dot={{ fill: '#8B5CF6', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="appels"
                  name="Appels"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ fill: '#10B981', strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="emails"
                  name="Emails"
                  stroke="#06B6D4"
                  strokeWidth={2}
                  dot={{ fill: '#06B6D4', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
