import { log, error, warn } from "../lib/logger.js";
import { useState, useEffect } from 'react';
import {
  Users, Search, Plus, Eye, Pause, Play, X, Mail, FileText,
  Building, Calendar, CheckCircle, XCircle, Clock, AlertCircle
} from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { confirmAction } from '../lib/confirmDialog';

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
  const [newClient, setNewClient] = useState({
    name: '',
    billing_email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'France',
    siret: '',
    siren: '',
    vat_number: '',
    vat_applicable: true,
    plan_id: '',
    admin_first_name: '',
    admin_last_name: '',
    admin_email: ''
  });
  const [stats, setStats] = useState({ total: 0, active: 0, trial: 0, suspended: 0 });
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    loadTenants();
    loadPlans();
    loadStats();
  }, [statusFilter]);

  const loadStats = async () => {
    try {
      const response = await api.get('/super-admin/dashboard/stats');
      if (response.data.stats?.tenants) {
        setStats({
          total: parseInt(response.data.stats.tenants.total_count) || 0,
          active: parseInt(response.data.stats.tenants.active_count) || 0,
          trial: parseInt(response.data.stats.tenants.trial_count) || 0,
          suspended: parseInt(response.data.stats.tenants.suspended_count) || 0
        });
      }
    } catch (error) {
      error('Erreur chargement stats:', error);
    }
  };

  const loadTenants = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;

      const response = await api.get('/super-admin/tenants', { params });
      setTenants(response.data.tenants);
    } catch (error) {
      error('Erreur chargement tenants:', error);
      toast.error('Erreur chargement des clients');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadTenants();
  };

  const loadPlans = async () => {
    try {
      const response = await api.get('/super-admin/plans');
      setPlans(response.data.plans || []);
    } catch (error) {
      error('Erreur chargement plans:', error);
    }
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();

    // Validation
    if (!newClient.name || !newClient.billing_email || !newClient.admin_email || !newClient.plan_id) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      await api.post('/super-admin/tenants', newClient);
      toast.success('Client créé avec succès');
      setShowCreateModal(false);
      setNewClient({
        name: '',
        billing_email: '',
        phone: '',
        address: '',
        city: '',
        postal_code: '',
        country: 'France',
        siret: '',
        siren: '',
        vat_number: '',
        vat_applicable: true,
        plan_id: '',
        admin_first_name: '',
        admin_last_name: '',
        admin_email: ''
      });
      loadTenants();
      loadStats();
    } catch (error) {
      error('Erreur création client:', error);
      toast.error('Erreur lors de la création du client');
    }
  };

  const handleSuspend = async (tenantId) => {
    if (!await confirmAction('Suspendre ce client ? Il n\'aura plus accès à LeadSynch.')) return;

    const reason = window.prompt('Raison de la suspension:');
    if (!reason) return;

    try {
      await api.post(`/super-admin/tenants/${tenantId}/suspend`, { reason });
      toast.success('Client suspendu');
      loadTenants();
    } catch (error) {
      error('Erreur suspension:', error);
      toast.error('Erreur lors de la suspension');
    }
  };

  const handleActivate = async (tenantId) => {
    if (!await confirmAction('Réactiver ce client ?')) return;

    try {
      await api.post(`/super-admin/tenants/${tenantId}/activate`);
      toast.success('Client réactivé');
      loadTenants();
    } catch (error) {
      error('Erreur activation:', error);
      toast.error('Erreur lors de la réactivation');
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <div className="text-white/80 text-sm">Total Clients</div>
            <div className="text-3xl font-bold text-white">{stats.total}</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <div className="text-green-200 text-sm flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> Actifs
            </div>
            <div className="text-3xl font-bold text-white">{stats.active}</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <div className="text-yellow-200 text-sm flex items-center gap-1">
              <Clock className="w-4 h-4" /> En Trial
            </div>
            <div className="text-3xl font-bold text-white">{stats.trial}</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <div className="text-red-200 text-sm flex items-center gap-1">
              <XCircle className="w-4 h-4" /> Suspendus
            </div>
            <div className="text-3xl font-bold text-white">{stats.suspended}</div>
          </div>
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

      {/* Modal Créer Client */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Plus className="w-6 h-6 text-blue-600" />
                  Créer un nouveau client
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateClient} className="p-6 space-y-6">
              {/* Informations Entreprise */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Building className="w-5 h-5 text-blue-600" />
                  Informations Entreprise
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom de l'entreprise *
                    </label>
                    <input
                      type="text"
                      required
                      value={newClient.name}
                      onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: ACME Corp"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email de facturation *
                    </label>
                    <input
                      type="email"
                      required
                      value={newClient.billing_email}
                      onChange={(e) => setNewClient({ ...newClient, billing_email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="facturation@entreprise.fr"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      value={newClient.phone}
                      onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="+33 1 23 45 67 89"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Adresse
                    </label>
                    <input
                      type="text"
                      value={newClient.address}
                      onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="123 Rue de la Paix"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ville
                    </label>
                    <input
                      type="text"
                      value={newClient.city}
                      onChange={(e) => setNewClient({ ...newClient, city: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Paris"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Code postal
                    </label>
                    <input
                      type="text"
                      value={newClient.postal_code}
                      onChange={(e) => setNewClient({ ...newClient, postal_code: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="75001"
                    />
                  </div>
                </div>
              </div>

              {/* Informations Fiscales - SIRET/SIREN/TVA */}
              <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-blue-800">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Informations Fiscales
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SIRET (14 chiffres)
                    </label>
                    <input
                      type="text"
                      value={newClient.siret}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 14);
                        setNewClient({
                          ...newClient,
                          siret: value,
                          siren: value.slice(0, 9)
                        });
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="123 456 789 00012"
                      maxLength={14}
                    />
                    <p className="text-xs text-gray-500 mt-1">Le SIREN sera extrait automatiquement</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SIREN (9 chiffres)
                    </label>
                    <input
                      type="text"
                      value={newClient.siren}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 9);
                        setNewClient({ ...newClient, siren: value });
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                      placeholder="123 456 789"
                      maxLength={9}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      N° TVA Intracommunautaire
                    </label>
                    <input
                      type="text"
                      value={newClient.vat_number}
                      onChange={(e) => setNewClient({ ...newClient, vat_number: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="FR12345678901"
                    />
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newClient.vat_applicable}
                        onChange={(e) => setNewClient({ ...newClient, vat_applicable: e.target.checked })}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Assujetti à la TVA
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Administrateur */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Compte Administrateur
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prénom
                    </label>
                    <input
                      type="text"
                      value={newClient.admin_first_name}
                      onChange={(e) => setNewClient({ ...newClient, admin_first_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Jean"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom
                    </label>
                    <input
                      type="text"
                      value={newClient.admin_last_name}
                      onChange={(e) => setNewClient({ ...newClient, admin_last_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Dupont"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={newClient.admin_email}
                      onChange={(e) => setNewClient({ ...newClient, admin_email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="admin@entreprise.fr"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Un email de bienvenue avec un mot de passe temporaire sera envoyé à cette adresse.
                    </p>
                  </div>
                </div>
              </div>

              {/* Plan d'abonnement */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Building className="w-5 h-5 text-blue-600" />
                  Plan d'abonnement
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sélectionner un plan *
                  </label>
                  <select
                    required
                    value={newClient.plan_id}
                    onChange={(e) => setNewClient({ ...newClient, plan_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Choisir un plan --</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} - {plan.price_monthly}€/mois
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Le client commencera avec un essai gratuit de 30 jours.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Créer le client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
