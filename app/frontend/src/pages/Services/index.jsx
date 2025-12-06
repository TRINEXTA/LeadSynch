import { log, error, warn } from "../../lib/logger.js";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Package, Plus, Edit2, Trash2, DollarSign, TrendingUp,
  Users, Clock, CheckCircle, X, Loader2, Filter, Search
} from 'lucide-react';
import api from '../../api/axios';

const CATEGORIES = [
  { value: 'consulting', label: 'Consulting', color: 'bg-blue-100 text-blue-800' },
  { value: 'development', label: 'Développement', color: 'bg-purple-100 text-purple-800' },
  { value: 'marketing', label: 'Marketing', color: 'bg-pink-100 text-pink-800' },
  { value: 'support', label: 'Support', color: 'bg-green-100 text-green-800' },
  { value: 'design', label: 'Design', color: 'bg-orange-100 text-orange-800' },
  { value: 'training', label: 'Formation', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'other', label: 'Autre', color: 'bg-gray-100 text-gray-800' }
];

const PRICE_TYPES = [
  { value: 'one_time', label: 'Paiement unique' },
  { value: 'monthly', label: 'Mensuel' },
  { value: 'yearly', label: 'Annuel' },
  { value: 'hourly', label: 'Horaire' },
  { value: 'custom', label: 'Personnalisé' }
];

export default function Services() {
  const [services, setServices] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('services'); // 'services' ou 'subscriptions'

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [servicesRes, subscriptionsRes, statsRes] = await Promise.all([
        api.get('/services'),
        api.get('/subscriptions'),
        api.get('/subscriptions/stats/summary')
      ]);

      setServices(servicesRes.data.services);
      setSubscriptions(subscriptionsRes.data.subscriptions);
      setStats(statsRes.data);
    } catch (error) {
      error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveService = async (serviceData) => {
    try {
      if (editingService) {
        await api.patch(`/services/${editingService.id}`, serviceData);
      } else {
        await api.post('/services', serviceData);
      }

      setShowServiceModal(false);
      setEditingService(null);
      await loadData();
    } catch (error) {
      error('Erreur sauvegarde service:', error);
      throw error;
    }
  };

  const handleDeleteService = async (serviceId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce service ?')) {
      return;
    }

    try {
      await api.delete(`/services/${serviceId}`);
      await loadData();
    } catch (error) {
      error('Erreur suppression service:', error);
      alert(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const filteredServices = services.filter(service => {
    const matchesSearch = searchQuery === '' ||
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = filterCategory === 'all' || service.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Services & Abonnements
          </h1>
          <p className="text-gray-700 text-lg font-medium">
            Gérez votre catalogue de services et les abonnements clients
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card
              className="relative overflow-hidden shadow-xl border-0"
              style={{background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'}}>
              <CardContent className="pt-6 pb-6">
                <div className="flex items-start justify-between text-white">
                  <div className="flex-1">
                    <p className="text-sm font-bold opacity-90 mb-2">💰 MRR</p>
                    <p className="text-4xl font-black mb-1">{stats.mrr.toFixed(0)}€</p>
                    <p className="text-xs opacity-80 font-medium">Revenu mensuel récurrent</p>
                  </div>
                  <DollarSign className="w-14 h-14 opacity-20 absolute right-3 top-3" />
                </div>
              </CardContent>
            </Card>

            <Card
              className="relative overflow-hidden shadow-xl border-0"
              style={{background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'}}>
              <CardContent className="pt-6 pb-6">
                <div className="flex items-start justify-between text-white">
                  <div className="flex-1">
                    <p className="text-sm font-bold opacity-90 mb-2">📦 Services</p>
                    <p className="text-4xl font-black mb-1">{services.length}</p>
                    <p className="text-xs opacity-80 font-medium">Services disponibles</p>
                  </div>
                  <Package className="w-14 h-14 opacity-20 absolute right-3 top-3" />
                </div>
              </CardContent>
            </Card>

            <Card
              className="relative overflow-hidden shadow-xl border-0"
              style={{background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)'}}>
              <CardContent className="pt-6 pb-6">
                <div className="flex items-start justify-between text-white">
                  <div className="flex-1">
                    <p className="text-sm font-bold opacity-90 mb-2">✓ Abonnements</p>
                    <p className="text-4xl font-black mb-1">
                      {stats.by_status.find(s => s.status === 'active')?.count || 0}
                    </p>
                    <p className="text-xs opacity-80 font-medium">Abonnements actifs</p>
                  </div>
                  <CheckCircle className="w-14 h-14 opacity-20 absolute right-3 top-3" />
                </div>
              </CardContent>
            </Card>

            <Card
              className="relative overflow-hidden shadow-xl border-0"
              style={{background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'}}>
              <CardContent className="pt-6 pb-6">
                <div className="flex items-start justify-between text-white">
                  <div className="flex-1">
                    <p className="text-sm font-bold opacity-90 mb-2">👥 Clients</p>
                    <p className="text-4xl font-black mb-1">
                      {new Set(subscriptions.filter(s => s.status === 'active').map(s => s.lead_id)).size}
                    </p>
                    <p className="text-xs opacity-80 font-medium">Clients actifs</p>
                  </div>
                  <Users className="w-14 h-14 opacity-20 absolute right-3 top-3" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex gap-3">
            <button
              onClick={() => setActiveTab('services')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'services'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Package className="w-5 h-5 inline-block mr-2" />
              Services ({services.length})
            </button>
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'subscriptions'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <TrendingUp className="w-5 h-5 inline-block mr-2" />
              Abonnements ({subscriptions.length})
            </button>
          </div>
        </div>

        {/* Services Tab */}
        {activeTab === 'services' && (
          <>
            {/* Filters & Actions */}
            <div className="mb-6 flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un service..."
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 appearance-none bg-white min-w-[200px]"
              >
                <option value="all">Toutes les catégories</option>
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>

              <button
                onClick={() => {
                  setEditingService(null);
                  setShowServiceModal(true);
                }}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Nouveau service
              </button>
            </div>

            {/* Services Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredServices.map(service => {
                const category = CATEGORIES.find(c => c.value === service.category);
                const priceType = PRICE_TYPES.find(p => p.value === service.price_type);

                return (
                  <Card key={service.id} className="shadow-xl border-2 border-gray-200 hover:shadow-2xl transition-all">
                    <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl mb-2">{service.name}</CardTitle>
                          {category && (
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${category.color}`}>
                              {category.label}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingService(service);
                              setShowServiceModal(true);
                            }}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-all"
                          >
                            <Edit2 className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteService(service.id)}
                            className="p-2 hover:bg-red-100 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {service.description || 'Aucune description'}
                      </p>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Prix</span>
                          <span className="text-xl font-bold text-indigo-600">
                            {service.base_price}€
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Type</span>
                          <span className="text-sm font-medium text-gray-900">
                            {priceType?.label}
                          </span>
                        </div>

                        {service.billing_cycle && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Facturation</span>
                            <span className="text-sm font-medium text-gray-900">
                              {service.billing_cycle}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-sm text-gray-600">Statut</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            service.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {service.is_active ? 'Actif' : 'Inactif'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filteredServices.length === 0 && (
              <Card className="shadow-xl border-2 border-gray-200">
                <CardContent className="pt-12 pb-12 text-center">
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Aucun service trouvé
                  </h3>
                  <p className="text-gray-600">
                    Créez votre premier service pour commencer
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <div className="grid grid-cols-1 gap-4">
            {subscriptions.map(subscription => (
              <Card key={subscription.id} className="shadow-lg border-2 border-gray-200 hover:shadow-xl transition-all bg-white">
                <CardContent className="pt-6 pb-6">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <h3 className="text-2xl font-black text-gray-900 mb-3">
                        {subscription.subscription_name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <span className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
                          <Users className="w-5 h-5 text-blue-600" />
                          <span className="font-bold text-gray-900">{subscription.company_name}</span>
                        </span>
                        {subscription.service_name && (
                          <span className="flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-lg border border-purple-200">
                            <Package className="w-5 h-5 text-purple-600" />
                            <span className="font-bold text-gray-900">{subscription.service_name}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border-2 border-green-200">
                      <p className="text-xs font-bold text-green-700 mb-1 uppercase tracking-wide">💰 Prix</p>
                      <p className="text-2xl font-black text-green-600">
                        {subscription.price}€
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl border-2 border-blue-200">
                      <p className="text-xs font-bold text-blue-700 mb-1 uppercase tracking-wide">🔄 Cycle</p>
                      <p className="text-lg font-bold text-blue-900">
                        {subscription.billing_cycle}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border-2 border-purple-200">
                      <p className="text-xs font-bold text-purple-700 mb-1 uppercase tracking-wide">📅 Début</p>
                      <p className="text-sm font-bold text-purple-900">
                        {subscription.start_date ? new Date(subscription.start_date).toLocaleDateString('fr-FR') : 'N/A'}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-yellow-50 p-4 rounded-xl border-2 border-orange-200">
                      <p className="text-xs font-bold text-orange-700 mb-1 uppercase tracking-wide">✓ Statut</p>
                      <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-black ${
                        subscription.status === 'active'
                          ? 'bg-green-500 text-white'
                          : subscription.status === 'paused'
                          ? 'bg-yellow-500 text-white'
                          : 'bg-gray-400 text-white'
                      }`}>
                        {subscription.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {subscriptions.length === 0 && (
              <Card className="shadow-xl border-2 border-gray-200">
                <CardContent className="pt-12 pb-12 text-center">
                  <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Aucun abonnement
                  </h3>
                  <p className="text-gray-600">
                    Les abonnements clients apparaîtront ici
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Service Modal - TODO: Create separate component */}
      {showServiceModal && (
        <ServiceModal
          service={editingService}
          onSave={handleSaveService}
          onClose={() => {
            setShowServiceModal(false);
            setEditingService(null);
          }}
        />
      )}
    </div>
  );
}

// Service Modal Component
function ServiceModal({ service, onSave, onClose }) {
  const [formData, setFormData] = useState(service || {
    name: '',
    description: '',
    category: 'consulting',
    price_type: 'monthly',
    base_price: 0,
    billing_cycle: 'monthly',
    is_active: true,
    features: []
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await onSave(formData);
    } catch (error) {
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
          <CardTitle className="flex items-center justify-between">
            <span>{service ? 'Modifier le service' : 'Nouveau service'}</span>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nom du service *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Catégorie
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Type de prix
                </label>
                <select
                  value={formData.price_type}
                  onChange={(e) => setFormData({ ...formData, price_type: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  {PRICE_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Prix de base (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.base_price}
                  onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Cycle de facturation
                </label>
                <select
                  value={formData.billing_cycle}
                  onChange={(e) => setFormData({ ...formData, billing_cycle: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="once">Une fois</option>
                  <option value="monthly">Mensuel</option>
                  <option value="quarterly">Trimestriel</option>
                  <option value="yearly">Annuel</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <label htmlFor="is_active" className="text-sm font-semibold text-gray-700">
                Service actif
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Enregistrer
                  </>
                )}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
