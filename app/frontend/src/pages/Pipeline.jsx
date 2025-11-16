import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { TrendingUp, Users, DollarSign, Clock, Filter, Search, Plus, Target } from 'lucide-react';
import api from '../api/axios';
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
  { id: 'hors_scope', name: 'Hors Scope', color: 'bg-orange-500', textColor: 'text-orange-700', bgLight: 'bg-orange-50' }
];

export default function Pipeline() {
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  
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
  const [validationRequestType, setValidationRequestType] = useState('validation'); // 'validation' ou 'help'
  const [selectedLead, setSelectedLead] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterLeads();
  }, [leads, selectedCampaign, searchQuery]);

  const loadData = async () => {
    try {
      const leadsResponse = await api.get('/pipeline-leads');
      const leadsData = leadsResponse.data.leads || [];
      
      const campaignsResponse = await api.get('/campaigns');
      const campaignsData = campaignsResponse.data.campaigns || [];
      
      console.log('✅ Leads chargés:', leadsData.length);
      console.log('✅ Campagnes chargées:', campaignsData.length);
      
      setLeads(leadsData);
      setCampaigns(campaignsData);
      setFilteredLeads(leadsData);
      calculateStats(leadsData);
      setLoading(false);
    } catch (error) {
      console.error('❌ Erreur chargement données:', error);
      setLoading(false);
    }
  };

  const filterLeads = () => {
    let filtered = [...leads];

    if (selectedCampaign !== 'all') {
      filtered = filtered.filter(lead => lead.campaign_id === selectedCampaign);
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

    setFilteredLeads(filtered);
    calculateStats(filtered);
  };

  const calculateStats = (leadsData) => {
    const statsByStage = {};
    STAGES.forEach(stage => {
      const stageLeads = leadsData.filter(l => l.stage === stage.id);
      statsByStage[stage.id] = {
        count: stageLeads.length,
        value: stageLeads.reduce((sum, l) => sum + (parseFloat(l.deal_value) || 0), 0)
      };
    });
    setStats(statsByStage);
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId) return;

    const updatedLeads = leads.map(lead => 
      lead.id === draggableId ? { ...lead, stage: destination.droppableId } : lead
    );
    setLeads(updatedLeads);

    try {
      await api.patch(`/pipeline-leads/${draggableId}`, { stage: destination.droppableId });
      console.log('✅ Stage mis à jour:', draggableId, '->', destination.droppableId);
    } catch (error) {
      console.error('❌ Erreur update stage:', error);
      loadData();
    }
  };

  const getLeadsByStage = (stageId) => {
    return filteredLeads.filter(lead => lead.stage === stageId);
  };

  // Quick Actions Handlers
  const handleEmailClick = (lead) => {
    setSelectedLead(lead);
    setShowEmailModal(true);
  };

  const handleCallClick = (lead) => {
    setSelectedLead(lead);
    setShowCallModal(true);
  };

  const handleProposalClick = (lead) => {
    setSelectedLead(lead);
    setShowProposalModal(true);
  };

  const handleContractClick = (lead) => {
    setSelectedLead(lead);
    setShowContractModal(true);
  };

  const handleEditClick = (lead) => {
    setEditingLead(lead);
    setShowLeadModal(true);
  };

  const handleViewHistory = (lead) => {
    setSelectedLead(lead);
    setShowHistoryModal(true);
  };

  const handleRequestValidation = (lead) => {
    setSelectedLead(lead);
    setValidationRequestType('validation');
    setShowValidationModal(true);
  };

  const handleRequestHelp = (lead) => {
    setSelectedLead(lead);
    setValidationRequestType('help');
    setShowValidationModal(true);
  };

  const handleCreateLead = (stageId) => {
    setCreatingLeadStage(stageId);
    setEditingLead(null);
    setShowLeadModal(true);
  };

  const handleSaveLead = async (leadData) => {
    try {
      if (editingLead) {
        await api.patch(`/pipeline-leads/${editingLead.id}`, leadData);
        console.log('✅ Lead mis à jour');
      } else {
        await api.post('/pipeline-leads', {
          ...leadData,
          stage: creatingLeadStage
        });
        console.log('✅ Lead créé');
      }
      
      setShowLeadModal(false);
      setEditingLead(null);
      setCreatingLeadStage(null);
      loadData();
    } catch (error) {
      console.error('❌ Erreur sauvegarde lead:', error);
      throw error;
    }
  };

  const handleModalSuccess = () => {
    loadData();
  };

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

  const totalLeads = filteredLeads.length;
  const totalValue = filteredLeads.reduce((sum, lead) => sum + (parseFloat(lead.deal_value) || 0), 0);
  const wonDeals = filteredLeads.filter(l => l.stage === 'gagne').length;
  const activeLeads = filteredLeads.filter(l => !['gagne', 'hors_scope', 'nrp'].includes(l.stage)).length;

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header fixe */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-6 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Target className="w-8 h-8 text-purple-600" />
              Pipeline Commercial
            </h1>
            <p className="text-gray-600 mt-1">Gérez vos opportunités de la prospection à la signature</p>
          </div>

          <button
            onClick={() => setProspectionMode(true)}
            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg flex items-center gap-2"
          >
            <TrendingUp className="w-5 h-5" />
            Mode Prospection
          </button>
        </div>

        {/* Filtres */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher (entreprise, contact, email, téléphone...)"
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 appearance-none bg-white"
            >
              <option value="all">Toutes les campagnes</option>
              {campaigns.map(campaign => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="bg-white px-6 py-4 border-b border-gray-200 flex-shrink-0">
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md p-4 text-white">
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6" />
              <div>
                <p className="text-xs font-medium opacity-90">Total Leads</p>
                <p className="text-2xl font-bold">{totalLeads}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-md p-4 text-white">
            <div className="flex items-center gap-2">
              <DollarSign className="w-6 h-6" />
              <div>
                <p className="text-xs font-medium opacity-90">Valeur Totale</p>
                <p className="text-2xl font-bold">{totalValue.toLocaleString()}€</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-md p-4 text-white">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              <div>
                <p className="text-xs font-medium opacity-90">Deals Gagnés</p>
                <p className="text-2xl font-bold">{wonDeals}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-md p-4 text-white">
            <div className="flex items-center gap-2">
              <Clock className="w-6 h-6" />
              <div>
                <p className="text-xs font-medium opacity-90">En Cours</p>
                <p className="text-2xl font-bold">{activeLeads}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban avec scroll optimisé */}
      <div className="flex-1 overflow-hidden p-6">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="h-full overflow-x-auto overflow-y-hidden">
            <div className="inline-flex gap-4 h-full">
              {STAGES.map(stage => (
                <div key={stage.id} className="flex-shrink-0 w-80 flex flex-col">
                  <div className={`${stage.color} text-white rounded-t-xl p-3 shadow-lg flex items-center justify-between mb-2`}>
                    <div className="flex-1">
                      <h3 className="font-bold text-base">{stage.name}</h3>
                      <div className="text-xs opacity-90 font-semibold mt-0.5">
                        {(stats[stage.id]?.value || 0).toLocaleString()}€
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-white px-2.5 py-1 rounded-full font-bold text-sm text-gray-900">
                        {stats[stage.id]?.count || 0}
                      </span>
                      <button
                        onClick={() => handleCreateLead(stage.id)}
                        className="bg-white hover:bg-gray-100 p-1.5 rounded-lg transition-all text-gray-700"
                        title="Créer un lead"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`${stage.bgLight} rounded-b-xl p-3 flex-1 overflow-y-auto transition-all ${
                          snapshot.isDraggingOver ? 'ring-4 ring-blue-300 bg-blue-100' : ''
                        }`}
                        style={{ 
                          maxHeight: 'calc(100vh - 420px)',
                          minHeight: '500px'
                        }}
                      >
                        <div className="space-y-3 pb-32">
                          {getLeadsByStage(stage.id).map((lead, index) => (
                            <Draggable key={lead.id} draggableId={lead.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`transition-all cursor-move ${
                                    snapshot.isDragging ? 'rotate-2 scale-105 shadow-2xl ring-4 ring-purple-400' : ''
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