import { log, error, warn } from "../lib/logger.js";
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Users,
  Database,
  DollarSign,
  FileText,
  Gift,
  RefreshCw,
  Pause,
  Play,
  Trash2,
  Save,
  Edit,
  Package,
  AlertCircle,
  Hash,
  Percent
} from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function SuperAdminTenantDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [subscriptionId, setSubscriptionId] = useState(null);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [giftAmount, setGiftAmount] = useState(0);
  const [refundAmount, setRefundAmount] = useState(0);

  useEffect(() => {
    loadTenantDetails();
  }, [id]);

  const loadTenantDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/super-admin/tenants/${id}`);
      setTenant(response.data.tenant);
      setFormData({
        name: response.data.tenant.name || '',
        billing_email: response.data.tenant.billing_email || '',
        phone: response.data.tenant.phone || '',
        address: response.data.tenant.address || '',
        city: response.data.tenant.city || '',
        postal_code: response.data.tenant.postal_code || '',
        country: response.data.tenant.country || 'France',
        company_siret: response.data.tenant.company_siret || '',
        company_siren: response.data.tenant.company_siren || '',
        company_vat: response.data.tenant.company_vat || '',
        vat_applicable: response.data.tenant.vat_applicable !== false
      });
      // Get active subscription ID for renewal
      if (response.data.subscriptions?.length > 0) {
        const activeSub = response.data.subscriptions.find(s => s.status === 'active' || s.status === 'trial');
        if (activeSub) setSubscriptionId(activeSub.id);
      }
    } catch (error) {
      error('Erreur chargement tenant:', error);
      toast.error('Erreur lors du chargement du client');
      navigate('/super-admin/tenants');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await api.put(`/super-admin/tenants/${id}`, formData);
      toast.success('Informations mises à jour avec succès');
      setEditing(false);
      loadTenantDetails();
    } catch (error) {
      error('Erreur mise à jour:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleSuspend = async () => {
    if (!window.confirm('Suspendre ce client ? Tous ses utilisateurs seront bloqués.')) return;

    try {
      await api.post(`/super-admin/tenants/${id}/suspend`);
      toast.success('Client suspendu');
      loadTenantDetails();
    } catch (error) {
      error('Erreur suspension:', error);
      toast.error('Erreur lors de la suspension');
    }
  };

  const handleActivate = async () => {
    if (!window.confirm('Réactiver ce client ?')) return;

    try {
      await api.post(`/super-admin/tenants/${id}/activate`);
      toast.success('Client réactivé');
      loadTenantDetails();
    } catch (error) {
      error('Erreur réactivation:', error);
      toast.error('Erreur lors de la réactivation');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('⚠️ ATTENTION ! Supprimer définitivement ce client et TOUTES ses données ? Cette action est IRRÉVERSIBLE !')) return;
    if (!window.confirm('Êtes-vous VRAIMENT sûr ? Toutes les données seront perdues.')) return;

    try {
      await api.delete(`/super-admin/tenants/${id}`);
      toast.success('Client supprimé');
      navigate('/super-admin/tenants');
    } catch (error) {
      error('Erreur suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleGiftCredits = async () => {
    if (giftAmount <= 0) {
      toast.error('Montant invalide');
      return;
    }

    try {
      await api.post(`/super-admin/tenants/${id}/gift-credits`, { amount: giftAmount });
      toast.success(`${giftAmount} crédits offerts avec succès`);
      setShowGiftModal(false);
      setGiftAmount(0);
      loadTenantDetails();
    } catch (error) {
      error('Erreur cadeau crédits:', error);
      toast.error('Erreur lors de l\'attribution des crédits');
    }
  };

  const handleRefund = async () => {
    if (refundAmount <= 0) {
      toast.error('Montant invalide');
      return;
    }

    try {
      await api.post(`/super-admin/tenants/${id}/refund`, { amount: refundAmount });
      toast.success(`Remboursement de ${refundAmount}€ effectué`);
      setShowRefundModal(false);
      setRefundAmount(0);
      loadTenantDetails();
    } catch (error) {
      error('Erreur remboursement:', error);
      toast.error('Erreur lors du remboursement');
    }
  };

  const handleRenewSubscription = async () => {
    if (!subscriptionId) {
      toast.error('Aucun abonnement actif à renouveler');
      return;
    }
    if (!window.confirm('Renouveler l\'abonnement de ce client ?')) return;

    try {
      await api.post(`/super-admin/subscriptions/${subscriptionId}/renew`);
      toast.success('Abonnement renouvelé avec succès');
      loadTenantDetails();
    } catch (error) {
      error('Erreur renouvellement:', error);
      toast.error('Erreur lors du renouvellement');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { bg: 'bg-green-100', text: 'text-green-800', label: '✅ Actif' },
      trial: { bg: 'bg-blue-100', text: 'text-blue-800', label: '🎯 Essai' },
      suspended: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '⏸️ Suspendu' },
      expired: { bg: 'bg-red-100', text: 'text-red-800', label: '❌ Expiré' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', label: '🚫 Annulé' }
    };
    const badge = badges[status] || badges.active;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-center">
          <RefreshCw className="w-12 h-12 mx-auto mb-4 animate-spin" />
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!tenant) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-800 to-indigo-800 border-b border-purple-700">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/super-admin/tenants')}
              className="flex items-center gap-2 text-purple-200 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Retour aux clients
            </button>
            <div className="flex items-center gap-3">
              {tenant.status === 'suspended' ? (
                <button
                  onClick={handleActivate}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Réactiver
                </button>
              ) : (
                <button
                  onClick={handleSuspend}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-all flex items-center gap-2"
                >
                  <Pause className="w-4 h-4" />
                  Suspendre
                </button>
              )}
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer
              </button>
            </div>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <Building className="w-8 h-8" />
                {tenant.name}
              </h1>
              <div className="flex items-center gap-4 text-purple-200">
                <span className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {tenant.billing_email}
                </span>
                {getStatusBadge(tenant.status)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Stats - LECTURE SEULE (Grisées) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-purple-400/30 opacity-60 cursor-not-allowed">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-blue-300" />
              <span className="text-white text-2xl font-bold">{tenant.users_count || 0}</span>
            </div>
            <p className="text-purple-200 text-sm">Utilisateurs</p>
            <p className="text-xs text-purple-300 mt-1">Lecture seule</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-purple-400/30 opacity-60 cursor-not-allowed">
            <div className="flex items-center justify-between mb-2">
              <Database className="w-8 h-8 text-green-300" />
              <span className="text-white text-2xl font-bold">{tenant.leads_count || 0}</span>
            </div>
            <p className="text-purple-200 text-sm">Leads</p>
            <p className="text-xs text-purple-300 mt-1">Lecture seule</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-purple-400/30 opacity-60 cursor-not-allowed">
            <div className="flex items-center justify-between mb-2">
              <CreditCard className="w-8 h-8 text-yellow-300" />
              <span className="text-white text-2xl font-bold">{tenant.credits_remaining || 0}</span>
            </div>
            <p className="text-purple-200 text-sm">Crédits</p>
            <p className="text-xs text-purple-300 mt-1">Lecture seule</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-purple-400/30 opacity-60 cursor-not-allowed">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-purple-300" />
              <span className="text-white text-2xl font-bold">{tenant.mrr || 0}€</span>
            </div>
            <p className="text-purple-200 text-sm">MRR</p>
            <p className="text-xs text-purple-300 mt-1">Lecture seule</p>
          </div>
        </div>

        {/* Informations Générales - MODIFIABLE */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-purple-400/30">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Building className="w-6 h-6" />
              Informations Générales
            </h2>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Modifier
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Enregistrer
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-purple-200 text-sm font-medium mb-2">Nom de l'entreprise</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!editing}
                className={`w-full px-4 py-3 bg-white/10 border border-purple-400/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 ${!editing && 'opacity-50 cursor-not-allowed'}`}
              />
            </div>

            <div>
              <label className="block text-purple-200 text-sm font-medium mb-2">Email de facturation</label>
              <input
                type="email"
                value={formData.billing_email}
                onChange={(e) => setFormData({ ...formData, billing_email: e.target.value })}
                disabled={!editing}
                className={`w-full px-4 py-3 bg-white/10 border border-purple-400/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 ${!editing && 'opacity-50 cursor-not-allowed'}`}
              />
            </div>

            <div>
              <label className="block text-purple-200 text-sm font-medium mb-2">Téléphone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={!editing}
                className={`w-full px-4 py-3 bg-white/10 border border-purple-400/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 ${!editing && 'opacity-50 cursor-not-allowed'}`}
              />
            </div>

            <div>
              <label className="block text-purple-200 text-sm font-medium mb-2">Adresse</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                disabled={!editing}
                className={`w-full px-4 py-3 bg-white/10 border border-purple-400/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 ${!editing && 'opacity-50 cursor-not-allowed'}`}
              />
            </div>

            <div>
              <label className="block text-purple-200 text-sm font-medium mb-2">Ville</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                disabled={!editing}
                className={`w-full px-4 py-3 bg-white/10 border border-purple-400/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 ${!editing && 'opacity-50 cursor-not-allowed'}`}
              />
            </div>

            <div>
              <label className="block text-purple-200 text-sm font-medium mb-2">Code postal</label>
              <input
                type="text"
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                disabled={!editing}
                className={`w-full px-4 py-3 bg-white/10 border border-purple-400/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 ${!editing && 'opacity-50 cursor-not-allowed'}`}
              />
            </div>
          </div>

          {/* Section Informations Fiscales */}
          <div className="mt-8 pt-6 border-t border-purple-400/30">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Hash className="w-5 h-5 text-yellow-400" />
              Informations Fiscales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-purple-200 text-sm font-medium mb-2">SIRET (14 chiffres)</label>
                <input
                  type="text"
                  value={formData.company_siret || ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 14);
                    setFormData({
                      ...formData,
                      company_siret: value,
                      company_siren: value.slice(0, 9)
                    });
                  }}
                  disabled={!editing}
                  maxLength={14}
                  className={`w-full px-4 py-3 bg-white/10 border border-purple-400/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 ${!editing && 'opacity-50 cursor-not-allowed'}`}
                  placeholder="12345678901234"
                />
              </div>

              <div>
                <label className="block text-purple-200 text-sm font-medium mb-2">SIREN (9 chiffres)</label>
                <input
                  type="text"
                  value={formData.company_siren || ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 9);
                    setFormData({ ...formData, company_siren: value });
                  }}
                  disabled={!editing}
                  maxLength={9}
                  className={`w-full px-4 py-3 bg-white/10 border border-purple-400/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-gray-800/30 ${!editing && 'opacity-50 cursor-not-allowed'}`}
                  placeholder="123456789"
                />
              </div>

              <div>
                <label className="block text-purple-200 text-sm font-medium mb-2">N° TVA Intracommunautaire</label>
                <input
                  type="text"
                  value={formData.company_vat || ''}
                  onChange={(e) => setFormData({ ...formData, company_vat: e.target.value.toUpperCase() })}
                  disabled={!editing}
                  className={`w-full px-4 py-3 bg-white/10 border border-purple-400/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 ${!editing && 'opacity-50 cursor-not-allowed'}`}
                  placeholder="FR12345678901"
                />
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.vat_applicable !== false}
                    onChange={(e) => setFormData({ ...formData, vat_applicable: e.target.checked })}
                    disabled={!editing}
                    className="w-5 h-5 text-yellow-500 border-purple-400/30 rounded focus:ring-yellow-500 bg-white/10"
                  />
                  <span className={`text-sm font-medium ${editing ? 'text-white' : 'text-purple-300'}`}>
                    <Percent className="w-4 h-4 inline mr-1" />
                    Assujetti à la TVA
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Abonnement Actuel */}
        {tenant.subscription && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-purple-400/30">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
              <Package className="w-6 h-6" />
              Abonnement Actuel
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-purple-200 text-sm mb-1">Plan</p>
                <p className="text-white text-lg font-semibold">{tenant.plan_name}</p>
              </div>
              <div>
                <p className="text-purple-200 text-sm mb-1">Cycle</p>
                <p className="text-white text-lg">{tenant.subscription.billing_cycle === 'monthly' ? 'Mensuel' : 'Annuel'}</p>
              </div>
              <div>
                <p className="text-purple-200 text-sm mb-1">Prix</p>
                <p className="text-white text-lg font-bold">{tenant.subscription.mrr || 0}€/mois</p>
              </div>
              <div>
                <p className="text-purple-200 text-sm mb-1">Date de début</p>
                <p className="text-white">{new Date(tenant.subscription.start_date).toLocaleDateString('fr-FR')}</p>
              </div>
              <div>
                <p className="text-purple-200 text-sm mb-1">Date de fin</p>
                <p className="text-white">{new Date(tenant.subscription.end_date).toLocaleDateString('fr-FR')}</p>
              </div>
              <div>
                <p className="text-purple-200 text-sm mb-1">Renouvellement auto</p>
                <p className="text-white">{tenant.subscription.auto_renew ? '✅ Oui' : '❌ Non'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions Spéciales */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-purple-400/30">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
            <AlertCircle className="w-6 h-6" />
            Actions Spéciales
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setShowGiftModal(true)}
              className="p-6 bg-gradient-to-br from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 rounded-xl text-white transition-all shadow-lg flex flex-col items-center gap-3"
            >
              <Gift className="w-8 h-8" />
              <span className="font-semibold">Offrir des Crédits</span>
            </button>

            <button
              onClick={() => setShowRefundModal(true)}
              className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl text-white transition-all shadow-lg flex flex-col items-center gap-3"
            >
              <DollarSign className="w-8 h-8" />
              <span className="font-semibold">Remboursement</span>
            </button>

            <button
              onClick={handleRenewSubscription}
              disabled={!subscriptionId}
              className={`p-6 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-xl text-white transition-all shadow-lg flex flex-col items-center gap-3 ${!subscriptionId && 'opacity-50 cursor-not-allowed'}`}
            >
              <RefreshCw className="w-8 h-8" />
              <span className="font-semibold">Renouveler Abonnement</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal Offrir Crédits */}
      {showGiftModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Gift className="w-6 h-6 text-yellow-500" />
              Offrir des Crédits
            </h3>
            <p className="text-gray-600 mb-6">Combien de crédits voulez-vous offrir à {tenant.name} ?</p>
            <input
              type="number"
              value={giftAmount}
              onChange={(e) => setGiftAmount(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-6"
              placeholder="Nombre de crédits"
              min="0"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowGiftModal(false)}
                className="flex-1 px-6 py-3 bg-gray-300 hover:bg-gray-400 rounded-lg transition-all"
              >
                Annuler
              </button>
              <button
                onClick={handleGiftCredits}
                className="flex-1 px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-all"
              >
                Offrir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Remboursement */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-blue-500" />
              Remboursement
            </h3>
            <p className="text-gray-600 mb-6">Montant à rembourser à {tenant.name} :</p>
            <input
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-6"
              placeholder="Montant en €"
              min="0"
              step="0.01"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowRefundModal(false)}
                className="flex-1 px-6 py-3 bg-gray-300 hover:bg-gray-400 rounded-lg transition-all"
              >
                Annuler
              </button>
              <button
                onClick={handleRefund}
                className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all"
              >
                Rembourser
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
