<<<<<<< HEAD
import { log, error, warn } from "./../lib/logger.js";
=======
import { log, error, warn } from "../lib/logger.js";
>>>>>>> origin/main
﻿import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Target, Zap, Snowflake, Ban, Users, Mail, Phone, Globe, 
  Download, Upload, RotateCw, CheckCircle, XCircle, AlertCircle,
  TrendingUp, Award, Filter, BarChart3, Activity, User, Building2, MapPin
} from "lucide-react";
import api from "../api/axios";

export default function LeadScoring() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [evaluating, setEvaluating] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    hot: 0,
    warm: 0,
    cold: 0,
    disqualified: 0,
    scoreMoyen: 0
  });
  const [rules, setRules] = useState([
    { id: 1, name: "Email valide", points: 10, type: "contact", status: "active" },
    { id: 2, name: "Téléphone valide", points: 10, type: "contact", status: "active" },
    { id: 3, name: "Site web présent", points: 5, type: "entreprise", status: "active" },
    { id: 4, name: "Secteur prioritaire", points: 20, type: "entreprise", status: "active" },
    { id: 5, name: "Ville cible", points: 15, type: "entreprise", status: "active" },
    { id: 6, name: "Taille entreprise", points: 10, type: "entreprise", status: "active" }
  ]);

  useEffect(() => {
    loadLeads();
  }, [sourceFilter]);

 const loadLeads = async () => {
  try {
    setLoading(true);
    
    // 1. Charger TOUS les leads
    const leadsResponse = await api.get('/leads');
    const allLeads = leadsResponse.data.leads || [];
    
    // 2. Charger les campagnes EMAIL pour identifier les leads WARM
    const campaignsResponse = await api.get('/campaigns');
    const campaigns = campaignsResponse.data.campaigns || [];
    
    // 3. Récupérer les leads des campagnes PHONING (leads froids)
    const phoningResponse = await api.get('/pipeline-leads');
    const phoningLeads = phoningResponse.data.leads || [];
    
    // 4. Identifier les leads WARM : ceux qui ont CLIQUÉ dans les campagnes email
    const warmLeadIds = new Set();
    campaigns.forEach(campaign => {
      // Les leads qui ont cliqué = WARM
      if (campaign.clicked_leads && Array.isArray(campaign.clicked_leads)) {
        campaign.clicked_leads.forEach(leadId => warmLeadIds.add(leadId));
      }
    });
    
    // 5. Identifier les leads COLD : ceux en campagne phoning
    const coldLeadIds = new Set();
    phoningLeads.forEach(lead => {
      coldLeadIds.add(lead.id);
    });
    
    // 6. Calculer score et catégorie pour chaque lead
    const leadsWithScores = allLeads.map(lead => {
      let score = calculateScore(lead);
      let category;
      
      // Déterminer la catégorie basée sur les VRAIES données
      if (lead.status === 'qualified' && score >= 70) {
        category = 'hot';
      } else if (warmLeadIds.has(lead.id)) {
        // Lead qui a cliqué = WARM
        category = 'warm';
      } else if (coldLeadIds.has(lead.id) || lead.status === 'new') {
        // Lead en phoning ou nouveau = COLD
        category = 'cold';
      } else if (score < 20) {
        category = 'disqualified';
      } else {
        // Par défaut basé sur le score
        category = getCategoryFromScore(score);
      }
      
      return {
        ...lead,
        score,
        category
      };
    });
    
    setLeads(leadsWithScores);
    calculateStats(leadsWithScores);
    
  } catch (error) {
    error('Erreur chargement:', error);
  } finally {
    setLoading(false);
  }
};

  const calculateScore = (lead) => {
    let score = 0;
    
    // Email valide
    if (lead.email && lead.email.includes('@')) score += 10;
    
    // Téléphone valide
    if (lead.phone && lead.phone.length >= 10) score += 10;
    
    // Site web
    if (lead.website) score += 5;
    
    // Secteur prioritaire (informatique, juridique, comptabilité)
    if (['informatique', 'juridique', 'comptabilite', 'consulting'].includes(lead.industry || lead.sector)) score += 20;
    
    // Ville importante
    if (['Paris', 'Lyon', 'Marseille'].some(city => lead.city?.includes(city))) score += 15;
    
    // Note existante
    if (lead.score) score = Math.max(score, lead.score);
    
    return Math.min(score, 100); // Max 100
  };

  const getCategoryFromScore = (score) => {
    if (score >= 70) return 'hot';
    if (score >= 40) return 'warm';
    if (score >= 20) return 'cold';
    return 'disqualified';
  };

  const calculateStats = (leadsData) => {
    const total = leadsData.length;
    const hot = leadsData.filter(l => l.category === 'hot').length;
    const warm = leadsData.filter(l => l.category === 'warm').length;
    const cold = leadsData.filter(l => l.category === 'cold').length;
    const disqualified = leadsData.filter(l => l.category === 'disqualified').length;
    const scoreMoyen = total > 0 
      ? Math.round(leadsData.reduce((sum, l) => sum + l.score, 0) / total)
      : 0;
    
    setStats({ total, hot, warm, cold, disqualified, scoreMoyen });
  };

  const exportResults = () => {
    const csv = [
      ['Entreprise', 'Email', 'Téléphone', 'Score', 'Catégorie'],
      ...leads.map(lead => [
        lead.company_name,
        lead.email || '',
        lead.phone || '',
        lead.score,
        lead.category
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scoring_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  const getCategoryStyle = (category) => {
    const styles = {
      hot: "bg-gradient-to-r from-red-500 to-orange-500 text-white",
      warm: "bg-gradient-to-r from-yellow-500 to-orange-500 text-white",
      cold: "bg-gradient-to-r from-blue-500 to-cyan-500 text-white",
      disqualified: "bg-gradient-to-r from-gray-500 to-gray-600 text-white"
    };
    return styles[category] || styles.cold;
  };

  const getCategoryIcon = (category) => {
    const icons = {
      hot: <Zap className="w-5 h-5" />,
      warm: <Activity className="w-5 h-5" />,
      cold: <Snowflake className="w-5 h-5" />,
      disqualified: <Ban className="w-5 h-5" />
    };
    return icons[category] || icons.cold;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Target className="w-10 h-10 text-blue-600" />
              Scoring &amp; Qualification
            </h1>
            <p className="text-gray-600 mt-1">Gérez vos règles de scoring et qualifiez automatiquement vos leads</p>
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={exportResults}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <Button 
              variant="outline"
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Export Excel
            </Button>
            <Button 
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
            >
              <RotateCw className="w-4 h-4 mr-2" />
              Nouvelle Règle
            </Button>
          </div>
        </div>
      </div>

      {/* Source Filter avec couleurs */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 border-2 border-purple-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <label className="font-bold text-gray-700">Source des leads à évaluer</label>
            <select 
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-4 py-2 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
            >
              <option value="all">Tous les leads</option>
              <option value="database">Base spécifique</option>
              <option value="campaign">Campagne spécifique</option>
              <option value="new">Nouveaux leads uniquement</option>
            </select>
            
            <div className="ml-auto flex items-center gap-3 text-sm">
              <span className="text-gray-600 font-medium">Évaluation en cours</span>
              <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1">
                Tous les leads
              </Badge>
              <span className="text-gray-700 font-bold">{leads.length} lead(s) à évaluer</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards avec plus de couleurs */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {/* Hot Leads */}
        <Card className="border-2 border-red-300 bg-gradient-to-br from-red-50 via-orange-50 to-red-100 hover:shadow-xl transition-all transform hover:scale-105">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Zap className="w-10 h-10 text-red-600" />
              <span className="text-xs font-bold text-red-700">HOT LEADS</span>
            </div>
            <p className="text-5xl font-bold text-red-600">{stats.hot}</p>
            <p className="text-sm text-red-600 font-medium mt-1">Score ≥ 70</p>
          </CardContent>
        </Card>

        {/* Warm Leads */}
        <Card className="border-2 border-orange-300 bg-gradient-to-br from-yellow-50 via-orange-50 to-yellow-100 hover:shadow-xl transition-all transform hover:scale-105">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-10 h-10 text-orange-600" />
              <span className="text-xs font-bold text-orange-700">WARM LEADS</span>
            </div>
            <p className="text-5xl font-bold text-orange-600">{stats.warm}</p>
            <p className="text-sm text-orange-600 font-medium mt-1">Cliqués/Contactés</p>
          </CardContent>
        </Card>

        {/* Cold Leads */}
        <Card className="border-2 border-blue-300 bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 hover:shadow-xl transition-all transform hover:scale-105">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Snowflake className="w-10 h-10 text-blue-600" />
              <span className="text-xs font-bold text-blue-700">COLD LEADS</span>
            </div>
            <p className="text-5xl font-bold text-blue-600">{stats.cold}</p>
            <p className="text-sm text-blue-600 font-medium mt-1">Nouveaux/Phoning</p>
          </CardContent>
        </Card>

        {/* Disqualified */}
        <Card className="border-2 border-gray-400 bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 hover:shadow-xl transition-all transform hover:scale-105">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Ban className="w-10 h-10 text-gray-700" />
              <span className="text-xs font-bold text-gray-800">DISQUALIFIÉS</span>
            </div>
            <p className="text-5xl font-bold text-gray-700">{stats.disqualified}</p>
            <p className="text-sm text-gray-600 font-medium mt-1">Score inférieur à 20</p>
          </CardContent>
        </Card>

        {/* Score Moyen */}
        <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-100 via-pink-100 to-purple-200 hover:shadow-xl transition-all transform hover:scale-105">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Award className="w-10 h-10 text-purple-700" />
              <span className="text-xs font-bold text-purple-800">SCORE MOYEN</span>
            </div>
            <p className="text-4xl font-bold text-purple-700">
              {stats.scoreMoyen}<span className="text-2xl">/100</span>
            </p>
            <p className="text-sm text-purple-600 font-medium mt-1">Total: {stats.total} leads</p>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Règles de Scoring */}
        <Card className="shadow-xl border-2 border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
            <CardTitle className="flex items-center justify-between">
              <span className="text-xl">Règles de Scoring</span>
              <span className="text-sm text-gray-500 font-normal">{rules.length} règles actives • 170 pts max</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Section Contact */}
            <div>
              <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Contact
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-blue-600" />
                    <div>
                      <span className="font-medium text-gray-800">Email valide</span>
                      <span className="ml-3 text-sm text-green-600 font-bold">+10 points</span>
                    </div>
                  </div>
                  <Badge className="bg-green-500 text-white">ON</Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-blue-600" />
                    <div>
                      <span className="font-medium text-gray-800">Téléphone valide</span>
                      <span className="ml-3 text-sm text-green-600 font-bold">+10 points</span>
                    </div>
                  </div>
                  <Badge className="bg-green-500 text-white">ON</Badge>
                </div>
              </div>
            </div>

            {/* Section Entreprise */}
            <div>
              <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-600" />
                Entreprise
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 border-2 border-purple-200 rounded-lg hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-purple-600" />
                    <div>
                      <span className="font-medium text-gray-800">Site web présent</span>
                      <span className="ml-3 text-sm text-green-600 font-bold">+5 points</span>
                    </div>
                  </div>
                  <Badge className="bg-green-500 text-white">ON</Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 border-2 border-purple-200 rounded-lg hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-purple-600" />
                    <div>
                      <span className="font-medium text-gray-800">Secteur prioritaire</span>
                      <span className="ml-3 text-sm text-green-600 font-bold">+20 points</span>
                    </div>
                  </div>
                  <Badge className="bg-green-500 text-white">ON</Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 border-2 border-purple-200 rounded-lg hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-purple-600" />
                    <div>
                      <span className="font-medium text-gray-800">Ville cible</span>
                      <span className="ml-3 text-sm text-green-600 font-bold">+15 points</span>
                    </div>
                  </div>
                  <Badge className="bg-green-500 text-white">ON</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leads Qualifiés */}
        <Card className="shadow-xl border-2 border-green-200">
          <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
            <CardTitle className="flex items-center justify-between">
              <span className="text-xl">Leads Qualifiés ({leads.length})</span>
              <div className="flex gap-2">
                <input 
                  type="search" 
                  placeholder="Rechercher..."
                  className="px-3 py-1 border-2 border-gray-300 rounded-lg text-sm"
                />
                <select className="px-3 py-1 border-2 border-gray-300 rounded-lg text-sm font-normal">
                  <option>Tous</option>
                  <option>Hot</option>
                  <option>Warm</option>
                  <option>Cold</option>
                  <option>Disqualifiés</option>
                </select>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {leads.length === 0 ? (
                <div className="text-center py-12">
                  <Ban className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Aucun lead trouvé</p>
                  <p className="text-sm text-gray-400 mt-2">Importez des leads pour commencer le scoring</p>
                </div>
              ) : (
                leads.slice(0, 20).map((lead, index) => (
                  <div key={lead.id || index} className="p-4 bg-gradient-to-r from-gray-50 to-white border-2 border-gray-200 rounded-lg hover:shadow-lg transition-all cursor-pointer hover:border-blue-300">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">{lead.company_name}</p>
                        <div className="flex gap-4 text-sm text-gray-600 mt-2">
                          {lead.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-4 h-4 text-gray-400" />
                              <span className="truncate max-w-[200px]">{lead.email}</span>
                            </span>
                          )}
                          {lead.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-4 h-4 text-gray-400" />
                              {lead.phone}
                            </span>
                          )}
                        </div>
                        {lead.city && (
                          <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                            <MapPin className="w-3 h-3" />
                            {lead.city}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-800">{lead.score}</p>
                          <p className="text-xs text-gray-500">/100</p>
                        </div>
                        <Badge className={`${getCategoryStyle(lead.category)} px-3 py-2 shadow-md`}>
                          {getCategoryIcon(lead.category)}
                          <span className="ml-2 font-bold">{lead.category?.toUpperCase()}</span>
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}