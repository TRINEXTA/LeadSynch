import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, UserPlus, Crown } from 'lucide-react';
import api from '../api/axios';

export default function ManageTeam() {
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
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
      console.error('Erreur teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Erreur users:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTeam) {
        await api.put(`/teams/${editingTeam.id}`, formData);
        alert('Equipe modifiee !');
      } else {
        await api.post('/teams', formData);
        alert('Equipe creee !');
      }
      setShowModal(false);
      setEditingTeam(null);
      setFormData({ name: '', description: '', manager_id: '' });
      loadTeams();
    } catch (error) {
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (teamId) => {
    if (!confirm('Supprimer cette equipe ?')) return;
    try {
      await api.delete(`/teams/${teamId}`);
      alert('Equipe supprimee !');
      loadTeams();
    } catch (error) {
      alert('Erreur');
    }
  };

  const colors = ['from-blue-500 to-blue-700', 'from-green-500 to-green-700', 'from-purple-500 to-purple-700'];

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
              <div className="flex gap-2">
                <button onClick={() => { setEditingTeam(team); setFormData({ name: team.name, description: team.description || '', manager_id: team.manager_id || '' }); setShowModal(true); }} className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(team.id)} className="px-3 py-2 bg-red-100 text-red-700 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full">
            <h2 className="text-2xl font-bold mb-6">{editingTeam ? 'Modifier' : 'Nouvelle'} Equipe</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold mb-2">Nom *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required className="w-full px-4 py-3 border-2 rounded-xl" />
              </div>
              <div>
                <label className="block font-semibold mb-2">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={3} className="w-full px-4 py-3 border-2 rounded-xl" />
              </div>
              <div>
                <label className="block font-semibold mb-2">Manager</label>
                <select value={formData.manager_id} onChange={(e) => setFormData({...formData, manager_id: e.target.value})} className="w-full px-4 py-3 border-2 rounded-xl">
                  <option value="">Aucun</option>
                  {users.map(user => <option key={user.id} value={user.id}>{user.first_name} {user.last_name}</option>)}
                </select>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 bg-gray-200 rounded-xl">Annuler</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl">{editingTeam ? 'Modifier' : 'Creer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
