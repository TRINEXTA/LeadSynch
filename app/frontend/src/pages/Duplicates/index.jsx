import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertTriangle, Merge, X, Mail, Building, MapPin, Loader2,
  CheckCircle, Eye
} from 'lucide-react';
import api from '../../api/axios';

export default function Duplicates() {
  const [duplicates, setDuplicates] = useState({ by_email: [], by_siret: [], by_name_city: [] });
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupLeads, setGroupLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState([]);

  useEffect(() => {
    detectDuplicates();
  }, []);

  const detectDuplicates = async () => {
    try {
      const { data } = await api.get('/duplicates/detect');
      setDuplicates(data.duplicates);
    } catch (error) {
      console.error('Erreur détection doublons:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGroupDetails = async (type, value) => {
    try {
      const { data } = await api.get(`/duplicates/group/${type}/${encodeURIComponent(value)}`);
      setGroupLeads(data.leads);
      setSelectedGroup({ type, value });
      setSelectedLeads([data.leads[0]?.id]); // Sélectionner le premier par défaut
    } catch (error) {
      console.error('Erreur chargement groupe:', error);
    }
  };

  const handleMerge = async () => {
    if (selectedLeads.length < 2) {
      alert('Sélectionnez au moins 2 leads à fusionner');
      return;
    }

    if (!confirm(`Fusionner ${selectedLeads.length} leads ? Cette action est irréversible.`)) {
      return;
    }

    setProcessing(true);

    try {
      const primaryId = selectedLeads[0];
      const duplicateIds = selectedLeads.slice(1);

      await api.post('/duplicates/merge', {
        primary_lead_id: primaryId,
        duplicate_lead_ids: duplicateIds
      });

      alert('Leads fusionnés avec succès !');
      setSelectedGroup(null);
      setGroupLeads([]);
      detectDuplicates();
    } catch (error) {
      console.error('Erreur fusion:', error);
      alert('Erreur lors de la fusion');
    } finally {
      setProcessing(false);
    }
  };

  const handleIgnore = async () => {
    if (selectedLeads.length < 2) {
      alert('Sélectionnez au moins 2 leads');
      return;
    }

    setProcessing(true);

    try {
      await api.post('/duplicates/ignore', {
        lead_ids: selectedLeads,
        reason: 'Marqués comme non-doublons par l\'utilisateur'
      });

      alert('Leads marqués comme non-doublons');
      setSelectedGroup(null);
      setGroupLeads([]);
      detectDuplicates();
    } catch (error) {
      console.error('Erreur ignore:', error);
      alert('Erreur lors du marquage');
    } finally {
      setProcessing(false);
    }
  };

  const toggleLeadSelection = (leadId) => {
    setSelectedLeads(prev =>
      prev.includes(leadId)
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const totalDuplicates =
    duplicates.by_email.length +
    duplicates.by_siret.length +
    duplicates.by_name_city.length;

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Gestion des doublons
          </h1>
          <p className="text-gray-700 mt-2 font-medium">
            {totalDuplicates > 0
              ? `${totalDuplicates} groupe(s) de doublons détecté(s)`
              : 'Aucun doublon détecté'}
          </p>
        </div>

        {totalDuplicates === 0 ? (
          <Card className="shadow-xl border-2 border-green-200 bg-green-50">
            <CardContent className="pt-12 pb-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-900 mb-2">Aucun doublon détecté !</h2>
              <p className="text-green-700">Votre base de données est propre. 🎉</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Liste des doublons */}
            <div className="space-y-4">
              {/* Doublons par email */}
              {duplicates.by_email.length > 0 && (
                <Card className="shadow-xl border-2 border-gray-200">
                  <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 border-b">
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="w-5 h-5 text-red-600" />
                      Doublons par Email ({duplicates.by_email.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {duplicates.by_email.map((dup, idx) => (
                        <button
                          key={idx}
                          onClick={() => loadGroupDetails('email', dup.value)}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-all hover:shadow-md ${
                            selectedGroup?.value === dup.value
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-200 hover:border-gray-300'
                          } ${getSeverityColor(dup.severity)}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{dup.value}</span>
                            <span className="text-xs font-bold px-2 py-1 bg-white rounded-full">
                              {dup.count} leads
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Doublons par SIRET */}
              {duplicates.by_siret.length > 0 && (
                <Card className="shadow-xl border-2 border-gray-200">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-yellow-50 border-b">
                    <CardTitle className="flex items-center gap-2">
                      <Building className="w-5 h-5 text-orange-600" />
                      Doublons par SIRET ({duplicates.by_siret.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {duplicates.by_siret.map((dup, idx) => (
                        <button
                          key={idx}
                          onClick={() => loadGroupDetails('siret', dup.value)}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-all hover:shadow-md ${
                            selectedGroup?.value === dup.value
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-200 hover:border-gray-300'
                          } ${getSeverityColor(dup.severity)}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium font-mono">{dup.value}</span>
                            <span className="text-xs font-bold px-2 py-1 bg-white rounded-full">
                              {dup.count} leads
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Doublons par nom + ville */}
              {duplicates.by_name_city.length > 0 && (
                <Card className="shadow-xl border-2 border-gray-200">
                  <CardHeader className="bg-gradient-to-r from-yellow-50 to-amber-50 border-b">
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-yellow-600" />
                      Doublons par Nom + Ville ({duplicates.by_name_city.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {duplicates.by_name_city.map((dup, idx) => (
                        <button
                          key={idx}
                          onClick={() => loadGroupDetails('name_city', dup.value)}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-all hover:shadow-md ${
                            selectedGroup?.value === dup.value
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-200 hover:border-gray-300'
                          } ${getSeverityColor(dup.severity)}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{dup.value}</span>
                            <span className="text-xs font-bold px-2 py-1 bg-white rounded-full">
                              {dup.count} leads
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Détails du groupe sélectionné */}
            <div>
              {selectedGroup ? (
                <Card className="shadow-xl border-4 border-indigo-500 sticky top-6">
                  <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="w-5 h-5 text-indigo-600" />
                      Détails du groupe ({groupLeads.length} leads)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {/* Liste des leads */}
                    <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
                      {groupLeads.map((lead) => (
                        <div
                          key={lead.id}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            selectedLeads.includes(lead.id)
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => toggleLeadSelection(lead.id)}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={selectedLeads.includes(lead.id)}
                              onChange={() => toggleLeadSelection(lead.id)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <h3 className="font-bold text-gray-900 mb-1">{lead.company_name}</h3>
                              {lead.email && (
                                <p className="text-sm text-gray-600">📧 {lead.email}</p>
                              )}
                              {lead.siret && (
                                <p className="text-sm text-gray-600">🏢 {lead.siret}</p>
                              )}
                              {lead.city && (
                                <p className="text-sm text-gray-600">📍 {lead.city}</p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">
                                Créé le {new Date(lead.created_at).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                      <button
                        onClick={handleMerge}
                        disabled={processing || selectedLeads.length < 2}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {processing ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Fusion en cours...
                          </>
                        ) : (
                          <>
                            <Merge className="w-5 h-5" />
                            Fusionner ({selectedLeads.length})
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleIgnore}
                        disabled={processing || selectedLeads.length < 2}
                        className="w-full bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <X className="w-5 h-5" />
                        Ignorer (pas un doublon)
                      </button>
                    </div>

                    <p className="text-xs text-gray-500 mt-4 text-center">
                      Le premier lead sélectionné sera conservé. Les autres seront fusionnés dans celui-ci.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="shadow-xl border-2 border-gray-200">
                  <CardContent className="pt-12 pb-12 text-center">
                    <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Sélectionnez un groupe
                    </h3>
                    <p className="text-gray-600">
                      Cliquez sur un groupe de doublons pour voir les détails et les fusionner
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
