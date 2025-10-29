import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Plus, Database, Folder, X, Upload, Search, BarChart3,
  TrendingUp, Archive, Trash2, Eye, Calendar, Users,
  CheckCircle, AlertCircle, Filter
} from "lucide-react";

const SECTEURS = [
  { value: "juridique", label: "Juridique / Légal", icon: "⚖️" },
  { value: "comptabilite", label: "Comptabilité", icon: "💼" },
  { value: "sante", label: "Santé", icon: "🏥" },
  { value: "informatique", label: "Informatique / IT", icon: "💻" },
  { value: "btp", label: "BTP / Construction", icon: "" },
  { value: "hotellerie", label: "Hôtellerie-Restauration", icon: "" },
  { value: "immobilier", label: "Immobilier", icon: "" },
  { value: "logistique", label: "Logistique / Transport", icon: "" },
  { value: "commerce", label: "Commerce / Retail", icon: "" },
  { value: "education", label: "Éducation", icon: "" },
  { value: "consulting", label: "Consulting", icon: "" },
  { value: "rh", label: "Ressources Humaines", icon: "" },
  { value: "services", label: "Services", icon: "" },
  { value: "industrie", label: "Industrie", icon: "" },
  { value: "automobile", label: "Automobile", icon: "" }
];

export default function LeadDatabases() {
  const navigate = useNavigate();
  const [databases, setDatabases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    archived: 0,
    totalLeads: 0
  });
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    source: 'import_manuel',
    tags: [],
    selectedSecteurs: []
  });

  useEffect(() => {
    loadDatabases();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [databases]);

  const loadDatabases = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/api/lead-databases', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setDatabases(data.databases || []);
    } catch (error) {
      console.error('Erreur chargement bases:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const active = databases.filter(db => !db.archived).length;
    const archived = databases.filter(db => db.archived).length;
    const totalLeads = databases.reduce((sum, db) => sum + (db.total_leads || 0), 0);

    setStats({
      total: databases.length,
      active,
      archived,
      totalLeads
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const segmentation = {};
    formData.selectedSecteurs.forEach(secteur => {
      segmentation[secteur] = 0;
    });

    try {
      const response = await fetch('http://localhost:3000/api/lead-databases', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          source: formData.source,
          tags: formData.tags,
          segmentation: segmentation
        })
      });
      
      if (response.ok) {
        setShowModal(false);
        setFormData({
          name: '',
          description: '',
          source: 'import_manuel',
          tags: [],
          selectedSecteurs: []
        });
        loadDatabases();
      }
    } catch (error) {
      console.error('Erreur création base:', error);
    }
  };

  const toggleSecteur = (secteur) => {
    setFormData(prev => ({
      ...prev,
      selectedSecteurs: prev.selectedSecteurs.includes(secteur)
        ? prev.selectedSecteurs.filter(s => s !== secteur)
        : [...prev.selectedSecteurs, secteur]
    }));
  };

  const handleCardClick = (databaseId) => {
    navigate(`/DatabaseDetails?id=${databaseId}`);
  };

  const handleArchive = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Archiver cette base de données ?')) return;

    try {
      const response = await fetch(`http://localhost:3000/api/lead-databases/${id}/archive`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        loadDatabases();
      }
    } catch (error) {
      console.error('Erreur archivage:', error);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm(' ATTENTION ! Supprimer cette base ET tous ses leads ?')) return;

    try {
      const response = await fetch(`http://localhost:3000/api/lead-databases/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        loadDatabases();
      }
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  const filteredDatabases = databases.filter(db => {
    const matchSearch = searchTerm === '' || 
      db.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      db.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'active' && !db.archived) ||
      (filterStatus === 'archived' && db.archived);

    return matchSearch && matchFilter;
  });

  const getSourceBadge = (source) => {
    const badges = {
      'import_manuel': { label: 'Import CSV', color: 'bg-blue-100 text-blue-700', icon: '' },
      'google_maps': { label: 'Google Maps', color: 'bg-green-100 text-green-700', icon: '' },
      'scraping_web': { label: 'Web Scraping', color: 'bg-purple-100 text-purple-700', icon: '' },
      'achat_base': { label: 'Base Achetée', color: 'bg-orange-100 text-orange-700', icon: '' },
      'autre': { label: 'Autre', color: 'bg-gray-100 text-gray-700', icon: '' }
    };
    return badges[source] || { label: source, color: 'bg-gray-100 text-gray-700', icon: '' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des bases de données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Database className="w-8 h-8 text-blue-600" />
              Bases de Données
            </h1>
            <p className="text-gray-600 mt-1">Gérez vos bases de leads par secteur d'activité</p>
          </div>
          <Button 
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg flex items-center gap-2"
            onClick={() => setShowModal(true)}
          >
            <Plus className="w-5 h-5" />
            Nouvelle Base
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6 shadow-lg">
            <Database className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-3xl font-bold">{stats.total}</p>
            <p className="text-sm opacity-90">Bases Total</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-6 shadow-lg">
            <CheckCircle className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-3xl font-bold">{stats.active}</p>
            <p className="text-sm opacity-90">Bases Actives</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl p-6 shadow-lg">
            <Archive className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-3xl font-bold">{stats.archived}</p>
            <p className="text-sm opacity-90">Bases Archivées</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-6 shadow-lg">
            <Users className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-3xl font-bold">{stats.totalLeads.toLocaleString()}</p>
            <p className="text-sm opacity-90">Leads Total</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher une base..."
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all"> Toutes les bases</option>
              <option value="active"> Actives uniquement</option>
              <option value="archived"> Archivées uniquement</option>
            </select>
          </div>
        </div>
      </div>

      {/* Liste des bases */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDatabases.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm ? 'Aucune base trouvée' : 'Aucune base de données'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm 
                ? 'Essayez avec d\'autres termes de recherche'
                : 'Commencez par créer votre première base de leads'
              }
            </p>
            {!searchTerm && (
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => setShowModal(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Créer une base
              </Button>
            )}
          </div>
        ) : (
          filteredDatabases.map(db => {
            const sourceBadge = getSourceBadge(db.source);
            
            return (
              <Card 
                key={db.id} 
                className={`hover:shadow-2xl transition-all cursor-pointer border-2 ${
                  db.archived ? 'border-gray-300 opacity-60' : 'border-transparent hover:border-blue-300'
                }`}
                onClick={() => handleCardClick(db.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="flex items-center gap-2">
                      <Folder className={`w-6 h-6 ${db.archived ? 'text-gray-400' : 'text-blue-600'}`} />
                      <span className="text-lg">{db.name}</span>
                    </CardTitle>
                  </div>
                  {db.archived && (
                    <Badge variant="outline" className="bg-gray-100 text-gray-600">
                      <Archive className="w-3 h-3 mr-1" />
                      Archivée
                    </Badge>
                  )}
                </CardHeader>

                <CardContent>
                  {db.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{db.description}</p>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span className="text-xs text-blue-600 font-semibold">Leads</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-900">{db.total_leads || 0}</p>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <BarChart3 className="w-4 h-4 text-purple-600" />
                        <span className="text-xs text-purple-600 font-semibold">Qualité</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-900">
                        {db.total_leads > 0 ? Math.round((db.qualified_leads || 0) / db.total_leads * 100) : 0}%
                      </p>
                    </div>
                  </div>
                  
                  {/* Secteurs */}
                  {db.segmentation && Object.keys(db.segmentation).length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-500 mb-2">Secteurs ciblés :</p>
                      <div className="flex flex-wrap gap-1">
                        {Object.keys(db.segmentation).slice(0, 3).map(secteur => {
                          const secteurInfo = SECTEURS.find(s => s.value === secteur);
                          return (
                            <Badge key={secteur} variant="secondary" className="text-xs">
                              {secteurInfo?.icon} {secteurInfo?.label || secteur}
                            </Badge>
                          );
                        })}
                        {Object.keys(db.segmentation).length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{Object.keys(db.segmentation).length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Source & Date */}
                  <div className="flex items-center justify-between mb-4 pt-4 border-t text-xs">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded font-semibold ${sourceBadge.color}`}>
                      {sourceBadge.icon} {sourceBadge.label}
                    </span>
                    <span className="flex items-center gap-1 text-gray-500">
                      <Calendar className="w-3 h-3" />
                      {new Date(db.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCardClick(db.id);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Voir
                    </Button>

                    {!db.archived ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleArchive(db.id, e)}
                          title="Archiver"
                        >
                          <Archive className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => handleDelete(db.id, e)}
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={(e) => handleDelete(db.id, e)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Supprimer
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Modal Nouvelle Base */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Nouvelle Base de Données</h2>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Nom de la base *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Prospects Comptables Paris"
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Description</label>
                <textarea
                  rows="3"
                  placeholder="Décrivez cette base de données..."
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Source</label>
                <select
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                  value={formData.source}
                  onChange={(e) => setFormData({...formData, source: e.target.value})}
                >
                  <option value="import_manuel"> Import manuel (CSV)</option>
                  <option value="google_maps"> Google Maps</option>
                  <option value="scraping_web"> Scraping web</option>
                  <option value="achat_base"> Base achetée</option>
                  <option value="autre"> Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-3 text-gray-700">
                  Secteurs d'activité ciblés * (au moins 1)
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto p-4 border-2 border-gray-200 rounded-lg bg-gray-50">
                  {SECTEURS.map(secteur => (
                    <button
                      key={secteur.value}
                      type="button"
                      onClick={() => toggleSecteur(secteur.value)}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        formData.selectedSecteurs.includes(secteur.value)
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{secteur.icon}</span>
                        <span className="text-sm font-medium">{secteur.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  {formData.selectedSecteurs.length} secteur(s) sélectionné(s)
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowModal(false)} 
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  disabled={formData.selectedSecteurs.length === 0}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Créer la base
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
