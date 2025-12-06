<<<<<<< HEAD
import { log, error, warn } from "./../lib/logger.js";
=======
import { log, error, warn } from "../lib/logger.js";
>>>>>>> origin/main
import { useState, useEffect } from 'react';
import {
  Users, DollarSign, TrendingUp, AlertTriangle,
  Activity, CreditCard, FileText, CheckCircle,
  XCircle, Clock, Shield, Crown
} from 'lucide-react';
import api from '../api/axios';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState(null);
  const [revenueChart, setRevenueChart] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, revenueRes] = await Promise.all([
        api.get('/super-admin/dashboard/stats'),
        api.get('/super-admin/dashboard/revenue-chart')
      ]);

      setStats(statsRes.data.stats);
      setRevenueChart(revenueRes.data.data.reverse()); // Plus ancien → plus récent
    } catch (error) {
      error('Erreur chargement dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white font-semibold">Chargement du Super-Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 p-6">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Crown className="w-10 h-10 text-yellow-400" />
          <h1 className="text-4xl font-bold text-white">Super-Admin TRINEXTA</h1>
        </div>
        <p className="text-gray-300 text-lg">Gestion globale des clients LeadSynch</p>
      </div>

      {/* Alertes */}
      {(stats?.alerts?.expiring_subscriptions > 0 || stats?.alerts?.overdue_invoices > 0) && (
        <div className="bg-red-900 bg-opacity-50 border-2 border-red-500 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <h2 className="text-xl font-bold text-white">Alertes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.alerts.expiring_subscriptions > 0 && (
              <div className="bg-red-800 bg-opacity-30 rounded-xl p-4">
                <p className="text-red-200 text-sm">Abonnements expirant sous 7 jours</p>
                <p className="text-3xl font-bold text-red-400">{stats.alerts.expiring_subscriptions}</p>
              </div>
            )}
            {stats.alerts.overdue_invoices > 0 && (
              <div className="bg-orange-800 bg-opacity-30 rounded-xl p-4">
                <p className="text-orange-200 text-sm">Factures impayées</p>
                <p className="text-3xl font-bold text-orange-400">{stats.alerts.overdue_invoices}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* KPIs Principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

        {/* MRR */}
        <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl shadow-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="w-8 h-8 opacity-80" />
            <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded-full">MRR</span>
          </div>
          <p className="text-4xl font-bold mb-1">{formatCurrency(stats?.revenue?.total_mrr || 0)}</p>
          <p className="text-sm opacity-80">Revenus mensuels récurrents</p>
        </div>

        {/* ARR */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 opacity-80" />
            <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded-full">ARR</span>
          </div>
          <p className="text-4xl font-bold mb-1">{formatCurrency(stats?.revenue?.total_arr || 0)}</p>
          <p className="text-sm opacity-80">Revenus annuels récurrents</p>
        </div>

        {/* Clients Actifs */}
        <div className="bg-gradient-to-br from-purple-600 to-pink-700 rounded-2xl shadow-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8 opacity-80" />
            <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded-full">Clients</span>
          </div>
          <p className="text-4xl font-bold mb-1">{stats?.tenants?.active_count || 0}</p>
          <p className="text-sm opacity-80">Clients actifs</p>
        </div>

        {/* Clients en Trial */}
        <div className="bg-gradient-to-br from-yellow-600 to-orange-700 rounded-2xl shadow-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Clock className="w-8 h-8 opacity-80" />
            <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded-full">Trial</span>
          </div>
          <p className="text-4xl font-bold mb-1">{stats?.tenants?.trial_count || 0}</p>
          <p className="text-sm opacity-80">En période d'essai</p>
        </div>

      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

        {/* Revenus 12 derniers mois */}
        <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl shadow-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Revenus - 12 derniers mois
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="month" stroke="rgba(255,255,255,0.6)" />
              <YAxis stroke="rgba(255,255,255,0.6)" />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }}
                formatter={(value) => formatCurrency(value)}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={3}
                name="Revenus"
                dot={{ fill: '#10b981', r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition Clients */}
        <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl shadow-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Répartition des clients
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-900 bg-opacity-30 rounded-xl p-4 border-2 border-green-500">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-green-300 text-sm">Actifs</span>
              </div>
              <p className="text-3xl font-bold text-white">{stats?.tenants?.active_count || 0}</p>
            </div>
            <div className="bg-yellow-900 bg-opacity-30 rounded-xl p-4 border-2 border-yellow-500">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-yellow-400" />
                <span className="text-yellow-300 text-sm">Trial</span>
              </div>
              <p className="text-3xl font-bold text-white">{stats?.tenants?.trial_count || 0}</p>
            </div>
            <div className="bg-red-900 bg-opacity-30 rounded-xl p-4 border-2 border-red-500">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-5 h-5 text-red-400" />
                <span className="text-red-300 text-sm">Suspendus</span>
              </div>
              <p className="text-3xl font-bold text-white">{stats?.tenants?.suspended_count || 0}</p>
            </div>
            <div className="bg-gray-700 bg-opacity-30 rounded-xl p-4 border-2 border-gray-500">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-gray-400" />
                <span className="text-gray-300 text-sm">Total</span>
              </div>
              <p className="text-3xl font-bold text-white">{stats?.tenants?.total_count || 0}</p>
            </div>
          </div>
        </div>

      </div>

      {/* Factures & Paiements */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

        <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl shadow-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-6 h-6 text-blue-400" />
            <h3 className="text-lg font-bold text-white">Factures payées</h3>
          </div>
          <p className="text-3xl font-bold text-blue-400 mb-1">{stats?.invoices?.paid_count || 0}</p>
          <p className="text-sm text-gray-300">Ce mois : {formatCurrency(stats?.invoices?.paid_this_month || 0)}</p>
        </div>

        <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl shadow-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-orange-400" />
            <h3 className="text-lg font-bold text-white">Impayés</h3>
          </div>
          <p className="text-3xl font-bold text-orange-400 mb-1">{stats?.invoices?.overdue_count || 0}</p>
          <p className="text-sm text-gray-300">{formatCurrency(stats?.invoices?.overdue_amount || 0)}</p>
        </div>

        <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl shadow-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-6 h-6 text-green-400" />
            <h3 className="text-lg font-bold text-white">Auto-renouvellement</h3>
          </div>
          <p className="text-3xl font-bold text-green-400 mb-1">{stats?.revenue?.auto_renew_count || 0}</p>
          <p className="text-sm text-gray-300">Abonnements auto-renew actifs</p>
        </div>

      </div>

      {/* Actions Rapides */}
      <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl shadow-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Actions Rapides</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a
            href="/super-admin/tenants"
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl p-4 text-center transition-all shadow-lg"
          >
            <Users className="w-8 h-8 mx-auto mb-2 text-white" />
            <p className="text-white font-semibold">Gérer Clients</p>
          </a>
          <a
            href="/super-admin/subscriptions"
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-xl p-4 text-center transition-all shadow-lg"
          >
            <CreditCard className="w-8 h-8 mx-auto mb-2 text-white" />
            <p className="text-white font-semibold">Abonnements</p>
          </a>
          <a
            href="/super-admin/invoices"
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-xl p-4 text-center transition-all shadow-lg"
          >
            <FileText className="w-8 h-8 mx-auto mb-2 text-white" />
            <p className="text-white font-semibold">Factures</p>
          </a>
          <a
            href="/super-admin/analytics"
            className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 rounded-xl p-4 text-center transition-all shadow-lg"
          >
            <Activity className="w-8 h-8 mx-auto mb-2 text-white" />
            <p className="text-white font-semibold">Analytiques</p>
          </a>
        </div>
      </div>

    </div>
  );
}
