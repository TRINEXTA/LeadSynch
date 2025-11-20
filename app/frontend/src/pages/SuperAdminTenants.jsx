import { useState, useEffect } from 'react';
import {
  Users, Search, Plus, Eye, Pause, Play, X, Mail,
  Building, Calendar, CheckCircle, XCircle, Clock, AlertCircle
} from 'lucide-react';
import api from '../api/axios';

const STATUS_COLORS = {
  trial: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  active: 'bg-green-100 text-green-800 border-green-300',
  suspended: 'bg-red-100 text-red-800 border-red-300',
  expired: 'bg-gray-100 text-gray-800 border-gray-300',
  cancelled: 'bg-purple-100 text-purple-800 border-purple-300'
};

const STATUS_ICONS = {
  trial: Clock,
  active: CheckCircle,
  suspended: XCircle,
  expired: AlertCircle,
  cancelled: X
};

export default function SuperAdminTenants() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);

  useEffect(() => {
    loadTenants();
  }, [statusFilter]);

  const loadTenants = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;

      const response = await api.get('/super-admin/tenants', { params });
      setTenants(response.data.tenants);
    } catch (error) {
      console.error('Erreur chargement tenants:', error);
      alert('Erreur chargement des clients');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadTenants();
  };

  const handleSuspend = async (tenantId) => {
    if (!confirm('Suspendre ce client ? Il n\'aura plus accès à LeadSynch.')) return;

    const reason = prompt('Raison de la suspension:');
    if (!reason) return;

    try {
      await api.post(`/super-admin/tenants/${tenantId}/suspend`, { reason });
      alert('✅ Client suspendu');
      loadTenants();
    } catch (error) {
      console.error('Erreur suspension:', error);
      alert('Erreur lors de la suspension');
    }
  };

  const handleActivate = async (tenantId) => {
    if (!confirm('Réactiver ce client ?')) return;

    try {
      await api.post(`/super-admin/tenants/${tenantId}/activate`);
      alert('✅ Client réactivé');
      loadTenants();
    } catch (error) {
      console.error('Erreur activation:', error);
      alert('Erreur lors de la réactivation');
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-2xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-10 h-10 text-white" />
            <div>
              <h1 className="text-3xl font-bold text-white">Gestion Clients</h1>
              <p className="text-purple-100">Tous les clients LeadSynch</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-white text-purple-600 hover:bg-purple-50 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Nouveau Client
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Recherche */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par nom ou email..."
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </form>

          {/* Filtre statut */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Tous les statuts</option>
            <option value="trial">Trial</option>
            <option value="active">Actifs</option>
            <option value="suspended">Suspendus</option>
            <option value="expired">Expirés</option>
            <option value="cancelled">Annulés</option>
          </select>
        </div>
      </div>

      {/* Liste Clients */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {tenants.map((tenant) => {
            const StatusIcon = STATUS_ICONS[tenant.status] || AlertCircle;

            return (
              <div
                key={tenant.id}
                className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all border-2 border-gray-100"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Building className="w-6 h-6 text-purple-600" />
                      <h3 className="text-xl font-bold text-gray-900">{tenant.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 flex items-center gap-1 ${STATUS_COLORS[tenant.status]}`}>
                        <StatusIcon className="w-3 h-3" />
                        {tenant.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="text-sm font-semibold text-gray-900">{tenant.billing_email || 'Non renseigné'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Plan</p>
                        <p className="text-sm font-semibold text-gray-900">{tenant.plan_name || 'Aucun'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Utilisateurs</p>
                        <p className="text-sm font-semibold text-gray-900">{tenant.users_count || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Leads</p>
                        <p className="text-sm font-semibold text-gray-900">{tenant.leads_count || 0}</p>
                      </div>
                    </div>

                    {tenant.trial_ends_at && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        Trial expire le : {new Date(tenant.trial_ends_at).toLocaleDateString('fr-FR')}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => window.location.href = `/super-admin/tenants/${tenant.id}`}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-700 p-2 rounded-lg transition-all"
                      title="Voir détails"
                    >
                      <Eye className="w-5 h-5" />
                    </button>

                    {tenant.status === 'suspended' ? (
                      <button
                        onClick={() => handleActivate(tenant.id)}
                        className="bg-green-100 hover:bg-green-200 text-green-700 p-2 rounded-lg transition-all"
                        title="Réactiver"
                      >
                        <Play className="w-5 h-5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSuspend(tenant.id)}
                        className="bg-red-100 hover:bg-red-200 text-red-700 p-2 rounded-lg transition-all"
                        title="Suspendre"
                      >
                        <Pause className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {tenants.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Aucun client trouvé</p>
            </div>
          )}
        </div>
      )}

      {/* Modal Créer Client - Placeholder */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
            <h2 className="text-2xl font-bold mb-4">Créer un nouveau client</h2>
            <p className="text-gray-600 mb-4">Fonctionnalité en cours de développement...</p>
            <button
              onClick={() => setShowCreateModal(false)}
              className="bg-gray-200 hover:bg-gray-300 px-6 py-2 rounded-xl font-bold"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
