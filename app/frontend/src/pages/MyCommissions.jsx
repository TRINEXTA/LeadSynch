import { log, error, warn } from "../../lib/logger.js";
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Users,
  FileText,
  ChevronDown,
  ChevronUp,
  Filter,
  Download,
  RefreshCw,
  Award,
  Target,
  Briefcase,
  CreditCard
} from 'lucide-react';
import { HIERARCHY_CONFIG } from '../lib/permissions';

export default function MyCommissions() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [commissions, setCommissions] = useState([]);
  const [stats, setStats] = useState({
    total_earned: 0,
    pending_amount: 0,
    paid_amount: 0,
    this_month: 0,
    last_month: 0,
    team_commissions: 0
  });
  const [filters, setFilters] = useState({
    period: 'all',
    status: 'all',
    type: 'all'
  });
  const [expandedRows, setExpandedRows] = useState({});
  const [periodFilter, setPeriodFilter] = useState('this_month');

  useEffect(() => {
    loadCommissions();
  }, [filters, periodFilter]);

  const loadCommissions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/commissions/my', {
        params: {
          period: periodFilter,
          status: filters.status,
          type: filters.type
        }
      });
      setCommissions(response.data.commissions || []);
      setStats(response.data.stats || {
        total_earned: 0,
        pending_amount: 0,
        paid_amount: 0,
        this_month: 0,
        last_month: 0,
        team_commissions: 0
      });
    } catch (err) {
      error('Erreur chargement commissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      validated: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    const labels = {
      pending: 'En attente',
      validated: 'Validée',
      paid: 'Payée',
      cancelled: 'Annulée'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getTypeBadge = (type) => {
    const badges = {
      personal: 'bg-indigo-100 text-indigo-800',
      team: 'bg-purple-100 text-purple-800',
      bonus: 'bg-amber-100 text-amber-800'
    };
    const labels = {
      personal: 'Personnel',
      team: 'Équipe',
      bonus: 'Bonus'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[type] || 'bg-gray-100 text-gray-800'}`}>
        {labels[type] || type}
      </span>
    );
  };

  const toggleRow = (id) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const isManager = user?.role === 'manager';
  const hierarchyConfig = user?.hierarchical_level ? HIERARCHY_CONFIG[user.hierarchical_level] : null;

  const growthPercentage = stats.last_month > 0
    ? ((stats.this_month - stats.last_month) / stats.last_month * 100).toFixed(1)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Chargement de vos commissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-600" />
              Mes Commissions
            </h1>
            <p className="text-gray-600 mt-1">
              Suivez vos gains et performances commerciales
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadCommissions}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </button>
          </div>
        </div>

        {/* Taux de commission affiché */}
        {(user?.commission_rate || user?.team_commission_rate) && (
          <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-600" />
                <span className="text-sm text-gray-600">Votre taux de commission :</span>
                <span className="font-bold text-indigo-700">{user.commission_rate || 0}%</span>
              </div>
              {isManager && user?.team_commission_rate > 0 && (
                <div className="flex items-center gap-2 border-l border-indigo-200 pl-6">
                  <Users className="w-5 h-5 text-purple-600" />
                  <span className="text-sm text-gray-600">Commission équipe :</span>
                  <span className="font-bold text-purple-700">{user.team_commission_rate}%</span>
                </div>
              )}
              {hierarchyConfig && (
                <div className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${hierarchyConfig.color}`}>
                  {hierarchyConfig.label}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Total</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.total_earned)}</p>
          <p className="text-sm text-gray-500 mt-1">Total gagné</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${
              growthPercentage >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {growthPercentage >= 0 ? '+' : ''}{growthPercentage}%
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.this_month)}</p>
          <p className="text-sm text-gray-500 mt-1">Ce mois-ci</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.pending_amount)}</p>
          <p className="text-sm text-gray-500 mt-1">En attente de validation</p>
        </div>

        {isManager && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-xs text-purple-500 bg-purple-100 px-2 py-1 rounded-full">Équipe</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.team_commissions)}</p>
            <p className="text-sm text-gray-500 mt-1">Commissions équipe</p>
          </div>
        )}

        {!isManager && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.paid_amount)}</p>
            <p className="text-sm text-gray-500 mt-1">Déjà versé</p>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6 border border-gray-100">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filtres :</span>
          </div>

          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="this_month">Ce mois</option>
            <option value="last_month">Mois dernier</option>
            <option value="this_quarter">Ce trimestre</option>
            <option value="this_year">Cette année</option>
            <option value="all">Tout</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="validated">Validées</option>
            <option value="paid">Payées</option>
          </select>

          <select
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="all">Tous les types</option>
            <option value="personal">Personnel</option>
            {isManager && <option value="team">Équipe</option>}
            <option value="bonus">Bonus</option>
          </select>
        </div>
      </div>

      {/* Commissions Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-400" />
            Historique des commissions
          </h2>
          <span className="text-sm text-gray-500">{commissions.length} commission(s)</span>
        </div>

        {commissions.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune commission</h3>
            <p className="text-gray-500">
              Vos commissions apparaîtront ici une fois que vous aurez conclu des contrats.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contrat / Lead
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant contrat
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Taux
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commission
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">

                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {commissions.map((commission) => (
                  <>
                    <tr key={commission.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(commission.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {commission.contract_reference || 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {commission.lead_company || commission.lead_name || '-'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getTypeBadge(commission.commission_type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(commission.contract_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {commission.rate}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-green-600">
                          {formatCurrency(commission.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(commission.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => toggleRow(commission.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {expandedRows[commission.id] ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                    </tr>
                    {expandedRows[commission.id] && (
                      <tr className="bg-gray-50">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">Type de contrat</p>
                              <p className="font-medium">{commission.contract_type || 'Standard'}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Date de validation</p>
                              <p className="font-medium">{formatDate(commission.validated_at) || 'Non validé'}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Date de paiement</p>
                              <p className="font-medium">{formatDate(commission.paid_at) || 'Non payé'}</p>
                            </div>
                            {commission.notes && (
                              <div className="col-span-3">
                                <p className="text-gray-500">Notes</p>
                                <p className="font-medium">{commission.notes}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary by contract type */}
      {commissions.length > 0 && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-600" />
              Par type de contrat
            </h3>
            <div className="space-y-3">
              {['subscription', 'one_shot', 'recurring'].map(type => {
                const typeCommissions = commissions.filter(c => c.contract_type === type);
                const total = typeCommissions.reduce((sum, c) => sum + (c.amount || 0), 0);
                const labels = {
                  subscription: 'Abonnements',
                  one_shot: 'One-shot',
                  recurring: 'Récurrent'
                };
                return (
                  <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">{labels[type] || type}</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(total)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-green-600" />
              Par statut
            </h3>
            <div className="space-y-3">
              {['pending', 'validated', 'paid'].map(status => {
                const statusCommissions = commissions.filter(c => c.status === status);
                const total = statusCommissions.reduce((sum, c) => sum + (c.amount || 0), 0);
                const labels = {
                  pending: 'En attente',
                  validated: 'Validées',
                  paid: 'Payées'
                };
                const colors = {
                  pending: 'text-yellow-600',
                  validated: 'text-blue-600',
                  paid: 'text-green-600'
                };
                return (
                  <div key={status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">{labels[status]}</span>
                    <span className={`font-semibold ${colors[status]}`}>{formatCurrency(total)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
