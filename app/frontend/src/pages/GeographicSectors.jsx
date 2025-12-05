import { log, error, warn } from "../lib/logger.js";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  MapPin, Plus, Edit2, Trash2, Users, CheckCircle, XCircle,
  Save, X, UserPlus, UserMinus, Eye, RefreshCw, MapPinned
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function GeographicSectors() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [sectors, setSectors] = useState([]);
  const [sectorStats, setSectorStats] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedSector, setSelectedSector] = useState(null);
  const [reassigning, setReassigning] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    region: '',
    department: '',
    zone: 'Nord',
    postal_codes: '',
    cities: '',
    description: '',
    color: '#3B82F6'
  });

  const zones = ['Nord', 'Sud', 'Est', 'Ouest', 'Centre'];
  const colors = [
    { value: '#3B82F6', label: 'Bleu' },
    { value: '#EF4444', label: 'Rouge' },
    { value: '#10B981', label: 'Vert' },
    { value: '#F59E0B', label: 'Orange' },
    { value: '#8B5CF6', label: 'Violet' },
    { value: '#EC4899', label: 'Rose' }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Charger les secteurs
      const sectorsRes = await api.get('/geographic-sectors');
      setSectors(sectorsRes.data.sectors || []);

      // Charger les stats par secteur
      const statsRes = await api.get('/lead-sector-assignment/stats').catch(() => ({ data: { stats: [] } }));
      setSectorStats(statsRes.data.stats || []);

      // Charger les membres de l'équipe (commerciaux)
      const usersRes = await api.get('/users').catch(() => ({ data: { users: [] } }));
      const commercials = (usersRes.data.users || []).filter(
        u => u.role === 'user' || u.role === 'commercial' || u.role === 'manager'
      );
      setTeamMembers(commercials);

    } catch (error) {
      error('Erreur chargement données:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleReassignAll = async () => {
    setReassigning(true);

    const promise = api.post('/lead-sector-assignment/reassign-all')
      .then((response) => {
        fetchData();
        return response;
      })
      .finally(() => setReassigning(false));

    toast.promise(promise, {
      loading: 'Réassignation en cours (peut prendre du temps)...',
      success: (response) => `${response.data.count} leads réassignés avec succès !`,
      error: 'Erreur lors de la réassignation'
    });
  };

  const handleCreateSector = async (e) => {
    e.preventDefault();

    const payload = {
      ...formData,
      postal_codes: formData.postal_codes.split(',').map(c => c.trim()).filter(Boolean),
      cities: formData.cities.split(',').map(c => c.trim()).filter(Boolean)
    };

    const promise = api.post('/geographic-sectors', payload)
      .then(() => {
        setShowCreateModal(false);
        resetForm();
        fetchData();
      });

    toast.promise(promise, {
      loading: 'Création du secteur...',
      success: 'Secteur créé avec succès !',
      error: (err) => `Erreur création : ${err.response?.data?.error || err.message}`
    });
  };

  const handleUpdateSector = async (e) => {
    e.preventDefault();

    const payload = {
      ...formData,
      postal_codes: formData.postal_codes.split(',').map(c => c.trim()).filter(Boolean),
      cities: formData.cities.split(',').map(c => c.trim()).filter(Boolean)
    };

    const promise = api.put(`/geographic-sectors/${selectedSector.id}`, payload)
      .then(() => {
        setShowEditModal(false);
        resetForm();
        fetchData();
      });

    toast.promise(promise, {
      loading: 'Mise à jour...',
      success: 'Secteur mis à jour avec succès !',
      error: 'Erreur lors de la mise à jour'
    });
  };

  const handleDeleteSector = async (sectorId) => {
    const promise = api.delete(`/geographic-sectors/${sectorId}`)
      .then(() => fetchData());

    toast.promise(promise, {
      loading: 'Suppression...',
      success: 'Secteur supprimé avec succès !',
      error: (err) => `Erreur : ${err.response?.data?.error || err.message}`
    });
  };

  const handleAssignUser = async (userId) => {
    const promise = api.post(`/geographic-sectors/${selectedSector.id}/assign`, {
      user_id: userId,
      assignment_role: 'commercial',
      is_primary: false
    }).then(() => {
      setShowAssignModal(false);
      fetchData();
    });

    toast.promise(promise, {
      loading: 'Assignation...',
      success: 'Commercial assigné au secteur !',
      error: (err) => `Erreur : ${err.response?.data?.error || err.message}`
    });
  };

  const handleUnassignUser = async (userId) => {
    const promise = api.delete(`/geographic-sectors/${selectedSector.id}/assign/${userId}`)
      .then(() => fetchData());

    toast.promise(promise, {
      loading: 'Retrait...',
      success: 'Commercial retiré du secteur !',
      error: 'Erreur lors du retrait'
    });
  };

  const openEditModal = (sector) => {
    setSelectedSector(sector);
    setFormData({
      name: sector.name,
      code: sector.code,
      region: sector.region || '',
      department: sector.department || '',
      zone: sector.zone,
      postal_codes: (sector.postal_codes || []).join(', '),
      cities: (sector.cities || []).join(', '),
      description: sector.description || '',
      color: sector.color || '#3B82F6'
    });
    setShowEditModal(true);
  };

  const openAssignModal = async (sector) => {
    setSelectedSector(sector);

    // Charger les assignations de ce secteur
    try {
      const res = await api.get(`/geographic-sectors/${sector.id}`);
      setSelectedSector(res.data.sector);
    } catch (error) {
      error('Erreur chargement secteur:', error);
    }

    setShowAssignModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      region: '',
      department: '',
      zone: 'Nord',
      postal_codes: '',
      cities: '',
      description: '',
      color: '#3B82F6'
    });
    setSelectedSector(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Chargement des secteurs...</p>
        </div>
      </div>
    );
  }

  // Vérifier permissions
  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-900 mb-2">Accès Refusé</h2>
          <p className="text-red-700">Cette page est réservée aux administrateurs et managers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-3">
              <MapPin className="w-10 h-10 text-blue-600" />
              Secteurs Géographiques
            </h1>
            <p className="text-gray-600 mt-2">
              Gérez les secteurs et assignez vos commerciaux
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-6 py-3 bg-white/60 backdrop-blur-md border border-white/60 rounded-xl hover:bg-white/80 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <RefreshCw className="w-5 h-5" />
              <span className="font-medium">Actualiser</span>
            </button>
            <button
              onClick={handleReassignAll}
              disabled={reassigning}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MapPinned className="w-5 h-5" />
              <span className="font-medium">{reassigning ? 'Réassignation...' : 'Réassigner Leads'}</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Nouveau Secteur</span>
            </button>
          </div>
        </div>
      </div>

      {/* Liste des secteurs */}
      {sectors.length === 0 ? (
        <div className="bg-white/60 backdrop-blur-md border border-white/60 rounded-2xl p-12 text-center shadow-lg">
          <MapPinned className="w-20 h-20 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Aucun secteur défini</h3>
          <p className="text-gray-600 mb-6">Commencez par créer votre premier secteur géographique</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-medium"
          >
            Créer un secteur
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sectors.map((sector) => {
            const stats = sectorStats.find(s => s.id === sector.id) || {};

            return (
            <div
              key={sector.id}
              className="bg-white/60 backdrop-blur-md border border-white/60 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: sector.color }}
                  ></div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{sector.name}</h3>
                    <p className="text-sm text-gray-500">{sector.code}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  sector.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {sector.is_active ? 'Actif' : 'Inactif'}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-700">Zone: <strong>{sector.zone}</strong></span>
                </div>
                {sector.region && (
                  <p className="text-sm text-gray-600">Région: {sector.region}</p>
                )}
                {sector.department && (
                  <p className="text-sm text-gray-600">Département: {sector.department}</p>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-purple-600" />
                  <span className="text-gray-700">
                    <strong>{sector.assigned_count || 0}</strong> commercial(aux) assigné(s)
                  </span>
                </div>
              </div>

              {/* Stats Leads */}
              {stats.total_leads > 0 && (
                <div className="mb-4 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-600">Leads assignés</span>
                    <span className="text-xl font-bold text-blue-600">{stats.total_leads || 0}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-600">Actifs:</span>
                      <span className="ml-1 font-semibold text-green-600">{stats.active_leads || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Qualifiés:</span>
                      <span className="ml-1 font-semibold text-purple-600">{stats.qualified_leads || 0}</span>
                    </div>
                  </div>
                </div>
              )}

              {sector.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{sector.description}</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => openAssignModal(sector)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all text-sm font-medium"
                >
                  <Users className="w-4 h-4" />
                  Assigner
                </button>
                <button
                  onClick={() => openEditModal(sector)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteSector(sector.id)}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
          })}
        </div>
      )}

      {/* Modal Création */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Nouveau Secteur</h2>
                <button
                  onClick={() => { setShowCreateModal(false); resetForm(); }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateSector} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom du secteur *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Paris Nord"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: PARIS_NORD"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Zone *
                  </label>
                  <select
                    required
                    value={formData.zone}
                    onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {zones.map(zone => (
                      <option key={zone} value={zone}>{zone}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Couleur
                  </label>
                  <select
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {colors.map(color => (
                      <option key={color.value} value={color.value}>{color.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Région
                  </label>
                  <input
                    type="text"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Île-de-France"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Département
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Paris (75)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Codes postaux (séparés par des virgules)
                </label>
                <input
                  type="text"
                  value={formData.postal_codes}
                  onChange={(e) => setFormData({ ...formData, postal_codes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: 75017, 75018, 75019"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Villes (séparées par des virgules)
                </label>
                <input
                  type="text"
                  value={formData.cities}
                  onChange={(e) => setFormData({ ...formData, cities: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Paris 17e, Paris 18e, Paris 19e"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Description du secteur"
                ></textarea>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-medium"
                >
                  <Save className="w-5 h-5" />
                  Créer le secteur
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); resetForm(); }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-medium"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Édition - Similaire au modal de création */}
      {showEditModal && selectedSector && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Modifier Secteur</h2>
                <button
                  onClick={() => { setShowEditModal(false); resetForm(); }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateSector} className="p-6 space-y-4">
              {/* Même formulaire que la création */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nom du secteur *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Zone *</label>
                  <select
                    required
                    value={formData.zone}
                    onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {zones.map(zone => (
                      <option key={zone} value={zone}>{zone}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Région</label>
                  <input
                    type="text"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Département</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Codes postaux</label>
                <input
                  type="text"
                  value={formData.postal_codes}
                  onChange={(e) => setFormData({ ...formData, postal_codes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Villes</label>
                <input
                  type="text"
                  value={formData.cities}
                  onChange={(e) => setFormData({ ...formData, cities: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-medium"
                >
                  <Save className="w-5 h-5" />
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); resetForm(); }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-medium"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Assignation */}
      {showAssignModal && selectedSector && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  Gérer les assignations - {selectedSector.name}
                </h2>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Commerciaux déjà assignés */}
              <div className="mb-6">
                <h3 className="font-bold text-gray-900 mb-3">Commerciaux assignés ({selectedSector.assignments?.length || 0})</h3>
                {selectedSector.assignments && selectedSector.assignments.length > 0 ? (
                  <div className="space-y-2">
                    {selectedSector.assignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between bg-gray-50 rounded-lg p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                            {assignment.first_name?.[0]}{assignment.last_name?.[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {assignment.first_name} {assignment.last_name}
                            </p>
                            <p className="text-sm text-gray-500">{assignment.email}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleUnassignUser(assignment.user_id)}
                          className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all text-sm font-medium"
                        >
                          <UserMinus className="w-4 h-4" />
                          Retirer
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Aucun commercial assigné</p>
                )}
              </div>

              {/* Commerciaux disponibles */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3">Ajouter un commercial</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {teamMembers
                    .filter(member => {
                      // Exclure ceux déjà assignés
                      return !selectedSector.assignments?.some(a => a.user_id === member.id);
                    })
                    .map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold">
                            {member.first_name?.[0]}{member.last_name?.[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {member.first_name} {member.last_name}
                            </p>
                            <p className="text-sm text-gray-500">{member.email}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAssignUser(member.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all text-sm font-medium"
                        >
                          <UserPlus className="w-4 h-4" />
                          Assigner
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer TRINEXTA */}
      <div className="mt-8 text-center">
        <div className="inline-block bg-white/60 backdrop-blur-md border border-white/60 rounded-xl px-6 py-3 shadow-lg">
          <p className="text-sm text-gray-600">
            Propulsé par{' '}
            <span className="font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              TRINEXTA
            </span>
            {' '}• TrusTech IT Support
          </p>
        </div>
      </div>
    </div>
  );
}
