import { log, error, warn } from "../lib/logger.js";
﻿import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Users, TrendingUp, Building, Mail, Phone, MapPin, Globe, Filter, Search, Download, Send, Trash2, RefreshCw, BarChart3, Target, Plus } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import CreateLeadModal from '../components/CreateLeadModal';
import LeadDetailsModal from '../components/LeadDetailsModal';

const SECTEURS_MAPPING = {
  juridique: { label: "Juridique / Legal", icon: "⚖️", color: "from-blue-500 to-cyan-500" },
  comptabilite: { label: "Comptabilite", icon: "💼", color: "from-green-500 to-emerald-500" },
  sante: { label: "Sante", icon: "🏥", color: "from-red-500 to-pink-500" },
  informatique: { label: "Informatique / IT", icon: "💻", color: "from-purple-500 to-indigo-500" },
  btp: { label: "BTP / Construction", icon: "🏗️", color: "from-orange-500 to-amber-500" },
  hotellerie: { label: "Hotellerie-Restauration", icon: "🏨", color: "from-yellow-500 to-orange-500" },
  immobilier: { label: "Immobilier", icon: "🏢", color: "from-teal-500 to-cyan-500" },
  logistique: { label: "Logistique / Transport", icon: "🚚", color: "from-gray-600 to-gray-700" },
  commerce: { label: "Commerce / Retail", icon: "🛒", color: "from-pink-500 to-rose-500" },
  education: { label: "Education", icon: "📚", color: "from-indigo-500 to-purple-500" },
  consulting: { label: "Consulting", icon: "💡", color: "from-yellow-400 to-yellow-600" },
  rh: { label: "Ressources Humaines", icon: "👥", color: "from-blue-400 to-blue-600" },
  services: { label: "Services", icon: "🔧", color: "from-gray-500 to-gray-600" },
  industrie: { label: "Industrie", icon: "🏭", color: "from-slate-600 to-slate-700" },
  automobile: { label: "Automobile", icon: "🚗", color: "from-red-600 to-red-700" },
  autre: { label: "Autre", icon: "📁", color: "from-gray-400 to-gray-500" }
};

export default function DatabaseDetails() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const databaseId = searchParams.get('id');

  const [database, setDatabase] = useState(null);
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSector, setSelectedSector] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [stats, setStats] = useState({});
  const [showCreateLeadModal, setShowCreateLeadModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (databaseId) {
      loadDatabaseDetails();
    }
  }, [databaseId]);

  useEffect(() => {
    filterLeads();
  }, [leads, selectedSector, searchQuery]);

  const loadDatabaseDetails = async () => {
    try {
      const response = await api.get(`/lead-databases/${databaseId}`);
      const dbData = response.data.database;

      setDatabase(dbData);
      setLeads(dbData.leads || []);
      calculateStats(dbData.leads || []);
      setLoading(false);
    } catch (error) {
      error('Erreur chargement base:', error);
      toast.error('Erreur lors du chargement de la base');
      navigate('/LeadDatabases');
    }
  };

  const calculateStats = (leadsData) => {
    const sectorCount = {};
    let validEmails = 0;
    let validPhones = 0;
    let withWebsite = 0;

    leadsData.forEach(lead => {
      const sector = lead.sector || 'autre';
      sectorCount[sector] = (sectorCount[sector] || 0) + 1;
      
      if (lead.email && lead.email.includes('@')) validEmails++;
      if (lead.phone) validPhones++;
      if (lead.website) withWebsite++;
    });

    setStats({
      total: leadsData.length,
      sectors: sectorCount,
      validEmails,
      validPhones,
      withWebsite
    });
  };

  const filterLeads = () => {
    let filtered = [...leads];

    if (selectedSector !== 'all') {
      filtered = filtered.filter(lead => (lead.sector || 'autre') === selectedSector);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(lead =>
        lead.company_name?.toLowerCase().includes(query) ||
        lead.email?.toLowerCase().includes(query) ||
        lead.phone?.includes(query) ||
        lead.city?.toLowerCase().includes(query) ||
        lead.website?.toLowerCase().includes(query)
      );
    }

    // 🚀 OPTIMISATION : Limiter à 100 leads pour performance
    const limitedFiltered = filtered.slice(0, 100);
    setFilteredLeads(limitedFiltered);
  };

  const handleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map(l => l.id));
    }
  };

  const handleSelectLead = (leadId) => {
    if (selectedLeads.includes(leadId)) {
      setSelectedLeads(selectedLeads.filter(id => id !== leadId));
    } else {
      setSelectedLeads([...selectedLeads, leadId]);
    }
  };

  const handleExportStats = () => {
    const statsData = {
      database: database.name,
      date: new Date().toLocaleDateString('fr-FR'),
      total_leads: stats.total,
      emails_valides: stats.validEmails,
      telephones_valides: stats.validPhones,
      avec_website: stats.withWebsite,
      repartition_secteurs: stats.sectors
    };

    const blob = new Blob([JSON.stringify(statsData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stats-${database.name}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('📊 Stats exportées avec succès !');
  };

  const handleAddToCampaign = () => {
    if (selectedLeads.length === 0) {
      toast.warning('⚠️ Sélectionnez au moins 1 lead');
      return;
    }

    // Stocker les leads sélectionnés et rediriger vers création campagne
    sessionStorage.setItem('selected_leads', JSON.stringify(selectedLeads));
    sessionStorage.setItem('selected_database_id', databaseId);
    navigate('/CampaignsManager');
  };

  const handleDeleteSelected = () => {
    if (selectedLeads.length === 0) {
      toast.warning('⚠️ Sélectionnez au moins 1 lead');
      return;
    }
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    const promise = api.post(`/lead-databases/${databaseId}/delete-leads`, {
      lead_ids: selectedLeads
    }).then(() => {
      setShowDeleteModal(false);
      setSelectedLeads([]);
      loadDatabaseDetails();
    });

    toast.promise(promise, {
      loading: 'Suppression en cours...',
      success: `🗑️ ${selectedLeads.length} lead(s) supprimé(s) avec succès`,
      error: 'Erreur lors de la suppression',
    });
  };

  const handleRefresh = () => {
    loadDatabaseDetails();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de la base...</p>
        </div>
      </div>
    );
  }

  if (!database) {
    return (
      <div className="p-6">
        <p className="text-red-600">Base de donnees introuvable</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/LeadDatabases')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 font-semibold"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour aux bases
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{database.name}</h1>
              {database.description && (
                <p className="text-gray-600">{database.description}</p>
              )}
            </div>

            <button
              onClick={handleRefresh}
              className="bg-white border-2 border-gray-300 text-gray-700 px-4 py-2 rounded-xl font-semibold hover:bg-gray-50 flex items-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Actualiser
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-blue-200">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Leads</p>
                <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-green-200">
            <div className="flex items-center gap-3 mb-2">
              <Mail className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600 font-medium">Emails Valides</p>
                <p className="text-3xl font-bold text-green-600">{stats.validEmails}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-purple-200">
            <div className="flex items-center gap-3 mb-2">
              <Phone className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600 font-medium">Telephones</p>
                <p className="text-3xl font-bold text-purple-600">{stats.validPhones}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-orange-200">
            <div className="flex items-center gap-3 mb-2">
              <Globe className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600 font-medium">Websites</p>
                <p className="text-3xl font-bold text-orange-600">{stats.withWebsite}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Secteurs */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-purple-600" />
              Repartition par secteur
            </h2>
            <button
              onClick={() => setShowCreateLeadModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="w-5 h-5" />
              Nouveau Lead
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setSelectedSector('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                selectedSector === 'all'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tous ({stats.total})
            </button>

            {Object.entries(stats.sectors || {}).map(([sector, count]) => {
              const sectorInfo = SECTEURS_MAPPING[sector] || SECTEURS_MAPPING.autre;
              return (
                <button
                  key={sector}
                  onClick={() => setSelectedSector(sector)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    selectedSector === sector
                      ? `bg-gradient-to-r ${sectorInfo.color} text-white shadow-lg`
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {sectorInfo.icon} {sectorInfo.label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions Bar */}
        {selectedLeads.length > 0 && (
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-2xl p-4 mb-6 flex items-center justify-between">
            <div className="text-white">
              <p className="font-bold text-lg">{selectedLeads.length} lead(s) selectionne(s)</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAddToCampaign}
                className="bg-white text-purple-600 px-6 py-3 rounded-xl font-bold hover:bg-gray-100 flex items-center gap-2"
              >
                <Send className="w-5 h-5" />
                Ajouter a une campagne
              </button>
              <button
                onClick={handleDeleteSelected}
                className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 flex items-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                Supprimer
              </button>
            </div>
          </div>
        )}

        {/* Filters & Search */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un lead..."
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500"
            />
          </div>

          <button
            onClick={handleExportStats}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Exporter Stats
          </button>
        </div>

        {/* Leads Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                <tr>
                  <th className="p-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                      onChange={handleSelectAll}
                      className="w-5 h-5"
                    />
                  </th>
                  <th className="p-4 text-left font-bold">Entreprise</th>
                  <th className="p-4 text-left font-bold">Secteur</th>
                  <th className="p-4 text-left font-bold">Email</th>
                  <th className="p-4 text-left font-bold">Telephone</th>
                  <th className="p-4 text-left font-bold">Ville</th>
                  <th className="p-4 text-left font-bold">Website</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-12 text-center">
                      <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">Aucun lead trouve</p>
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead, index) => {
                    const sector = SECTEURS_MAPPING[lead.sector || 'autre'] || SECTEURS_MAPPING.autre;
                    return (
                      <tr
                        key={lead.id}
                        onClick={(e) => {
                          if (e.target.type !== 'checkbox' && !e.target.closest('input[type="checkbox"]')) {
                            setSelectedLead(lead);
                          }
                        }}
                        className={`border-b border-gray-200 hover:bg-purple-50 transition-all cursor-pointer ${
                          index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                        }`}
                      >
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selectedLeads.includes(lead.id)}
                            onChange={() => handleSelectLead(lead.id)}
                            className="w-5 h-5"
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Building className="w-5 h-5 text-gray-600" />
                            <span className="font-bold text-gray-900">{lead.company_name || '-'}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-lg text-white text-sm font-semibold bg-gradient-to-r ${sector.color}`}>
                            {sector.icon} {sector.label}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-gray-700">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span className="text-sm">{lead.email || '-'}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-gray-700">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span className="text-sm">{lead.phone || '-'}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-gray-700">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span className="text-sm">{lead.city || '-'}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          {lead.website ? (
                            <a
                              href={lead.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                            >
                              <Globe className="w-4 h-4" />
                              <span>Visiter</span>
                            </a>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {filteredLeads.length > 0 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 text-center">
                Affichage de <span className="font-bold text-gray-900">{filteredLeads.length}</span> lead(s) 
                {filteredLeads.length === 100 && <span className="text-orange-600"> (limité à 100 pour performance - utilisez la recherche pour affiner)</span>}
                {' '}sur <span className="font-bold text-gray-900">{stats.total}</span>
              </p>
            </div>
          )}
        </div>

        {/* Modal création lead */}
        {showCreateLeadModal && (
          <CreateLeadModal
            databaseId={databaseId}
            preselectedSector={selectedSector !== 'all' ? selectedSector : null}
            onClose={() => setShowCreateLeadModal(false)}
            onSuccess={() => {
              setShowCreateLeadModal(false);
              loadDatabaseDetails();
            }}
          />
        )}

        {/* Modal détails du lead */}
        {selectedLead && (
          <LeadDetailsModal
            lead={selectedLead}
            onClose={() => setSelectedLead(null)}
            onUpdate={() => {
              setSelectedLead(null);
              loadDatabaseDetails();
            }}
          />
        )}

        {/* Modal Confirmation Suppression */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Supprimer {selectedLeads.length} lead(s) ?</h3>
                <p className="text-gray-600">
                  Cette action est irréversible. Les leads sélectionnés seront définitivement supprimés de la base.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                >
                  Confirmer la suppression
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}