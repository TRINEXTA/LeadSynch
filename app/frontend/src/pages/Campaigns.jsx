import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Mail, Phone, MessageSquare, Send, Play, Pause, StopCircle, RefreshCw, Edit, Trash2, Archive, Clock, TrendingUp, Users, Target, Calendar, Filter, Search, Eye, MoreVertical, AlertCircle, CheckCircle, XCircle, BarChart3, X } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const CAMPAIGN_STATUS = {
  draft: { name: 'Brouillon', color: 'bg-gray-500', bgLight: 'bg-gray-50', textColor: 'text-gray-700', icon: Edit },
  scheduled: { name: 'Programmee', color: 'bg-blue-500', bgLight: 'bg-blue-50', textColor: 'text-blue-700', icon: Clock },
  active: { name: 'En cours', color: 'bg-green-500', bgLight: 'bg-green-50', textColor: 'text-green-700', icon: Play },
  tracking: { name: 'Suivi actif', color: 'bg-cyan-500', bgLight: 'bg-cyan-50', textColor: 'text-cyan-700', icon: TrendingUp },
  paused: { name: 'En pause', color: 'bg-yellow-500', bgLight: 'bg-yellow-50', textColor: 'text-yellow-700', icon: Pause },
  completed: { name: 'Terminee', color: 'bg-purple-500', bgLight: 'bg-purple-50', textColor: 'text-purple-700', icon: CheckCircle },
  archived: { name: 'Archivee', color: 'bg-gray-400', bgLight: 'bg-gray-50', textColor: 'text-gray-600', icon: Archive },
  stopped: { name: 'Arretee', color: 'bg-red-500', bgLight: 'bg-red-50', textColor: 'text-red-700', icon: StopCircle }
};

const CAMPAIGN_TYPES = {
  email: { name: 'Email', icon: Mail, color: 'text-blue-600', bgGradient: 'from-blue-500 to-cyan-500' },
  phoning: { name: 'Phoning', icon: Phone, color: 'text-green-600', bgGradient: 'from-green-500 to-emerald-500' },
  sms: { name: 'SMS', icon: MessageSquare, color: 'text-purple-600', bgGradient: 'from-purple-500 to-pink-500' },
  whatsapp: { name: 'WhatsApp', icon: Send, color: 'text-emerald-600', bgGradient: 'from-emerald-500 to-teal-500' }
};

export default function Campaigns() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showActionMenu, setShowActionMenu] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showStatsModal, setShowStatsModal] = useState(false);

  // ✅ CORRECTION 1/3 : Détection du rôle
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  const isCommercial = user?.role === 'commercial' || user?.role === 'user';

  useEffect(() => {
    loadCampaigns();
    const interval = setInterval(loadCampaigns, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadCampaigns = async () => {
    try {
      // ✅ CORRECTION 2/3 : Appeler /my-campaigns pour les commerciaux
      const endpoint = isCommercial ? '/campaigns/my-campaigns' : '/campaigns';
      console.log(`📋 Chargement campagnes depuis: ${endpoint}`);
      
      const response = await api.get(endpoint);
      console.log('📊 Campagnes chargées:', response.data.campaigns);
      setCampaigns(response.data.campaigns || []);
      setLoading(false);
    } catch (error) {
      console.error('❌ Erreur chargement campagnes:', error);
      setLoading(false);
    }
  };

  const getFilteredCampaigns = () => {
    let filtered = [...campaigns];

    if (filterStatus !== 'all') {
      filtered = filtered.filter(c => c.status === filterStatus);
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(c => c.type === filterType);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.name?.toLowerCase().includes(query) ||
        c.subject?.toLowerCase().includes(query) ||
        c.goal_description?.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  };

  const handleStart = async (campaignId) => {
    try {
      console.log('▶️ Démarrage campagne:', campaignId);
      await api.post(`/campaigns/${campaignId}/start`);
      loadCampaigns();
      alert('✅ Campagne demarree');
    } catch (error) {
      console.error('❌ Erreur start:', error);
      alert('❌ Erreur demarrage campagne');
    }
  };

  const handlePause = async (campaignId) => {
    if (confirm('Mettre en pause cette campagne ?')) {
      try {
        console.log('⏸️ Pause campagne:', campaignId);
        await api.post(`/campaigns/${campaignId}/pause`);
        loadCampaigns();
        alert('✅ Campagne mise en pause');
      } catch (error) {
        console.error('❌ Erreur pause:', error);
        alert('❌ Erreur pause campagne');
      }
    }
  };

  const handleResume = async (campaignId) => {
    try {
      console.log('▶️ Reprise campagne:', campaignId);
      await api.post(`/campaigns/${campaignId}/resume`);
      loadCampaigns();
      alert('✅ Campagne relancee');
    } catch (error) {
      console.error('❌ Erreur resume:', error);
      alert('❌ Erreur relance campagne');
    }
  };

  const handleStop = async (campaignId) => {
    if (confirm('ATTENTION: Arrêter définitivement cette campagne ? Elle ne pourra plus être relancée.')) {
      try {
        console.log('⏹️ Arrêt campagne:', campaignId);
        await api.post(`/campaigns/${campaignId}/stop`);
        loadCampaigns();
        alert('✅ Campagne arretee');
      } catch (error) {
        console.error('❌ Erreur stop:', error);
        alert('❌ Erreur arrêt campagne');
      }
    }
  };

  const handleArchive = async (campaignId) => {
    if (confirm('Archiver cette campagne ?')) {
      try {
        console.log('📦 Archivage campagne:', campaignId);
        await api.post(`/campaigns/${campaignId}/archive`);
        loadCampaigns();
        alert('✅ Campagne archivee');
      } catch (error) {
        console.error('❌ Erreur archive:', error);
        alert('❌ Erreur archivage');
      }
    }
  };

  const handleUnarchive = async (campaignId) => {
    try {
      console.log('📤 Désarchivage campagne:', campaignId);
      await api.post(`/campaigns/${campaignId}/unarchive`);
      loadCampaigns();
      alert('✅ Campagne desarchivee');
    } catch (error) {
      console.error('❌ Erreur unarchive:', error);
      alert('❌ Erreur désarchivage');
    }
  };

  const handleDelete = async (campaignId) => {
    if (confirm('⚠️ ATTENTION: Supprimer définitivement cette campagne ? Cette action est irréversible !')) {
      if (confirm('Êtes-vous vraiment sûr ? Toutes les données seront perdues.')) {
        try {
          console.log('🗑️ Suppression campagne:', campaignId);
          await api.delete(`/campaigns/${campaignId}`);
          loadCampaigns();
          alert('✅ Campagne supprimee');
        } catch (error) {
          console.error('❌ Erreur suppression:', error);
          alert('❌ Erreur suppression');
        }
      }
    }
  };

  const handleDuplicate = async (campaignId) => {
    try {
      console.log('📋 Duplication campagne:', campaignId);
      const response = await api.post(`/campaigns/${campaignId}/duplicate`);
      loadCampaigns();
      alert('✅ Campagne dupliquee');
      navigate(`/CampaignsManager?edit=${response.data.campaign.id}`);
    } catch (error) {
      console.error('❌ Erreur duplication:', error);
      alert('❌ Erreur duplication');
    }
  };

  const getStats = () => {
    return {
      total: campaigns.length,
      active: campaigns.filter(c => c.status === 'active').length,
      tracking: campaigns.filter(c => c.status === 'tracking').length,
      scheduled: campaigns.filter(c => c.status === 'scheduled').length,
      draft: campaigns.filter(c => c.status === 'draft').length,
      completed: campaigns.filter(c => c.status === 'completed').length,
      paused: campaigns.filter(c => c.status === 'paused').length,
      archived: campaigns.filter(c => c.status === 'archived').length
    };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProgressPercentage = (campaign) => {
    if (!campaign.total_leads || campaign.total_leads === 0) return 0;
    
    // Pour campagnes phoning: utiliser leads_contacted
    if (campaign.type === 'phoning' || campaign.campaign_type === 'phone') {
      return Math.round((campaign.leads_contacted || 0) / campaign.total_leads * 100);
    }
    
    // Pour campagnes email: utiliser sent_count
    return Math.round((campaign.sent_count || 0) / campaign.total_leads * 100);
  };

  const getOpenRate = (campaign) => {
    if (!campaign.delivered_count || campaign.delivered_count === 0) return 0;
    return Math.round((campaign.opened_count || 0) / campaign.delivered_count * 100);
  };

  const getClickRate = (campaign) => {
    if (!campaign.opened_count || campaign.opened_count === 0) return 0;
    return Math.round((campaign.clicked_count || 0) / campaign.opened_count * 100);
  };

  const filteredCampaigns = getFilteredCampaigns();
  const stats = getStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-semibold">Chargement des campagnes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
                {/* ✅ CORRECTION 3/3 : Titre adapté au rôle */}
                {isCommercial ? 'Mes Campagnes' : 'Gestion des Campagnes'}
              </h1>
              <p className="text-gray-600 ml-15">
                {isCommercial ? 'Campagnes qui vous sont assignées' : 'Pilotez toutes vos campagnes en temps reel'}
              </p>
            </div>
            {/* Bouton visible seulement pour admin */}
            {isAdmin && (
              <button
                onClick={() => navigate('/CampaignsManager')}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Nouvelle campagne
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-lg border-2 border-gray-200 hover:shadow-xl transition-all">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-gray-600" />
              <p className="text-sm text-gray-600 font-medium">Total</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-lg border-2 border-green-200 hover:shadow-xl transition-all">
            <div className="flex items-center gap-2 mb-2">
              <Play className="w-5 h-5 text-green-600" />
              <p className="text-sm text-gray-600 font-medium">En cours</p>
            </div>
            <p className="text-3xl font-bold text-green-600">{stats.active}</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-lg border-2 border-cyan-200 hover:shadow-xl transition-all">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-cyan-600" />
              <p className="text-sm text-gray-600 font-medium">Suivi</p>
            </div>
            <p className="text-3xl font-bold text-cyan-600">{stats.tracking}</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-lg border-2 border-blue-200 hover:shadow-xl transition-all">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <p className="text-sm text-gray-600 font-medium">Programmees</p>
            </div>
            <p className="text-3xl font-bold text-blue-600">{stats.scheduled}</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-lg border-2 border-yellow-200 hover:shadow-xl transition-all">
            <div className="flex items-center gap-2 mb-2">
              <Pause className="w-5 h-5 text-yellow-600" />
              <p className="text-sm text-gray-600 font-medium">En pause</p>
            </div>
            <p className="text-3xl font-bold text-yellow-600">{stats.paused}</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-lg border-2 border-gray-200 hover:shadow-xl transition-all">
            <div className="flex items-center gap-2 mb-2">
              <Edit className="w-5 h-5 text-gray-600" />
              <p className="text-sm text-gray-600 font-medium">Brouillons</p>
            </div>
            <p className="text-3xl font-bold text-gray-700">{stats.draft}</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-lg border-2 border-purple-200 hover:shadow-xl transition-all">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-purple-600" />
              <p className="text-sm text-gray-600 font-medium">Terminees</p>
            </div>
            <p className="text-3xl font-bold text-purple-600">{stats.completed}</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-lg border-2 border-gray-200 hover:shadow-xl transition-all">
            <div className="flex items-center gap-2 mb-2">
              <Archive className="w-5 h-5 text-gray-600" />
              <p className="text-sm text-gray-600 font-medium">Archivees</p>
            </div>
            <p className="text-3xl font-bold text-gray-600">{stats.archived}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une campagne par nom, sujet ou description..."
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none bg-white"
            >
              <option value="all">🎯 Tous les statuts</option>
              {Object.entries(CAMPAIGN_STATUS).map(([key, status]) => (
                <option key={key} value={key}>{status.name}</option>
              ))}
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none bg-white"
            >
              <option value="all">📧 Tous les types</option>
              {Object.entries(CAMPAIGN_TYPES).map(([key, type]) => (
                <option key={key} value={key}>{type.name}</option>
              ))}
            </select>

            <button
              onClick={() => {
                setSearchQuery('');
                setFilterStatus('all');
                setFilterType('all');
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-semibold"
            >
              Réinitialiser
            </button>
          </div>
        </div>

        {/* Campaigns List */}
        <div className="space-y-4">
          {filteredCampaigns.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Target className="w-12 h-12 text-gray-300" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Aucune campagne trouvée</h3>
              <p className="text-gray-500 mb-6">
                {searchQuery || filterStatus !== 'all' || filterType !== 'all' 
                  ? 'Aucune campagne ne correspond à vos filtres'
                  : isCommercial ? 'Aucune campagne ne vous est assignée' : 'Créez votre première campagne pour commencer'
                }
              </p>
              {isAdmin && (
                <button
                  onClick={() => navigate('/CampaignsManager')}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Créer une campagne
                </button>
              )}
            </div>
          ) : (
            filteredCampaigns.map(campaign => {
              const status = CAMPAIGN_STATUS[campaign.status] || CAMPAIGN_STATUS.draft;
              const type = CAMPAIGN_TYPES[campaign.type] || CAMPAIGN_TYPES.email;
              const StatusIcon = status.icon;
              const TypeIcon = type.icon;
              const progress = getProgressPercentage(campaign);
              const openRate = getOpenRate(campaign);
              const clickRate = getClickRate(campaign);

              return (
                <div key={campaign.id} className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all border-2 border-gray-100">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${type.bgGradient} flex items-center justify-center shadow-lg`}>
                            <TypeIcon className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                              {campaign.name}
                              {campaign.status === 'active' && (
                                <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                              )}
                            </h3>
                            {campaign.subject && (
                              <p className="text-sm text-gray-600">📧 {campaign.subject}</p>
                            )}
                            {campaign.goal_description && (
                              <p className="text-xs text-gray-500 mt-1">🎯 {campaign.goal_description}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mt-3">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>Créé le {formatDate(campaign.created_at)}</span>
                          </div>
                          {campaign.start_date && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>Démarre le {formatDate(campaign.start_date)}</span>
                            </div>
                          )}
                          {campaign.assigned_users && campaign.assigned_users.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span>{campaign.assigned_users.length} commercial(aux)</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`${status.color} text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1 shadow-md`}>
                          <StatusIcon className="w-4 h-4" />
                          {status.name}
                        </span>

                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowActionMenu(showActionMenu === campaign.id ? null : campaign.id);
                            }}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                          >
                            <MoreVertical className="w-5 h-5 text-gray-600" />
                          </button>

                          {showActionMenu === campaign.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-[9998]" 
                                onClick={() => setShowActionMenu(null)}
                              ></div>
                              
                              <div 
                                className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-2xl border-2 border-gray-200 py-2 z-[9999] w-56"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* Voir détails */}
                                <button
                                  onClick={() => {
                                    setShowActionMenu(null);
                                    // Rediriger selon le type de campagne
                                    if (campaign.type === 'phoning' || campaign.campaign_type === 'phone') {
                                      navigate(`/CampaignDetailsPhoning?id=${campaign.id}`);
                                    } else {
                                      navigate(`/CampaignDetails?id=${campaign.id}`);
                                    }
                                  }}
                                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                                >
                                  <Eye className="w-4 h-4" />
                                  Voir details
                                </button>

                                {/* Modifier visible seulement pour admin */}
                                {isAdmin && (campaign.status === 'draft' || campaign.status === 'scheduled') && (
                                  <button
                                    onClick={() => {
                                      navigate(`/CampaignsManager?edit=${campaign.id}`);
                                      setShowActionMenu(null);
                                    }}
                                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                                  >
                                    <Edit className="w-4 h-4" />
                                    Modifier
                                  </button>
                                )}

                                <div className="border-t border-gray-200 my-2"></div>

                                {/* Actions réservées aux admins */}
                                {isAdmin && (
                                  <>
                                    {/* Démarrer */}
                                    {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                                      <button
                                        onClick={() => {
                                          handleStart(campaign.id);
                                          setShowActionMenu(null);
                                        }}
                                        className="w-full px-4 py-2 text-left hover:bg-green-50 flex items-center gap-2 text-green-600 font-semibold"
                                      >
                                        <Play className="w-4 h-4" />
                                        Demarrer maintenant
                                      </button>
                                    )}

                                    {/* Pause */}
                                    {campaign.status === 'active' && (
                                      <button
                                        onClick={() => {
                                          handlePause(campaign.id);
                                          setShowActionMenu(null);
                                        }}
                                        className="w-full px-4 py-2 text-left hover:bg-yellow-50 flex items-center gap-2 text-yellow-600 font-semibold"
                                      >
                                        <Pause className="w-4 h-4" />
                                        Mettre en pause
                                      </button>
                                    )}

                                    {/* Reprendre */}
                                    {campaign.status === 'paused' && (
                                      <button
                                        onClick={() => {
                                          handleResume(campaign.id);
                                          setShowActionMenu(null);
                                        }}
                                        className="w-full px-4 py-2 text-left hover:bg-green-50 flex items-center gap-2 text-green-600 font-semibold"
                                      >
                                        <Play className="w-4 h-4" />
                                        Reprendre
                                      </button>
                                    )}

                                    {/* Arrêter */}
                                    {(campaign.status === 'active' || campaign.status === 'paused') && (
                                      <button
                                        onClick={() => {
                                          handleStop(campaign.id);
                                          setShowActionMenu(null);
                                        }}
                                        className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center gap-2 text-red-600"
                                      >
                                        <StopCircle className="w-4 h-4" />
                                        Arreter definitivement
                                      </button>
                                    )}

                                    <div className="border-t border-gray-200 my-2"></div>

                                    {/* Archiver */}
                                    {campaign.status !== 'archived' && campaign.status !== 'draft' && (
                                      <button
                                        onClick={() => {
                                          handleArchive(campaign.id);
                                          setShowActionMenu(null);
                                        }}
                                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-600"
                                      >
                                        <Archive className="w-4 h-4" />
                                        Archiver
                                      </button>
                                    )}

                                    {/* Désarchiver */}
                                    {campaign.status === 'archived' && (
                                      <button
                                        onClick={() => {
                                          handleUnarchive(campaign.id);
                                          setShowActionMenu(null);
                                        }}
                                        className="w-full px-4 py-2 text-left hover:bg-blue-50 flex items-center gap-2 text-blue-600"
                                      >
                                        <RefreshCw className="w-4 h-4" />
                                        Desarchiver
                                      </button>
                                    )}

                                    {/* Dupliquer */}
                                    <button
                                      onClick={() => {
                                        handleDuplicate(campaign.id);
                                        setShowActionMenu(null);
                                      }}
                                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                                    >
                                      <RefreshCw className="w-4 h-4" />
                                      Dupliquer
                                    </button>

                                    {/* SUPPRIMER - TOUJOURS VISIBLE */}
                                    <div className="border-t border-gray-200 my-2"></div>
                                    <button
                                      onClick={() => {
                                        handleDelete(campaign.id);
                                        setShowActionMenu(null);
                                      }}
                                      className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center gap-2 text-red-600 font-semibold"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Supprimer définitivement
                                    </button>
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stats pour campagnes email */}
                    {campaign.type === 'email' && campaign.status !== 'draft' && campaign.total_leads > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                          <p className="text-xs text-gray-600 mb-1 font-semibold">📤 Envoyés</p>
                          <p className="text-2xl font-bold text-blue-600">{campaign.sent_count || 0}</p>
                          <p className="text-xs text-gray-500">sur {campaign.total_leads}</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                          <p className="text-xs text-gray-600 mb-1 font-semibold">✅ Délivrés</p>
                          <p className="text-2xl font-bold text-green-600">{campaign.delivered_count || 0}</p>
                          <p className="text-xs text-gray-500">{campaign.sent_count > 0 ? Math.round((campaign.delivered_count / campaign.sent_count) * 100) : 0}%</p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                          <p className="text-xs text-gray-600 mb-1 font-semibold">👁️ Ouverts</p>
                          <p className="text-2xl font-bold text-purple-600">{campaign.opened_count || 0}</p>
                          <p className="text-xs text-gray-500">{openRate}% taux ouverture</p>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                          <p className="text-xs text-gray-600 mb-1 font-semibold">🖱️ Clics</p>
                          <p className="text-2xl font-bold text-orange-600">{campaign.clicked_count || 0}</p>
                          <p className="text-xs text-gray-500">{clickRate}% taux clic</p>
                        </div>
                      </div>
                    )}

                    {/* Barre de progression */}
                    {(campaign.status === 'active' || campaign.status === 'paused' || campaign.status === 'completed') && campaign.total_leads > 0 && (
                      <div>
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                          <span className="font-semibold">Progression de la campagne</span>
                          <span className="font-bold text-lg">{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                          <div
                            className={`h-4 ${status.color} transition-all duration-500 flex items-center justify-end pr-2`}
                            style={{ width: `${progress}%` }}
                          >
                            {progress > 10 && (
                              <span className="text-white text-xs font-bold">{campaign.sent_count}/{campaign.total_leads}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Stats détaillées */}
        {showStatsModal && selectedCampaign && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-t-2xl flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-8 h-8" />
                  <div>
                    <h2 className="text-2xl font-bold">{selectedCampaign.name}</h2>
                    <p className="text-sm opacity-90">{CAMPAIGN_STATUS[selectedCampaign.status]?.name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowStatsModal(false);
                    setSelectedCampaign(null);
                  }} 
                  className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Type</p>
                    <p className="text-lg font-bold">{CAMPAIGN_TYPES[selectedCampaign.type]?.name || '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Créée le</p>
                    <p className="text-lg font-bold">{formatDate(selectedCampaign.created_at)}</p>
                  </div>
                </div>

                {selectedCampaign.type === 'email' && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-gray-900">📊 Statistiques détaillées</h3>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                        <p className="text-sm text-gray-600 mb-2">Total envoyés</p>
                        <p className="text-3xl font-bold text-blue-600">{selectedCampaign.sent_count || 0}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                        <p className="text-sm text-gray-600 mb-2">Taux livraison</p>
                        <p className="text-3xl font-bold text-green-600">
                          {selectedCampaign.sent_count > 0 ? Math.round((selectedCampaign.delivered_count / selectedCampaign.sent_count) * 100) : 0}%
                        </p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4 border-2 border-purple-200">
                        <p className="text-sm text-gray-600 mb-2">Taux ouverture</p>
                        <p className="text-3xl font-bold text-purple-600">{getOpenRate(selectedCampaign)}%</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}