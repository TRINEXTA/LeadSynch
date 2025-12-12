import { log, error, warn } from "../lib/logger.js";
import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, UserPlus, Crown, X, UserMinus, Shield, AlertTriangle } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function ManageTeam() {
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [editingTeam, setEditingTeam] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    manager_id: ''
  });

  useEffect(() => {
    loadTeams();
    loadUsers();
  }, []);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const response = await api.get('/teams');
      setTeams(response.data.teams || []);
    } catch (error) {
      error('Erreur teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data.users || []);
    } catch (error) {
      error('Erreur users:', error);
    }
  };

  const loadTeamMembers = async (teamId) => {
    try {
      const response = await api.get(`/teams/${teamId}/members`);
      setTeamMembers(response.data.members || []);
    } catch (error) {
      error('Erreur chargement membres:', error);
      setTeamMembers([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let promise;
    let successMessage;

    if (editingTeam) {
      promise = api.put(`/teams/${editingTeam.id}`, formData);
      successMessage = 'Équipe modifiée avec succès !';
    } else {
      promise = api.post('/teams', formData);
      successMessage = 'Équipe créée avec succès !';
    }

    promise = promise.then(() => {
      setShowModal(false);
      setEditingTeam(null);
      setFormData({ name: '', description: '', manager_id: '' });
      loadTeams();
    });

    toast.promise(promise, {
      loading: editingTeam ? 'Modification...' : 'Création...',
      success: successMessage,
      error: 'Erreur lors de la sauvegarde'
    });
  };

  const handleDelete = async (teamId) => {
    const promise = api.delete(`/teams/${teamId}`)
      .then(() => loadTeams());

    toast.promise(promise, {
      loading: 'Suppression...',
      success: 'Équipe supprimée avec succès !',
      error: 'Erreur lors de la suppression'
    });
  };

  const openMembersModal = async (team) => {
    setSelectedTeam(team);
    await loadTeamMembers(team.id);
    setShowMembersModal(true);
  };

  const handleAddMember = async (userId) => {
    const promise = api.post(`/teams/${selectedTeam.id}/members`, { user_id: userId })
      .then(async () => {
        await loadTeamMembers(selectedTeam.id);
        await loadTeams();
      });

    toast.promise(promise, {
      loading: 'Ajout...',
      success: 'Membre ajouté à l\'équipe !',
      error: (err) => err.response?.data?.message || 'Erreur lors de l\'ajout'
    });
  };

  const handleRemoveMember = async (userId) => {
    const promise = api.delete(`/teams/${selectedTeam.id}/members/${userId}`)
      .then(async () => {
        await loadTeamMembers(selectedTeam.id);
        await loadTeams();
      });

    toast.promise(promise, {
      loading: 'Retrait...',
      success: 'Membre retiré de l\'équipe !',
      error: 'Erreur lors du retrait'
    });
  };

  const colors = ['from-blue-500 to-blue-700', 'from-green-500 to-green-700', 'from-purple-500 to-purple-700'];

  const availableUsers = users.filter(
    user => !teamMembers.find(member => member.id === user.id)
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="w-8 h-8 text-purple-600" />
            Gestion des Equipes
          </h1>
          <p className="text-gray-600 mt-2">Organisez vos commerciaux en equipes</p>
        </div>
        <button
          onClick={() => {
            setEditingTeam(null);
            setFormData({ name: '', description: '', manager_id: '' });
            setShowModal(true);
          }}
          className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nouvelle Equipe
        </button>
      </div>

      {/* Info Banner */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900">Assignation automatique des managers</h3>
            <p className="text-sm text-blue-700 mt-1">
              Lorsqu'un utilisateur est ajouté à une équipe, il est automatiquement assigné au manager de cette équipe.
              Cela permet au manager de voir les événements de son équipe dans le planning.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Chargement...</div>
      ) : teams.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Aucune equipe</p>
          <button onClick={() => setShowModal(true)} className="px-6 py-3 bg-purple-600 text-white rounded-lg">
            Creer la premiere equipe
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team, index) => (
            <div key={team.id} className="bg-white rounded-xl shadow-md p-6 border-2 border-gray-200">
              <div className={`inline-block px-4 py-2 rounded-full bg-gradient-to-r ${colors[index % colors.length]} text-white font-bold mb-4`}>
                {team.members_count || 0} membres
              </div>
              <h3 className="text-xl font-bold mb-2">{team.name}</h3>
              {team.description && <p className="text-sm text-gray-600 mb-4">{team.description}</p>}
              {team.manager_name && (
                <div className="flex items-center gap-2 mb-4 text-sm text-purple-700 bg-purple-50 px-3 py-2 rounded-lg">
                  <Crown className="w-4 h-4" />
                  {team.manager_name}
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => openMembersModal(team)}
                  className="flex-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all font-semibold text-sm flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Membres
                </button>
                <button
                  onClick={() => {
                    setEditingTeam(team);
                    setFormData({
                      name: team.name,
                      description: team.description || '',
                      manager_id: team.manager_id || ''
                    });
                    setShowModal(true);
                  }}
                  className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(team.id)}
                  className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Créer/Modifier Equipe */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full">
            <h2 className="text-2xl font-bold mb-6">{editingTeam ? 'Modifier' : 'Nouvelle'} Equipe</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold mb-2">Nom *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  className="w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block font-semibold mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block font-semibold mb-2">Manager</label>
                <select
                  value={formData.manager_id}
                  onChange={(e) => setFormData({...formData, manager_id: e.target.value})}
                  className="w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Aucun</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 rounded-xl hover:bg-gray-300 transition-all font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all font-semibold"
                >
                  {editingTeam ? 'Modifier' : 'Creer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gestion des Membres */}
      {showMembersModal && selectedTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                Membres de {selectedTeam.name}
              </h2>
              <button
                onClick={() => setShowMembersModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Membres actuels */}
            <div className="mb-6">
              <h3 className="font-bold text-lg mb-3">Membres actuels ({teamMembers.length})</h3>
              {teamMembers.length === 0 ? (
                <p className="text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
                  Aucun membre dans cette équipe
                </p>
              ) : (
                <div className="space-y-2">
                  {teamMembers.map(member => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2 border-gray-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                          {member.first_name?.[0]}{member.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-semibold">
                            {member.first_name} {member.last_name}
                          </p>
                          <p className="text-sm text-gray-600">{member.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all flex items-center gap-2"
                      >
                        <UserMinus className="w-4 h-4" />
                        Retirer
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ajouter des membres */}
            <div>
              <h3 className="font-bold text-lg mb-3">Ajouter des membres</h3>
              {availableUsers.length === 0 ? (
                <p className="text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
                  Tous les utilisateurs sont déjà membres
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {availableUsers.map(user => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-green-300 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
                          {user.first_name?.[0]}{user.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-semibold">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddMember(user.id)}
                        className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all flex items-center gap-2 font-semibold"
                      >
                        <UserPlus className="w-4 h-4" />
                        Ajouter
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
