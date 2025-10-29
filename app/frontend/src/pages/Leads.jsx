import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Mail, Phone, MapPin, Star, X, Building2, User, Briefcase } from "lucide-react";

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    contact_position: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'France',
    website: '',
    industry: '',
    company_size: '',
    annual_revenue: '',
    status: 'nouveau',
    score: 50,
    source: '',
    notes: ''
  });

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/leads', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setLeads(data.leads || []);
      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement leads:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:3000/api/leads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        setShowModal(false);
        setFormData({
          company_name: '',
          contact_name: '',
          contact_position: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          postal_code: '',
          country: 'France',
          website: '',
          industry: '',
          company_size: '',
          annual_revenue: '',
          status: 'nouveau',
          score: 50,
          source: '',
          notes: ''
        });
        loadLeads();
      }
    } catch (error) {
      console.error('Erreur création lead:', error);
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

  const filteredLeads = filter === 'all' 
    ? leads 
    : leads.filter(lead => lead.status === filter);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Chargement...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Leads & Prospects</h1>
          <p className="text-gray-600">Gérez vos prospects et opportunités</p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => setShowModal(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau Lead
        </Button>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 mb-6">
        <Button 
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          Tous ({leads.length})
        </Button>
        <Button 
          variant={filter === 'nouveau' ? 'default' : 'outline'}
          onClick={() => setFilter('nouveau')}
        >
          Nouveaux ({leads.filter(l => l.status === 'nouveau').length})
        </Button>
        <Button 
          variant={filter === 'contacté' ? 'default' : 'outline'}
          onClick={() => setFilter('contacté')}
        >
          Contactés ({leads.filter(l => l.status === 'contacté').length})
        </Button>
        <Button 
          variant={filter === 'qualifié' ? 'default' : 'outline'}
          onClick={() => setFilter('qualifié')}
        >
          Qualifiés ({leads.filter(l => l.status === 'qualifié').length})
        </Button>
      </div>

      {/* Liste des leads */}
      <div className="grid gap-4">
        {filteredLeads.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              Aucun lead trouvé
            </CardContent>
          </Card>
        ) : (
          filteredLeads.map(lead => (
            <Card key={lead.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold">{lead.company_name}</h3>
                      <Badge className={getStatusColor(lead.status)}>
                        {lead.status}
                      </Badge>
                      {lead.score && lead.score > 70 && (
                        <div className="flex items-center text-yellow-600">
                          <Star className="w-4 h-4 mr-1 fill-yellow-600" />
                          <span className="text-sm font-medium">{lead.score}</span>
                        </div>
                      )}
                    </div>

                    {lead.contact_name && (
                      <p className="text-gray-600 mb-3">
                        <User className="w-4 h-4 inline mr-1" />
                        {lead.contact_name} {lead.contact_position && `- ${lead.contact_position}`}
                      </p>
                    )}
                    
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

                    {lead.industry && (
                      <div className="mt-3">
                        <Badge variant="outline">{lead.industry}</Badge>
                      </div>
                    )}
                  </div>

                  <Button variant="outline" size="sm">
                    Voir détails
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal Nouveau Lead */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Nouveau Lead</h2>
              <button onClick={() => setShowModal(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Informations de l'entreprise */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Building2 className="w-5 h-5 mr-2" />
                  Informations de l'entreprise
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Nom de l'entreprise *</label>
                    <input
                      type="text"
                      required
                      className="w-full border rounded-lg px-3 py-2"
                      value={formData.company_name}
                      onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Secteur d'activité</label>
                    <select
                      className="w-full border rounded-lg px-3 py-2"
                      value={formData.industry}
                      onChange={(e) => setFormData({...formData, industry: e.target.value})}
                    >
                      <option value="">Sélectionner...</option>
                      <option value="Technologie">Technologie</option>
                      <option value="Finance">Finance</option>
                      <option value="Santé">Santé</option>
                      <option value="Commerce">Commerce</option>
                      <option value="Industrie">Industrie</option>
                      <option value="Services">Services</option>
                      <option value="Immobilier">Immobilier</option>
                      <option value="Éducation">Éducation</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Taille de l'entreprise</label>
                    <select
                      className="w-full border rounded-lg px-3 py-2"
                      value={formData.company_size}
                      onChange={(e) => setFormData({...formData, company_size: e.target.value})}
                    >
                      <option value="">Sélectionner...</option>
                      <option value="1-10">1-10 employés</option>
                      <option value="11-50">11-50 employés</option>
                      <option value="51-200">51-200 employés</option>
                      <option value="201-500">201-500 employés</option>
                      <option value="500+">500+ employés</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Site web</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      className="w-full border rounded-lg px-3 py-2"
                      value={formData.website}
                      onChange={(e) => setFormData({...formData, website: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Chiffre d'affaires annuel</label>
                    <input
                      type="text"
                      placeholder="Ex: 500000"
                      className="w-full border rounded-lg px-3 py-2"
                      value={formData.annual_revenue}
                      onChange={(e) => setFormData({...formData, annual_revenue: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Contact principal */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Contact principal
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nom du contact</label>
                    <input
                      type="text"
                      placeholder="Jean Dupont"
                      className="w-full border rounded-lg px-3 py-2"
                      value={formData.contact_name}
                      onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Poste</label>
                    <input
                      type="text"
                      placeholder="Directeur Commercial"
                      className="w-full border rounded-lg px-3 py-2"
                      value={formData.contact_position}
                      onChange={(e) => setFormData({...formData, contact_position: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      className="w-full border rounded-lg px-3 py-2"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Téléphone</label>
                    <input
                      type="tel"
                      placeholder="06 12 34 56 78"
                      className="w-full border rounded-lg px-3 py-2"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Adresse */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  Adresse
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Adresse</label>
                    <input
                      type="text"
                      placeholder="123 Rue de la République"
                      className="w-full border rounded-lg px-3 py-2"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Ville</label>
                    <input
                      type="text"
                      placeholder="Paris"
                      className="w-full border rounded-lg px-3 py-2"
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Code postal</label>
                    <input
                      type="text"
                      placeholder="75001"
                      className="w-full border rounded-lg px-3 py-2"
                      value={formData.postal_code}
                      onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Pays</label>
                    <input
                      type="text"
                      className="w-full border rounded-lg px-3 py-2"
                      value={formData.country}
                      onChange={(e) => setFormData({...formData, country: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Qualification */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Briefcase className="w-5 h-5 mr-2" />
                  Qualification
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Statut</label>
                    <select
                      className="w-full border rounded-lg px-3 py-2"
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                    >
                      <option value="nouveau">Nouveau</option>
                      <option value="contacté">Contacté</option>
                      <option value="qualifié">Qualifié</option>
                      <option value="perdu">Perdu</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Source</label>
                    <select
                      className="w-full border rounded-lg px-3 py-2"
                      value={formData.source}
                      onChange={(e) => setFormData({...formData, source: e.target.value})}
                    >
                      <option value="">Sélectionner...</option>
                      <option value="Site web">Site web</option>
                      <option value="Référencement">Référencement</option>
                      <option value="Publicité">Publicité</option>
                      <option value="Salon">Salon</option>
                      <option value="Recommandation">Recommandation</option>
                      <option value="Cold calling">Cold calling</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Score de qualification ({formData.score}/100)</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      className="w-full"
                      value={formData.score}
                      onChange={(e) => setFormData({...formData, score: parseInt(e.target.value)})}
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Faible</span>
                      <span>Moyen</span>
                      <span>Élevé</span>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Notes</label>
                    <textarea
                      rows="3"
                      placeholder="Ajoutez des notes sur ce lead..."
                      className="w-full border rounded-lg px-3 py-2"
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">
                  Annuler
                </Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                  Créer le lead
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

