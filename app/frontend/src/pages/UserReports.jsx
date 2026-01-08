import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  FileText, Download, Calendar, Users, Target, Phone,
  Mail, CheckCircle, XCircle, TrendingUp, Clock, Award,
  BarChart3, Eye, RefreshCw, FileSpreadsheet,
  ChevronDown, User, Activity, Briefcase, ArrowUp, ArrowDown,
  Bell, AlertTriangle, MessageSquare, Zap
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const PERIODS = [
  { value: 'today', label: "Aujourd'hui" },
  { value: 'yesterday', label: 'Hier' },
  { value: '7days', label: '7 derniers jours' },
  { value: '30days', label: '30 derniers jours' },
  { value: 'quarter', label: 'Trimestre (90 jours)' },
  { value: 'semester', label: 'Semestre (180 jours)' },
  { value: 'year', label: 'Année (365 jours)' }
];

export default function UserReports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30days');
  const [selectedUserId, setSelectedUserId] = useState(''); // '' = tous les utilisateurs
  const [usersList, setUsersList] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [dailyActivity, setDailyActivity] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Charger la liste des utilisateurs au démarrage
  useEffect(() => {
    loadUsersList();
  }, []);

  // Charger les données quand période ou utilisateur change
  useEffect(() => {
    loadReportData();
    loadDailyActivity();
  }, [period, selectedUserId]);

  const loadUsersList = async () => {
    try {
      const response = await api.get('/user-reports/users');
      setUsersList(response.data.users || []);
    } catch (err) {
      console.error('Error loading users list:', err);
    }
  };

  const loadReportData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ period });
      if (selectedUserId) params.append('user_id', selectedUserId);

      const response = await api.get(`/user-reports/report?${params.toString()}`);
      setReportData(response.data);
    } catch (err) {
      console.error('Error loading report:', err);
      toast.error('Erreur lors du chargement du rapport');
    } finally {
      setLoading(false);
    }
  };

  const loadDailyActivity = async () => {
    try {
      const params = new URLSearchParams({ period });
      if (selectedUserId) params.append('user_id', selectedUserId);

      const response = await api.get(`/user-reports/daily-activity?${params.toString()}`);
      setDailyActivity(response.data);
    } catch (err) {
      console.error('Error loading daily activity:', err);
    }
  };

  const exportToCSV = async () => {
    if (!reportData?.users) return;

    try {
      setExporting(true);

      // Créer le contenu CSV
      const headers = [
        'Nom', 'Email', 'Rôle', 'Actif',
        'Leads Assignés (total)', 'Leads Période', 'Leads Qualifiés', 'Leads Gagnés', 'Leads Perdus',
        'Rappels Total', 'Rappels Complétés', 'Rappels En Retard',
        'Campagnes Créées', 'Campagnes Assignées',
        'Sessions Appel', 'Appels Passés', 'RDV Pris', 'Durée Appels (min)',
        'Emails Envoyés', 'Emails Ouverts', 'Emails Cliqués', 'Taux Ouverture'
      ];

      const rows = reportData.users.map(u => [
        `${u.first_name} ${u.last_name}`,
        u.email,
        u.role,
        u.is_active ? 'Oui' : 'Non',
        u.leads.total_assigned,
        u.leads.assigned_period,
        u.leads.qualified,
        u.leads.won,
        u.leads.lost,
        u.rappels.total,
        u.rappels.completed,
        u.rappels.overdue,
        u.campaigns.created,
        u.campaigns.assigned,
        u.calls.sessions,
        u.calls.calls_made,
        u.calls.rdv_pris,
        u.calls.duration_minutes,
        u.emails.sent,
        u.emails.opens,
        u.emails.clicks,
        `${u.emails.open_rate}%`
      ]);

      const periodLabel = PERIODS.find(p => p.value === period)?.label || period;
      const csvContent = [
        `Rapport de Performance - ${reportData.filter?.user_name || 'Tous les utilisateurs'}`,
        `Période: ${periodLabel}`,
        `Date: ${new Date(reportData.date_range.start).toLocaleDateString('fr-FR')} - ${new Date(reportData.date_range.end).toLocaleDateString('fr-FR')}`,
        `Généré le: ${new Date().toLocaleString('fr-FR')}`,
        '',
        headers.join(';'),
        ...rows.map(row => row.join(';'))
      ].join('\n');

      // Télécharger le fichier
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
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

  const formatDuration = (minutes) => {
    if (!minutes) return '0min';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}min`;
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

  const totals = reportData?.totals || {};
  const users = reportData?.users || [];
  const filterName = reportData?.filter?.user_name || 'Tous les utilisateurs';

  // Préparer les données pour les graphiques
  const dailyRappels = dailyActivity?.daily?.rappels?.map(item => ({
    date: new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
    total: parseInt(item.total) || 0,
    completes: parseInt(item.completed) || 0
  })) || [];

  const dailyCalls = dailyActivity?.daily?.calls?.map(item => ({
    date: new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
    appels: parseInt(item.calls) || 0,
    duree: Math.round((parseInt(item.duration_seconds) || 0) / 60)
  })) || [];

  const dailyEmails = dailyActivity?.daily?.emails?.map(item => ({
    date: new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
    envoyes: parseInt(item.sent) || 0
  })) || [];

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
                  {filterName}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* User Selector */}
              <div className="relative">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="appearance-none pl-10 pr-10 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/50 cursor-pointer min-w-[220px]"
                >
                  <option value="">Tous les utilisateurs</option>
                  {usersList.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} ({u.role})
                    </option>
                  ))}
                </select>
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>

              {/* Period Selector */}
              <div className="relative">
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="appearance-none pl-10 pr-10 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/50 cursor-pointer min-w-[200px]"
                >
                  {PERIODS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>

              {/* Refresh Button */}
              <button
                onClick={() => { loadReportData(); loadDailyActivity(); }}
                disabled={loading}
                className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white hover:bg-slate-700 transition-colors disabled:opacity-50"
                title="Rafraîchir"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>

              {/* Export Button */}
              <button
                onClick={exportToCSV}
                disabled={exporting || !users.length}
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

        {/* Summary Cards - Totaux */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <SummaryCard
            icon={Target}
            label="Leads Assignés"
            value={totals.leads_assigned || 0}
            color="blue"
          />
          <SummaryCard
            icon={TrendingUp}
            label="Leads Qualifiés"
            value={totals.leads_qualified || 0}
            color="violet"
          />
          <SummaryCard
            icon={CheckCircle}
            label="Leads Gagnés"
            value={totals.leads_won || 0}
            color="emerald"
          />
          <SummaryCard
            icon={Phone}
            label="Appels Passés"
            value={totals.calls_made || 0}
            subValue={formatDuration(totals.calls_duration_minutes)}
            color="cyan"
          />
          <SummaryCard
            icon={Mail}
            label="Emails Envoyés"
            value={totals.emails_sent || 0}
            subValue={`${totals.email_open_rate || 0}% ouvert`}
            color="amber"
          />
          <SummaryCard
            icon={Bell}
            label="Rappels"
            value={totals.rappels_total || 0}
            subValue={`${totals.rappels_completion_rate || 0}% fait`}
            color={parseInt(totals.rappels_overdue || 0) > 0 ? 'red' : 'emerald'}
          />
        </div>

        {/* Deuxième ligne de métriques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <MetricCard
            icon={Briefcase}
            label="Campagnes Créées"
            value={totals.campaigns_created || 0}
            color="purple"
          />
          <MetricCard
            icon={Calendar}
            label="RDV Pris"
            value={totals.calls_rdv || 0}
            color="green"
          />
          <MetricCard
            icon={AlertTriangle}
            label="Rappels en Retard"
            value={totals.rappels_overdue || 0}
            color={parseInt(totals.rappels_overdue || 0) > 0 ? 'red' : 'gray'}
          />
          <MetricCard
            icon={XCircle}
            label="Leads Perdus"
            value={totals.leads_lost || 0}
            color="gray"
          />
        </div>

        {/* Users Performance Table */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl mb-8">
          <div className="p-5 border-b border-slate-700/50 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-violet-400" />
              Détail par Utilisateur
            </h2>
            <span className="text-slate-400 text-sm">
              {users.length} utilisateur{users.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-900/50">
                  <th className="text-left py-4 px-5 text-slate-400 font-semibold text-sm">Utilisateur</th>
                  <th className="text-center py-4 px-3 text-slate-400 font-semibold text-sm">Leads Total</th>
                  <th className="text-center py-4 px-3 text-slate-400 font-semibold text-sm">Qualifiés</th>
                  <th className="text-center py-4 px-3 text-slate-400 font-semibold text-sm">Gagnés</th>
                  <th className="text-center py-4 px-3 text-slate-400 font-semibold text-sm">Campagnes</th>
                  <th className="text-center py-4 px-3 text-slate-400 font-semibold text-sm">Appels</th>
                  <th className="text-center py-4 px-3 text-slate-400 font-semibold text-sm">RDV</th>
                  <th className="text-center py-4 px-3 text-slate-400 font-semibold text-sm">Temps Appel</th>
                  <th className="text-center py-4 px-3 text-slate-400 font-semibold text-sm">Emails</th>
                  <th className="text-center py-4 px-3 text-slate-400 font-semibold text-sm">Taux Ouv.</th>
                  <th className="text-center py-4 px-3 text-slate-400 font-semibold text-sm">Rappels</th>
                  <th className="text-center py-4 px-3 text-slate-400 font-semibold text-sm">Retard</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {users.map((u) => (
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
                      <span className="text-white font-semibold">{u.leads.total_assigned}</span>
                      {u.leads.assigned_period > 0 && (
                        <span className="text-slate-500 text-xs block">+{u.leads.assigned_period} période</span>
                      )}
                    </td>
                    <td className="py-4 px-3 text-center">
                      <span className="text-violet-400 font-semibold">{u.leads.qualified}</span>
                    </td>
                    <td className="py-4 px-3 text-center">
                      <span className="text-emerald-400 font-bold">{u.leads.won}</span>
                    </td>
                    <td className="py-4 px-3 text-center">
                      <div className="flex flex-col">
                        <span className="text-blue-400 font-semibold">{u.campaigns.assigned}</span>
                        <span className="text-slate-500 text-xs">{u.campaigns.created} créées</span>
                      </div>
                    </td>
                    <td className="py-4 px-3 text-center">
                      <span className="text-cyan-400 font-semibold">{u.calls.calls_made}</span>
                    </td>
                    <td className="py-4 px-3 text-center">
                      <span className="text-green-400 font-bold">{u.calls.rdv_pris}</span>
                    </td>
                    <td className="py-4 px-3 text-center">
                      <span className="text-slate-300">{formatDuration(u.calls.duration_minutes)}</span>
                    </td>
                    <td className="py-4 px-3 text-center">
                      <span className="text-amber-400 font-semibold">{u.emails.sent}</span>
                    </td>
                    <td className="py-4 px-3 text-center">
                      <span className={`font-semibold ${
                        parseFloat(u.emails.open_rate || 0) >= 20 ? 'text-emerald-400' :
                        parseFloat(u.emails.open_rate || 0) >= 10 ? 'text-amber-400' :
                        'text-red-400'
                      }`}>
                        {u.emails.open_rate}%
                      </span>
                    </td>
                    <td className="py-4 px-3 text-center">
                      <div className="flex flex-col">
                        <span className="text-white font-semibold">{u.rappels.total}</span>
                        <span className="text-emerald-400 text-xs">{u.rappels.completed} faits</span>
                      </div>
                    </td>
                    <td className="py-4 px-3 text-center">
                      <span className={`font-bold ${
                        parseInt(u.rappels.overdue || 0) > 0 ? 'text-red-400' : 'text-slate-400'
                      }`}>
                        {u.rappels.overdue}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Rappels Chart */}
          {dailyRappels.length > 0 && (
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Bell className="w-6 h-6 text-violet-400" />
                Rappels par Jour
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyRappels}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9CA3AF" fontSize={11} />
                    <YAxis stroke="#9CA3AF" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1E293B',
                        border: '1px solid #475569',
                        borderRadius: '12px',
                        color: '#fff'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="total" name="Planifiés" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completes" name="Complétés" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Calls Chart */}
          {dailyCalls.length > 0 && (
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Phone className="w-6 h-6 text-cyan-400" />
                Appels par Jour
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyCalls}>
                    <defs>
                      <linearGradient id="colorAppels" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9CA3AF" fontSize={11} />
                    <YAxis stroke="#9CA3AF" fontSize={11} />
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
                      dataKey="appels"
                      name="Appels passés"
                      stroke="#06B6D4"
                      fillOpacity={1}
                      fill="url(#colorAppels)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Emails Chart */}
          {dailyEmails.length > 0 && (
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Mail className="w-6 h-6 text-amber-400" />
                Emails Envoyés par Jour
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyEmails}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9CA3AF" fontSize={11} />
                    <YAxis stroke="#9CA3AF" fontSize={11} />
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
                      dataKey="envoyes"
                      name="Emails envoyés"
                      stroke="#F59E0B"
                      strokeWidth={3}
                      dot={{ fill: '#F59E0B', strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Pipeline Summary per User */}
          {users.some(u => Object.keys(u.pipeline || {}).length > 0) && (
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Activity className="w-6 h-6 text-emerald-400" />
                Pipeline par Utilisateur
              </h3>
              <div className="space-y-4 max-h-64 overflow-y-auto">
                {users.filter(u => Object.keys(u.pipeline || {}).length > 0).map(u => (
                  <div key={u.id} className="bg-slate-700/50 rounded-xl p-4">
                    <p className="text-white font-medium mb-2">{u.first_name} {u.last_name}</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(u.pipeline).map(([stage, count]) => (
                        <span key={stage} className="px-3 py-1 bg-slate-600/50 rounded-lg text-sm">
                          <span className="text-slate-400">{stage}:</span>
                          <span className="text-white font-semibold ml-1">{count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* No data message */}
        {users.length === 0 && !loading && (
          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-12 text-center">
            <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Aucune donnée disponible</h3>
            <p className="text-slate-400">
              Aucun utilisateur trouvé pour cette période et ce filtre.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Summary Card Component
function SummaryCard({ icon: Icon, label, value, subValue, color }) {
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
      {subValue && <p className="text-sm text-slate-400 mt-1">{subValue}</p>}
    </div>
  );
}

// Metric Card Component (smaller)
function MetricCard({ icon: Icon, label, value, color }) {
  const colors = {
    purple: 'bg-purple-500/20 border-purple-500/30 text-purple-400',
    green: 'bg-green-500/20 border-green-500/30 text-green-400',
    red: 'bg-red-500/20 border-red-500/30 text-red-400',
    gray: 'bg-slate-500/20 border-slate-500/30 text-slate-400'
  };

  return (
    <div className={`${colors[color]} border rounded-xl p-4 flex items-center gap-4`}>
      <div className={`p-3 rounded-lg ${colors[color].split(' ')[0]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-slate-400 text-sm">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}
