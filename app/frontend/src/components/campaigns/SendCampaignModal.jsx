import { log, error, warn } from "../lib/logger.js";
import React, { useState, useEffect } from 'react';
import { X, Send, AlertTriangle, CheckCircle, Loader2, Mail, Database, Tag, Users } from 'lucide-react';
import api from '../../api/axios';

export default function SendCampaignModal({ campaign, onClose, onSent }) {
  const [templates, setTemplates] = useState([]);
  const [databases, setDatabases] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedDatabase, setSelectedDatabase] = useState('');
  const [selectedSector, setSelectedSector] = useState('');
  const [leadsCount, setLeadsCount] = useState(0);
  const [testMode, setTestMode] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [quotas, setQuotas] = useState(null);
  const [loadingQuotas, setLoadingQuotas] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(false);

  useEffect(() => {
    loadTemplates();
    loadDatabases();
    loadQuotas();
  }, []);

  useEffect(() => {
    if (selectedDatabase) {
      loadSectors();
      loadLeadsCount();
    }
  }, [selectedDatabase, selectedSector]);

  const loadTemplates = async () => {
    try {
      const response = await api.get('/email-templates');
      setTemplates(response.data.templates || []);
    } catch (error) {
      error('Erreur templates:', error);
    }
  };

  const loadDatabases = async () => {
    try {
      const response = await api.get('/lead-databases');
      setDatabases(response.data.databases || []);
    } catch (error) {
      error('Erreur databases:', error);
    }
  };

  const loadSectors = async () => {
    if (!selectedDatabase) return;
    
    try {
      const response = await api.get(`/lead-databases/${selectedDatabase}/sectors`);
      setSectors(response.data.sectors || []);
    } catch (error) {
      error('Erreur secteurs:', error);
      setSectors([]);
    }
  };

  const loadLeadsCount = async () => {
    if (!selectedDatabase) return;
    
    setLoadingLeads(true);
    try {
      const params = new URLSearchParams({
        database_id: selectedDatabase
      });
      
      if (selectedSector) {
        params.append('sector', selectedSector);
      }

      const response = await api.get(`/leads/count?${params}`);
      setLeadsCount(response.data.count || 0);
    } catch (error) {
      error('Erreur count leads:', error);
      setLeadsCount(0);
    } finally {
      setLoadingLeads(false);
    }
  };

  const loadQuotas = async () => {
    try {
      const response = await api.get('/quotas');
      setQuotas(response.data.quotas);
    } catch (error) {
      error('Erreur quotas:', error);
    } finally {
      setLoadingQuotas(false);
    }
  };

  const getQuotaInfo = () => {
    if (!quotas || !quotas.email) {
      return { used: 0, limit: 100, remaining: 100, percentage: 0, plan: 'FREE' };
    }
    return quotas.email;
  };

  const handleSend = async () => {
    if (!selectedTemplate) {
      alert('?? Veuillez sélectionner un template');
      return;
    }

    if (!selectedDatabase) {
      alert('?? Veuillez sélectionner une base de données');
      return;
    }

    if (leadsCount === 0) {
      alert('?? Aucun lead trouvé dans cette sélection');
      return;
    }

    const quotaInfo = getQuotaInfo();

    if (!testMode && quotaInfo.remaining <= 0 && quotaInfo.limit !== -1) {
      alert('?? Quota d\'emails atteint ! Veuillez upgrader votre plan.');
      return;
    }

    const leadsToSend = testMode ? Math.min(5, leadsCount) : leadsCount;
    const confirmMessage = testMode
      ? `?? Envoyer un TEST à ${leadsToSend} leads ?\n\nBase: ${databases.find(d => d.id == selectedDatabase)?.name}\n${selectedSector ? `Secteur: ${selectedSector}\n` : ''}Template: ${templates.find(t => t.id == selectedTemplate)?.name}`
      : `?? ENVOYER LA CAMPAGNE à ${leadsCount} leads ?\n\nBase: ${databases.find(d => d.id == selectedDatabase)?.name}\n${selectedSector ? `Secteur: ${selectedSector}\n` : ''}Template: ${templates.find(t => t.id == selectedTemplate)?.name}\n\nQuota restant: ${quotaInfo.remaining === -1 ? '8' : quotaInfo.remaining} emails`;

    if (!confirm(confirmMessage)) return;

    setSending(true);
    setProgress(10);

    try {
      setProgress(30);

      const response = await api.post('/send-campaign-emails', {
        campaign_id: campaign.id,
        template_id: selectedTemplate,
        database_id: selectedDatabase,
        sector: selectedSector || null,
        test_mode: testMode
      });

      setProgress(100);
      setResult(response.data);

      setTimeout(() => {
        if (onSent) onSent(response.data);
      }, 2000);

    } catch (error) {
      error('Erreur envoi:', error);
      alert('? Erreur : ' + (error.response?.data?.error || error.message));
      setSending(false);
      setProgress(0);
    }
  };

  if (result) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-2xl w-full p-8 relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>

          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>

            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {testMode ? '? Test envoyé !' : '?? Campagne envoyée !'}
            </h2>

            <p className="text-gray-600 mb-6">{result.message}</p>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <Mail className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-600">{result.results.total}</p>
                <p className="text-sm text-gray-600">Total</p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">{result.results.sent}</p>
                <p className="text-sm text-gray-600">Envoyés</p>
              </div>

              <div className="bg-red-50 p-4 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-600">{result.results.failed}</p>
                <p className="text-sm text-gray-600">Échoués</p>
              </div>
            </div>

            {result.quota && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-purple-700">Quota Emails</span>
                  <span className="text-sm text-purple-600">
                    {result.quota.used} / {result.quota.limit === -1 ? '8' : result.quota.limit}
                  </span>
                </div>
                {result.quota.limit !== -1 && (
                  <div className="w-full bg-purple-200 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${result.quota.percentage}%` }} />
                  </div>
                )}
              </div>
            )}

            <button onClick={onClose} className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700">
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

  const quotaInfo = getQuotaInfo();
  const selectedDb = databases.find(d => d.id == selectedDatabase);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full p-8 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg" disabled={sending}>
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          ?? Envoyer : {campaign.name}
        </h2>

        {!loadingQuotas && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-700">
                Quota Emails {quotaInfo.plan ? `(${quotaInfo.plan})` : ''}
              </span>
              <span className="text-sm text-blue-600">
                {quotaInfo.used} / {quotaInfo.limit === -1 ? '8' : quotaInfo.limit}
              </span>
            </div>
            {quotaInfo.limit !== -1 && (
              <>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${quotaInfo.percentage}%` }} />
                </div>
                <p className="text-xs text-blue-600 mt-2">Restant : {quotaInfo.remaining}</p>
              </>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Database className="w-4 h-4 inline mr-1" />
              Base de Données *
            </label>
            <select
              value={selectedDatabase}
              onChange={(e) => {
                setSelectedDatabase(e.target.value);
                setSelectedSector('');
                setSectors([]);
              }}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={sending}
            >
              <option value="">Sélectionner une base...</option>
              {databases.map((db) => (
                <option key={db.id} value={db.id}>
                  {db.name} ({db.leads_count || 0} leads)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Tag className="w-4 h-4 inline mr-1" />
              Secteur {sectors.length > 0 && '*'}
            </label>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={sending || !selectedDatabase || sectors.length === 0}
            >
              <option value="">Tous les secteurs</option>
              {sectors.map((sector, idx) => (
                <option key={idx} value={sector}>
                  {sector}
                </option>
              ))}
            </select>
            {selectedDatabase && sectors.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">Pas de secteurs dans cette base</p>
            )}
          </div>
        </div>

        {selectedDatabase && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-green-700">
                {loadingLeads ? 'Chargement...' : `${leadsCount} leads trouvés`}
              </span>
              {selectedSector && (
                <span className="text-sm text-green-600">dans le secteur "{selectedSector}"</span>
              )}
            </div>
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Mail className="w-4 h-4 inline mr-1" />
            Template Email *
          </label>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            disabled={sending}
          >
            <option value="">Sélectionner...</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name} - {t.subject}</option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={testMode}
              onChange={(e) => setTestMode(e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded"
              disabled={sending}
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Mode Test</span>
              <p className="text-xs text-gray-500">5 leads seulement</p>
            </div>
          </label>
        </div>

        {sending && (
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-700">Envoi en cours...</span>
              <span className="text-sm text-blue-600">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-blue-600 h-3 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border-2 rounded-lg font-semibold hover:bg-gray-50"
            disabled={sending}
          >
            Annuler
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !selectedTemplate || !selectedDatabase || leadsCount === 0}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                {testMode ? `Test (${Math.min(5, leadsCount)})` : `Envoyer (${leadsCount})`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
