import { log, error, warn } from "../lib/logger.js";
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { TrendingUp, Users, DollarSign, Clock, Filter, Search, Plus, Target, ChevronDown, ChevronUp, BarChart3, X, User } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import ProspectingMode from './ProspectingMode';
import LeadModal from '../components/LeadModal';
import LeadCard from '../components/pipeline/LeadCard';
import QuickEmailModal from '../components/pipeline/QuickEmailModal';
import QuickCallModal from '../components/pipeline/QuickCallModal';
import QuickProposalModal from '../components/pipeline/QuickProposalModal';
import QuickContractModal from '../components/pipeline/QuickContractModal';
import HistoryModal from '../components/pipeline/HistoryModal';
import ValidationRequestModal from '../components/pipeline/ValidationRequestModal';

const STAGES = [
  { id: 'cold_call', name: 'Cold Call', color: 'bg-indigo-500', textColor: 'text-indigo-700', bgLight: 'bg-indigo-50' },
  { id: 'leads_click', name: 'Leads Click', color: 'bg-cyan-500', textColor: 'text-cyan-700', bgLight: 'bg-cyan-50' },
  { id: 'nrp', name: 'NRP', color: 'bg-gray-500', textColor: 'text-gray-700', bgLight: 'bg-gray-50' },
  { id: 'qualifie', name: 'Qualifié', color: 'bg-blue-500', textColor: 'text-blue-700', bgLight: 'bg-blue-50' },
  { id: 'relancer', name: 'À Relancer', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgLight: 'bg-yellow-50' },
  { id: 'tres_qualifie', name: 'Très Qualifié/RDV', color: 'bg-green-500', textColor: 'text-green-700', bgLight: 'bg-green-50' },
  { id: 'proposition', name: 'Proposition', color: 'bg-purple-500', textColor: 'text-purple-700', bgLight: 'bg-purple-50' },
  { id: 'gagne', name: 'Gagné', color: 'bg-emerald-600', textColor: 'text-emerald-700', bgLight: 'bg-emerald-50' },
  { id: 'perdu', name: 'Perdu', color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50' },
  { id: 'hors_scope', name: 'Hors Scope', color: 'bg-orange-500', textColor: 'text-orange-700', bgLight: 'bg-orange-50' }
];

export default function Pipeline() {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [selectedUser, setSelectedUser] = useState('all'); // 🆕 Filtre par utilisateur pour managers
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Vérifier si l'utilisateur est manager ou supervisor
  const isManagerOrSupervisor = user?.role === 'manager' || user?.role === 'supervisor' || user?.role === 'admin';

  // UI State - récupérer depuis localStorage
  const [showStats, setShowStats] = useState(() => {
    const saved = localStorage.getItem('pipeline_show_stats');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [creatingLeadStage, setCreatingLeadStage] = useState(null);
  const [prospectionMode, setProspectionMode] = useState(false);

  // Quick Actions Modals
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationRequestType, setValidationRequestType] = useState('validation');
  const [selectedLead, setSelectedLead] = useState(null);

  // Sauvegarder préférence stats
  useEffect(() => {
    localStorage.setItem('pipeline_show_stats', JSON.stringify(showStats));
  }, [showStats]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    try {
      const requests = [
        api.get('/pipeline-leads'),
        api.get('/campaigns/my-campaigns')
      ];

      // Charger les membres de l'équipe si manager/supervisor
      if (isManagerOrSupervisor) {
        requests.push(api.get('/users/team').catch(() => ({ data: { users: [] } })));
      }

      const responses = await Promise.all(requests);

      const leadsData = responses[0].data.leads || [];
      const campaignsData = responses[1].data.campaigns || [];

      log('✅ Leads chargés:', leadsData.length);
      log('✅ Campagnes chargées:', campaignsData.length);

      setLeads(leadsData);
      setCampaigns(campaignsData);

      // Extraire les utilisateurs uniques des leads pour le filtre
      if (isManagerOrSupervisor) {
        const teamData = responses[2]?.data?.users || [];
        // Créer une liste d'utilisateurs uniques à partir des leads + team
        const usersFromLeads = leadsData
          .filter(l => l.assigned_user_id && l.assigned_user_name)
          .map(l => ({ id: l.assigned_user_id, name: l.assigned_user_name }));

        const uniqueUsers = Array.from(
          new Map([...usersFromLeads, ...teamData.map(u => ({
            id: u.id,
            name: `${u.first_name} ${u.last_name}`
          }))].map(u => [u.id, u])).values()
        );

        setTeamMembers(uniqueUsers);
        log('✅ Membres équipe:', uniqueUsers.length);
      }

      setLoading(false);
    } catch (err) {
      error('❌ Erreur chargement données:', err);
      setLoading(false);
    }
  }, [isManagerOrSupervisor]);

  // Filtrage optimisé avec useMemo
  const filteredLeads = useMemo(() => {
    let filtered = leads;

    if (selectedCampaign !== 'all') {
      filtered = filtered.filter(lead => lead.campaign_id === selectedCampaign);
    }

    // 🆕 Filtre par utilisateur (pour managers/supervisors)
    if (selectedUser !== 'all') {
      filtered = filtered.filter(lead => lead.assigned_user_id === selectedUser);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(lead =>
        lead.company_name?.toLowerCase().includes(query) ||
        lead.contact_name?.toLowerCase().includes(query) ||
        lead.email?.toLowerCase().includes(query) ||
        lead.phone?.includes(query) ||
        lead.city?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [leads, selectedCampaign, selectedUser, searchQuery]);

  // Stats calculées avec useMemo
  const stats = useMemo(() => {
    const statsByStage = {};
    STAGES.forEach(stage => {
      const stageLeads = filteredLeads.filter(l => l.stage === stage.id);
      statsByStage[stage.id] = {
        count: stageLeads.length,
        value: stageLeads.reduce((sum, l) => sum + (parseFloat(l.deal_value) || 0), 0)
      };
    });
    return statsByStage;
  }, [filteredLeads]);

  // Stats globales calculées avec useMemo
  const globalStats = useMemo(() => ({
    totalLeads: filteredLeads.length,
    totalValue: filteredLeads.reduce((sum, lead) => sum + (parseFloat(lead.deal_value) || 0), 0),
    wonDeals: filteredLeads.filter(l => l.stage === 'gagne').length,
    activeLeads: filteredLeads.filter(l => !['gagne', 'hors_scope', 'nrp'].includes(l.stage)).length
  }), [filteredLeads]);

  // Optimisation: mise à jour locale sans recharger toutes les données
  const onDragEnd = useCallback(async (result) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId) return;

    // Mise à jour optimiste immédiate
    setLeads(prevLeads =>
      prevLeads.map(lead =>
        lead.id === draggableId ? { ...lead, stage: destination.droppableId } : lead
      )
    );

    try {
      await api.patch(`/pipeline-leads/${draggableId}`, { stage: destination.droppableId });
      log('✅ Stage mis à jour:', draggableId, '->', destination.droppableId);
    } catch (err) {
      error('❌ Erreur update stage:', err);
      // Revert en cas d'erreur
      setLeads(prevLeads =>
        prevLeads.map(lead =>
          lead.id === draggableId ? { ...lead, stage: source.droppableId } : lead
        )
      );
    }
  }, []);

  // Leads par stage avec useMemo
  const leadsByStage = useMemo(() => {
    const grouped = {};
    STAGES.forEach(stage => {
      grouped[stage.id] = filteredLeads.filter(lead => lead.stage === stage.id);
    });
    return grouped;
  }, [filteredLeads]);

  // Quick Actions Handlers - optimisés avec useCallback
  const handleEmailClick = useCallback((lead) => {
    setSelectedLead(lead);
    setShowEmailModal(true);
  }, []);

  const handleCallClick = useCallback((lead) => {
    setSelectedLead(lead);
    setShowCallModal(true);
  }, []);

  const handleProposalClick = useCallback((lead) => {
    setSelectedLead(lead);
    setShowProposalModal(true);
  }, []);

  const handleContractClick = useCallback((lead) => {
    setSelectedLead(lead);
    setShowContractModal(true);
  }, []);

  const handleEditClick = useCallback((lead) => {
    setEditingLead(lead);
    setShowLeadModal(true);
  }, []);

  const handleViewHistory = useCallback((lead) => {
    setSelectedLead(lead);
    setShowHistoryModal(true);
  }, []);

  const handleRequestValidation = useCallback((lead) => {
    setSelectedLead(lead);
    setValidationRequestType('validation');
    setShowValidationModal(true);
  }, []);

  const handleRequestHelp = useCallback((lead) => {
    setSelectedLead(lead);
    setValidationRequestType('help');
    setShowValidationModal(true);
  }, []);

  const handleLeadShow = useCallback((lead) => {
    setSelectedLead(lead);
    setValidationRequestType('leadshow');
    setShowValidationModal(true);
  }, []);

  const handleCreateLead = useCallback((stageId) => {
    setCreatingLeadStage(stageId);
    setEditingLead(null);
    setShowLeadModal(true);
  }, []);

  const handleSaveLead = useCallback(async (leadData) => {
    try {
      if (editingLead) {
        await api.patch(`/pipeline-leads/${editingLead.id}`, leadData);
        log('✅ Lead mis à jour');
      } else {
        await api.post('/pipeline-leads', {
          ...leadData,
          stage: creatingLeadStage
        });
        log('✅ Lead créé');
      }

      setShowLeadModal(false);
      setEditingLead(null);
      setCreatingLeadStage(null);
      loadData();
    } catch (err) {
      error('❌ Erreur sauvegarde lead:', err);
      throw err;
    }
  }, [editingLead, creatingLeadStage, loadData]);

  const handleModalSuccess = useCallback(() => {
    loadData();
  }, [loadData]);

  if (prospectionMode) {
    return (
      <ProspectingMode 
        leads={filteredLeads}
        onExit={() => {
          setProspectionMode(false);
          loadData();
        }}
        onLeadUpdated={loadData}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Chargement du pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header compact */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          {/* Titre + Stats inline */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Target className="w-6 h-6 text-purple-600" />
              <h1 className="text-xl font-bold text-gray-900">Pipeline</h1>
            </div>

            {/* Mini stats inline */}
            <div className="hidden md:flex items-center gap-3 text-sm">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg font-medium">
                {globalStats.totalLeads} leads
              </span>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg font-medium">
                {globalStats.totalValue.toLocaleString()}€
              </span>
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg font-medium">
                {globalStats.wonDeals} gagnés
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Toggle Stats */}
            <button
              onClick={() => setShowStats(!showStats)}
              className={`p-2 rounded-lg transition-colors ${showStats ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              title={showStats ? 'Masquer les statistiques' : 'Afficher les statistiques'}
            >
              <BarChart3 className="w-5 h-5" />
            </button>

            {/* Toggle Filtres */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${showFilters ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              title={showFilters ? 'Masquer les filtres' : 'Afficher les filtres'}
            >
              <Filter className="w-5 h-5" />
            </button>

            {/* Filtre campagne compact */}
            <select
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-purple-500 max-w-[200px]"
            >
              <option value="all">Toutes ({leads.length})</option>
              {campaigns.map(campaign => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>

            {/* 🆕 Filtre par utilisateur pour managers/supervisors */}
            {isManagerOrSupervisor && teamMembers.length > 0 && (
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-purple-500 max-w-[200px]"
              >
                <option value="all">👥 Toute l'équipe</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            )}

            {/* Mode Prospection */}
            <button
              onClick={() => setProspectionMode(true)}
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow flex items-center gap-2 text-sm"
            >
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Prospection</span>
            </button>
          </div>
        </div>

        {/* Barre de recherche - collapsible */}
        {showFilters && (
          <div className="mt-3 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <span className="text-sm text-gray-500">
              {filteredLeads.length} résultat{filteredLeads.length > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Stats Cards - collapsible */}
      {showStats && (
        <div className="bg-white px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm p-3 text-white">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <div>
                  <p className="text-xs opacity-90">Total Leads</p>
                  <p className="text-xl font-bold">{globalStats.totalLeads}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-sm p-3 text-white">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                <div>
                  <p className="text-xs opacity-90">Valeur Totale</p>
                  <p className="text-xl font-bold">{globalStats.totalValue.toLocaleString()}€</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-sm p-3 text-white">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                <div>
                  <p className="text-xs opacity-90">Deals Gagnés</p>
                  <p className="text-xl font-bold">{globalStats.wonDeals}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-sm p-3 text-white">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <div>
                  <p className="text-xs opacity-90">En Cours</p>
                  <p className="text-xl font-bold">{globalStats.activeLeads}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kanban avec scroll optimisé */}
      <div className="flex-1 overflow-hidden p-4">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="h-full overflow-x-auto overflow-y-hidden pb-2">
            <div className="inline-flex gap-3 h-full">
              {STAGES.map(stage => (
                <div key={stage.id} className="flex-shrink-0 w-72 flex flex-col">
                  {/* Header de colonne compact */}
                  <div className={`${stage.color} text-white rounded-t-lg p-2.5 shadow flex items-center justify-between`}>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{stage.name}</h3>
                      <div className="text-xs opacity-90">
                        {(stats[stage.id]?.value || 0).toLocaleString()}€
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="bg-white/90 px-2 py-0.5 rounded-full font-bold text-xs text-gray-900">
                        {stats[stage.id]?.count || 0}
                      </span>
                      <button
                        onClick={() => handleCreateLead(stage.id)}
                        className="bg-white/90 hover:bg-white p-1 rounded transition-all text-gray-700"
                        title="Créer un lead"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Zone de drop */}
                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`${stage.bgLight} rounded-b-lg p-2 flex-1 overflow-y-auto transition-colors ${
                          snapshot.isDraggingOver ? 'ring-2 ring-blue-400 bg-blue-50' : ''
                        }`}
                        style={{
                          maxHeight: showStats ? 'calc(100vh - 280px)' : 'calc(100vh - 180px)',
                          minHeight: '400px'
                        }}
                      >
                        <div className="space-y-2 pb-20">
                          {leadsByStage[stage.id]?.map((lead, index) => (
                            <Draggable key={lead.id} draggableId={lead.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`transition-transform ${
                                    snapshot.isDragging ? 'rotate-1 scale-105 shadow-xl ring-2 ring-purple-400' : ''
                                  }`}
                                >
                                  <LeadCard
                                    lead={lead}
                                    onEmailClick={handleEmailClick}
                                    onCallClick={handleCallClick}
                                    onProposalClick={handleProposalClick}
                                    onContractClick={handleContractClick}
                                    onEditClick={handleEditClick}
                                    onViewHistory={handleViewHistory}
                                    onRequestValidation={handleRequestValidation}
                                    onRequestHelp={handleRequestHelp}
                                    onLeadShow={handleLeadShow}
                                  />
                                </div>
                              )}
                            </Draggable>
                          ))}
                        </div>
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </div>
        </DragDropContext>
      </div>

      {/* Modals */}
      {showLeadModal && (
        <LeadModal
          lead={editingLead}
          stage={creatingLeadStage}
          onClose={() => {
            setShowLeadModal(false);
            setEditingLead(null);
            setCreatingLeadStage(null);
          }}
          onSave={handleSaveLead}
        />
      )}

      {showEmailModal && selectedLead && (
        <QuickEmailModal
          lead={selectedLead}
          onClose={() => {
            setShowEmailModal(false);
            setSelectedLead(null);
          }}
          onSuccess={handleModalSuccess}
        />
      )}

      {showCallModal && selectedLead && (
        <QuickCallModal
          lead={selectedLead}
          onClose={() => {
            setShowCallModal(false);
            setSelectedLead(null);
          }}
          onSuccess={handleModalSuccess}
        />
      )}

      {showProposalModal && selectedLead && (
        <QuickProposalModal
          lead={selectedLead}
          onClose={() => {
            setShowProposalModal(false);
            setSelectedLead(null);
          }}
          onSuccess={handleModalSuccess}
        />
      )}

      {showContractModal && selectedLead && (
        <QuickContractModal
          lead={selectedLead}
          onClose={() => {
            setShowContractModal(false);
            setSelectedLead(null);
          }}
          onSuccess={handleModalSuccess}
        />
      )}

      {showHistoryModal && selectedLead && (
        <HistoryModal
          lead={selectedLead}
          onClose={() => {
            setShowHistoryModal(false);
            setSelectedLead(null);
          }}
        />
      )}

      {showValidationModal && selectedLead && (
        <ValidationRequestModal
          isOpen={showValidationModal}
          onClose={() => {
            setShowValidationModal(false);
            setSelectedLead(null);
          }}
          lead={selectedLead}
          type={validationRequestType}
        />
      )}
    </div>
  );
}