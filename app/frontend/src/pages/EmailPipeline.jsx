import { log, error, warn } from "./../lib/logger.js";
﻿import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { TrendingUp, Users, DollarSign, Clock, Mail, Phone, MapPin, Star, X, Filter } from 'lucide-react';
import api from '../api/axios';

const STAGES = [
  { id: 'leads_click', name: 'Leads Click', color: 'bg-cyan-500', textColor: 'text-cyan-700', bgLight: 'bg-cyan-50' },
  { id: 'nrp', name: 'NRP', color: 'bg-gray-500', textColor: 'text-gray-700', bgLight: 'bg-gray-50' },
  { id: 'qualifié', name: 'Qualifié', color: 'bg-blue-500', textColor: 'text-blue-700', bgLight: 'bg-blue-50' },
  { id: 'relancer', name: 'À Relancer', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgLight: 'bg-yellow-50' },
  { id: 'très_qualifié', name: 'Très Qualifié/RDV', color: 'bg-green-500', textColor: 'text-green-700', bgLight: 'bg-green-50' },
  { id: 'proposition', name: 'Proposition', color: 'bg-purple-500', textColor: 'text-purple-700', bgLight: 'bg-purple-50' },
  { id: 'gagné', name: 'Gagné', color: 'bg-emerald-600', textColor: 'text-emerald-700', bgLight: 'bg-emerald-50' },
  { id: 'hors_scope', name: 'Hors Scope', color: 'bg-orange-500', textColor: 'text-orange-700', bgLight: 'bg-orange-50' }
];

export default function EmailPipeline() {
  const [leads, setLeads] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState('all');

  useEffect(() => {
    loadLeads();
    loadCampaigns();
  }, []);

  useEffect(() => {
    const filtered = getFilteredLeadsByCampaign();
    calculateStats(filtered);
  }, [selectedCampaign, leads]);

  const loadLeads = async () => {
    try {
      const response = await api.get('/leads');
      const leadsData = response.data.leads || [];
      log('Leads chargés:', leadsData.length);
      setLeads(leadsData);
      setLoading(false);
    } catch (error) {
      error('Erreur:', error);
      setLoading(false);
    }
  };

  const loadCampaigns = async () => {
    try {
      const response = await api.get('/campaigns');
      setCampaigns(response.data.campaigns || []);
    } catch (error) {
      error('Erreur campaigns:', error);
    }
  };

  const getFilteredLeadsByCampaign = () => {
    if (selectedCampaign === 'all') return leads;
    return leads.filter(l => l.campaign_id === selectedCampaign);
  };

  const calculateStats = (leadsData) => {
    const statsByStage = {};
    STAGES.forEach(stage => {
      const stageLeads = leadsData.filter(l => l.status === stage.id);
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
      lead.id === draggableId ? { ...lead, status: destination.droppableId } : lead
    );
    setLeads(updatedLeads);

    try {
      await api.patch(`/leads/${draggableId}`, { status: destination.droppableId });
    } catch (error) {
      error('Erreur:', error);
      loadLeads();
    }
  };

  const handleUpdateLead = async () => {
    try {
      await api.patch(`/leads/${selectedLead.id}`, {
        deal_value: selectedLead.deal_value,
        score: selectedLead.score,
        notes: selectedLead.notes
      });
      
      const updatedLeads = leads.map(l => 
        l.id === selectedLead.id ? selectedLead : l
      );
      setLeads(updatedLeads);
      setSelectedLead(null);
    } catch (error) {
      error('Erreur:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  const getLeadsByStage = (stageId) => {
    const filteredLeads = getFilteredLeadsByCampaign();
    return filteredLeads.filter(lead => lead.status === stageId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const filteredLeads = getFilteredLeadsByCampaign();
  const totalValue = filteredLeads.reduce((sum, l) => sum + (parseFloat(l.deal_value) || 0), 0);
  const conversionRate = filteredLeads.length > 0 ? Math.round((stats.gagné?.count || 0) / filteredLeads.length * 100) : 0;
  const activeLeads = filteredLeads.filter(l => !['gagné', 'hors_scope'].includes(l.status)).length;

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-purple-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Pipeline Commercial</h1>
              <p className="text-gray-600">Glissez-déposez vos opportunités entre les étapes</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-md border-2 border-purple-200">
            <Filter className="w-5 h-5 text-purple-600" />
            <select
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              className="px-3 py-1 border-0 focus:ring-2 focus:ring-purple-500 rounded-lg font-semibold text-gray-700 bg-transparent cursor-pointer"
            >
              <option value="all">📊 Toutes les campagnes</option>
              {campaigns.map(campaign => (
                <option key={campaign.id} value={campaign.id}>
                  📧 {campaign.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

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
              <p className="text-2xl font-bold text-green-700">{totalValue.toLocaleString()}€</p>
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

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map(stage => (
            <div key={stage.id} className="flex-shrink-0 w-80">
              <div className={`${stage.color} text-white rounded-t-xl p-4 shadow-lg`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg">{stage.name}</h3>
                  <span className="bg-white bg-opacity-30 px-3 py-1 rounded-full font-bold text-sm">
                    {stats[stage.id]?.count || 0}
                  </span>
                </div>
                <div className="text-sm opacity-90 font-semibold">
                  {(stats[stage.id]?.value || 0).toLocaleString()}€
                </div>
              </div>

              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`${stage.bgLight} rounded-b-xl p-3 min-h-[600px] transition-all ${
                      snapshot.isDraggingOver ? 'ring-4 ring-blue-300' : ''
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
                              onClick={() => setSelectedLead(lead)}
                              className={`bg-white rounded-lg p-4 shadow-md border-2 border-gray-200 hover:shadow-xl transition-all cursor-move ${
                                snapshot.isDragging ? 'rotate-2 shadow-2xl ring-4 ring-purple-300' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-bold text-gray-900">{lead.company_name}</h4>
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

                              {lead.deal_value && parseFloat(lead.deal_value) > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">Valeur</span>
                                    <span className="font-bold text-green-600">
                                      {parseFloat(lead.deal_value).toLocaleString()}€
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

      {selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{selectedLead.company_name}</h2>
              <button onClick={() => setSelectedLead(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Valeur du deal (€)
                  </label>
                  <input
                    type="number"
                    value={selectedLead.deal_value || ''}
                    onChange={(e) => setSelectedLead({...selectedLead, deal_value: e.target.value})}
                    placeholder="Ex: 15000"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Star className="w-4 h-4 inline mr-1" />
                    Score
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={selectedLead.score || 50}
                    onChange={(e) => setSelectedLead({...selectedLead, score: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                <textarea
                  value={selectedLead.notes || ''}
                  onChange={(e) => setSelectedLead({...selectedLead, notes: e.target.value})}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ajouter des notes..."
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => setSelectedLead(null)}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300"
                >
                  Annuler
                </button>
                <button
                  onClick={handleUpdateLead}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 shadow-lg"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
