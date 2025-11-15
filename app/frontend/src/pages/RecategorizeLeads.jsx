import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Database, TrendingUp, CheckCircle, Loader2, AlertCircle, Zap } from 'lucide-react';
import api from '../api/axios';

export default function RecategorizeLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    uncategorized: 0,
    wrongCategory: 0
  });
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      const response = await api.get('/leads');
      const allLeads = response.data.leads || [];

      // Filtrer les leads sans catégorie ou avec catégorie suspecte
      const needsRecategorization = allLeads.filter(lead =>
        !lead.sector ||
        lead.sector === 'other' ||
        lead.sector === 'unknown' ||
        lead.sector === ''
      );

      setLeads(needsRecategorization);
      setStats({
        total: allLeads.length,
        uncategorized: needsRecategorization.length,
        wrongCategory: 0
      });
    } catch (error) {
      console.error('Erreur chargement leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedLeads.length === leads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(leads.map(l => l.id));
    }
  };

  const handleSelectLead = (leadId) => {
    if (selectedLeads.includes(leadId)) {
      setSelectedLeads(selectedLeads.filter(id => id !== leadId));
    } else {
      setSelectedLeads([...selectedLeads, leadId]);
    }
  };

  const handleRecategorizeWithAI = async () => {
    if (selectedLeads.length === 0) {
      alert('Veuillez sélectionner au moins un lead');
      return;
    }

    if (!confirm(`Recatégoriser ${selectedLeads.length} leads avec l'IA ASEFI ?`)) {
      return;
    }

    setProcessing(true);
    setProgress({ current: 0, total: selectedLeads.length });

    try {
      let successCount = 0;
      let errorCount = 0;

      // Traiter lead par lead
      for (let i = 0; i < selectedLeads.length; i++) {
        const leadId = selectedLeads[i];
        const lead = leads.find(l => l.id === leadId);

        setProgress({ current: i + 1, total: selectedLeads.length });

        try {
          // Appeler l'IA pour catégoriser
          const response = await api.post('/asefi/categorize', {
            company_name: lead.company_name,
            description: lead.description || '',
            website: lead.website || '',
            address: lead.address || ''
          });

          const suggestedCategory = response.data.category;

          // Mettre à jour le lead
          await api.patch(`/leads/${leadId}`, {
            sector: suggestedCategory
          });

          successCount++;

          // Petit délai pour éviter de surcharger l'API
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          console.error(`Erreur lead ${leadId}:`, error);
          errorCount++;
        }
      }

      alert(`✅ Recatégorisation terminée !\n\n${successCount} leads mis à jour\n${errorCount} erreurs`);

      // Recharger la liste
      await loadLeads();
      setSelectedLeads([]);

    } catch (error) {
      console.error('Erreur recatégorisation:', error);
      alert('Erreur lors de la recatégorisation');
    } finally {
      setProcessing(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Recatégorisation IA
          </h1>
          <p className="text-gray-700 text-lg font-medium">
            Utilisez l'IA ASEFI pour catégoriser automatiquement vos leads
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-xl border-2 border-gray-200 bg-gradient-to-br from-blue-500 to-blue-600 hover:scale-105 transition-all">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between text-white">
                <div>
                  <p className="text-sm font-medium opacity-90">Total Leads</p>
                  <p className="text-4xl font-bold mt-1">{stats.total}</p>
                </div>
                <Database className="w-16 h-16 opacity-30" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-2 border-gray-200 bg-gradient-to-br from-orange-500 to-orange-600 hover:scale-105 transition-all">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between text-white">
                <div>
                  <p className="text-sm font-medium opacity-90">Non Catégorisés</p>
                  <p className="text-4xl font-bold mt-1">{stats.uncategorized}</p>
                </div>
                <AlertCircle className="w-16 h-16 opacity-30" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-2 border-gray-200 bg-gradient-to-br from-purple-500 to-purple-600 hover:scale-105 transition-all">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between text-white">
                <div>
                  <p className="text-sm font-medium opacity-90">Sélectionnés</p>
                  <p className="text-4xl font-bold mt-1">{selectedLeads.length}</p>
                </div>
                <CheckCircle className="w-16 h-16 opacity-30" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="shadow-xl border-2 border-indigo-200 bg-indigo-50 mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Sparkles className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-indigo-900 mb-2">Comment ça fonctionne ?</h3>
                <p className="text-sm text-indigo-800">
                  L'IA ASEFI analyse le nom de l'entreprise, sa description, son site web et son adresse
                  pour déterminer automatiquement la catégorie la plus appropriée. Sélectionnez les leads
                  à traiter et lancez la recatégorisation.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="mb-6 flex gap-4">
          <button
            onClick={handleSelectAll}
            className="px-6 py-3 bg-white border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all"
          >
            {selectedLeads.length === leads.length ? 'Tout désélectionner' : 'Tout sélectionner'}
          </button>

          <button
            onClick={handleRecategorizeWithAI}
            disabled={processing || selectedLeads.length === 0}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg font-bold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Recatégorisation en cours... ({progress.current}/{progress.total})
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Recatégoriser avec l'IA ({selectedLeads.length} leads)
              </>
            )}
          </button>
        </div>

        {/* Leads List */}
        {leads.length === 0 ? (
          <Card className="shadow-xl border-2 border-gray-200">
            <CardContent className="pt-12 pb-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Tous les leads sont catégorisés !
              </h3>
              <p className="text-gray-600">
                Excellent travail ! Tous vos leads ont une catégorie assignée.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-xl border-2 border-gray-200">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
              <CardTitle>Leads à catégoriser ({leads.length})</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {leads.map(lead => (
                  <div
                    key={lead.id}
                    onClick={() => handleSelectLead(lead.id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedLeads.includes(lead.id)
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectLead(lead.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900">{lead.company_name}</h4>
                        {lead.contact_name && (
                          <p className="text-sm text-gray-600">{lead.contact_name}</p>
                        )}
                        {lead.website && (
                          <p className="text-sm text-gray-500">{lead.website}</p>
                        )}
                        {lead.address && (
                          <p className="text-sm text-gray-500">{lead.address}</p>
                        )}
                        <div className="mt-2">
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
                            {lead.sector || 'Non catégorisé'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
