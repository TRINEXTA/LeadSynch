import React, { useState, useEffect } from 'react';
import { Plus, Play, Pause, Eye, Edit, Trash2, Calendar, Users, TrendingUp, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const response = await api.get('/campaigns');
      setCampaigns(response.data.campaigns || []);
    } catch (error) {
      console.error('Erreur chargement campagnes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (campaign) => {
    if (!confirm(`?? Démarrer la campagne "${campaign.name}" maintenant ?\n\nCela enverra les emails à ${campaign.leads_count || 0} leads.`)) {
      return;
    }

    try {
      await api.post(`/campaigns/${campaign.id}/start`);
      alert('? Campagne démarrée avec succès !');
      loadCampaigns();
    } catch (error) {
      alert('? Erreur : ' + (error.response?.data?.error || error.message));
    }
  };

  const handlePause = async (campaign) => {
    if (!confirm(`?? Mettre en pause la campagne "${campaign.name}" ?`)) {
      return;
    }

    try {
      await api.post(`/campaigns/${campaign.id}/pause`);
      alert('? Campagne mise en pause');
      loadCampaigns();
    } catch (error) {
      alert('? Erreur : ' + error.message);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`??? Supprimer la campagne "${name}" ?\n\nCette action est irréversible.`)) {
      return;
    }

    try {
      await api.delete(`/campaigns/${id}`);
      alert('? Campagne supprimée');
      loadCampaigns();
    } catch (error) {
      alert('? Erreur : ' + error.message);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: { color: 'gray', icon: '??', label: 'Brouillon' },
      scheduled: { color: 'blue', icon: '??', label: 'Programmée' },
      active: { color: 'green', icon: '?', label: 'Active' },
      paused: { color: 'yellow', icon: '??', label: 'En pause' },
      completed: { color: 'purple', icon: '??', label: 'Terminée' }
    };

    const badge = badges[status] || badges.draft;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-${badge.color}-100 text-${badge.color}-700`}>
        {badge.icon} {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Campagnes</h1>
          <p className="text-gray-600 mt-1">Gérez et démarrez vos campagnes</p>
        </div>
        <button
          onClick={() => navigate('/CampaignsManager')}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl transition-all"
        >
          <Plus className="w-5 h-5" />
          Nouvelle Campagne
        </button>
      </div>

      {/* Filtres rapides */}
      <div className="flex gap-3 mb-6">
        {['Toutes', 'Brouillon', 'Programmées', 'Actives', 'Terminées'].map((filter) => (
          <button
            key={filter}
            className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 text-sm font-medium"
          >
            {filter}
          </button>
        ))}
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
          <Play className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg mb-4">Aucune campagne pour le moment</p>
          <button
            onClick={() => navigate('/CampaignsManager')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Créer votre première campagne
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-white border rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-xl text-gray-800">{campaign.name}</h3>
                    {getStatusBadge(campaign.status)}
                  </div>
                  <p className="text-gray-600 text-sm">{campaign.description || 'Aucune description'}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <Users className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-gray-800">{campaign.leads_count || 0}</p>
                  <p className="text-xs text-gray-600">Leads ciblés</p>
                </div>

                <div className="text-center">
                  <TrendingUp className="w-5 h-5 text-green-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-gray-800">{campaign.emails_sent || 0}</p>
                  <p className="text-xs text-gray-600">Emails envoyés</p>
                </div>

                <div className="text-center">
                  <CheckCircle className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-gray-800">{campaign.emails_opened || 0}</p>
                  <p className="text-xs text-gray-600">Ouvertures</p>
                </div>

                <div className="text-center">
                  <Calendar className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                  <p className="text-sm font-bold text-gray-800">
                    {campaign.scheduled_date 
                      ? new Date(campaign.scheduled_date).toLocaleDateString('fr-FR')
                      : 'Non programmée'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {campaign.scheduled_time || 'Manuel'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                  <button
                    onClick={() => handleStart(campaign)}
                    className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center justify-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    Démarrer
                  </button>
                )}

                {campaign.status === 'active' && (
                  <button
                    onClick={() => handlePause(campaign)}
                    className="flex-1 bg-yellow-600 text-white px-4 py-3 rounded-lg hover:bg-yellow-700 transition-colors font-semibold flex items-center justify-center gap-2"
                  >
                    <Pause className="w-5 h-5" />
                    Pause
                  </button>
                )}

                <button
                  onClick={() => navigate(`/CampaignDetails?id=${campaign.id}`)}
                  className="px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  title="Voir détails"
                >
                  <Eye className="w-5 h-5 text-gray-600" />
                </button>

                {campaign.status === 'draft' && (
                  <button
                    onClick={() => navigate(`/CampaignsManager?edit=${campaign.id}`)}
                    className="px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    title="Modifier"
                  >
                    <Edit className="w-5 h-5 text-gray-600" />
                  </button>
                )}

                <button
                  onClick={() => handleDelete(campaign.id, campaign.name)}
                  className="px-4 py-3 border-2 border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-5 h-5 text-red-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
