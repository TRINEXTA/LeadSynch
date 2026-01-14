import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Loader2,
  Target,
  Filter,
  Briefcase,
  Phone,
  Clock,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  Users,
  Flame,
  ThumbsUp,
  PhoneOff,
  Mail
} from 'lucide-react';
import api from '../api/axios';
import ProspectionMode from './ProspectingMode';
import { toast } from '../lib/toast';

// Filtres par type de leads
const LEAD_FILTERS = [
  { id: 'all', label: 'Tous les leads', icon: Target, color: 'bg-purple-500' },
  { id: 'cold_call', label: 'Appels à froid', icon: Phone, color: 'bg-indigo-500' },
  { id: 'leads_click', label: 'Leads Click', icon: Mail, color: 'bg-cyan-500' },
  { id: 'relancer', label: 'À relancer', icon: Clock, color: 'bg-yellow-500' },
  { id: 'nrp', label: 'NRP (Ne répond pas)', icon: PhoneOff, color: 'bg-gray-500' },
  { id: 'qualifie', label: 'Qualifiés', icon: ThumbsUp, color: 'bg-blue-500' },
  { id: 'tres_qualifie', label: 'Très chauds / RDV', icon: Flame, color: 'bg-green-500' },
  { id: 'hors_scope', label: 'Hors Scope', icon: AlertCircle, color: 'bg-orange-500' },
];

export default function ProspectingModePage() {
  const [searchParams] = useSearchParams();
  const [allLeads, setAllLeads] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState(searchParams.get('campaign') || 'all');
  const [selectedFilter, setSelectedFilter] = useState(searchParams.get('filter') || 'all');
  const [showCampaignDropdown, setShowCampaignDropdown] = useState(false);
  const [isProspecting, setIsProspecting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (showLoader = true) => {
    try {
      // Ne pas afficher le loader si on est en mode prospection (évite de démonter le composant)
      if (showLoader && !isProspecting) {
        setLoading(true);
      }
      const [leadsRes, campaignsRes] = await Promise.all([
        api.get('/pipeline-leads', { params: { mode: 'prospection' } }),
        api.get('/campaigns/my-campaigns')
      ]);

      const leadsData = leadsRes.data.leads || [];
      // Exclure les leads gagnés et perdus
      const prospecableLeads = leadsData.filter(lead =>
        !['gagne', 'perdu'].includes(lead.stage)
      );
      setAllLeads(prospecableLeads);

      const campaignsData = campaignsRes.data.campaigns || [];
      setCampaigns(campaignsData);
    } catch (err) {
      console.error('Erreur chargement données:', err);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les leads par campagne et type
  const filteredLeads = useMemo(() => {
    let leads = [...allLeads];

    // Filtrer par campagne
    if (selectedCampaign !== 'all') {
      leads = leads.filter(lead => lead.campaign_id === selectedCampaign);
    }

    // Filtrer par type/stage
    if (selectedFilter !== 'all') {
      leads = leads.filter(lead => lead.stage === selectedFilter);
    }

    return leads;
  }, [allLeads, selectedCampaign, selectedFilter]);

  // Stats par filtre
  const filterStats = useMemo(() => {
    const stats = {};
    let leadsForStats = allLeads;

    // Si une campagne est sélectionnée, ne compter que ses leads
    if (selectedCampaign !== 'all') {
      leadsForStats = allLeads.filter(lead => lead.campaign_id === selectedCampaign);
    }

    stats.all = leadsForStats.length;
    LEAD_FILTERS.forEach(filter => {
      if (filter.id !== 'all') {
        stats[filter.id] = leadsForStats.filter(lead => lead.stage === filter.id).length;
      }
    });

    return stats;
  }, [allLeads, selectedCampaign]);

  const handleExit = () => {
    setIsProspecting(false);
    navigate('/pipeline');
  };

  // Rafraîchir les leads sans démonter le composant ProspectionMode
  const handleLeadUpdated = () => {
    loadData(false); // false = ne pas afficher le loader
  };

  const handleStartProspecting = () => {
    if (filteredLeads.length === 0) {
      toast.warning('Aucun lead disponible pour cette sélection');
      return;
    }
    setIsProspecting(true);
  };

  const selectedCampaignData = campaigns.find(c => c.id === selectedCampaign);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-700 font-semibold">Chargement des leads...</p>
        </div>
      </div>
    );
  }

  // Mode prospection actif
  if (isProspecting) {
    return (
      <ProspectionMode
        leads={filteredLeads}
        campaign={selectedCampaignData}
        filterType={selectedFilter}
        onExit={handleExit}
        onLeadUpdated={handleLeadUpdated}
      />
    );
  }

  // Page de sélection
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-6">
      {/* Header */}
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <Target className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mode Prospection</h1>
              <p className="text-gray-600">Choisissez votre cible et commencez à prospecter</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/pipeline')}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
          >
            Retour au Pipeline
          </button>
        </div>

        {/* Sélection Campagne */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <Briefcase className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Campagne</h2>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowCampaignDropdown(!showCampaignDropdown)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl hover:border-purple-300 transition-all"
            >
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-gray-500" />
                <span className="font-medium">
                  {selectedCampaign === 'all'
                    ? 'Toutes les campagnes'
                    : selectedCampaignData?.name || 'Campagne inconnue'}
                </span>
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${showCampaignDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showCampaignDropdown && (
              <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                <button
                  onClick={() => {
                    setSelectedCampaign('all');
                    setShowCampaignDropdown(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-purple-50 transition-colors ${selectedCampaign === 'all' ? 'bg-purple-50 text-purple-700' : ''}`}
                >
                  <Users className="w-5 h-5" />
                  <span className="font-medium">Toutes les campagnes</span>
                  <span className="ml-auto text-sm text-gray-500">{allLeads.length} leads</span>
                </button>
                {campaigns.map(campaign => {
                  const campaignLeadCount = allLeads.filter(l => l.campaign_id === campaign.id).length;
                  return (
                    <button
                      key={campaign.id}
                      onClick={() => {
                        setSelectedCampaign(campaign.id);
                        setShowCampaignDropdown(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-purple-50 transition-colors ${selectedCampaign === campaign.id ? 'bg-purple-50 text-purple-700' : ''}`}
                    >
                      <Briefcase className="w-5 h-5" />
                      <span className="font-medium">{campaign.name}</span>
                      <span className="ml-auto text-sm text-gray-500">{campaignLeadCount} leads</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Filtres par type */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Type de leads à prospecter</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {LEAD_FILTERS.map(filter => {
              const Icon = filter.icon;
              const count = filterStats[filter.id] || 0;
              const isSelected = selectedFilter === filter.id;

              return (
                <button
                  key={filter.id}
                  onClick={() => setSelectedFilter(filter.id)}
                  className={`relative flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-purple-500 bg-purple-50 shadow-md'
                      : 'border-gray-200 bg-gray-50 hover:border-purple-300 hover:bg-purple-50/50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl ${filter.color} flex items-center justify-center mb-2 shadow-sm`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 text-center">{filter.label}</span>
                  <span className={`mt-1 text-lg font-bold ${isSelected ? 'text-purple-700' : 'text-gray-700'}`}>
                    {count}
                  </span>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-3 h-3 bg-purple-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Résumé et bouton démarrer */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl shadow-xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-2">Prêt à prospecter ?</h3>
              <p className="text-purple-100">
                {filteredLeads.length === 0 ? (
                  <span className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Aucun lead disponible pour cette sélection
                  </span>
                ) : (
                  <>
                    <span className="text-3xl font-bold">{filteredLeads.length}</span> leads à traiter
                    {selectedCampaign !== 'all' && selectedCampaignData && (
                      <span className="ml-2">dans "{selectedCampaignData.name}"</span>
                    )}
                    {selectedFilter !== 'all' && (
                      <span className="ml-2">({LEAD_FILTERS.find(f => f.id === selectedFilter)?.label})</span>
                    )}
                  </>
                )}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={loadData}
                className="flex items-center gap-2 px-5 py-3 bg-white/20 hover:bg-white/30 rounded-xl font-semibold transition-all"
              >
                <RefreshCw className="w-5 h-5" />
                Actualiser
              </button>
              <button
                onClick={handleStartProspecting}
                disabled={filteredLeads.length === 0}
                className="flex items-center gap-2 px-8 py-3 bg-white text-purple-600 rounded-xl font-bold hover:bg-purple-50 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Target className="w-5 h-5" />
                Commencer ({filteredLeads.length})
              </button>
            </div>
          </div>
        </div>

        {/* Info supplémentaire */}
        {filteredLeads.length > 0 && (
          <div className="mt-6 bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-600 text-center">
              💡 <strong>Conseil :</strong> Commencez par les leads "À relancer" pour maximiser vos chances de conversion,
              puis traitez les "Appels à froid" pour alimenter votre pipeline.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
