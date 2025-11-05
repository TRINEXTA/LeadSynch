import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { TrendingUp, Users, DollarSign, Clock, Mail, Phone, MapPin, Star, PhoneCall, Filter, Search, Plus, Target, Edit } from 'lucide-react';
import api from '../api/axios';
import QualificationModal from '../components/QualificationModal';
import CallNotesPanel from '../components/CallNotesPanel';
import ProspectionMode from './ProspectionMode';
import LeadModal from '../components/LeadModal';

const STAGES = [
  { id: 'cold_call', name: 'Cold Call', color: 'bg-indigo-500', textColor: 'text-indigo-700', bgLight: 'bg-indigo-50' },
  { id: 'leads_click', name: 'Leads Click', color: 'bg-cyan-500', textColor: 'text-cyan-700', bgLight: 'bg-cyan-50' },
  { id: 'nrp', name: 'NRP', color: 'bg-gray-500', textColor: 'text-gray-700', bgLight: 'bg-gray-50' },
  { id: 'qualifie', name: 'Qualifie', color: 'bg-blue-500', textColor: 'text-blue-700', bgLight: 'bg-blue-50' },
  { id: 'relancer', name: 'A Relancer', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgLight: 'bg-yellow-50' },
  { id: 'tres_qualifie', name: 'Tres Qualifie/RDV', color: 'bg-green-500', textColor: 'text-green-700', bgLight: 'bg-green-50' },
  { id: 'proposition', name: 'Proposition', color: 'bg-purple-500', textColor: 'text-purple-700', bgLight: 'bg-purple-50' },
  { id: 'gagne', name: 'Gagne', color: 'bg-emerald-600', textColor: 'text-emerald-700', bgLight: 'bg-emerald-50' },
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
  const [activeCall, setActiveCall] = useState(null);
  const [callStartTime, setCallStartTime] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [showQualificationModal, setShowQualificationModal] = useState(false);
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [currentLead, setCurrentLead] = useState(null);
  const [callNotes, setCallNotes] = useState('');
  const [prospectionMode, setProspectionMode] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [creatingLeadStage, setCreatingLeadStage] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let interval;
    if (callStartTime) {
      interval = setInterval(() => {
        const duration = Math.floor((Date.now() - callStartTime) / 1000);
        setCallDuration(duration);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStartTime]);

  useEffect(() => {
    filterLeads();
  }, [leads, selectedCampaign, searchQuery]);

  const loadData = async () => {
    try {
      const leadsResponse = await api.get('/pipeline-leads');
      const leadsData = leadsResponse.data.leads || [];
      
      const campaignsResponse = await api.get('/campaigns');
      const campaignsData = campaignsResponse.data.campaigns || [];
      
      console.log('Leads charges:', leadsData.length);
      console.log('Campagnes chargees:', campaignsData.length);
      
      setLeads(leadsData);
      setCampaigns(campaignsData);
      setFilteredLeads(leadsData);
      calculateStats(leadsData);
      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement donnees:', error);
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
      console.log('Stage mis a jour:', draggableId, '->', destination.droppableId);
    } catch (error) {
      console.error('Erreur update stage:', error);
      loadData();
    }
  };

  const handleStartCall = async (lead) => {
    try {
      setCallStartTime(Date.now());
      setCallDuration(0);
      setActiveCall(lead.id);
      setCurrentLead(lead);
      setCallNotes('');
      setShowNotesPanel(true);

      if (lead.phone) {
        const cleanPhone = lead.phone.replace(/[\s\-\(\)]/g, '');
        const telLink = document.createElement('a');
        telLink.href = `tel:${cleanPhone}`;
        telLink.style.display = 'none';
        document.body.appendChild(telLink);
        telLink.click();
        document.body.removeChild(telLink);
        console.log('Ouverture Teams/Skype pour:', cleanPhone);
      }

      await api.post(`/pipeline-leads/${lead.id}/start-call`);
      console.log('Appel demarre pour:', lead.company_name);
    } catch (error) {
      console.error('Erreur demarrage appel:', error);
    }
  };

  const handleEndCall = () => {
    setShowNotesPanel(false);
    setShowQualificationModal(true);
  };

  const handleNotesChange = (newNotes) => {
    setCallNotes(newNotes);
  };

  const handleQualify = async (qualificationData) => {
    try {
      await api.post(`/pipeline-leads/${currentLead.id}/qualify`, qualificationData);
      console.log('Lead qualifie:', currentLead.company_name);
      
      setShowQualificationModal(false);
      setActiveCall(null);
      setCallStartTime(null);
      setCallDuration(0);
      setCurrentLead(null);
      setCallNotes('');
      
      loadData();
    } catch (error) {
      console.error('Erreur qualification:', error);
    }
  };

  const handleEditLead = (lead) => {
    setEditingLead(lead);
    setShowLeadModal(true);
  };

  const handleCreateLead = (stage) => {
    setCreatingLeadStage(stage);
    setEditingLead(null);
    setShowLeadModal(true);
  };

  const handleSaveLead = async (leadData) => {
    try {
      if (editingLead) {
        const actualLeadId = editingLead.lead_id || editingLead.id;
        await api.put(`/leads/${actualLeadId}`, leadData);
        console.log('Lead mis a jour');
      } else {
        const response = await api.post('/leads', leadData);
        const newLead = response.data.lead;
        
        await api.post('/pipeline-leads', {
          lead_id: newLead.id,
          campaign_id: null,
          stage: creatingLeadStage,
          tenant_id: newLead.tenant_id
        });
        
        console.log('Lead cree et ajoute au pipeline');
      }
      loadData();
      setShowLeadModal(false);
      setEditingLead(null);
      setCreatingLeadStage(null);
    } catch (error) {
      console.error('Erreur sauvegarde lead:', error);
      alert(`Erreur: ${error.response?.data?.error || error.message}`);
    }
  };

  const getLeadsByStage = (stageId) => filteredLeads.filter(lead => lead.stage === stageId);

  if (prospectionMode) {
    return (
      <ProspectionMode
        leads={filteredLeads}
        onExit={() => setProspectionMode(false)}
        onLeadUpdated={loadData}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const totalValue = filteredLeads.reduce((sum, l) => sum + (parseFloat(l.deal_value) || 0), 0);
  const conversionRate = filteredLeads.length > 0 ? Math.round((stats.gagne?.count || 0) / filteredLeads.length * 100) : 0;
  const activeLeads = filteredLeads.filter(l => !['gagne', 'perdu'].includes(l.stage)).length;

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Notification appel en cours */}
      {activeCall && (
        <div className="fixed top-4 right-4 bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-xl shadow-2xl z-50 animate-pulse">
          <div className="flex items-center gap-3">
            <PhoneCall className="w-6 h-6 animate-bounce" />
            <div>
              <p className="font-bold">Appel en cours...</p>
              <p className="text-sm">{Math.floor(callDuration / 60)}m {callDuration % 60}s</p>
            </div>
            <button
              onClick={handleEndCall}
              className="ml-4 bg-white text-green-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-all"
            >
              Terminer
            </button>
          </div>
        </div>
      )}

      {/* Panel de notes - TOUJOURS VISIBLE pendant l'appel */}
      {showNotesPanel && currentLead && (
        <CallNotesPanel
          lead={currentLead}
          callDuration={callDuration}
          notes={callNotes}
          onNotesChange={handleNotesChange}
          onClose={() => {
            setShowNotesPanel(false);
            setActiveCall(null);
            setCallStartTime(null);
            setCallDuration(0);
            setCurrentLead(null);
            setCallNotes('');
          }}
        />
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-purple-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Pipeline Commercial</h1>
              <p className="text-gray-600">Glissez-deposez vos opportunites entre les etapes</p>
            </div>
          </div>
          
          <button
            onClick={() => setProspectionMode(true)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg flex items-center gap-2"
          >
            <Target className="w-5 h-5" />
            Mode Prospection
          </button>
        </div>

        {/* Filtres */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un lead (nom, entreprise, email, telephone, ville)..."
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <select
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              className="pl-10 pr-8 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all appearance-none bg-white cursor-pointer min-w-[250px]"
            >
              <option value="all">Toutes les campagnes</option>
              {campaigns.map(campaign => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name} ({campaign.leads_count || 0} leads)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-lg border-2 border-blue-200 hover:shadow-xl transition-shadow">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Leads</p>
              <p className="text-2xl font-bold text-blue-700">{filteredLeads.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-lg border-2 border-green-200 hover:shadow-xl transition-shadow">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600 font-medium">Valeur Totale</p>
              <p className="text-2xl font-bold text-green-700">{totalValue.toLocaleString()}?</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-lg border-2 border-purple-200 hover:shadow-xl transition-shadow">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600 font-medium">Taux Conversion</p>
              <p className="text-2xl font-bold text-purple-700">{conversionRate}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-lg border-2 border-orange-200 hover:shadow-xl transition-shadow">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-orange-600" />
            <div>
              <p className="text-sm text-gray-600 font-medium">En Cours</p>
              <p className="text-2xl font-bold text-orange-700">{activeLeads}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map(stage => (
            <div key={stage.id} className="flex-shrink-0 w-80">
              <div className={`${stage.color} text-white rounded-t-xl p-4 shadow-lg flex items-center justify-between`}>
                <div>
                  <h3 className="font-bold text-lg">{stage.name}</h3>
                  <div className="text-sm opacity-90 font-semibold">
                    {(stats[stage.id]?.value || 0).toLocaleString()}?
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-white bg-opacity-30 px-3 py-1 rounded-full font-bold text-sm">
                    {stats[stage.id]?.count || 0}
                  </span>
                  <button
                    onClick={() => handleCreateLead(stage.id)}
                    className="bg-white bg-opacity-30 hover:bg-opacity-50 p-2 rounded-lg transition-all"
                    title="Creer un lead"
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
                    className={`${stage.bgLight} rounded-b-xl p-3 min-h-[600px] transition-all ${
                      snapshot.isDraggingOver ? 'ring-4 ring-blue-300 bg-blue-100' : ''
                    }`}
                  >
                    <div className="space-y-3">
                      {getLeadsByStage(stage.id).map((lead, index) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white rounded-lg p-4 shadow-md border-2 border-gray-200 hover:shadow-xl transition-all cursor-move relative group ${
                                snapshot.isDragging ? 'rotate-2 shadow-2xl ring-4 ring-purple-300' : ''
                              } ${activeCall === lead.id ? 'ring-4 ring-green-400' : ''}`}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditLead(lead);
                                }}
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-blue-500 text-white p-1.5 rounded-lg hover:bg-blue-600 transition-all"
                                title="Editer le lead"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-bold text-gray-900 pr-8">{lead.company_name}</h4>
                                {lead.score > 70 && (
                                  <div className="flex items-center gap-1 text-yellow-600">
                                    <Star className="w-4 h-4 fill-yellow-500" />
                                    <span className="text-xs font-bold">{lead.score}</span>
                                  </div>
                                )}
                              </div>

                              {lead.contact_name && (
                                <p className="text-sm text-gray-600 mb-3">{lead.contact_name}</p>
                              )}

                              {lead.campaign_name && (
                                <div className="mb-3">
                                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-semibold">
                                    {lead.campaign_name}
                                  </span>
                                </div>
                              )}

                              <div className="space-y-2">
                                {lead.email && (
                                  <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <Mail className="w-3 h-3" />
                                    <span className="truncate">{lead.email}</span>
                                  </div>
                                )}
                                {lead.phone && (
                                  <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <Phone className="w-3 h-3" />
                                    <span>{lead.phone}</span>
                                  </div>
                                )}
                                {lead.city && (
                                  <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <MapPin className="w-3 h-3" />
                                    <span>{lead.city}</span>
                                  </div>
                                )}
                              </div>

                              {lead.phone && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartCall(lead);
                                  }}
                                  disabled={activeCall !== null}
                                  className="mt-3 w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-2 px-4 rounded-lg hover:from-green-600 hover:to-green-700 transition-all flex items-center justify-center gap-2 font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <PhoneCall className="w-4 h-4" />
                                  {activeCall === lead.id ? 'En cours...' : 'Appeler'}
                                </button>
                              )}

                              {lead.deal_value && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">Valeur</span>
                                    <span className="font-bold text-green-600">
                                      {parseFloat(lead.deal_value).toLocaleString()}?
                                    </span>
                                  </div>
                                </div>
                              )}
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
      </DragDropContext>

      {/* Modal Qualification */}
      {showQualificationModal && currentLead && (
        <QualificationModal
          lead={currentLead}
          callDuration={callDuration}
          notes={callNotes}
          onClose={() => {
            setShowQualificationModal(false);
            setActiveCall(null);
            setCallStartTime(null);
            setCallDuration(0);
            setCurrentLead(null);
            setCallNotes('');
          }}
          onQualify={handleQualify}
        />
      )}

      {/* Modal Lead */}
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
    </div>
  );
}