import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Search, Loader2, AlertTriangle, CheckCircle, Zap, Users, Merge } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function DuplicateDetection() {
  const [duplicates, setDuplicates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState(false);
  const [selectedPairs, setSelectedPairs] = useState([]);
  const [detectionMethod, setDetectionMethod] = useState('email'); // email, phone, company_name
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [showMergeModal, setShowMergeModal] = useState(false);

  const handleDetectDuplicates = async () => {
    setLoading(true);
    setDuplicates([]);

    try {
      const response = await api.post('/duplicates/detect', {
        method: detectionMethod
      });

      setDuplicates(response.data.duplicates || []);

      if (response.data.duplicates.length === 0) {
        toast.success('✅ Aucun doublon détecté !');
      } else {
        toast.success(`🔍 ${response.data.duplicates.length} groupes de doublons détectés`);
      }
    } catch (error) {
      console.error('Erreur détection:', error);
      toast.error('Erreur lors de la détection des doublons');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPair = (groupIndex) => {
    if (selectedPairs.includes(groupIndex)) {
      setSelectedPairs(selectedPairs.filter(i => i !== groupIndex));
    } else {
      setSelectedPairs([...selectedPairs, groupIndex]);
    }
  };

  const handleSelectAll = () => {
    if (selectedPairs.length === duplicates.length) {
      setSelectedPairs([]);
    } else {
      setSelectedPairs(duplicates.map((_, i) => i));
    }
  };

  const handleAutoMerge = () => {
    if (selectedPairs.length === 0) {
      toast.warning('⚠️ Veuillez sélectionner au moins un groupe de doublons');
      return;
    }
    setShowMergeModal(true);
  };

  const confirmMerge = async () => {
    setShowMergeModal(false);
    setMerging(true);
    setProgress({ current: 0, total: selectedPairs.length });

    try {
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < selectedPairs.length; i++) {
        const groupIndex = selectedPairs[i];
        const group = duplicates[groupIndex];

        setProgress({ current: i + 1, total: selectedPairs.length });

        try {
          // Le premier lead (le plus ancien) est le lead principal
          const primaryLeadId = group.leads[0].id;
          const duplicateIds = group.leads.slice(1).map(l => l.id);

          // Appeler l'API de fusion automatique
          await api.post('/duplicates/merge-auto', {
            primary_lead_id: primaryLeadId,
            duplicate_ids: duplicateIds,
            merge_strategy: 'keep_oldest' // keep_oldest, keep_most_complete
          });

          successCount++;

        } catch (error) {
          console.error(`Erreur fusion groupe ${groupIndex}:`, error);
          errorCount++;
        }
      }

      if (errorCount === 0) {
        toast.success(`✅ Fusion terminée ! ${successCount} groupes fusionnés`);
      } else {
        toast.success(`✅ Fusion terminée : ${successCount} groupes fusionnés, ${errorCount} erreurs`);
      }

      // Recharger la détection
      await handleDetectDuplicates();
      setSelectedPairs([]);

    } catch (error) {
      console.error('Erreur fusion:', error);
      toast.error('Erreur lors de la fusion des doublons');
    } finally {
      setMerging(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Détection & Fusion de Doublons
          </h1>
          <p className="text-gray-700 text-lg font-medium">
            Détectez et fusionnez automatiquement les leads en double
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-xl border-2 border-gray-200 bg-gradient-to-br from-orange-500 to-orange-600 hover:scale-105 transition-all">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between text-white">
                <div>
                  <p className="text-sm font-medium opacity-90">Doublons Détectés</p>
                  <p className="text-4xl font-bold mt-1">{duplicates.length}</p>
                </div>
                <Copy className="w-16 h-16 opacity-30" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-2 border-gray-200 bg-gradient-to-br from-purple-500 to-purple-600 hover:scale-105 transition-all">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between text-white">
                <div>
                  <p className="text-sm font-medium opacity-90">Sélectionnés</p>
                  <p className="text-4xl font-bold mt-1">{selectedPairs.length}</p>
                </div>
                <CheckCircle className="w-16 h-16 opacity-30" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-2 border-gray-200 bg-gradient-to-br from-green-500 to-green-600 hover:scale-105 transition-all">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between text-white">
                <div>
                  <p className="text-sm font-medium opacity-90">Leads Concernés</p>
                  <p className="text-4xl font-bold mt-1">
                    {duplicates.reduce((sum, group) => sum + group.leads.length, 0)}
                  </p>
                </div>
                <Users className="w-16 h-16 opacity-30" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detection Method */}
        <Card className="shadow-xl border-2 border-gray-200 mb-6">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-indigo-600" />
              Méthode de Détection
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setDetectionMethod('email')}
                className={`p-6 rounded-xl border-2 font-semibold transition-all ${
                  detectionMethod === 'email'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-300 hover:border-indigo-300'
                }`}
              >
                <div className="text-4xl mb-2">📧</div>
                <div className="font-bold">Par Email</div>
                <div className="text-sm opacity-75 mt-1">Même adresse email</div>
              </button>

              <button
                onClick={() => setDetectionMethod('phone')}
                className={`p-6 rounded-xl border-2 font-semibold transition-all ${
                  detectionMethod === 'phone'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-300 hover:border-indigo-300'
                }`}
              >
                <div className="text-4xl mb-2">📞</div>
                <div className="font-bold">Par Téléphone</div>
                <div className="text-sm opacity-75 mt-1">Même numéro</div>
              </button>

              <button
                onClick={() => setDetectionMethod('company_name')}
                className={`p-6 rounded-xl border-2 font-semibold transition-all ${
                  detectionMethod === 'company_name'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-300 hover:border-indigo-300'
                }`}
              >
                <div className="text-4xl mb-2">🏢</div>
                <div className="font-bold">Par Entreprise</div>
                <div className="text-sm opacity-75 mt-1">Même nom d'entreprise</div>
              </button>
            </div>

            <button
              onClick={handleDetectDuplicates}
              disabled={loading}
              className="w-full mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-lg font-bold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Détection en cours...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Détecter les Doublons
                </>
              )}
            </button>
          </CardContent>
        </Card>

        {/* Actions */}
        {duplicates.length > 0 && (
          <div className="mb-6 flex gap-4">
            <button
              onClick={handleSelectAll}
              className="px-6 py-3 bg-white border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all"
            >
              {selectedPairs.length === duplicates.length ? 'Tout désélectionner' : 'Tout sélectionner'}
            </button>

            <button
              onClick={handleAutoMerge}
              disabled={merging || selectedPairs.length === 0}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {merging ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Fusion en cours... ({progress.current}/{progress.total})
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Fusionner Automatiquement ({selectedPairs.length} groupes)
                </>
              )}
            </button>
          </div>
        )}

        {/* Duplicates List */}
        {duplicates.length === 0 && !loading ? (
          <Card className="shadow-xl border-2 border-gray-200">
            <CardContent className="pt-12 pb-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Aucun doublon détecté
              </h3>
              <p className="text-gray-600">
                Lancez une détection pour identifier les doublons
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {duplicates.map((group, groupIndex) => (
              <Card key={groupIndex} className={`shadow-xl border-2 transition-all ${
                selectedPairs.includes(groupIndex)
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200'
              }`}>
                <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Copy className="w-5 h-5 text-orange-600" />
                      Groupe #{groupIndex + 1} - {group.leads.length} doublons
                    </CardTitle>
                    <input
                      type="checkbox"
                      checked={selectedPairs.includes(groupIndex)}
                      onChange={() => handleSelectPair(groupIndex)}
                      className="w-6 h-6 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {group.leads.map((lead, leadIndex) => (
                      <div
                        key={lead.id}
                        className={`p-4 rounded-lg border-2 ${
                          leadIndex === 0
                            ? 'border-green-300 bg-green-50'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {leadIndex === 0 && (
                              <div className="mb-2">
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500 text-white">
                                  ✓ Lead Principal (sera conservé)
                                </span>
                              </div>
                            )}
                            <h4 className="font-bold text-gray-900">{lead.company_name}</h4>
                            {lead.contact_name && (
                              <p className="text-sm text-gray-600">{lead.contact_name}</p>
                            )}
                            <div className="mt-2 flex gap-4 text-sm text-gray-600">
                              {lead.email && (
                                <span>📧 {lead.email}</span>
                              )}
                              {lead.phone && (
                                <span>📞 {lead.phone}</span>
                              )}
                            </div>
                            {lead.created_at && (
                              <p className="text-xs text-gray-500 mt-2">
                                Créé le: {new Date(lead.created_at).toLocaleDateString('fr-FR')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>ℹ️ Fusion automatique :</strong> Le lead le plus ancien sera conservé.
                      Les données des autres leads seront fusionnées (emails, téléphones, notes, etc.).
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Modal Confirmation Fusion */}
        {showMergeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Merge className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Fusionner {selectedPairs.length} groupe(s) de doublons ?
                </h3>
                <p className="text-gray-600 mb-2">
                  Cette action est irréversible.
                </p>
                <p className="text-sm text-blue-600 font-medium">
                  ℹ️ Le lead le plus ancien sera conservé et les autres seront fusionnés avec lui.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowMergeModal(false)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmMerge}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                >
                  Confirmer la fusion
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
