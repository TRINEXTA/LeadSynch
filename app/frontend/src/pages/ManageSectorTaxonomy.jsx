import React, { useState, useEffect } from 'react';
import { Tag, Edit2, Trash2, GitMerge, Plus, Search, TrendingUp, AlertCircle } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function TaxonomieSecteurs() {
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSectors, setSelectedSectors] = useState([]);
  const [editingSector, setEditingSector] = useState(null);
  const [newName, setNewName] = useState('');
  const [mergeTarget, setMergeTarget] = useState('');
  const [showMergeModal, setShowMergeModal] = useState(false);

  useEffect(() => {
    loadSectors();
  }, []);

  const loadSectors = async () => {
    setLoading(true);
    try {
      const response = await api.get('/sectors');
      setSectors(response.data.sectors || []);
    } catch (error) {
      console.error('Erreur sectors:', error);
      toast.error('Erreur lors du chargement des secteurs');
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async (oldName) => {
    if (!newName.trim()) {
      toast.error('Nouveau nom requis');
      return;
    }

    const promise = api.put('/sectors', {
      old_name: oldName,
      new_name: newName.trim()
    }).then(() => {
      setEditingSector(null);
      setNewName('');
      loadSectors();
    });

    toast.promise(promise, {
      loading: 'Renommage...',
      success: 'Secteur renommé avec succès !',
      error: 'Erreur lors du renommage'
    });
  };

  const handleDelete = async (sector) => {
    const promise = api.delete(`/sectors?sector=${encodeURIComponent(sector)}`)
      .then(() => loadSectors());

    toast.promise(promise, {
      loading: 'Suppression...',
      success: 'Secteur supprimé ! (Les leads sont maintenant sans secteur)',
      error: 'Erreur lors de la suppression'
    });
  };

  const handleMerge = async () => {
    if (selectedSectors.length === 0) {
      toast.error('Sélectionnez au moins un secteur à fusionner');
      return;
    }

    if (!mergeTarget.trim()) {
      toast.error('Nom du secteur cible requis');
      return;
    }

    const count = selectedSectors.length;
    const promise = api.post('/sectors', {
      sectors_to_merge: selectedSectors,
      target_sector: mergeTarget.trim()
    }).then(() => {
      setSelectedSectors([]);
      setMergeTarget('');
      setShowMergeModal(false);
      loadSectors();
    });

    toast.promise(promise, {
      loading: 'Fusion en cours...',
      success: `${count} secteur(s) fusionné(s) avec succès !`,
      error: 'Erreur lors de la fusion'
    });
  };

  const toggleSelectSector = (sector) => {
    if (selectedSectors.includes(sector)) {
      setSelectedSectors(selectedSectors.filter(s => s !== sector));
    } else {
      setSelectedSectors([...selectedSectors, sector]);
    }
  };

  const filteredSectors = sectors.filter(s =>
    s.sector.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalLeads = sectors.reduce((sum, s) => sum + parseInt(s.leads_count), 0);

  const colors = [
    'from-blue-400 to-blue-600',
    'from-green-400 to-green-600',
    'from-purple-400 to-purple-600',
    'from-orange-400 to-orange-600',
    'from-pink-400 to-pink-600',
    'from-indigo-400 to-indigo-600',
    'from-red-400 to-red-600',
    'from-yellow-400 to-yellow-600',
    'from-teal-400 to-teal-600',
    'from-cyan-400 to-cyan-600'
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Tag className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-bold text-gray-900">Taxonomie Secteurs</h1>
        </div>
        <p className="text-gray-600">Gerez et organisez vos secteurs d'activite</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <Tag className="w-10 h-10 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Secteurs</p>
              <p className="text-3xl font-bold text-blue-700">{sectors.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-10 h-10 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Total Leads</p>
              <p className="text-3xl font-bold text-green-700">{totalLeads}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <GitMerge className="w-10 h-10 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Selectionnes</p>
              <p className="text-3xl font-bold text-purple-700">{selectedSectors.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-200">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un secteur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {selectedSectors.length > 0 && (
            <button
              onClick={() => setShowMergeModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all flex items-center gap-2 shadow-lg"
            >
              <GitMerge className="w-5 h-5" />
              Fusionner ({selectedSectors.length})
            </button>
          )}
        </div>
      </div>

      {/* Liste des secteurs */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      ) : filteredSectors.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Aucun secteur trouve</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSectors.map((sector, index) => (
            <div
              key={sector.sector}
              className={`relative bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 border-2 ${
                selectedSectors.includes(sector.sector)
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200'
              }`}
            >
              {/* Checkbox pour selection */}
              <input
                type="checkbox"
                checked={selectedSectors.includes(sector.sector)}
                onChange={() => toggleSelectSector(sector.sector)}
                className="absolute top-4 right-4 w-5 h-5 text-purple-600 rounded"
              />

              {/* Badge colore */}
              <div className={`inline-block px-4 py-2 rounded-full bg-gradient-to-r ${colors[index % colors.length]} text-white font-bold mb-4 shadow-lg`}>
                <Tag className="w-5 h-5 inline mr-2" />
                {sector.leads_count}
              </div>

              {/* Nom du secteur */}
              {editingSector === sector.sector ? (
                <div className="mb-4">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nouveau nom"
                    className="w-full px-3 py-2 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 mb-2"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRename(sector.sector)}
                      className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                    >
                      Valider
                    </button>
                    <button
                      onClick={() => {
                        setEditingSector(null);
                        setNewName('');
                      }}
                      className="flex-1 px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-semibold"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-bold text-gray-900 mb-2 pr-8">
                    {sector.sector}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {sector.leads_count} lead(s)
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingSector(sector.sector);
                        setNewName(sector.sector);
                      }}
                      className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all flex items-center justify-center gap-2 font-semibold"
                    >
                      <Edit2 className="w-4 h-4" />
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(sector.sector)}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Fusion */}
      {showMergeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="flex items-center gap-3 mb-6">
              <GitMerge className="w-8 h-8 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-900">Fusionner les secteurs</h2>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-3">Secteurs a fusionner :</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedSectors.map(sector => (
                  <span key={sector} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                    {sector}
                  </span>
                ))}
              </div>

              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nom du secteur cible *
              </label>
              <input
                type="text"
                value={mergeTarget}
                onChange={(e) => setMergeTarget(e.target.value)}
                placeholder="Ex: Comptabilite"
                className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2">
                Tous les leads des secteurs selectionnes seront rattaches a ce secteur
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowMergeModal(false);
                  setMergeTarget('');
                }}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={handleMerge}
                disabled={!mergeTarget.trim()}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                Fusionner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
