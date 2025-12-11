import { log, error as logError, warn } from "../lib/logger.js";
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Users as UsersIcon, Plus, Edit2, Trash2, Shield, User, Crown, Mail, Phone, Calendar, Search, Filter, X, AlertCircle, Lock, Unlock, Key, Settings, Check } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  PERMISSIONS,
  PERMISSION_LABELS,
  PERMISSION_CATEGORIES,
  DEFAULT_MANAGER_PERMISSIONS,
  HIERARCHICAL_LEVELS,
  HIERARCHY_CONFIG,
  HIERARCHY_DEFAULT_PERMISSIONS,
  COMMISSION_TYPES,
  COMMISSION_TYPE_LABELS,
  getHierarchyLabel,
  getHierarchyConfig
} from '../lib/permissions';

const ROLES = [
  { value: 'admin', label: 'Administrateur', color: 'bg-red-100 text-red-700', icon: Shield },
  { value: 'manager', label: 'Manager', color: 'bg-purple-100 text-purple-700', icon: Crown },
  { value: 'commercial', label: 'Commercial', color: 'bg-blue-100 text-blue-700', icon: User },
  { value: 'user', label: 'Utilisateur', color: 'bg-green-100 text-green-700', icon: User }
];

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: 'commercial',
    phone: '',
    team_id: '',
    permissions: { ...DEFAULT_MANAGER_PERMISSIONS },
    // Nouveaux champs hiérarchie et commissions
    hierarchical_level: '',
    commission_rate: 0,
    team_commission_rate: 0,
    commission_type: 'percentage',
    base_salary: ''
  });

  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager';
  const isSuperAdmin = currentUser?.is_super_admin === true;

  useEffect(() => {
    loadUsers();
    loadTeams();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users');
      log('👥 Users chargés:', response.data.users);
      setUsers(response.data.users || []);
    } catch (err) {
      logError('❌ Erreur users:', err);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const loadTeams = async () => {
    try {
      const response = await api.get('/teams');
      setTeams(response.data.teams || []);
    } catch (err) {
      logError('❌ Erreur teams:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.email || !formData.first_name || !formData.last_name) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      // Préparer les données avec permissions si manager
      const dataToSend = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        role: formData.role,
        phone: formData.phone,
        team_id: formData.team_id || null
      };

      // Ajouter les permissions pour les managers
      if (formData.role === 'manager') {
        dataToSend.permissions = formData.permissions || DEFAULT_MANAGER_PERMISSIONS;
        // Ajouter le niveau hiérarchique si défini
        if (formData.hierarchical_level) {
          dataToSend.hierarchical_level = formData.hierarchical_level;
        }
      }

      // Ajouter les données de commission (pour managers et commerciaux)
      if (['manager', 'commercial'].includes(formData.role)) {
        dataToSend.commission_rate = parseFloat(formData.commission_rate) || 0;
        dataToSend.team_commission_rate = parseFloat(formData.team_commission_rate) || 0;
        dataToSend.commission_type = formData.commission_type || 'percentage';
        if (formData.base_salary) {
          dataToSend.base_salary = parseFloat(formData.base_salary);
        }
      }

      if (editingUser) {
        // Mise à jour utilisateur
        await api.put(`/users/${editingUser.id}`, dataToSend);
        toast.success('Utilisateur modifié avec succès !');
      } else {
        // Création - ajouter l'email
        await api.post('/users', { ...dataToSend, email: formData.email });
        toast.success('Utilisateur créé avec succès ! Un email avec le mot de passe temporaire a été envoyé.');
      }

      setShowModal(false);
      setEditingUser(null);
      setFormData({
        email: '',
        first_name: '',
        last_name: '',
        role: 'commercial',
        phone: '',
        team_id: '',
        permissions: { ...DEFAULT_MANAGER_PERMISSIONS },
        hierarchical_level: '',
        commission_rate: 0,
        team_commission_rate: 0,
        commission_type: 'percentage',
        base_salary: ''
      });
      loadUsers();
    } catch (err) {
      logError('❌ Erreur:', err);
      toast.error(err.response?.data?.error || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (userId) => {
    const promise = api.delete(`/users/${userId}`).then(() => loadUsers());

    toast.promise(promise, {
      loading: 'Suppression en cours...',
      success: 'Utilisateur supprimé avec succès',
      error: 'Erreur lors de la suppression'
    });
  };

  const handleBlockUser = async (userId) => {
    const promise = api.patch(`/users/${userId}/block`).then(() => loadUsers());

    toast.promise(promise, {
      loading: 'Blocage en cours...',
      success: 'Utilisateur bloqué avec succès',
      error: (err) => err.response?.data?.error || 'Erreur lors du blocage'
    });
  };

  const handleUnblockUser = async (userId) => {
    const promise = api.patch(`/users/${userId}/unblock`).then(() => loadUsers());

    toast.promise(promise, {
      loading: 'Déblocage en cours...',
      success: 'Utilisateur débloqué avec succès',
      error: (err) => err.response?.data?.error || 'Erreur lors du déblocage'
    });
  };

  const handleForcePasswordChange = async (userId) => {
    const promise = api.patch(`/users/${userId}/force-password-change`).then(() => loadUsers());

    toast.promise(promise, {
      loading: 'Traitement en cours...',
      success: 'Changement de mot de passe forcé avec succès',
      error: (err) => err.response?.data?.error || 'Erreur lors de l\'opération'
    });
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      phone: user.phone || '',
      team_id: user.team_id || '',
      // Charger les permissions existantes ou les permissions par défaut
      permissions: user.permissions || { ...DEFAULT_MANAGER_PERMISSIONS },
      // Charger les données de hiérarchie et commission
      hierarchical_level: user.hierarchical_level || '',
      commission_rate: user.commission_rate || 0,
      team_commission_rate: user.team_commission_rate || 0,
      commission_type: user.commission_type || 'percentage',
      base_salary: user.base_salary || ''
    });
    setShowModal(true);
  };

  const getFilteredUsers = () => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(u => 
        u.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterRole !== 'all') {
      filtered = filtered.filter(u => u.role === filterRole);
    }

    return filtered;
  };

  const getRoleConfig = (role) => {
    return ROLES.find(r => r.value === role) || ROLES[2];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Jamais';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredUsers = getFilteredUsers();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Chargement des utilisateurs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                <UsersIcon className="w-6 h-6 text-white" />
              </div>
              Gestion des Utilisateurs
            </h1>
            <p className="text-gray-600 ml-15">Gérez les accès et permissions de votre équipe</p>
          </div>
          {(isAdmin || isManager) && (
            <button
              onClick={() => {
                setEditingUser(null);
                setFormData({
                  email: '',
                  first_name: '',
                  last_name: '',
                  role: 'commercial',
                  phone: '',
                  team_id: '',
                  permissions: { ...DEFAULT_MANAGER_PERMISSIONS },
                  hierarchical_level: '',
                  commission_rate: 0,
                  team_commission_rate: 0,
                  commission_type: 'percentage',
                  base_salary: ''
                });
                setShowModal(true);
              }}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Nouvel utilisateur
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-lg border-2 border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Total</p>
          <p className="text-3xl font-bold text-gray-900">{users.length}</p>
        </div>
        {ROLES.map(role => (
          <div key={role.value} className="bg-white rounded-xl p-4 shadow-lg border-2 border-gray-200">
            <p className="text-sm text-gray-600 mb-1">{role.label}s</p>
            <p className="text-3xl font-bold text-gray-900">
              {users.filter(u => u.role === role.value).length}
            </p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par nom ou email..."
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none"
            />
          </div>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none bg-white"
          >
            <option value="all">👥 Tous les rôles</option>
            {ROLES.map(role => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>

          <button
            onClick={() => {
              setSearchTerm('');
              setFilterRole('all');
            }}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Liste utilisateurs */}
      {filteredUsers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <UsersIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Aucun utilisateur trouvé</h3>
          <p className="text-gray-500 mb-6">
            {users.length === 0 ? 'Commencez par créer votre premier utilisateur' : 'Aucun utilisateur ne correspond aux filtres'}
          </p>
          {(isAdmin || isManager) && users.length === 0 && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-700"
            >
              Créer le premier utilisateur
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Utilisateur</th>
                <th className="px-6 py-4 text-left font-semibold">Email</th>
                <th className="px-6 py-4 text-left font-semibold">Téléphone</th>
                <th className="px-6 py-4 text-left font-semibold">Rôle</th>
                <th className="px-6 py-4 text-left font-semibold">Dernière connexion</th>
                <th className="px-6 py-4 text-left font-semibold">Statut</th>
                {(isAdmin || isManager) && (
                  <th className="px-6 py-4 text-center font-semibold">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => {
                const roleConfig = getRoleConfig(user.role);
                const RoleIcon = roleConfig.icon;

                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold">
                          {user.first_name?.[0]}{user.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {user.first_name} {user.last_name}
                          </p>
                          {user.tenant_name && (
                            <p className="text-xs text-gray-500">{user.tenant_name}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Mail className="w-4 h-4 text-gray-400" />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {user.phone || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`${roleConfig.color} px-3 py-1 rounded-full text-sm font-semibold inline-flex items-center gap-1`}>
                        <RoleIcon className="w-4 h-4" />
                        {roleConfig.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {formatDate(user.last_login)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.is_active ? (
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                          🟢 Actif
                        </span>
                      ) : (
                        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold">
                          🔴 Inactif
                        </span>
                      )}
                    </td>
                    {(isAdmin || isManager) && (
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all"
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Bloquer/Débloquer */}
                          {isAdmin && user.id !== currentUser.id && (
                            <>
                              {user.is_active ? (
                                <button
                                  onClick={() => handleBlockUser(user.id)}
                                  className="p-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-all"
                                  title="Bloquer l'utilisateur"
                                >
                                  <Lock className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUnblockUser(user.id)}
                                  className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all"
                                  title="Débloquer l'utilisateur"
                                >
                                  <Unlock className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}

                          {/* Forcer changement de mot de passe */}
                          {(isAdmin || isManager) && user.id !== currentUser.id && (
                            <button
                              onClick={() => handleForcePasswordChange(user.id)}
                              className="p-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-all"
                              title="Forcer le changement de mot de passe"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                          )}

                          {/* Supprimer */}
                          {isAdmin && user.id !== currentUser.id && (
                            <button
                              onClick={() => handleDelete(user.id)}
                              className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Création/Modification */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-t-2xl flex items-center justify-between sticky top-0 z-10">
              <h2 className="text-2xl font-bold">
                {editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingUser(null);
                }}
                className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Email - désactivé en édition */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email * {editingUser && <span className="text-gray-500 text-xs">(non modifiable)</span>}
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  disabled={!!editingUser}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none disabled:bg-gray-100"
                  placeholder="email@exemple.com"
                />
              </div>

              {/* Prénom */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Prénom *</label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                  placeholder="Jean"
                />
              </div>

              {/* Nom */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nom *</label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                  placeholder="Dupont"
                />
              </div>

              {/* Rôle - ✅ MODIFIABLE */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Rôle *</label>
                <select
                  value={formData.role}
                  onChange={(e) => {
                    const newRole = e.target.value;
                    setFormData({
                      ...formData,
                      role: newRole,
                      // Reset permissions quand on change de rôle
                      permissions: newRole === 'manager' ? { ...DEFAULT_MANAGER_PERMISSIONS } : {}
                    });
                  }}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none bg-white"
                >
                  {ROLES.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {editingUser ? '✅ Vous pouvez modifier le rôle de cet utilisateur' : 'Sélectionnez le niveau d\'accès'}
                </p>
              </div>

              {/* Téléphone */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Téléphone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                  placeholder="+33 6 12 34 56 78"
                />
              </div>

              {/* Équipe */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Équipe</label>
                <select
                  value={formData.team_id}
                  onChange={(e) => setFormData({...formData, team_id: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none bg-white"
                >
                  <option value="">Aucune équipe</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>

              {/* Niveau hiérarchique - Visible seulement pour les managers */}
              {formData.role === 'manager' && (isAdmin || isSuperAdmin) && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Niveau hiérarchique
                  </label>
                  <select
                    value={formData.hierarchical_level}
                    onChange={(e) => {
                      const level = e.target.value;
                      setFormData({
                        ...formData,
                        hierarchical_level: level,
                        // Appliquer les permissions par défaut du niveau si sélectionné
                        permissions: level && HIERARCHY_DEFAULT_PERMISSIONS[level]
                          ? { ...HIERARCHY_DEFAULT_PERMISSIONS[level] }
                          : { ...DEFAULT_MANAGER_PERMISSIONS }
                      });
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none bg-white"
                  >
                    <option value="">Manager standard</option>
                    {Object.entries(HIERARCHY_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </select>
                  {formData.hierarchical_level && (
                    <p className="text-xs text-gray-500 mt-1">
                      {HIERARCHY_CONFIG[formData.hierarchical_level]?.description}
                    </p>
                  )}
                </div>
              )}

              {/* Section Commission - Visible pour managers et commerciaux */}
              {['manager', 'commercial'].includes(formData.role) && (isAdmin || isSuperAdmin) && (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Settings className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-bold text-green-900">Rémunération & Commission</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Type de commission */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Type de commission
                      </label>
                      <select
                        value={formData.commission_type}
                        onChange={(e) => setFormData({...formData, commission_type: e.target.value})}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none bg-white text-sm"
                      >
                        {Object.entries(COMMISSION_TYPE_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Taux de commission personnel */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Commission personnelle (%)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        value={formData.commission_rate}
                        onChange={(e) => setFormData({...formData, commission_rate: e.target.value})}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none text-sm"
                        placeholder="0"
                      />
                    </div>

                    {/* Taux sur équipe - seulement pour managers */}
                    {formData.role === 'manager' && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Commission équipe (%)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="100"
                          value={formData.team_commission_rate}
                          onChange={(e) => setFormData({...formData, team_commission_rate: e.target.value})}
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none text-sm"
                          placeholder="0"
                        />
                        <p className="text-xs text-gray-500 mt-1">% sur les ventes de son équipe</p>
                      </div>
                    )}

                    {/* Salaire fixe */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Salaire fixe (€)
                      </label>
                      <input
                        type="number"
                        step="100"
                        min="0"
                        value={formData.base_salary}
                        onChange={(e) => setFormData({...formData, base_salary: e.target.value})}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none text-sm"
                        placeholder="Optionnel"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Section Permissions - Visible seulement pour les managers */}
              {formData.role === 'manager' && (isAdmin || isSuperAdmin) && (
                <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Settings className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-bold text-purple-900">Permissions du Manager</h3>
                  </div>
                  <p className="text-sm text-purple-700 mb-4">
                    Par défaut, les managers ont des accès restreints. Activez les permissions supplémentaires ci-dessous.
                  </p>

                  <div className="space-y-4">
                    {Object.entries(PERMISSION_CATEGORIES).map(([catKey, category]) => (
                      <div key={catKey} className="bg-white rounded-lg p-3 border border-purple-100">
                        <h4 className="font-semibold text-gray-800 mb-2 text-sm">{category.title}</h4>
                        <div className="space-y-2">
                          {category.permissions.map(perm => (
                            <label key={perm} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                              <div className="relative">
                                <input
                                  type="checkbox"
                                  checked={formData.permissions?.[perm] === true}
                                  onChange={(e) => {
                                    setFormData({
                                      ...formData,
                                      permissions: {
                                        ...formData.permissions,
                                        [perm]: e.target.checked
                                      }
                                    });
                                  }}
                                  className="sr-only"
                                />
                                <div className={`w-10 h-6 rounded-full transition-colors ${
                                  formData.permissions?.[perm] ? 'bg-purple-600' : 'bg-gray-300'
                                }`}>
                                  <div className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform mt-1 ${
                                    formData.permissions?.[perm] ? 'translate-x-5' : 'translate-x-1'
                                  }`} />
                                </div>
                              </div>
                              <span className="text-sm text-gray-700">{PERMISSION_LABELS[perm]}</span>
                              {formData.permissions?.[perm] && (
                                <Check className="w-4 h-4 text-green-600 ml-auto" />
                              )}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Boutons actions rapides */}
                  <div className="flex gap-2 mt-4 pt-3 border-t border-purple-200">
                    <button
                      type="button"
                      onClick={() => {
                        const allEnabled = {};
                        Object.values(PERMISSIONS).forEach(p => allEnabled[p] = true);
                        setFormData({ ...formData, permissions: allEnabled });
                      }}
                      className="flex-1 px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 font-medium"
                    >
                      Tout activer
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, permissions: { ...DEFAULT_MANAGER_PERMISSIONS } })}
                      className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 font-medium"
                    >
                      Tout désactiver
                    </button>
                  </div>
                </div>
              )}

              {/* Info mot de passe */}
              {!editingUser && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-blue-900 mb-1">
                        Mot de passe automatique
                      </p>
                      <p className="text-sm text-blue-700">
                        Un mot de passe temporaire sera généré et envoyé par email à l'utilisateur.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Boutons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingUser(null);
                  }}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg"
                >
                  {editingUser ? 'Modifier' : 'Créer l\'utilisateur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}