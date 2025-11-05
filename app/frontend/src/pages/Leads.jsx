import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Mail, Phone, MapPin, Star, X, Building2, User, Briefcase, Globe, Calendar } from "lucide-react";

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/leads', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setLeads(data.leads || []);
      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'nouveau': 'bg-blue-100 text-blue-800',
      'contacté': 'bg-yellow-100 text-yellow-800',
      'qualifié': 'bg-green-100 text-green-800',
      'perdu': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const filteredLeads = filter === 'all' ? leads : leads.filter(lead => lead.status === filter);

  if (loading) return <div className="flex items-center justify-center h-screen">Chargement...</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Leads & Prospects</h1>
          <p className="text-gray-600">Gérez vos prospects et opportunités</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nouveau Lead
        </Button>
      </div>

      <div className="flex gap-2 mb-6">
        <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>
          Tous ({leads.length})
        </Button>
        <Button variant={filter === 'nouveau' ? 'default' : 'outline'} onClick={() => setFilter('nouveau')}>
          Nouveaux ({leads.filter(l => l.status === 'nouveau').length})
        </Button>
        <Button variant={filter === 'contacté' ? 'default' : 'outline'} onClick={() => setFilter('contacté')}>
          Contactés ({leads.filter(l => l.status === 'contacté').length})
        </Button>
        <Button variant={filter === 'qualifié' ? 'default' : 'outline'} onClick={() => setFilter('qualifié')}>
          Qualifiés ({leads.filter(l => l.status === 'qualifié').length})
        </Button>
      </div>

      <div className="grid gap-4">
        {filteredLeads.map(lead => (
          <Card key={lead.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold">{lead.company_name}</h3>
                    <Badge className={getStatusColor(lead.status)}>{lead.status}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    {lead.email && (
                      <div className="flex items-center text-gray-600">
                        <Mail className="w-4 h-4 mr-2" />
                        <span className="text-sm">{lead.email}</span>
                      </div>
                    )}
                    {lead.phone && (
                      <div className="flex items-center text-gray-600">
                        <Phone className="w-4 h-4 mr-2" />
                        <span className="text-sm">{lead.phone}</span>
                      </div>
                    )}
                    {lead.city && (
                      <div className="flex items-center text-gray-600">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span className="text-sm">{lead.city}</span>
                      </div>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setSelectedLead(lead); setShowDetailsModal(true); }}>
                  Voir détails
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showDetailsModal && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">{selectedLead.company_name}</h2>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Email</p>
                  <p className="font-semibold flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {selectedLead.email || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Téléphone</p>
                  <p className="font-semibold flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {selectedLead.phone || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Ville</p>
                  <p className="font-semibold flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {selectedLead.city || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Secteur</p>
                  <p className="font-semibold flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    {selectedLead.industry || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Statut</p>
                  <Badge className={getStatusColor(selectedLead.status)}>{selectedLead.status}</Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Score</p>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="font-semibold">{selectedLead.score || 0}/100</span>
                  </div>
                </div>
              </div>
              {selectedLead.notes && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Notes</p>
                  <p className="bg-gray-50 p-4 rounded-lg">{selectedLead.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
