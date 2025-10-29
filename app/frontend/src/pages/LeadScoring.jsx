import React, { useState, useEffect } from 'react';
import { 
  Target, TrendingUp, Award, Plus, Edit, Trash2, Save, X,
  Zap, ThermometerSun, Snowflake, Ban, Users, DollarSign,
  Calendar, CheckCircle, AlertCircle, Filter, Search, Download,
  Database, Megaphone, FileSpreadsheet
} from 'lucide-react';

const SCORE_RANGES = {
  hot: { min: 80, max: 100, label: ' Hot Lead', color: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-50' },
  warm: { min: 60, max: 79, label: ' Warm Lead', color: 'bg-orange-500', textColor: 'text-orange-700', bgColor: 'bg-orange-50' },
  cold: { min: 40, max: 59, label: ' Cold Lead', color: 'bg-blue-500', textColor: 'text-blue-700', bgColor: 'bg-blue-50' },
  disqualified: { min: 0, max: 39, label: ' Disqualified', color: 'bg-gray-500', textColor: 'text-gray-700', bgColor: 'bg-gray-50' }
};

const DEFAULT_RULES = [
  { id: 1, name: 'Email valide', category: 'contact', points: 10, active: true },
  { id: 2, name: 'Téléphone valide', category: 'contact', points: 10, active: true },
  { id: 3, name: 'Site web présent', category: 'company', points: 5, active: true },
  { id: 4, name: 'Entreprise > 50 employés', category: 'company', points: 15, active: true },
  { id: 5, name: 'Secteur cible', category: 'targeting', points: 20, active: true },
  { id: 6, name: 'Géolocalisation prioritaire', category: 'targeting', points: 10, active: true },
  { id: 7, name: 'A répondu à un email', category: 'engagement', points: 25, active: true },
  { id: 8, name: 'A visité le site', category: 'engagement', points: 15, active: true },
  { id: 9, name: 'A téléchargé un doc', category: 'engagement', points: 20, active: true },
  { id: 10, name: 'RDV demandé', category: 'engagement', points: 40, active: true }
];

const CATEGORIES = {
  contact: { label: 'Contact', icon: Users, color: 'blue' },
  company: { label: 'Entreprise', icon: DollarSign, color: 'green' },
  targeting: { label: 'Ciblage', icon: Target, color: 'purple' },
  engagement: { label: 'Engagement', icon: Zap, color: 'orange' }
};

export default function LeadScoring() {
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [leads, setLeads] = useState([]);
  const [databases, setDatabases] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  
  // Filtres
  const [selectedSource, setSelectedSource] = useState('all'); // all, database, campaign
  const [selectedDatabaseId, setSelectedDatabaseId] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterScore, setFilterScore] = useState('all');
  
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [stats, setStats] = useState({
    hot: 0,
    warm: 0,
    cold: 0,
    disqualified: 0,
    averageScore: 0
  });

  const [newRule, setNewRule] = useState({
    name: '',
    category: 'contact',
    points: 10,
    active: true
  });

  useEffect(() => {
    fetchDatabases();
    fetchCampaigns();
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [selectedSource, selectedDatabaseId, selectedCampaignId]);

  useEffect(() => {
    calculateStats();
  }, [leads]);

  const fetchDatabases = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/lead-databases', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) setDatabases(data.databases.filter(db => !db.archived));
    } catch (error) {
      console.error('Erreur chargement bases:', error);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/campaigns-full', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) setCampaigns(data.campaigns);
    } catch (error) {
      console.error('Erreur chargement campagnes:', error);
    }
  };

  const fetchLeads = async () => {
    try {
      let url = 'http://localhost:3000/api/leads';
      
      // Filtrer par base de données
      if (selectedSource === 'database' && selectedDatabaseId) {
        url += `?database_id=${selectedDatabaseId}`;
      }
      
      // Filtrer par campagne
      if (selectedSource === 'campaign' && selectedCampaignId) {
        url = `http://localhost:3000/api/campaign-leads?campaign_id=${selectedCampaignId}`;
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      
      if (data.success) {
        const leadsWithScores = data.leads.map(lead => ({
          ...lead,
          score: calculateLeadScore(lead),
          qualification: getQualification(calculateLeadScore(lead))
        }));
        setLeads(leadsWithScores);
      }
    } catch (error) {
      console.error('Erreur chargement leads:', error);
    }
  };

  const calculateLeadScore = (lead) => {
    let score = 0;

    rules.forEach(rule => {
      if (!rule.active) return;

      switch (rule.id) {
        case 1: if (lead.email && lead.email.includes('@')) score += rule.points; break;
        case 2: if (lead.phone) score += rule.points; break;
        case 3: if (lead.website) score += rule.points; break;
        case 4: if (lead.company_size && parseInt(lead.company_size) > 50) score += rule.points; break;
        case 5: if (lead.industry) score += rule.points; break;
        case 6: if (lead.city) score += rule.points; break;
        case 7: if (lead.last_email_opened) score += rule.points; break;
        case 8: if (lead.website_visits > 0) score += rule.points; break;
        case 9: if (lead.downloads > 0) score += rule.points; break;
        case 10: 
          if (lead.pipeline_stage === 'meeting_requested' || lead.pipeline_stage === 'meeting_scheduled') {
            score += rule.points;
          }
          break;
      }
    });

    return Math.min(score, 100);
  };

  const getQualification = (score) => {
    if (score >= 80) return 'hot';
    if (score >= 60) return 'warm';
    if (score >= 40) return 'cold';
    return 'disqualified';
  };

  const calculateStats = () => {
    const hot = leads.filter(l => l.qualification === 'hot').length;
    const warm = leads.filter(l => l.qualification === 'warm').length;
    const cold = leads.filter(l => l.qualification === 'cold').length;
    const disqualified = leads.filter(l => l.qualification === 'disqualified').length;
    const averageScore = leads.length > 0 
      ? Math.round(leads.reduce((sum, l) => sum + l.score, 0) / leads.length)
      : 0;

    setStats({ hot, warm, cold, disqualified, averageScore });
  };

  const handleAddRule = () => {
    if (!newRule.name) {
      alert(' Nom de la règle requis');
      return;
    }

    const rule = { id: rules.length + 1, ...newRule };
    setRules([...rules, rule]);
    setNewRule({ name: '', category: 'contact', points: 10, active: true });
    setShowRuleModal(false);
    fetchLeads();
  };

  const handleToggleRule = (ruleId) => {
    setRules(rules.map(r => r.id === ruleId ? { ...r, active: !r.active } : r));
    fetchLeads();
  };

  const handleDeleteRule = (ruleId) => {
    if (confirm('Supprimer cette règle ?')) {
      setRules(rules.filter(r => r.id !== ruleId));
      fetchLeads();
    }
  };

  const exportToCSV = () => {
    const headers = ['Entreprise', 'Email', 'Téléphone', 'Secteur', 'Score', 'Qualification'];
    const rows = filteredLeads.map(lead => [
      lead.company_name || '',
      lead.email || '',
      lead.phone || '',
      lead.industry || '',
      lead.score,
      SCORE_RANGES[lead.qualification].label
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `scoring-leads-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToExcel = () => {
    const headers = ['Entreprise', 'Email', 'Téléphone', 'Secteur', 'Ville', 'Score', 'Qualification'];
    const rows = filteredLeads.map(lead => [
      lead.company_name || '',
      lead.email || '',
      lead.phone || '',
      lead.industry || '',
      lead.city || '',
      lead.score,
      SCORE_RANGES[lead.qualification].label
    ]);

    let html = '<table><thead><tr>';
    headers.forEach(h => html += `<th>${h}</th>`);
    html += '</tr></thead><tbody>';
    rows.forEach(row => {
      html += '<tr>';
      row.forEach(cell => html += `<td>${cell}</td>`);
      html += '</tr>';
    });
    html += '</tbody></table>';

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `scoring-leads-${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
  };

  const filteredLeads = leads.filter(lead => {
    const matchSearch = searchTerm === '' || 
      lead.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFilter = filterScore === 'all' || lead.qualification === filterScore;
    return matchSearch && matchFilter;
  });

  const totalPossiblePoints = rules.filter(r => r.active).reduce((sum, r) => sum + r.points, 0);

  const getSourceLabel = () => {
    if (selectedSource === 'database' && selectedDatabaseId) {
      const db = databases.find(d => d.id === selectedDatabaseId);
      return db ? ` ${db.name}` : 'Tous les leads';
    }
    if (selectedSource === 'campaign' && selectedCampaignId) {
      const camp = campaigns.find(c => c.id === selectedCampaignId);
      return camp ? ` ${camp.name}` : 'Tous les leads';
    }
    return 'Tous les leads';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Target className="w-8 h-8 text-blue-600" />
              Scoring & Qualification
            </h1>
            <p className="text-gray-600 mt-1">Gérez vos règles de scoring et qualifiez automatiquement vos leads</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow-lg transition-all"
            >
              <Download className="w-5 h-5" />
              Export CSV
            </button>
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-lg transition-all"
            >
              <FileSpreadsheet className="w-5 h-5" />
              Export Excel
            </button>
            <button
              onClick={() => setShowRuleModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg transition-all"
            >
              <Plus className="w-5 h-5" />
              Nouvelle Règle
            </button>
          </div>
        </div>

        {/* Sélection Source */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4"> Source des leads à évaluer</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type de source</label>
              <select
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3"
                value={selectedSource}
                onChange={(e) => {
                  setSelectedSource(e.target.value);
                  setSelectedDatabaseId('');
                  setSelectedCampaignId('');
                }}
              >
                <option value="all"> Tous les leads</option>
                <option value="database"> Base de données</option>
                <option value="campaign"> Campagne</option>
              </select>
            </div>

            {selectedSource === 'database' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sélectionner une base</label>
                <select
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3"
                  value={selectedDatabaseId}
                  onChange={(e) => setSelectedDatabaseId(e.target.value)}
                >
                  <option value="">-- Choisir une base --</option>
                  {databases.map(db => (
                    <option key={db.id} value={db.id}>
                      {db.name} ({db.total_leads} leads)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedSource === 'campaign' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sélectionner une campagne</label>
                <select
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3"
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                >
                  <option value="">-- Choisir une campagne --</option>
                  {campaigns.map(camp => (
                    <option key={camp.id} value={camp.id}>
                      {camp.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-end">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg px-4 py-3 w-full">
                <p className="text-sm text-blue-600 font-medium">Évaluation en cours</p>
                <p className="text-lg font-bold text-blue-900">{getSourceLabel()}</p>
                <p className="text-xs text-blue-600 mt-1">{leads.length} lead(s) à évaluer</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl p-6 shadow-lg">
            <ThermometerSun className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-3xl font-bold">{stats.hot}</p>
            <p className="text-sm opacity-90">Hot Leads</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl p-6 shadow-lg">
            <Zap className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-3xl font-bold">{stats.warm}</p>
            <p className="text-sm opacity-90">Warm Leads</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6 shadow-lg">
            <Snowflake className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-3xl font-bold">{stats.cold}</p>
            <p className="text-sm opacity-90">Cold Leads</p>
          </div>

          <div className="bg-gradient-to-br from-gray-500 to-gray-600 text-white rounded-xl p-6 shadow-lg">
            <Ban className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-3xl font-bold">{stats.disqualified}</p>
            <p className="text-sm opacity-90">Disqualifiés</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-6 shadow-lg">
            <Award className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-3xl font-bold">{stats.averageScore}</p>
            <p className="text-sm opacity-90">Score Moyen</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Règles de scoring */}
        <div className="col-span-1 bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Règles de Scoring</h2>
            <span className="text-sm text-gray-600">{totalPossiblePoints} pts max</span>
          </div>

          <div className="space-y-3">
            {Object.entries(CATEGORIES).map(([key, cat]) => {
              const Icon = cat.icon;
              const categoryRules = rules.filter(r => r.category === key);
              
              return (
                <div key={key} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className={`w-5 h-5 text-${cat.color}-600`} />
                    <h3 className="font-semibold text-gray-900">{cat.label}</h3>
                  </div>

                  <div className="space-y-2">
                    {categoryRules.map(rule => (
                      <div 
                        key={rule.id}
                        className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                          rule.active ? 'bg-gray-50 border border-gray-200' : 'bg-gray-100 opacity-60'
                        }`}
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{rule.name}</p>
                          <p className="text-xs text-gray-600">+{rule.points} points</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleRule(rule.id)}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                              rule.active 
                                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                          >
                            {rule.active ? 'ON' : 'OFF'}
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="p-1 hover:bg-red-100 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Liste des leads qualifiés */}
        <div className="col-span-2 bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Leads Qualifiés ({filteredLeads.length})</h2>
            <div className="flex gap-3">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  className="pl-10 pr-4 py-2 border rounded-lg"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="border rounded-lg px-4 py-2"
                value={filterScore}
                onChange={(e) => setFilterScore(e.target.value)}
              >
                <option value="all">Tous</option>
                <option value="hot"> Hot</option>
                <option value="warm"> Warm</option>
                <option value="cold"> Cold</option>
                <option value="disqualified"> Disqualified</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 max-h-[700px] overflow-y-auto">
            {filteredLeads.map(lead => {
              const qualification = SCORE_RANGES[lead.qualification];
              
              return (
                <div 
                  key={lead.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{lead.company_name}</h3>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${qualification.bgColor} ${qualification.textColor}`}>
                        {qualification.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      {lead.email && <span> {lead.email}</span>}
                      {lead.phone && <span> {lead.phone}</span>}
                      {lead.industry && <span> {lead.industry}</span>}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl font-bold text-gray-900">{lead.score}</span>
                      <span className="text-sm text-gray-500">/ 100</span>
                    </div>
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${qualification.color}`}
                        style={{ width: `${lead.score}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal Nouvelle Règle */}
      {showRuleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Nouvelle Règle de Scoring</h2>
              <button onClick={() => setShowRuleModal(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Nom de la règle *</label>
                <input
                  type="text"
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3"
                  value={newRule.name}
                  onChange={(e) => setNewRule({...newRule, name: e.target.value})}
                  placeholder="Ex: A visité la page tarifs"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Catégorie</label>
                <select
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3"
                  value={newRule.category}
                  onChange={(e) => setNewRule({...newRule, category: e.target.value})}
                >
                  {Object.entries(CATEGORIES).map(([key, cat]) => (
                    <option key={key} value={key}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Points attribués</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3"
                  value={newRule.points}
                  onChange={(e) => setNewRule({...newRule, points: parseInt(e.target.value)})}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowRuleModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddRule}
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  Créer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
