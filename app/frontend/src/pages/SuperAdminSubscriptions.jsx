import { log, error, warn } from "../lib/logger.js";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Search,
  Filter,
  RefreshCw,
  Pause,
  Play,
  TrendingUp,
  DollarSign,
  Calendar,
  Package,
  AlertCircle
} from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { confirmAction } from '../lib/confirmDialog';

export default function SuperAdminSubscriptions() {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [stats, setStats] = useState({
    mrr: 0,
    arr: 0,
    active: 0,
    trial: 0,
    suspended: 0,
    expired: 0
  });

  useEffect(() => {
    loadSubscriptions();
    loadStats();
  }, [statusFilter, planFilter]);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (planFilter !== 'all') params.append('plan', planFilter);

      const response = await api.get(`/super-admin/subscriptions?${params.toString()}`);
      setSubscriptions(response.data.subscriptions || []);
    } catch (err) {
      error('Erreur chargement abonnements:', err);
      toast.error('Erreur lors du chargement des abonnements');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/super-admin/subscriptions/stats');
      setStats(response.data.stats || {});
    } catch (error) {
      error('Erreur chargement stats:', error);
    }
  };

  const handleRenewSubscription = async (subscriptionId) => {
    if (!await confirmAction('Renouveler cet abonnement pour 1 an ?')) return;

    try {
      await api.post(`/super-admin/subscriptions/${subscriptionId}/renew`);
      toast.success('Abonnement renouvelé avec succès');
      loadSubscriptions();
      loadStats();
    } catch (err) {
      error('Erreur renouvellement:', err);
      toast.error('Erreur lors du renouvellement');
    }
  };

  const handleSuspendSubscription = async (subscriptionId) => {
    if (!await confirmAction('Suspendre cet abonnement ?')) return;

    try {
      await api.post(`/super-admin/subscriptions/${subscriptionId}/suspend`);
      toast.success('Abonnement suspendu');
      loadSubscriptions();
      loadStats();
    } catch (err) {
      error('Erreur suspension:', err);
      toast.error('Erreur lors de la suspension');
    }
  };

  const handleActivateSubscription = async (subscriptionId) => {
    if (!await confirmAction('Réactiver cet abonnement ?')) return;

    try {
      await api.post(`/super-admin/subscriptions/${subscriptionId}/activate`);
      toast.success('Abonnement réactivé');
      loadSubscriptions();
      loadStats();
    } catch (err) {
      error('Erreur réactivation:', err);
      toast.error('Erreur lors de la réactivation');
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch =
      sub.tenant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.tenant_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.plan_name?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const getStatusBadge = (status) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      trial: 'bg-blue-100 text-blue-800',
      suspended: 'bg-yellow-100 text-yellow-800',
      expired: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-800 to-indigo-800 border-b border-purple-700">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                💳 Gestion des Abonnements
              </h1>
              <p className="text-purple-200">
                Gérer les abonnements de tous les clients LeadSynch
              </p>
            </div>
            <button
              onClick={loadSubscriptions}
              className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-xl font-semibold hover:from-yellow-600 hover:to-yellow-700 transition-all shadow-lg flex items-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Actualiser
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 opacity-80" />
              <TrendingUp className="w-5 h-5 opacity-60" />
            </div>
            <div className="text-3xl font-bold mb-1">{formatCurrency(stats.mrr)}</div>
            <div className="text-green-100 text-sm">MRR (Mensuel)</div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-8 h-8 opacity-80" />
              <TrendingUp className="w-5 h-5 opacity-60" />
            </div>
            <div className="text-3xl font-bold mb-1">{formatCurrency(stats.arr)}</div>
            <div className="text-blue-100 text-sm">ARR (Annuel)</div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <CreditCard className="w-8 h-8 opacity-80" />
              <span className="text-2xl font-bold opacity-60">{stats.active}</span>
            </div>
            <div className="text-xl font-bold mb-1">Actifs</div>
            <div className="text-purple-100 text-sm">{stats.trial} en essai</div>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-8 h-8 opacity-80" />
              <span className="text-2xl font-bold opacity-60">{stats.suspended + stats.expired}</span>
            </div>
            <div className="text-xl font-bold mb-1">Problèmes</div>
            <div className="text-yellow-100 text-sm">{stats.suspended} suspendus, {stats.expired} expirés</div>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6 border border-purple-400/30">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-300" />
              <input
                type="text"
                placeholder="Rechercher un client, plan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-purple-400/30 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>

            {/* Filtre statut */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-300" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-purple-400/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 appearance-none"
              >
                <option value="all" className="bg-purple-900">Tous les statuts</option>
                <option value="active" className="bg-purple-900">Actifs</option>
                <option value="trial" className="bg-purple-900">En essai</option>
                <option value="suspended" className="bg-purple-900">Suspendus</option>
                <option value="expired" className="bg-purple-900">Expirés</option>
                <option value="cancelled" className="bg-purple-900">Annulés</option>
              </select>
            </div>

            {/* Filtre plan */}
            <div className="relative">
              <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-300" />
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-purple-400/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 appearance-none"
              >
                <option value="all" className="bg-purple-900">Tous les plans</option>
                <option value="trial" className="bg-purple-900">Trial</option>
                <option value="starter" className="bg-purple-900">Starter</option>
                <option value="pro" className="bg-purple-900">Pro</option>
                <option value="enterprise" className="bg-purple-900">Enterprise</option>
                <option value="custom" className="bg-purple-900">Custom</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table des abonnements */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-purple-400/30 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-purple-200">
              <RefreshCw className="w-12 h-12 mx-auto mb-4 animate-spin" />
              <p>Chargement des abonnements...</p>
            </div>
          ) : filteredSubscriptions.length === 0 ? (
            <div className="p-12 text-center text-purple-200">
              <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-40" />
              <p className="text-lg">Aucun abonnement trouvé</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-purple-800/50 border-b border-purple-400/30">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-purple-200">Client</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-purple-200">Plan</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-purple-200">Cycle</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-purple-200">Montant</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-purple-200">Début</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-purple-200">Fin</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-purple-200">Statut</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-purple-200">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-400/20">
                  {filteredSubscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-white font-medium">{sub.tenant_name}</div>
                        <div className="text-purple-300 text-sm">{sub.tenant_email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-500/30 text-purple-200 text-sm font-medium">
                          {sub.plan_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-purple-200">
                        {sub.billing_cycle === 'monthly' ? 'Mensuel' : 'Annuel'}
                      </td>
                      <td className="px-6 py-4 text-white font-semibold">
                        {formatCurrency(sub.billing_cycle === 'monthly' ? sub.mrr : sub.arr / 12)}
                      </td>
                      <td className="px-6 py-4 text-purple-200 text-sm">
                        {formatDate(sub.start_date)}
                      </td>
                      <td className="px-6 py-4 text-purple-200 text-sm">
                        {formatDate(sub.end_date)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(sub.status)}`}>
                          {sub.status === 'active' && '✅ Actif'}
                          {sub.status === 'trial' && '🎯 Essai'}
                          {sub.status === 'suspended' && '⏸️ Suspendu'}
                          {sub.status === 'expired' && '❌ Expiré'}
                          {sub.status === 'cancelled' && '🚫 Annulé'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {(sub.status === 'active' || sub.status === 'trial') && (
                            <button
                              onClick={() => handleSuspendSubscription(sub.id)}
                              className="p-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 rounded-lg transition-colors"
                              title="Suspendre"
                            >
                              <Pause className="w-4 h-4" />
                            </button>
                          )}
                          {sub.status === 'suspended' && (
                            <button
                              onClick={() => handleActivateSubscription(sub.id)}
                              className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg transition-colors"
                              title="Réactiver"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          )}
                          {(sub.status === 'expired' || sub.status === 'active') && (
                            <button
                              onClick={() => handleRenewSubscription(sub.id)}
                              className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-colors"
                              title="Renouveler"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
