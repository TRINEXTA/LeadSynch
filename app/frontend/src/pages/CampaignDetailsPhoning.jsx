import { log, error, warn } from "./../lib/logger.js";
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Phone, Users, TrendingUp, Clock, Calendar, Edit,
  Play, Pause, StopCircle, Target, Award, Activity, BarChart3,
  CheckCircle, XCircle, PhoneCall, UserCheck, AlertCircle, Plus,
  RefreshCw, ArrowRightLeft
} from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import LeadTransferModal from '../components/campaigns/LeadTransferModal';

const STAGE_CONFIG = {
  cold_call: { name: 'Cold Call', color: 'bg-blue-500', icon: Phone, textColor: 'text-blue-700', bgLight: 'bg-blue-50' },
  nrp: { name: 'NRP', color: 'bg-gray-500', icon: PhoneCall, textColor: 'text-gray-700', bgLight: 'bg-gray-50' },
  qualifie: { name: 'Qualifié', color: 'bg-blue-600', icon: CheckCircle, textColor: 'text-blue-700', bgLight: 'bg-blue-50' },
  relancer: { name: 'À Relancer', color: 'bg-yellow-500', icon: Clock, textColor: 'text-yellow-700', bgLight: 'bg-yellow-50' },
  tres_qualifie: { name: 'Très Qualifié/RDV', color: 'bg-green-500', icon: Award, textColor: 'text-green-700', bgLight: 'bg-green-50' },
  proposition: { name: 'Proposition', color: 'bg-purple-500', icon: Target, textColor: 'text-purple-700', bgLight: 'bg-purple-50' },
  gagne: { name: 'Gagné', color: 'bg-emerald-600', icon: Award, textColor: 'text-emerald-700', bgLight: 'bg-emerald-50' },
  hors_scope: { name: 'Hors Scope', color: 'bg-red-500', icon: XCircle, textColor: 'text-red-700', bgLight: 'bg-red-50' }
};

export default function CampaignDetailsPhoning() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get('id');
  
  const [campaign, setCampaign] = useState(null);
  const [stats, setStats] = useState(null);
  const [commercials, setCommercials] = useState([]);
  const [pipelineStats, setPipelineStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddLeadsModal, setShowAddLeadsModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  useEffect(() => {
    if (campaignId) {
      loadCampaignDetails();
    }
  }, [campaignId]);

  const loadCampaignDetails = async () => {
    try {
      setLoading(true);

      const [campaignRes, statsRes, commercialsRes, pipelineRes] = await Promise.all([
        api.get(`/campaigns/${campaignId}`),
        api.get(`/campaigns/${campaignId}/phoning-stats`),
        api.get(`/campaigns/${campaignId}/commercials`),
        api.get(`/campaigns/${campaignId}/pipeline-stats`)
      ]);

      setCampaign(campaignRes.data.campaign);
      setStats(statsRes.data.stats);
      setCommercials(commercialsRes.data.commercials || []);
      setPipelineStats(pipelineRes.data.pipeline || []);

    } catch (error) {
      error('Erreur:', error);
      toast.error('Erreur chargement campagne');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLeadsBatch = () => {
    setShowAddLeadsModal(true);
  };

  const confirmAddLeads = async () => {
    setShowAddLeadsModal(false);

    const promise = api.post(`/pipeline-leads/deploy-batch`, {
      campaign_id: campaignId,
      size: 50
    }).then(() => loadCampaignDetails());

    toast.promise(promise, {
      loading: 'Ajout des leads en cours...',
      success: '✅ 50 leads ajoutés à chaque commercial !',
      error: '❌ Erreur lors de l\'ajout des leads',
    });
  };

  const handleEditCampaign = () => {
    navigate(`/CampaignsManager?edit=${campaignId}`);
  };

  const handleStatusChange = async (newStatus) => {
    const statusText = newStatus === 'pause' ? 'mise en pause' : newStatus === 'resume' ? 'relancée' : 'arrêtée';

    const promise = api.post(`/campaigns/${campaignId}/${newStatus}`)
      .then(() => loadCampaignDetails());

    toast.promise(promise, {
      loading: 'Modification du statut...',
      success: `✅ Campagne ${statusText}`,
      error: '❌ Erreur changement statut',
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
        <button 
          onClick={() => navigate('/Campaigns')} 
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900 mb-4 font-medium"
        >
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

  const totalLeads = stats?.total_leads || 0;
  const leadsContacted = stats?.leads_contacted || 0;
  const progress = totalLeads > 0 ? Math.round((leadsContacted / totalLeads) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
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
              onClick={() => setShowTransferModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
            >
              <ArrowRightLeft className="w-5 h-5" />
              Transférer des leads
            </button>
            <button
              onClick={handleAddLeadsBatch}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              <Plus className="w-5 h-5" />
              Ajouter 50 leads
            </button>
            <button
              onClick={handleEditCampaign}
              className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold border border-gray-200"
            >
              <Edit className="w-5 h-5" />
              Modifier
            </button>
          </div>
        </div>

        {/* Carte principale */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-4 rounded-2xl">
                <Phone className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
                  {campaign.name}
                </h1>
                <p className="text-gray-600">{campaign.goal_description || 'Campagne de prospection téléphonique'}</p>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <Calendar className="w-8 h-8 text-blue-600 mb-2" />
              <p className="text-sm text-gray-600 mb-1 font-semibold">Créée le</p>
              <p className="text-lg font-bold text-gray-800">
                {new Date(campaign.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
              <Target className="w-8 h-8 text-purple-600 mb-2" />
              <p className="text-sm text-gray-600 mb-1 font-semibold">Total leads</p>
              <p className="text-3xl font-bold text-purple-700">{totalLeads}</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
              <PhoneCall className="w-8 h-8 text-green-600 mb-2" />
              <p className="text-sm text-gray-600 mb-1 font-semibold">Contactés</p>
              <p className="text-3xl font-bold text-green-700">{leadsContacted}</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
              <Users className="w-8 h-8 text-orange-600 mb-2" />
              <p className="text-sm text-gray-600 mb-1 font-semibold">Commerciaux</p>
              <p className="text-3xl font-bold text-orange-700">{commercials.length}</p>
            </div>
          </div>

          {/* Barre de progression */}
          {totalLeads > 0 && (
            <div>
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span className="font-semibold">Progression de la campagne</span>
                <span className="font-bold text-lg text-green-600">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                <div
                  className="h-6 bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500 flex items-center justify-end pr-3"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                >
                  {progress > 10 && (
                    <span className="text-white text-sm font-bold">{leadsContacted}/{totalLeads}</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Statistiques du pipeline */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-blue-600" />
            Répartition du pipeline
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {pipelineStats.map((stat, idx) => {
              const config = STAGE_CONFIG[stat.stage] || { 
                name: stat.stage, 
                color: 'bg-gray-500', 
                icon: Activity,
                bgLight: 'bg-gray-50',
                textColor: 'text-gray-700'
              };
              const Icon = config.icon;
              const percentage = totalLeads > 0 ? ((stat.count / totalLeads) * 100).toFixed(1) : 0;

              return (
                <div key={idx} className={`${config.bgLight} rounded-xl p-4 border-2 ${config.color.replace('bg-', 'border-')}`}>
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`w-6 h-6 ${config.textColor}`} />
                    <span className="text-sm font-semibold text-gray-500">{percentage}%</span>
                  </div>
                  <p className="text-sm text-gray-600 font-semibold mb-1">{config.name}</p>
                  <p className="text-3xl font-bold text-gray-800">{stat.count}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Liste des commerciaux */}
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
            <div className="space-y-4">
              {commercials.map((commercial, idx) => {
                const commercialProgress = commercial.leads_assigned > 0
                  ? Math.round((commercial.leads_contacted / commercial.leads_assigned) * 100)
                  : 0;

                return (
                  <div key={idx} className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-5 border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-3 rounded-full">
                          <UserCheck className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-800">
                            {commercial.first_name} {commercial.last_name}
                          </h3>
                          <p className="text-sm text-gray-500">{commercial.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {(commercial.leads_assigned || 0) > 0 && (
                          <button
                            onClick={() => setShowTransferModal(true)}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Transférer les leads"
                          >
                            <ArrowRightLeft className="w-5 h-5" />
                          </button>
                        )}
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-600">{commercialProgress}%</p>
                          <p className="text-sm text-gray-500">progression</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-600 font-semibold mb-1">Leads assignés</p>
                        <p className="text-2xl font-bold text-blue-600">{commercial.leads_assigned || 0}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-600 font-semibold mb-1">Contactés</p>
                        <p className="text-2xl font-bold text-green-600">{commercial.leads_contacted || 0}</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-600 font-semibold mb-1">RDV obtenus</p>
                        <p className="text-2xl font-bold text-purple-600">{commercial.meetings_scheduled || 0}</p>
                      </div>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-3 bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                        style={{ width: `${commercialProgress}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Confirmation Ajout Leads */}
        {showAddLeadsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Ajouter 50 nouveaux leads ?
                </h3>
                <p className="text-gray-600">
                  Chaque commercial recevra 50 nouveaux leads à contacter pour cette campagne.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddLeadsModal(false)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmAddLeads}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Transfert de Leads */}
        <LeadTransferModal
          isOpen={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          campaignId={campaignId}
          commercials={commercials}
          onTransferComplete={loadCampaignDetails}
        />
      </div>
    </div>
  );
}