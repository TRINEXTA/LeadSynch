<<<<<<< HEAD
import { log, error, warn } from "./../lib/logger.js";
=======
import { log, error, warn } from "../lib/logger.js";
>>>>>>> origin/main
﻿import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Users as UsersIcon, Plus, Edit2, Trash2, Shield, User, Crown, Mail, Phone, Calendar, Search, Filter, X, AlertCircle, Lock, Unlock, Key } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

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
    team_id: ''
  });

  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager';

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
    } catch (error) {
      error('❌ Erreur users:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const loadTeams = async () => {
    try {
      const response = await api.get('/teams');
      setTeams(response.data.teams || []);
    } catch (error) {
      error('❌ Erreur teams:', error);
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
      if (editingUser) {
        // ✅ CORRECTION : Mise à jour utilisateur
        await api.put(`/users/${editingUser.id}`, {
          first_name: formData.first_name,
          last_name: formData.last_name,
          role: formData.role,
          phone: formData.phone,
          team_id: formData.team_id || null
        });
        toast.success('Utilisateur modifié avec succès !');
      } else {
        // Création
        await api.post('/users', formData);
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
        team_id: ''
      });
      loadUsers();
    } catch (error) {
      error('❌ Erreur:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la sauvegarde');
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
      team_id: user.team_id || ''
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
                  team_id: ''
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
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
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