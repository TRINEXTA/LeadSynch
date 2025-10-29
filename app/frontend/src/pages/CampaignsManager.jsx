import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Users, Phone, Mail, Target, TrendingUp, 
  Edit, Trash2, Play, Pause, BarChart3, Calendar
} from 'lucide-react';

export default function CampaignsManager() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [databases, setDatabases] = useState([]);
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    campaign_type: 'phone',
    track_clicks: false,
    database_id: '',
    assigned_users: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const [campaignsRes, databasesRes, usersRes] = await Promise.all([
        fetch('http://localhost:3000/api/campaigns-full', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:3000/api/lead-databases', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:3000/api/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const campaignsData = await campaignsRes.json();
      const databasesData = await databasesRes.json();
      const usersData = await usersRes.json();

      if (campaignsData.success) setCampaigns(campaignsData.campaigns);
      if (databasesData.success) setDatabases(databasesData.databases.filter(db => !db.archived));
      if (usersData.success) setUsers(usersData.users);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    
    if (!formData.name || formData.assigned_users.length === 0) {
      alert('❌ Nom et commerciaux requis');
      return;
    }

    try {
      const url = editingCampaign 
        ? `http://localhost:3000/api/campaigns-full/${editingCampaign}`
        : 'http://localhost:3000/api/campaigns-full';
      
      const method = editingCampaign ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        alert(editingCampaign ? '✅ Campagne modifiée !' : '✅ Campagne créée !');
        setShowModal(false);
        setEditingCampaign(null);
        setFormData({
          name: '',
          description: '',
          campaign_type: 'phone',
          track_clicks: false,
          database_id: '',
          assigned_users: []
        });
        fetchData();
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('❌ Erreur lors de l\'opération');
    }
  };

  const handleEditCampaign = (campaign) => {
    let assignedUsersList = [];
    
    try {
      if (campaign.assigned_users) {
        assignedUsersList = typeof campaign.assigned_users === 'string' 
          ? JSON.parse(campaign.assigned_users)
          : campaign.assigned_users;
      }
    } catch (error) {
      console.error('Erreur parsing assigned_users:', error);
      assignedUsersList = [];
    }

    setFormData({
      name: campaign.name,
      description: campaign.description || '',
      campaign_type: campaign.campaign_type,
      track_clicks: campaign.track_clicks || false,
      database_id: '',
      assigned_users: Array.isArray(assignedUsersList) ? assignedUsersList : []
    });
    setEditingCampaign(campaign.id);
    setShowModal(true);
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (!confirm('⚠️ Supprimer définitivement cette campagne et toutes ses données ?')) return;
    if (!confirm('Cette action est irréversible. Continuer ?')) return;

    try {
      const response = await fetch(`http://localhost:3000/api/campaigns-full/${campaignId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        alert('✅ Campagne supprimée !');
        fetchData();
      } else {
        alert('❌ Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('❌ Erreur lors de la suppression');
    }
  };

  const toggleUser = (userId) => {
    setFormData(prev => ({
      ...prev,
      assigned_users: prev.assigned_users.includes(userId)
        ? prev.assigned_users.filter(id => id !== userId)
        : [...prev.assigned_users, userId]
    }));
  };

  const openPipeline = (campaignId) => {
    navigate(`/Pipeline?campaign_id=${campaignId}`);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCampaign(null);
    setFormData({
      name: '',
      description: '',
      campaign_type: 'phone',
      track_clicks: false,
      database_id: '',
      assigned_users: []
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Chargement des campagnes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campagnes</h1>
          <p className="text-gray-600 mt-1">{campaigns.length} campagne(s) active(s)</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all"
        >
          <Plus className="w-5 h-5" />
          Nouvelle Campagne
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map(campaign => (
          <div 
            key={campaign.id} 
            className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all border border-gray-100 overflow-hidden"
          >
            <div className={`p-4 ${
              campaign.campaign_type === 'phone' 
                ? 'bg-gradient-to-r from-blue-50 to-blue-100' 
                : 'bg-gradient-to-r from-green-50 to-green-100'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {campaign.campaign_type === 'phone' ? (
                      <Phone className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Mail className="w-5 h-5 text-green-600" />
                    )}
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                      campaign.campaign_type === 'phone'
                        ? 'bg-blue-600 text-white'
                        : 'bg-green-600 text-white'
                    }`}>
                      {campaign.campaign_type === 'phone' ? 'PHONING' : 'EMAIL'}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 leading-tight">{campaign.name}</h3>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{campaign.description || 'Aucune description'}</p>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-4 h-4 text-blue-600" />
                    <span className="text-xs text-gray-600">Leads</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{campaign.total_leads_assigned || 0}</p>
                </div>

                <div className="bg-green-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-gray-600">RDV</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{campaign.total_meetings || 0}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">{campaign.total_calls_made || 0} appels</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">{campaign.assigned_users_count || 0} commerciaux</span>
                </div>
              </div>

              {campaign.total_calls_made > 0 && (
                <div className="pt-2">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Taux conversion</span>
                    <span className="font-bold text-purple-600">
                      {((campaign.total_meetings / campaign.total_calls_made) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(((campaign.total_meetings / campaign.total_calls_made) * 100), 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openPipeline(campaign.id);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <Play className="w-4 h-4" />
                Pipeline
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditCampaign(campaign);
                }}
                className="px-3 py-2.5 border border-gray-300 hover:bg-gray-100 rounded-lg transition-colors"
                title="Modifier"
              >
                <Edit className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteCampaign(campaign.id);
                }}
                className="px-3 py-2.5 border border-red-300 hover:bg-red-50 rounded-lg transition-colors"
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {campaigns.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl shadow">
          <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Aucune campagne</h3>
          <p className="text-gray-600 mb-6">Créez votre première campagne pour commencer la prospection</p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            <Plus className="w-5 h-5" />
            Créer une campagne
          </button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">
              {editingCampaign ? 'Modifier la campagne' : 'Nouvelle Campagne'}
            </h2>

            <form onSubmit={handleCreateCampaign} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Nom de la campagne *
                </label>
                <input
                  type="text"
                  required
                  className="w-full border-2 border-gray-300 focus:border-blue-500 rounded-lg px-4 py-3 outline-none transition-colors"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Ex: Campagne Q4 - Comptables Paris"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Description</label>
                <textarea
                  className="w-full border-2 border-gray-300 focus:border-blue-500 rounded-lg px-4 py-3 outline-none transition-colors"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Description de la campagne..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Type de campagne</label>
                <select
                  className="w-full border-2 border-gray-300 focus:border-blue-500 rounded-lg px-4 py-3 outline-none transition-colors"
                  value={formData.campaign_type}
                  onChange={(e) => setFormData({...formData, campaign_type: e.target.value})}
                >
                  <option value="phone">📞 Phoning (Appels à froid)</option>
                  <option value="email">📧 Email Marketing</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Base de données (optionnel)
                </label>
                <select
                  className="w-full border-2 border-gray-300 focus:border-blue-500 rounded-lg px-4 py-3 outline-none transition-colors"
                  value={formData.database_id}
                  onChange={(e) => setFormData({...formData, database_id: e.target.value})}
                >
                  <option value="">-- Aucune (ajouter leads plus tard) --</option>
                  {databases.map(db => (
                    <option key={db.id} value={db.id}>
                      {db.name} ({db.total_leads} leads)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Commerciaux affectés * ({formData.assigned_users.length} sélectionné{formData.assigned_users.length > 1 ? 's' : ''})
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border-2 border-gray-300 rounded-lg p-3 bg-gray-50">
                  {users.map(user => (
                    <label 
                      key={user.id} 
                      className="flex items-center gap-3 cursor-pointer hover:bg-white p-3 rounded-lg transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={formData.assigned_users.includes(user.id)}
                        onChange={() => toggleUser(user.id)}
                        className="w-5 h-5 text-blue-600"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{user.first_name} {user.last_name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 hover:bg-gray-50 rounded-lg font-medium transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all"
                >
                  {editingCampaign ? 'Modifier' : 'Créer la campagne'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

