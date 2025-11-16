import React, { useState, useEffect } from "react";
import toast from 'react-hot-toast';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, Mail, Phone, MapPin, Star, X, Building2,
  User, Globe, Calendar, Edit, Save, Trash2,
  TrendingUp, DollarSign, Hash, FileText, CheckCircle,
  Clock, AlertCircle, Briefcase, MessageSquare
} from "lucide-react";
import api from "../api/axios";

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedLead, setEditedLead] = useState({});

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const response = await api.get('/leads');
      setLeads(response.data.leads || []);
    } catch (error) {
      console.error('Erreur:', error);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditMode(true);
    setEditedLead({...selectedLead});
  };

  const handleSave = async () => {
    try {
      const response = await api.put(`/leads/${selectedLead.id}`, editedLead);
      if (response.data.success) {
        setLeads(leads.map(l => l.id === selectedLead.id ? response.data.lead : l));
        setSelectedLead(response.data.lead);
        setEditMode(false);
        toast.success('Lead mis à jour avec succès');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async (leadId) => {
    // ✅ Remplacer confirm() par toast.promise
    const deletePromise = new Promise(async (resolve, reject) => {
      try {
        await api.delete(`/leads/${leadId}`);
        setLeads(leads.filter(l => l.id !== leadId));
        setShowDetailsModal(false);
        resolve();
      } catch (error) {
        console.error('Erreur:', error);
        reject(error);
      }
    });

    toast.promise(deletePromise, {
      loading: 'Suppression en cours...',
      success: 'Lead supprimé avec succès',
      error: 'Erreur lors de la suppression',
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      'new': 'bg-gradient-to-r from-blue-500 to-blue-600 text-white',
      'assigned': 'bg-gradient-to-r from-purple-500 to-purple-600 text-white',
      'contacted': 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white',
      'qualified': 'bg-gradient-to-r from-green-500 to-green-600 text-white',
      'lost': 'bg-gradient-to-r from-red-500 to-red-600 text-white'
    };
    return styles[status] || 'bg-gray-500 text-white';
  };

  const filteredLeads = filter === 'all' ? leads : leads.filter(lead => lead.status === filter);
  const countByStatus = (status) => leads.filter(l => l.status === status).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Leads & Prospects
            </h1>
            <p className="text-gray-600 mt-1">Gérez vos prospects et opportunités</p>
          </div>
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg transition-all">
            <Plus className="w-5 h-5 mr-2" />
            Nouveau Lead
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div 
          onClick={() => setFilter('all')}
          className={`bg-white rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg ${
            filter === 'all' ? 'ring-2 ring-blue-500 shadow-lg transform scale-105' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <Hash className="w-8 h-8 text-gray-400" />
            <span className="text-xs font-medium text-gray-500">TOTAL</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{leads.length}</p>
          <p className="text-sm text-gray-600 mt-1">Tous les leads</p>
        </div>

        <div 
          onClick={() => setFilter('new')}
          className={`bg-white rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg ${
            filter === 'new' ? 'ring-2 ring-blue-500 shadow-lg transform scale-105' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="w-8 h-8 text-blue-500" />
            <span className="text-xs font-medium text-blue-600">NEW</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{countByStatus('new')}</p>
          <p className="text-sm text-gray-600 mt-1">Nouveaux</p>
        </div>

        <div 
          onClick={() => setFilter('contacted')}
          className={`bg-white rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg ${
            filter === 'contacted' ? 'ring-2 ring-yellow-500 shadow-lg transform scale-105' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <Phone className="w-8 h-8 text-yellow-500" />
            <span className="text-xs font-medium text-yellow-600">CONTACTED</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{countByStatus('contacted')}</p>
          <p className="text-sm text-gray-600 mt-1">Contactés</p>
        </div>

        <div 
          onClick={() => setFilter('qualified')}
          className={`bg-white rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg ${
            filter === 'qualified' ? 'ring-2 ring-green-500 shadow-lg transform scale-105' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <span className="text-xs font-medium text-green-600">QUALIFIED</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{countByStatus('qualified')}</p>
          <p className="text-sm text-gray-600 mt-1">Qualifiés</p>
        </div>

        <div 
          onClick={() => setFilter('assigned')}
          className={`bg-white rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg ${
            filter === 'assigned' ? 'ring-2 ring-purple-500 shadow-lg transform scale-105' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <User className="w-8 h-8 text-purple-500" />
            <span className="text-xs font-medium text-purple-600">ASSIGNED</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{countByStatus('assigned')}</p>
          <p className="text-sm text-gray-600 mt-1">Assignés</p>
        </div>
      </div>

      {/* Leads List */}
      <div className="space-y-4">
        {filteredLeads.map(lead => (
          <div key={lead.id} className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all p-6 group">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{lead.company_name}</h3>
                  {lead.contact_name && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <User className="w-4 h-4" />
                      <span>{lead.contact_name}</span>
                    </div>
                  )}
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(lead.status)}`}>
                    {lead.status.toUpperCase()}
                  </span>
                  {lead.score >= 70 && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-yellow-400 to-orange-400 text-white">
                      ⭐ HOT LEAD
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-4 gap-4">
                  {lead.email && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{lead.email}</span>
                    </div>
                  )}
                  {lead.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{lead.phone}</span>
                    </div>
                  )}
                  {lead.city && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{lead.city}</span>
                    </div>
                  )}
                  {lead.industry && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Briefcase className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{lead.industry}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setSelectedLead(lead);
                    setShowDetailsModal(true);
                  }}
                >
                  Voir détails
                </Button>
                <Button 
                  variant="outline"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => handleDelete(lead.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Détails COMPLET */}
      {showDetailsModal && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Building2 className="w-8 h-8 text-blue-600" />
                {editMode ? 'Modifier le Lead' : selectedLead.company_name}
              </h2>
              <div className="flex gap-2">
                {!editMode ? (
                  <>
                    <Button onClick={handleEdit} className="bg-blue-600 text-white hover:bg-blue-700">
                      <Edit className="w-4 h-4 mr-2" />
                      Modifier
                    </Button>
                    <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-6 h-6" />
                    </button>
                  </>
                ) : (
                  <>
                    <Button onClick={handleSave} className="bg-green-600 text-white hover:bg-green-700">
                      <Save className="w-4 h-4 mr-2" />
                      Enregistrer
                    </Button>
                    <Button variant="outline" onClick={() => setEditMode(false)}>
                      Annuler
                    </Button>
                  </>
                )}
              </div>
            </div>

            {!editMode ? (
              // MODE AFFICHAGE
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Entreprise</p>
                      <p className="font-semibold text-lg">{selectedLead.company_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Contact</p>
                      <p className="font-semibold">{selectedLead.contact_name || 'Non renseigné'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Email</p>
                      <p className="font-semibold flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        {selectedLead.email || 'Non renseigné'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Téléphone</p>
                      <p className="font-semibold flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {selectedLead.phone || 'Non renseigné'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Ville</p>
                      <p className="font-semibold flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        {selectedLead.city || 'Non renseigné'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Secteur</p>
                      <p className="font-semibold flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-gray-400" />
                        {selectedLead.industry || 'Non renseigné'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Site web</p>
                      <p className="font-semibold flex items-center gap-2">
                        <Globe className="w-4 h-4 text-gray-400" />
                        {selectedLead.website || 'Non renseigné'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Valeur estimée</p>
                      <p className="font-semibold text-lg flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-green-500" />
                        {selectedLead.deal_value ? `${selectedLead.deal_value.toLocaleString('fr-FR')} €` : 'Non renseigné'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Statut</p>
                    <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusBadge(selectedLead.status)}`}>
                      {selectedLead.status.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Score</p>
                    <div className="flex items-center gap-3">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i}
                            className={`w-6 h-6 ${i < Math.floor((selectedLead.score || 0) / 20) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                      <span className="font-bold text-lg">{selectedLead.score || 0}/100</span>
                    </div>
                  </div>
                </div>

                {selectedLead.notes && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Notes
                    </p>
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedLead.notes}</p>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Créé le {new Date(selectedLead.created_at).toLocaleDateString('fr-FR')}</span>
                    <span>Modifié le {new Date(selectedLead.updated_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
              </div>
            ) : (
              // MODE ÉDITION COMPLET
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Entreprise *</label>
                      <Input
                        value={editedLead.company_name || ''}
                        onChange={(e) => setEditedLead({...editedLead, company_name: e.target.value})}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
                      <Input
                        value={editedLead.contact_name || ''}
                        onChange={(e) => setEditedLead({...editedLead, contact_name: e.target.value})}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <Input
                        type="email"
                        value={editedLead.email || ''}
                        onChange={(e) => setEditedLead({...editedLead, email: e.target.value})}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                      <Input
                        value={editedLead.phone || ''}
                        onChange={(e) => setEditedLead({...editedLead, phone: e.target.value})}
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                      <Input
                        value={editedLead.city || ''}
                        onChange={(e) => setEditedLead({...editedLead, city: e.target.value})}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Secteur</label>
                      <Input
                        value={editedLead.industry || ''}
                        onChange={(e) => setEditedLead({...editedLead, industry: e.target.value})}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Site web</label>
                      <Input
                        value={editedLead.website || ''}
                        onChange={(e) => setEditedLead({...editedLead, website: e.target.value})}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valeur estimée (€)</label>
                      <Input
                        type="number"
                        value={editedLead.deal_value || ''}
                        onChange={(e) => setEditedLead({...editedLead, deal_value: parseInt(e.target.value) || 0})}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                    <select
                      value={editedLead.status || 'new'}
                      onChange={(e) => setEditedLead({...editedLead, status: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="new">Nouveau</option>
                      <option value="assigned">Assigné</option>
                      <option value="contacted">Contacté</option>
                      <option value="qualified">Qualifié</option>
                      <option value="lost">Perdu</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Score (0-100)</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={editedLead.score || 0}
                      onChange={(e) => setEditedLead({...editedLead, score: parseInt(e.target.value) || 0})}
                      className="w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <MessageSquare className="w-4 h-4 inline mr-2" />
                    Notes
                  </label>
                  <textarea
                    value={editedLead.notes || ''}
                    onChange={(e) => setEditedLead({...editedLead, notes: e.target.value})}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ajoutez vos notes ici..."
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}