import React, { useState, useEffect, useMemo } from 'react';
import { Phone, Clock, Target, TrendingUp, Users, Calendar, ChevronDown, Award, Flame, Coffee, Filter, Download, RefreshCw, User, BarChart3, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import api from '../api/axios';
import { toast } from '../lib/toast';
import { useAuth } from '../context/AuthContext';

const PERIOD_OPTIONS = [
  { id: 'today', label: "Aujourd'hui" },
  { id: 'week', label: 'Cette semaine' },
  { id: 'month', label: 'Ce mois' },
  { id: 'custom', label: 'Personnalisé' },
];

export default function CallReports() {
  const { user } = useAuth();
  const isManager = user?.role === 'admin' || user?.role === 'manager';

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('today');
  const [teamStats, setTeamStats] = useState([]);
  const [myStats, setMyStats] = useState([]);
  const [objectives, setObjectives] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showObjectivesModal, setShowObjectivesModal] = useState(false);
  const [customDates, setCustomDates] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadData();
  }, [period, customDates]);

  const loadData = async () => {
    setLoading(true);
    try {
      const promises = [
        api.get('/call-sessions', { params: { action: 'objectives' } }),
        api.get('/call-sessions', {
          params: {
            action: 'stats',
            period: 'daily',
            start_date: getStartDate(),
            end_date: getEndDate()
          }
        })
      ];

      if (isManager) {
        promises.push(
          api.get('/call-sessions', { params: { action: 'team-summary' } })
        );
      }

      const results = await Promise.all(promises);

      setObjectives(results[0].data.objectives);
      setMyStats(results[1].data.stats || []);

      if (isManager && results[2]) {
        setTeamStats(results[2].data.team || []);
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  const getStartDate = () => {
    const today = new Date();
    switch (period) {
      case 'today':
        return today.toISOString().split('T')[0];
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay() + 1);
        return weekStart.toISOString().split('T')[0];
      case 'month':
        return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      case 'custom':
        return customDates.start;
      default:
        return today.toISOString().split('T')[0];
    }
  };

  const getEndDate = () => {
    if (period === 'custom') {
      return customDates.end;
    }
    return new Date().toISOString().split('T')[0];
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0m';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);

    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDurationFull = (seconds) => {
    if (!seconds) return '0h 0m 0s';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  const getProgressPercent = (current, target) => {
    if (!target) return 0;
    return Math.min(Math.round((current / target) * 100), 100);
  };

  const getProgressColor = (percent) => {
    if (percent >= 100) return 'bg-green-500';
    if (percent >= 75) return 'bg-blue-500';
    if (percent >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTrend = (current, previous) => {
    if (!previous || previous === 0) return { icon: Minus, color: 'text-gray-400', label: '-' };
    const diff = ((current - previous) / previous) * 100;
    if (diff > 5) return { icon: ArrowUp, color: 'text-green-500', label: `+${Math.round(diff)}%` };
    if (diff < -5) return { icon: ArrowDown, color: 'text-red-500', label: `${Math.round(diff)}%` };
    return { icon: Minus, color: 'text-gray-400', label: '0%' };
  };

  // Calculer les totaux pour mes stats
  const myTotals = useMemo(() => {
    if (!myStats.length) return null;
    return {
      total_seconds: myStats.reduce((sum, s) => sum + (parseInt(s.total_seconds) || 0), 0),
      effective_seconds: myStats.reduce((sum, s) => sum + (parseInt(s.effective_seconds) || 0), 0),
      leads_processed: myStats.reduce((sum, s) => sum + (parseInt(s.leads_processed) || 0), 0),
      leads_qualified: myStats.reduce((sum, s) => sum + (parseInt(s.leads_qualified) || 0), 0),
      rdv_created: myStats.reduce((sum, s) => sum + (parseInt(s.rdv_created) || 0), 0),
      sessions_count: myStats.reduce((sum, s) => sum + (parseInt(s.sessions_count) || 0), 0),
    };
  }, [myStats]);

  const handleExportCSV = () => {
    if (!teamStats.length) return;

    const headers = ['Nom', 'Email', "Aujourd'hui", 'Semaine', 'Mois', 'Leads traités', 'Leads qualifiés', 'RDV'];
    const rows = teamStats.map(u => [
      `${u.first_name} ${u.last_name}`,
      u.email,
      formatDuration(u.today_seconds),
      formatDuration(u.week_seconds),
      formatDuration(u.month_seconds),
      u.today_leads,
      u.today_qualified,
      u.today_rdv
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-appels-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Rapport exporté');
  };

  const handleSetObjectives = async (targetUserId, newObjectives) => {
    try {
      await api.put('/call-sessions', {
        user_id: targetUserId,
        ...newObjectives
      });
      toast.success('Objectifs mis à jour');
      setShowObjectivesModal(false);
      loadData();
    } catch (error) {
      console.error('Erreur mise à jour objectifs:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="bg-purple-100 p-3 rounded-xl">
            <BarChart3 className="w-8 h-8 text-purple-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Rapports d'Appels</h1>
            <p className="text-gray-600">Suivi des heures de prospection</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Sélecteur de période */}
          <div className="flex bg-white rounded-xl shadow-sm border overflow-hidden">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setPeriod(opt.id)}
                className={`px-4 py-2 text-sm font-medium transition-all ${
                  period === opt.id
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={loadData}
            className="p-2 bg-white rounded-xl shadow-sm border hover:bg-gray-50 transition-all"
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>

          {isManager && teamStats.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-all"
            >
              <Download className="w-4 h-4" />
              Exporter
            </button>
          )}
        </div>
      </div>

      {/* Dates personnalisées */}
      {period === 'custom' && (
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-600">Du</span>
            <input
              type="date"
              value={customDates.start}
              onChange={(e) => setCustomDates(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">au</span>
            <input
              type="date"
              value={customDates.end}
              onChange={(e) => setCustomDates(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      )}

      {/* Mes statistiques personnelles */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <User className="w-6 h-6 text-purple-600" />
          Mes Statistiques
        </h2>

        {/* Objectif journalier */}
        {objectives && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Objectif journalier : {formatDuration(objectives.daily_target_minutes * 60)}
              </span>
              <span className="text-sm text-gray-500">
                {myTotals ? formatDuration(myTotals.effective_seconds) : '0m'} / {formatDuration(objectives.daily_target_minutes * 60)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all duration-500 ${
                  getProgressColor(getProgressPercent(myTotals?.effective_seconds || 0, objectives.daily_target_minutes * 60))
                }`}
                style={{ width: `${getProgressPercent(myTotals?.effective_seconds || 0, objectives.daily_target_minutes * 60)}%` }}
              ></div>
            </div>
            <p className="text-right text-sm text-gray-500 mt-1">
              {getProgressPercent(myTotals?.effective_seconds || 0, objectives.daily_target_minutes * 60)}% de l'objectif
            </p>
          </div>
        )}

        {/* Cards de stats */}
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5" />
              <span className="text-sm opacity-80">Temps effectif</span>
            </div>
            <p className="text-2xl font-bold">{myTotals ? formatDuration(myTotals.effective_seconds) : '0m'}</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5" />
              <span className="text-sm opacity-80">Leads traités</span>
            </div>
            <p className="text-2xl font-bold">{myTotals?.leads_processed || 0}</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm opacity-80">Leads qualifiés</span>
            </div>
            <p className="text-2xl font-bold">{myTotals?.leads_qualified || 0}</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-5 h-5" />
              <span className="text-sm opacity-80">RDV planifiés</span>
            </div>
            <p className="text-2xl font-bold">{myTotals?.rdv_created || 0}</p>
          </div>

          <div className="bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="w-5 h-5" />
              <span className="text-sm opacity-80">Sessions</span>
            </div>
            <p className="text-2xl font-bold">{myTotals?.sessions_count || 0}</p>
          </div>
        </div>

        {/* Historique par jour */}
        {myStats.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Historique par jour</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Date</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Sessions</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Temps effectif</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Leads traités</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Qualifiés</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">RDV</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Taux qualif.</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Moy/lead</th>
                  </tr>
                </thead>
                <tbody>
                  {myStats.map((stat, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">
                        {new Date(stat.call_date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </td>
                      <td className="py-3 px-4 text-right">{stat.sessions_count}</td>
                      <td className="py-3 px-4 text-right font-semibold text-purple-600">
                        {formatDuration(stat.effective_seconds)}
                      </td>
                      <td className="py-3 px-4 text-right">{stat.leads_processed}</td>
                      <td className="py-3 px-4 text-right text-green-600">{stat.leads_qualified}</td>
                      <td className="py-3 px-4 text-right text-orange-600">{stat.rdv_created}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          parseFloat(stat.qualification_rate) >= 50 ? 'bg-green-100 text-green-700' :
                          parseFloat(stat.qualification_rate) >= 25 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {stat.qualification_rate}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-gray-500">
                        {formatDuration(stat.avg_seconds_per_lead)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Statistiques d'équipe (managers/admins uniquement) */}
      {isManager && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-purple-600" />
              Statistiques d'Équipe
            </h2>
          </div>

          {teamStats.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucune donnée d'équipe disponible</p>
            </div>
          ) : (
            <div className="space-y-4">
              {teamStats.map((member) => {
                const dailyProgress = getProgressPercent(member.today_seconds, member.daily_target_seconds);

                return (
                  <div
                    key={member.user_id}
                    className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar et info */}
                      <div className="flex-shrink-0">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                          member.has_active_session ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                        }`}>
                          {member.first_name?.charAt(0)}{member.last_name?.charAt(0)}
                        </div>
                      </div>

                      <div className="flex-grow">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">
                            {member.first_name} {member.last_name}
                          </h3>
                          {member.has_active_session && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                              En ligne
                            </span>
                          )}
                          <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                            {member.role}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">{member.email}</p>

                        {/* Barre de progression */}
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span>Objectif jour: {formatDuration(member.daily_target_seconds)}</span>
                            <span>{dailyProgress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${getProgressColor(dailyProgress)}`}
                              style={{ width: `${dailyProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-6 flex-shrink-0">
                        <div className="text-center">
                          <p className="text-xs text-gray-500">Aujourd'hui</p>
                          <p className="text-lg font-bold text-purple-600">{formatDuration(member.today_seconds)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500">Semaine</p>
                          <p className="text-lg font-bold text-blue-600">{formatDuration(member.week_seconds)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500">Mois</p>
                          <p className="text-lg font-bold text-green-600">{formatDuration(member.month_seconds)}</p>
                        </div>
                        <div className="text-center border-l pl-6">
                          <p className="text-xs text-gray-500">Leads</p>
                          <p className="text-lg font-bold text-gray-700">{member.today_leads}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500">Qualifiés</p>
                          <p className="text-lg font-bold text-green-600">{member.today_qualified}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500">RDV</p>
                          <p className="text-lg font-bold text-orange-600">{member.today_rdv}</p>
                        </div>

                        {/* Bouton objectifs */}
                        <button
                          onClick={() => {
                            setSelectedUser(member);
                            setShowObjectivesModal(true);
                          }}
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                          title="Définir les objectifs"
                        >
                          <Target className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal Objectifs */}
      {showObjectivesModal && selectedUser && (
        <ObjectivesModal
          user={selectedUser}
          currentObjectives={objectives}
          onClose={() => {
            setShowObjectivesModal(false);
            setSelectedUser(null);
          }}
          onSave={handleSetObjectives}
        />
      )}
    </div>
  );
}

// Composant Modal pour définir les objectifs
function ObjectivesModal({ user, currentObjectives, onClose, onSave }) {
  const [form, setForm] = useState({
    daily_target_minutes: currentObjectives?.daily_target_minutes || 240,
    weekly_target_minutes: currentObjectives?.weekly_target_minutes || 1200,
    monthly_target_minutes: currentObjectives?.monthly_target_minutes || 4800
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(user.user_id, form);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Target className="w-6 h-6 text-purple-600" />
          Objectifs pour {user.first_name} {user.last_name}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Objectif journalier (minutes)
            </label>
            <input
              type="number"
              value={form.daily_target_minutes}
              onChange={(e) => setForm(prev => ({ ...prev, daily_target_minutes: parseInt(e.target.value) || 0 }))}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              min="0"
              step="15"
            />
            <p className="text-xs text-gray-500 mt-1">
              = {Math.floor(form.daily_target_minutes / 60)}h {form.daily_target_minutes % 60}m par jour
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Objectif hebdomadaire (minutes)
            </label>
            <input
              type="number"
              value={form.weekly_target_minutes}
              onChange={(e) => setForm(prev => ({ ...prev, weekly_target_minutes: parseInt(e.target.value) || 0 }))}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              min="0"
              step="30"
            />
            <p className="text-xs text-gray-500 mt-1">
              = {Math.floor(form.weekly_target_minutes / 60)}h {form.weekly_target_minutes % 60}m par semaine
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Objectif mensuel (minutes)
            </label>
            <input
              type="number"
              value={form.monthly_target_minutes}
              onChange={(e) => setForm(prev => ({ ...prev, monthly_target_minutes: parseInt(e.target.value) || 0 }))}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              min="0"
              step="60"
            />
            <p className="text-xs text-gray-500 mt-1">
              = {Math.floor(form.monthly_target_minutes / 60)}h {form.monthly_target_minutes % 60}m par mois
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-all disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
