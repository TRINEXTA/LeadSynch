import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Database, Upload, Search, BarChart3, TrendingUp, Eye, Trash2, Archive, RefreshCw, FileSpreadsheet, Zap } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

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

export default function LeadDatabases() {
  const navigate = useNavigate();
  const [databases, setDatabases] = useState([]);
  const [filteredDatabases, setFilteredDatabases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState('all');
  const [deleteModalId, setDeleteModalId] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    totalLeads: 0,
    bySector: {},
    bySource: {}
  });

  useEffect(() => {
    loadDatabases();
  }, []);

  useEffect(() => {
    filterDatabases();
  }, [databases, searchQuery, filterSource]);

  const loadDatabases = async () => {
    try {
      const response = await api.get('/lead-databases');
      const dbList = response.data.databases || [];
      setDatabases(dbList);
      calculateGlobalStats(dbList);
      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement bases:', error);
      setLoading(false);
    }
  };

  const calculateGlobalStats = (dbList) => {
    const totalLeads = dbList.reduce((sum, db) => sum + (parseInt(db.total_leads) || 0), 0);
    
    const bySector = {};
    const bySource = {};

    dbList.forEach(db => {
      // Stats par secteur
      if (db.segmentation) {
        Object.entries(db.segmentation).forEach(([sector, count]) => {
          bySector[sector] = (bySector[sector] || 0) + count;
        });
      }

      // Stats par source
      const source = db.source || 'autre';
      bySource[source] = (bySource[source] || 0) + 1;
    });

    setStats({
      total: dbList.length,
      totalLeads,
      bySector,
      bySource
    });
  };

  const filterDatabases = () => {
    let filtered = [...databases];

    if (filterSource !== 'all') {
      filtered = filtered.filter(db => db.source === filterSource);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(db =>
        db.name?.toLowerCase().includes(query) ||
        db.description?.toLowerCase().includes(query)
      );
    }

    setFilteredDatabases(filtered);
  };

  const handleDelete = async () => {
    const promise = api.delete(`/lead-databases/${deleteModalId}`)
      .then(() => {
        setDeleteModalId(null);
        loadDatabases();
      });

    toast.promise(promise, {
      loading: 'Suppression en cours...',
      success: '🗑️ Base supprimée avec succès',
      error: 'Erreur lors de la suppression',
    });
  };

  const handleArchive = async (databaseId) => {
    const promise = api.patch(`/lead-databases/${databaseId}/archive`)
      .then(() => loadDatabases());

    toast.promise(promise, {
      loading: 'Archivage en cours...',
      success: '📦 Base archivée avec succès',
      error: 'Erreur lors de l\'archivage',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des bases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Bases de Donnees</h1>
              <p className="text-gray-600">Gerez vos bases de leads et prospects</p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/ImportLeads')}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg flex items-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Importer CSV
              </button>
              
              <button
  onClick={() => navigate('/LeadGeneration')}
  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg flex items-center gap-2"
>
  <Zap className="w-5 h-5" />
  Generer avec IA
</button>
            </div>
          </div>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-purple-200">
            <div className="flex items-center gap-3">
              <Database className="w-10 h-10 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600 font-medium">Bases totales</p>
                <p className="text-3xl font-bold text-purple-600">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-blue-200">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-10 h-10 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600 font-medium">Leads totaux</p>
                <p className="text-3xl font-bold text-blue-600">{stats.totalLeads.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-green-200">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-10 h-10 text-green-600" />
              <div>
                <p className="text-sm text-gray-600 font-medium">Secteurs couverts</p>
                <p className="text-3xl font-bold text-green-600">{Object.keys(stats.bySector).length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-orange-200">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-10 h-10 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600 font-medium">Sources</p>
                <p className="text-3xl font-bold text-orange-600">{Object.keys(stats.bySource).length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une base..."
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500"
            />
          </div>

          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500"
          >
            <option value="all">Toutes les sources</option>
            <option value="import_csv">Import CSV</option>
            <option value="ai_generation">Generation IA</option>
            <option value="manual">Manuel</option>
            <option value="api">API</option>
          </select>

          <button
            onClick={loadDatabases}
            className="bg-white border-2 border-gray-300 text-gray-700 px-4 py-3 rounded-xl font-semibold hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Actualiser
          </button>
        </div>

        {/* Databases Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDatabases.length === 0 ? (
            <div className="col-span-3 bg-white rounded-xl shadow-lg p-12 text-center">
              <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-4">Aucune base trouvee</p>
              <button
                onClick={() => navigate('/ImportLeads')}
                className="bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-700"
              >
                Importer votre premiere base
              </button>
            </div>
          ) : (
            filteredDatabases.map(database => (
              <div
                key={database.id}
                className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all overflow-hidden border-2 border-gray-200 hover:border-purple-400"
              >
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Database className="w-8 h-8 text-white" />
                    <span className="bg-white bg-opacity-20 text-white px-3 py-1 rounded-full text-xs font-bold">
                      {database.source === 'import_csv' ? '📥 CSV' : 
                       database.source === 'ai_generation' ? '🤖 IA' : 
                       database.source === 'api' ? '🔌 API' : '✏️ Manuel'}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white line-clamp-1">{database.name}</h3>
                </div>

                <div className="p-4">
                  {database.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{database.description}</p>
                  )}

                  <div className="bg-blue-50 rounded-lg p-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Leads totaux</span>
                      <span className="text-2xl font-bold text-blue-600">
                        {(database.total_leads || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {database.segmentation && Object.keys(database.segmentation).length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-600 mb-2 font-semibold">Secteurs principaux:</p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(database.segmentation)
                          .sort(([,a], [,b]) => b - a)
                          .slice(0, 3)
                          .map(([sector, count]) => {
                            const sectorInfo = SECTEURS_MAPPING[sector] || SECTEURS_MAPPING.autre;
                            return (
                              <span
                                key={sector}
                                className={`text-xs px-2 py-1 rounded-lg text-white font-semibold bg-gradient-to-r ${sectorInfo.color}`}
                              >
                                {sectorInfo.icon} {count}
                              </span>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 mb-4">
                    Cree le {new Date(database.created_at).toLocaleDateString('fr-FR')}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/DatabaseDetails?id=${database.id}`)}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Voir
                    </button>
                    
                    <button
                      onClick={() => handleArchive(database.id)}
                      className="bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200"
                      title="Archiver"
                    >
                      <Archive className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setDeleteModalId(database.id)}
                      className="bg-red-100 text-red-600 py-2 px-3 rounded-lg hover:bg-red-200"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Top Sectors Stats */}
        {Object.keys(stats.bySector).length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-purple-600" />
              Repartition globale par secteur
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(stats.bySector)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 8)
                .map(([sector, count]) => {
                  const sectorInfo = SECTEURS_MAPPING[sector] || SECTEURS_MAPPING.autre;
                  return (
                    <div
                      key={sector}
                      className={`bg-gradient-to-r ${sectorInfo.color} text-white rounded-lg p-4 text-center`}
                    >
                      <div className="text-3xl mb-1">{sectorInfo.icon}</div>
                      <div className="text-2xl font-bold mb-1">{count.toLocaleString()}</div>
                      <div className="text-xs opacity-90">{sectorInfo.label}</div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Modal Confirmation Suppression */}
      {deleteModalId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Supprimer la base ?</h3>
              <p className="text-gray-600">
                Cette action est irréversible. Tous les leads de cette base seront définitivement supprimés.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModalId(null)}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}