<<<<<<< HEAD
import { log, error, warn } from "./../lib/logger.js";
=======
import { log, error, warn } from "../lib/logger.js";
>>>>>>> origin/main
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Mail, Users, Eye, MousePointer, Clock, Calendar, TrendingUp,
  UserCheck, Edit, Trash2, Play, Pause, StopCircle, AlertCircle
} from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function CampaignDetails() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get('id');

  const [campaign, setCampaign] = useState(null);
  const [stats, setStats] = useState(null);
  const [commercials, setCommercials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (campaignId) {
      loadCampaignDetails();
    }
  }, [campaignId]);

  const loadCampaignDetails = async () => {
    try {
      setLoading(true);

      // Charger la campagne d'abord (obligatoire)
      const campaignRes = await api.get(`/campaigns/${campaignId}`);
      setCampaign(campaignRes.data.campaign);

      // Charger stats et commercials séparément (optionnel)
      try {
        const statsRes = await api.get(`/tracking/campaign/${campaignId}/stats`);
        setStats(statsRes.data.stats);
      } catch (e) {
        error('Erreur stats:', e);
        setStats({ sent: 0, opened: 0, clicked: 0, open_rate: 0, click_rate: 0 });
      }

      try {
        const commercialsRes = await api.get(`/campaigns/${campaignId}/commercials`);
        setCommercials(commercialsRes.data.commercials || []);
      } catch (e) {
        error('Erreur commercials:', e);
        setCommercials([]);
      }

    } catch (error) {
      error('Erreur:', error);
      toast.error('Erreur chargement campagne');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCampaign = () => {
    navigate(`/CampaignsManager?edit=${campaignId}`);
  };

  const handleDeleteCampaign = async () => {
    setDeleting(true);
    try {
      await api.delete(`/campaigns/${campaignId}`);
      toast.success('Campagne supprimée');
      navigate('/Campaigns');
    } catch (error) {
      error('Erreur:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    const statusText = newStatus === 'pause' ? 'mise en pause' : newStatus === 'resume' ? 'relancée' : 'arrêtée';

    const promise = api.post(`/campaigns/${campaignId}/${newStatus}`)
      .then(() => loadCampaignDetails());

    toast.promise(promise, {
      loading: 'Modification du statut...',
      success: `Campagne ${statusText}`,
      error: 'Erreur changement statut',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 font-semibold">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
        <button onClick={() => navigate('/Campaigns')} className="flex items-center gap-2 text-gray-700 hover:text-gray-900 mb-4 font-medium">
          <ArrowLeft className="w-5 h-5" />
          Retour
        </button>
        <div className="text-center py-12 bg-white rounded-2xl shadow-xl">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Campagne introuvable</p>
        </div>
      </div>
    );
  }

  const openRate = stats?.sent > 0 ? ((stats.opens / stats.sent) * 100).toFixed(1) : 0;
  const clickRate = stats?.sent > 0 ? ((stats.clicks / stats.sent) * 100).toFixed(1) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header avec boutons */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/Campaigns')}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour aux campagnes
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleEditCampaign}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              <Edit className="w-5 h-5" />
              Modifier
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
            >
              <Trash2 className="w-5 h-5" />
              Supprimer
            </button>
          </div>
        </div>

        {/* Carte principale */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-4 rounded-2xl">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                  {campaign.name}
                </h1>
                <p className="text-gray-600">{campaign.goal_description || campaign.description || 'Campagne email'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                campaign.status === 'active' ? 'bg-green-100 text-green-700' :
                campaign.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                campaign.status === 'completed' ? 'bg-purple-100 text-purple-700' :
                'bg-red-100 text-red-700'
              }`}>
                {campaign.status === 'active' ? '🟢 En cours' :
                 campaign.status === 'draft' ? '⚪ Brouillon' :
                 campaign.status === 'paused' ? '🟡 En pause' :
                 campaign.status === 'completed' ? '🟣 Terminée' : '🔴 Arrêtée'}
              </span>

              {campaign.status === 'active' && (
                <button
                  onClick={() => handleStatusChange('pause')}
                  className="p-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors"
                  title="Mettre en pause"
                >
                  <Pause className="w-5 h-5" />
                </button>
              )}

              {campaign.status === 'paused' && (
                <button
                  onClick={() => handleStatusChange('resume')}
                  className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                  title="Relancer"
                >
                  <Play className="w-5 h-5" />
                </button>
              )}

              {(campaign.status === 'active' || campaign.status === 'paused') && (
                <button
                  onClick={() => handleStatusChange('stop')}
                  className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  title="Arrêter définitivement"
                >
                  <StopCircle className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Stats principales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <Calendar className="w-8 h-8 text-blue-600 mb-2" />
              <p className="text-sm text-gray-600 mb-1 font-semibold">Créée le</p>
              <p className="text-lg font-bold text-gray-800">
                {new Date(campaign.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
              <Users className="w-8 h-8 text-purple-600 mb-2" />
              <p className="text-sm text-gray-600 mb-1 font-semibold">Emails envoyés</p>
              <p className="text-3xl font-bold text-purple-700">{stats?.sent || 0}</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
              <Eye className="w-8 h-8 text-green-600 mb-2" />
              <p className="text-sm text-gray-600 mb-1 font-semibold">Taux d'ouverture</p>
              <p className="text-3xl font-bold text-green-700">{openRate}%</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
              <MousePointer className="w-8 h-8 text-orange-600 mb-2" />
              <p className="text-sm text-gray-600 mb-1 font-semibold">Taux de clic</p>
              <p className="text-3xl font-bold text-orange-700">{clickRate}%</p>
            </div>
          </div>
        </div>

        {/* Statistiques détaillées */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Ouvertures</p>
                <p className="text-4xl font-bold text-green-600">{stats?.opens || 0}</p>
              </div>
              <Eye className="w-12 h-12 text-green-500 opacity-20" />
            </div>
            <p className="text-sm text-gray-600">{openRate}% des emails envoyés</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Clics</p>
                <p className="text-4xl font-bold text-blue-600">{stats?.clicks || 0}</p>
              </div>
              <MousePointer className="w-12 h-12 text-blue-500 opacity-20" />
            </div>
            <p className="text-sm text-gray-600">{clickRate}% des emails envoyés</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Bounces</p>
                <p className="text-4xl font-bold text-red-600">{stats?.bounces || 0}</p>
              </div>
              <AlertCircle className="w-12 h-12 text-red-500 opacity-20" />
            </div>
            <p className="text-sm text-gray-600">Emails non délivrés</p>
          </div>
        </div>

        {/* Section Commerciaux Affectés */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-3">
            <Users className="w-7 h-7 text-purple-600" />
            Commerciaux affectés ({commercials.length})
          </h2>

          {commercials.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Aucun commercial affecté</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {commercials.map((commercial, idx) => (
                <div key={idx} className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-3 rounded-full">
                      <UserCheck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">
                        {commercial.first_name} {commercial.last_name}
                      </h3>
                      <p className="text-sm text-gray-500">{commercial.email}</p>
                      <p className="text-xs text-purple-600 font-medium mt-1">{commercial.role}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-center">
                    <div className="bg-blue-50 rounded-lg p-2">
                      <p className="text-xs text-gray-600">Leads</p>
                      <p className="text-lg font-bold text-blue-600">{commercial.leads_assigned || 0}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2">
                      <p className="text-xs text-gray-600">Ouvertures</p>
                      <p className="text-lg font-bold text-green-600">{commercial.leads_contacted || 0}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Confirmation Suppression */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Supprimer cette campagne ?
                </h3>
                <p className="text-gray-600">
                  Cette action est irréversible. Toutes les données de la campagne seront supprimées.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                  disabled={deleting}
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteCampaign}
                  disabled={deleting}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all disabled:opacity-50"
                >
                  {deleting ? 'Suppression...' : 'Supprimer'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
