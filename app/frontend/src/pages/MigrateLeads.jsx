import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Database, ArrowRight, CheckCircle, AlertCircle,
  Loader2, Search, RefreshCw, Sparkles, MoveRight
} from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function MigrateLeads() {
  const [databases, setDatabases] = useState([]);
  const [sourceDb, setSourceDb] = useState(null);
  const [targetDb, setTargetDb] = useState(null);
  const [leads, setLeads] = useState([]);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showMigrateModal, setShowMigrateModal] = useState(false);

  useEffect(() => {
    loadDatabases();
  }, []);

  useEffect(() => {
    if (sourceDb) {
      loadLeadsFromDatabase(sourceDb);
    } else {
      setLeads([]);
      setSelectedLeads([]);
    }
  }, [sourceDb]);

  const loadDatabases = async () => {
    try {
      const { data } = await api.get('/lead-databases');
      setDatabases(data.databases || []);
    } catch (error) {
      console.error('Erreur chargement bases:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLeadsFromDatabase = async (dbId) => {
    try {
      setLoading(true);
      const { data } = await api.get(`/lead-databases/${dbId}`);
      setLeads(data.database.leads || []);
    } catch (error) {
      console.error('Erreur chargement leads:', error);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map(lead => lead.id));
    }
  };

  const handleLeadSelection = (leadId) => {
    setSelectedLeads(prev =>
      prev.includes(leadId)
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const handleMigration = () => {
    if (!sourceDb || !targetDb || selectedLeads.length === 0) {
      toast.error('⚠️ Veuillez sélectionner une base source, une base cible et au moins un lead');
      return;
    }

    if (sourceDb === targetDb) {
      toast.error('⚠️ La base source et la base cible doivent être différentes');
      return;
    }

    setShowMigrateModal(true);
  };

  const confirmMigration = async () => {
    setShowMigrateModal(false);
    setMigrating(true);

    try {
      // Créer les relations dans la base cible
      for (const leadId of selectedLeads) {
        await api.post(`/lead-databases/${targetDb}/add-lead`, {
          lead_id: leadId
        });
      }

      toast.success(`✅ Migration réussie ! ${selectedLeads.length} lead(s) ajouté(s) à la base cible`);

      // Réinitialiser
      setSelectedLeads([]);
      setSourceDb(null);
      setTargetDb(null);
      setLeads([]);
      await loadDatabases();

    } catch (error) {
      console.error('Erreur migration:', error);
      toast.error('❌ Erreur lors de la migration');
    } finally {
      setMigrating(false);
    }
  };

  const filteredLeads = leads.filter(lead => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      lead.company_name?.toLowerCase().includes(search) ||
      lead.contact_name?.toLowerCase().includes(search) ||
      lead.email?.toLowerCase().includes(search) ||
      lead.city?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3 flex items-center justify-center gap-3">
            <Database className="w-12 h-12 text-indigo-600" />
            Migration de Leads
          </h1>
          <p className="text-gray-700 text-lg font-medium">
            Déplacez vos leads d'une base de données à une autre
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Base Source */}
          <Card className="shadow-xl border-2 border-gray-200">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <Database className="w-6 h-6 text-blue-600" />
                Base Source
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <select
                value={sourceDb || ''}
                onChange={(e) => setSourceDb(e.target.value || null)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-semibold"
              >
                <option value="">Sélectionner une base</option>
                {databases.map(db => (
                  <option key={db.id} value={db.id}>
                    {db.name} ({db.lead_count || 0} leads)
                  </option>
                ))}
              </select>

              {sourceDb && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                  <p className="text-sm font-bold text-blue-900 mb-1">
                    {leads.length} leads disponibles
                  </p>
                  <p className="text-xs text-blue-700">
                    {selectedLeads.length} sélectionné(s)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Flèche */}
          <div className="flex items-center justify-center">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-6 rounded-full shadow-xl">
              <MoveRight className="w-12 h-12 text-white" />
            </div>
          </div>

          {/* Base Cible */}
          <Card className="shadow-xl border-2 border-gray-200">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <Database className="w-6 h-6 text-purple-600" />
                Base Cible
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <select
                value={targetDb || ''}
                onChange={(e) => setTargetDb(e.target.value || null)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent font-semibold"
              >
                <option value="">Sélectionner une base</option>
                {databases
                  .filter(db => db.id !== sourceDb)
                  .map(db => (
                    <option key={db.id} value={db.id}>
                      {db.name} ({db.lead_count || 0} leads)
                    </option>
                  ))}
              </select>

              {targetDb && (
                <div className="mt-4 p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                  <p className="text-sm font-bold text-purple-900">
                    Base cible sélectionnée
                  </p>
                  <p className="text-xs text-purple-700 mt-1">
                    Les leads seront ajoutés à cette base
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Liste des leads */}
        {sourceDb && (
          <Card className="shadow-xl border-2 border-gray-200">
            <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-green-600" />
                  Sélectionner les leads à migrer
                </CardTitle>
                {leads.length > 0 && (
                  <button
                    onClick={handleSelectAll}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all"
                  >
                    {selectedLeads.length === filteredLeads.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Barre de recherche */}
              {leads.length > 0 && (
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Rechercher un lead..."
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {loading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
                  <p className="text-gray-600">Chargement des leads...</p>
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">
                    {searchTerm ? 'Aucun lead trouvé pour cette recherche' : 'Aucun lead dans cette base'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredLeads.map(lead => (
                    <div
                      key={lead.id}
                      onClick={() => handleLeadSelection(lead.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedLeads.includes(lead.id)
                          ? 'bg-gradient-to-r from-green-50 to-teal-50 border-green-400 shadow-md'
                          : 'bg-white border-gray-200 hover:border-green-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-bold text-gray-900 mb-1">
                            {lead.company_name}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            {lead.contact_name && (
                              <span>👤 {lead.contact_name}</span>
                            )}
                            {lead.email && (
                              <span>📧 {lead.email}</span>
                            )}
                            {lead.city && (
                              <span>📍 {lead.city}</span>
                            )}
                          </div>
                        </div>
                        <div>
                          {selectedLeads.includes(lead.id) ? (
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          ) : (
                            <div className="w-6 h-6 border-2 border-gray-300 rounded-full" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Info sélection */}
              {selectedLeads.length > 0 && (
                <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200">
                  <p className="text-indigo-900 font-bold">
                    ✨ {selectedLeads.length} lead(s) sélectionné(s) pour la migration
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Bouton Migration */}
        {selectedLeads.length > 0 && targetDb && (
          <div className="mt-8 relative">
            {/* Animation de fond */}
            <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl blur-xl opacity-50 animate-pulse"></div>

            <button
              onClick={handleMigration}
              disabled={migrating}
              className="relative w-full h-16 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white text-xl font-black shadow-2xl hover:shadow-green-500/50 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border-4 border-white rounded-2xl flex items-center justify-center gap-3"
            >
              {migrating ? (
                <>
                  <Loader2 className="w-8 h-8 animate-spin" />
                  Migration en cours...
                </>
              ) : (
                <>
                  <RefreshCw className="w-8 h-8 animate-bounce" />
                  MIGRER {selectedLeads.length} LEAD(S) VERS LA BASE CIBLE
                  <ArrowRight className="w-8 h-8 animate-bounce" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Info box */}
        <Card className="mt-6 shadow-lg border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
              <div className="text-sm text-yellow-900">
                <p className="font-bold mb-2">ℹ️ Comment fonctionne la migration ?</p>
                <ul className="space-y-1 ml-4">
                  <li>• Les leads sont <strong>copiés</strong> vers la base cible (pas supprimés de la source)</li>
                  <li>• Les leads apparaîtront dans les deux bases de données</li>
                  <li>• Les informations du lead restent identiques</li>
                  <li>• Vous pouvez migrer plusieurs leads en même temps</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modal Confirmation Migration */}
        {showMigrateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MoveRight className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Migrer {selectedLeads.length} lead(s) ?
                </h3>
                <p className="text-gray-600">
                  Les leads sélectionnés seront copiés vers la base cible. Ils resteront également dans la base source.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowMigrateModal(false)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmMigration}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                >
                  Confirmer la migration
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
