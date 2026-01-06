import { log, error, warn } from "../lib/logger.js";
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Mail, Users, Eye, MousePointer, Clock, Calendar, TrendingUp,
  UserCheck, Edit, Trash2, Play, Pause, StopCircle, AlertCircle, RefreshCw, Sparkles
} from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import FollowUpConfig from '../components/campaigns/FollowUpConfig';
import ModifyCampaignModal from '../components/campaigns/ModifyCampaignModal';

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

  // Follow-up state
  const [followUpEnabled, setFollowUpEnabled] = useState(false);
  const [followUpCount, setFollowUpCount] = useState(1);
  const [followUpDelayDays, setFollowUpDelayDays] = useState(3);
  const [followUpTemplates, setFollowUpTemplates] = useState([]);
  const [showFollowUpSection, setShowFollowUpSection] = useState(false);
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  // NEW: Independent mode configuration for relances
  const [enabledModes, setEnabledModes] = useState({
    opened_not_clicked: false,
    not_opened: false
  });
  const [delayByMode, setDelayByMode] = useState({
    opened_not_clicked: 3,
    not_opened: 3
  });

  // Modify campaign modal
  const [showModifyModal, setShowModifyModal] = useState(false);

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
      const campaignData = campaignRes.data.campaign;
      setCampaign(campaignData);

      // Initialiser les états follow-up depuis la campagne
      setFollowUpEnabled(campaignData.follow_ups_enabled || false);
      setFollowUpCount(campaignData.follow_ups_count || 1);
      setFollowUpDelayDays(campaignData.follow_up_delay_days || 3);
      // NEW: Initialize independent mode configuration
      if (campaignData.enabled_modes) {
        setEnabledModes(campaignData.enabled_modes);
      }
      if (campaignData.delay_by_mode) {
        setDelayByMode(campaignData.delay_by_mode);
      }

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

      // Charger les follow-ups existants si activés
      if (campaignData.follow_ups_enabled) {
        try {
          const followUpsRes = await api.get(`/campaigns/${campaignId}/follow-ups`);
          setFollowUpTemplates(followUpsRes.data.follow_ups || []);
        } catch (e) {
          error('Erreur follow-ups:', e);
          setFollowUpTemplates([]);
        }
      }

    } catch (err) {
      error('Erreur:', err);
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

  // Sauvegarder la configuration des follow-ups
  const handleSaveFollowUpConfig = async () => {
    setSavingFollowUp(true);
    try {
      // Si des templates existent (générés ou manuels), les sauvegarder
      if (followUpTemplates.length > 0) {
        const response = await api.post(`/campaigns/${campaignId}/follow-ups/save-templates`, {
          templates: followUpTemplates,
          follow_up_count: followUpCount,
          delay_days: followUpDelayDays,
          // NEW: Independent mode configuration
          enabled_modes: enabledModes,
          delay_by_mode: delayByMode
        });

        if (response.data.success) {
          setFollowUpTemplates(response.data.follow_ups || followUpTemplates);
          toast.success('Relances configurées et sauvegardées !');
        }
      } else {
        // Sinon, juste activer les relances
        await api.post(`/campaigns/${campaignId}/follow-ups/enable`, {
          enabled: followUpEnabled,
          follow_up_count: followUpCount,
          delay_days: followUpDelayDays,
          // NEW: Independent mode configuration
          enabled_modes: enabledModes,
          delay_by_mode: delayByMode
        });
        toast.success('Configuration des relances sauvegardée');
      }

      setShowFollowUpSection(false);
      loadCampaignDetails();
    } catch (err) {
      error('Erreur sauvegarde follow-up:', err);
      toast.error(err.response?.data?.error || 'Erreur lors de la sauvegarde');
    } finally {
      setSavingFollowUp(false);
    }
  };

  // Générer les templates de follow-up avec Asefi
  const handleGenerateFollowUpTemplates = async () => {
    setSavingFollowUp(true);
    try {
      // D'abord activer les relances avec les paramètres
      await api.post(`/campaigns/${campaignId}/follow-ups/enable`, {
        follow_up_count: followUpCount,
        delay_days: followUpDelayDays
      });

      // Puis générer les templates
      const response = await api.post(`/campaigns/${campaignId}/follow-ups/generate-templates`, {
        follow_up_count: followUpCount,
        delay_days: followUpDelayDays
      });

      if (response.data.success) {
        setFollowUpTemplates(response.data.follow_ups || response.data.templates || []);
        setFollowUpEnabled(true);
        toast.success('Templates de relance générés et sauvegardés !');
        // Fermer le panneau de config et recharger
        setShowFollowUpSection(false);
        loadCampaignDetails();
      }
    } catch (err) {
      error('Erreur génération templates:', err);
      toast.error(err.response?.data?.error || 'Erreur lors de la génération');
    } finally {
      setSavingFollowUp(false);
    }
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
              onClick={() => setShowModifyModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
            >
              <Edit className="w-5 h-5" />
              Modifier
            </button>
            <button
              onClick={handleEditCampaign}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              <Edit className="w-5 h-5" />
              Edition complete
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
                {campaign.supervisor_first_name && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium flex items-center gap-1">
                      Superviseur: {campaign.supervisor_first_name} {campaign.supervisor_last_name}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                campaign.status === 'active' ? 'bg-green-100 text-green-700' :
                campaign.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                campaign.status === 'completed' ? 'bg-purple-100 text-purple-700' :
                campaign.status === 'relances_en_cours' ? 'bg-orange-100 text-orange-700' :
                campaign.status === 'surveillance' ? 'bg-blue-100 text-blue-700' :
                campaign.status === 'closed' ? 'bg-gray-100 text-gray-700' :
                'bg-red-100 text-red-700'
              }`}>
                {campaign.status === 'active' ? '🟢 En cours' :
                 campaign.status === 'draft' ? '⚪ Brouillon' :
                 campaign.status === 'paused' ? '🟡 En pause' :
                 campaign.status === 'completed' ? '🟣 Terminée' :
                 campaign.status === 'relances_en_cours' ? '🔄 Relances en cours' :
                 campaign.status === 'surveillance' ? '👁️ Surveillance' :
                 campaign.status === 'closed' ? '🔒 Clôturée' : '🔴 Arrêtée'}
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

              {/* Bouton Activer les relances pour campagnes terminées sans relances */}
              {(campaign.status === 'completed' || campaign.status === 'stopped') && !campaign.follow_ups_enabled && (
                <button
                  onClick={() => setShowFollowUpSection(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors font-semibold"
                  title="Activer les relances pour cette campagne"
                >
                  <RefreshCw className="w-4 h-4" />
                  Activer les relances
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

        {/* Section Relances Automatiques */}
        {campaign.type === 'email' && campaign.status !== 'archived' && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mt-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <RefreshCw className="w-7 h-7 text-purple-600" />
                Relances automatiques
              </h2>
              <button
                onClick={() => setShowFollowUpSection(!showFollowUpSection)}
                className="text-purple-600 hover:text-purple-700 font-semibold"
              >
                {showFollowUpSection ? 'Reduire' : 'Configurer'}
              </button>
            </div>

            {!showFollowUpSection ? (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6">
                {followUpEnabled ? (
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                          <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">Relances activees</h3>
                          <p className="text-sm text-gray-600">
                            {followUpCount} relance(s) - Delai: {followUpDelayDays} jours
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            try {
                              const res = await api.post(`/campaigns/${campaignId}/follow-ups/start-now`);
                              if (res.data.success) {
                                toast.success(res.data.message || 'Relances demarrees !');
                                loadCampaignDetails();
                              }
                            } catch (err) {
                              toast.error(err.response?.data?.error || 'Erreur');
                            }
                          }}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 flex items-center gap-2"
                        >
                          <Play className="w-4 h-4" />
                          Demarrer maintenant
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('Desactiver toutes les relances ?')) {
                              try {
                                await api.delete(`/campaigns/${campaignId}/follow-ups`);
                                toast.success('Relances desactivees');
                                setFollowUpEnabled(false);
                                setFollowUpTemplates([]);
                                loadCampaignDetails();
                              } catch (err) {
                                toast.error('Erreur');
                              }
                            }
                          }}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200"
                        >
                          Desactiver
                        </button>
                      </div>
                    </div>

                    {/* Dashboard des relances */}
                    {followUpTemplates.length > 0 ? (
                      <div className="grid gap-4 mt-4">
                        {followUpTemplates.map((fu) => (
                          <div key={fu.id} className={`bg-white rounded-xl p-4 border-2 ${
                            fu.status === 'active' ? 'border-green-300' :
                            fu.status === 'completed' ? 'border-blue-300' :
                            fu.status === 'validated' ? 'border-emerald-300' :
                            fu.status === 'test_sent' ? 'border-amber-300' :
                            fu.status === 'paused' ? 'border-yellow-300' :
                            fu.status === 'cancelled' ? 'border-red-300' :
                            'border-gray-200'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                  fu.target_audience === 'opened_not_clicked'
                                    ? 'bg-orange-100' : 'bg-red-100'
                                }`}>
                                  {fu.target_audience === 'opened_not_clicked'
                                    ? <Eye className="w-5 h-5 text-orange-600" />
                                    : <Mail className="w-5 h-5 text-red-600" />
                                  }
                                </div>
                                <div>
                                  <h4 className="font-bold text-gray-900">
                                    Relance #{fu.follow_up_number}
                                  </h4>
                                  <p className="text-sm text-gray-600">
                                    {fu.target_audience === 'opened_not_clicked'
                                      ? 'Ont ouvert sans cliquer'
                                      : 'N\'ont pas ouvert'
                                    }
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                {/* Stats */}
                                <div className="text-right mr-4">
                                  <p className="text-sm text-gray-600">
                                    {fu.total_sent || 0} / {fu.total_eligible || '?'} envoyes
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Delai: {fu.delay_days} jours
                                  </p>
                                </div>

                                {/* Status badge */}
                                <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                                  fu.status === 'active' ? 'bg-green-100 text-green-700' :
                                  fu.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                  fu.status === 'validated' ? 'bg-emerald-100 text-emerald-700' :
                                  fu.status === 'test_sent' ? 'bg-amber-100 text-amber-700' :
                                  fu.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                                  fu.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                  fu.status === 'scheduled' ? 'bg-purple-100 text-purple-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {fu.status === 'active' ? '🟢 En cours' :
                                   fu.status === 'completed' ? '✅ Termine' :
                                   fu.status === 'validated' ? '✅ Valide' :
                                   fu.status === 'test_sent' ? '📧 Test envoye' :
                                   fu.status === 'paused' ? '⏸️ En pause' :
                                   fu.status === 'cancelled' ? '❌ Annule' :
                                   fu.status === 'scheduled' ? '📅 Planifie' :
                                   '⏳ En attente'}
                                </span>
                              </div>
                            </div>

                            {/* Actions selon statut */}
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              {/* Statut pending : Envoyer test */}
                              {fu.status === 'pending' && (
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={async () => {
                                      try {
                                        const res = await api.post(`/campaigns/${campaignId}/follow-ups/send-test`, {
                                          follow_up_id: fu.id
                                        });
                                        toast.success(res.data.message || 'Email test envoye !');
                                        loadCampaignDetails();
                                      } catch (err) {
                                        toast.error(err.response?.data?.error || 'Erreur');
                                      }
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 flex items-center gap-2"
                                  >
                                    <Mail className="w-4 h-4" />
                                    Envoyer email test
                                  </button>
                                  <span className="text-sm text-gray-500">
                                    Recevez le test dans votre boite mail avant l'envoi reel
                                  </span>
                                </div>
                              )}

                              {/* Statut test_sent : Valider ou Modifier */}
                              {fu.status === 'test_sent' && (
                                <div className="space-y-3">
                                  <p className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
                                    📧 Email test envoye ! Verifiez votre boite mail et choisissez une action :
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      onClick={async () => {
                                        try {
                                          await api.post(`/campaigns/${campaignId}/follow-ups/${fu.id}/validate`);
                                          toast.success('Relance validee !');
                                          loadCampaignDetails();
                                        } catch (err) {
                                          toast.error('Erreur');
                                        }
                                      }}
                                      className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 flex items-center gap-2"
                                    >
                                      ✅ Valider et preparer l'envoi
                                    </button>
                                    <button
                                      onClick={() => setShowFollowUpSection(true)}
                                      className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-semibold hover:bg-purple-200 flex items-center gap-2"
                                    >
                                      ✏️ Modifier moi-meme
                                    </button>
                                    <button
                                      onClick={async () => {
                                        const feedback = prompt('Decrivez ce que vous souhaitez modifier :');
                                        if (feedback) {
                                          try {
                                            const res = await api.post(`/campaigns/${campaignId}/follow-ups/${fu.id}/request-modification`, { feedback });
                                            toast.success(res.data.message || 'Template modifie !');
                                            loadCampaignDetails();
                                          } catch (err) {
                                            toast.error('Erreur');
                                          }
                                        }
                                      }}
                                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-semibold hover:bg-blue-200 flex items-center gap-2"
                                    >
                                      <Sparkles className="w-4 h-4" />
                                      Demander a Asefi
                                    </button>
                                    <button
                                      onClick={async () => {
                                        try {
                                          await api.post(`/campaigns/${campaignId}/follow-ups/send-test`, {
                                            follow_up_id: fu.id
                                          });
                                          toast.success('Nouveau test envoye !');
                                        } catch (err) {
                                          toast.error('Erreur');
                                        }
                                      }}
                                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200"
                                    >
                                      🔄 Renvoyer test
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Statut validated : Pret a demarrer */}
                              {fu.status === 'validated' && (
                                <div className="flex items-center gap-3">
                                  <span className="text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
                                    ✅ Template valide et pret pour l'envoi
                                  </span>
                                </div>
                              )}

                              {/* Statut active : Pause/Cancel */}
                              {fu.status === 'active' && (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={async () => {
                                      try {
                                        await api.post(`/campaigns/${campaignId}/follow-ups/${fu.id}/pause`);
                                        toast.success('Relance mise en pause');
                                        loadCampaignDetails();
                                      } catch (err) {
                                        toast.error('Erreur');
                                      }
                                    }}
                                    className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 flex items-center gap-1"
                                  >
                                    <Pause className="w-4 h-4" /> Pause
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (confirm('Annuler cette relance ?')) {
                                        try {
                                          await api.post(`/campaigns/${campaignId}/follow-ups/${fu.id}/cancel`);
                                          toast.success('Relance annulee');
                                          loadCampaignDetails();
                                        } catch (err) {
                                          toast.error('Erreur');
                                        }
                                      }
                                    }}
                                    className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-1"
                                  >
                                    <StopCircle className="w-4 h-4" /> Annuler
                                  </button>
                                </div>
                              )}

                              {/* Statut paused : Resume/Cancel */}
                              {fu.status === 'paused' && (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={async () => {
                                      try {
                                        await api.post(`/campaigns/${campaignId}/follow-ups/${fu.id}/resume`);
                                        toast.success('Relance reprise');
                                        loadCampaignDetails();
                                      } catch (err) {
                                        toast.error('Erreur');
                                      }
                                    }}
                                    className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-1"
                                  >
                                    <Play className="w-4 h-4" /> Reprendre
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (confirm('Annuler cette relance ?')) {
                                        try {
                                          await api.post(`/campaigns/${campaignId}/follow-ups/${fu.id}/cancel`);
                                          toast.success('Relance annulee');
                                          loadCampaignDetails();
                                        } catch (err) {
                                          toast.error('Erreur');
                                        }
                                      }
                                    }}
                                    className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                                    title="Annuler"
                                  >
                                    <StopCircle className="w-4 h-4" /> Annuler
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mt-4">
                        <div className="flex items-center gap-3">
                          <AlertCircle className="w-5 h-5 text-yellow-600" />
                          <div>
                            <p className="font-semibold text-yellow-800">Aucun template de relance configure</p>
                            <p className="text-sm text-yellow-700">Cliquez sur "Configurer" pour generer les templates</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <RefreshCw className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="font-bold text-gray-900 mb-2">Relances non configurees</h3>
                    <p className="text-gray-600 mb-4">
                      Activez les relances pour augmenter vos taux de reponse
                    </p>
                    <button
                      onClick={() => setShowFollowUpSection(true)}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700"
                    >
                      Configurer les relances
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <FollowUpConfig
                  campaignId={campaignId}
                  enabled={followUpEnabled}
                  onEnabledChange={setFollowUpEnabled}
                  followUpCount={followUpCount}
                  onFollowUpCountChange={setFollowUpCount}
                  delayDays={followUpDelayDays}
                  onDelayDaysChange={setFollowUpDelayDays}
                  templates={followUpTemplates}
                  onTemplatesChange={setFollowUpTemplates}
                  isNewCampaign={false}
                  hasTemplate={!!campaign.template_id}
                  enabledModes={enabledModes}
                  onEnabledModesChange={setEnabledModes}
                  delayByMode={delayByMode}
                  onDelayByModeChange={setDelayByMode}
                />

                <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setShowFollowUpSection(false)}
                    className="px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveFollowUpConfig}
                    disabled={savingFollowUp}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {savingFollowUp ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Sauvegarde...
                      </>
                    ) : (
                      'Sauvegarder'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

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

        {/* Modal Modification Campagne */}
        <ModifyCampaignModal
          isOpen={showModifyModal}
          onClose={() => setShowModifyModal(false)}
          campaignId={campaignId}
          onCampaignUpdated={loadCampaignDetails}
        />
      </div>
    </div>
  );
}
