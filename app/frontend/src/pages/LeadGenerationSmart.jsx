/**
 * LeadGenerationSmart - Génération de leads intelligente V2
 * Interface moderne avec multi-sélection
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sparkles, Loader2, CheckCircle2, AlertTriangle, MapPin, Building2,
  Search, Database, Globe, Users, Save, Plus, X, Zap,
  Map, Layers, ArrowRight, TrendingUp, Target, Filter, ChevronDown
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/axios";

// Secteurs disponibles
const SECTORS = [
  { value: "immobilier", label: "Immobilier", icon: "🏠" },
  { value: "juridique", label: "Juridique / Avocats", icon: "⚖️" },
  { value: "comptabilite", label: "Comptabilité / Expert-comptable", icon: "📊" },
  { value: "informatique", label: "Informatique / IT", icon: "💻" },
  { value: "sante", label: "Santé / Médical", icon: "🏥" },
  { value: "btp", label: "BTP / Construction", icon: "🏗️" },
  { value: "hotellerie", label: "Hôtellerie / Restauration", icon: "🍽️" },
  { value: "commerce", label: "Commerce / Retail", icon: "🛒" },
  { value: "logistique", label: "Transport / Logistique", icon: "📦" },
  { value: "education", label: "Éducation / Formation", icon: "🎓" },
  { value: "consulting", label: "Consulting / Conseil", icon: "💼" },
  { value: "marketing", label: "Marketing / Communication", icon: "📣" },
  { value: "rh", label: "Ressources Humaines", icon: "👥" },
  { value: "industrie", label: "Industrie / Manufacturing", icon: "🏭" },
  { value: "automobile", label: "Automobile / Garage", icon: "🚗" },
  { value: "assurance", label: "Assurance", icon: "🛡️" },
  { value: "banque", label: "Banque / Finance", icon: "🏦" },
  { value: "beaute", label: "Beauté / Bien-être", icon: "💅" },
  { value: "sport", label: "Sport / Fitness", icon: "🏋️" },
  { value: "artisan", label: "Artisanat", icon: "🔧" }
];

export default function LeadGenerationSmart() {
  const navigate = useNavigate();

  // État du formulaire
  const [sector, setSector] = useState("");
  const [geoType, setGeoType] = useState("region");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedItems, setSelectedItems] = useState([]); // Multi-sélection
  const [quantity, setQuantity] = useState(500);

  // Données géographiques
  const [regions, setRegions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [deptSearch, setDeptSearch] = useState(""); // Recherche département

  // Recherche de ville
  const [citySearch, setCitySearch] = useState("");
  const [cityResults, setCityResults] = useState([]);
  const [isSearchingCity, setIsSearchingCity] = useState(false);
  const [selectedCity, setSelectedCity] = useState(null);

  // État utilisateur
  const [credits, setCredits] = useState({ available: 0, used: 0 });
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // État de l'analyse
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  // État de la génération
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [leads, setLeads] = useState([]);
  const [generationComplete, setGenerationComplete] = useState(false);

  // Modal de sauvegarde
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [databases, setDatabases] = useState([]);
  const [selectedDatabase, setSelectedDatabase] = useState("");
  const [createNewDb, setCreateNewDb] = useState(true);
  const [newDbName, setNewDbName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Charger au démarrage
  useEffect(() => {
    loadRegions();
    loadCredits();
    loadDatabases();
    checkSuperAdmin();
  }, []);

  const checkSuperAdmin = async () => {
    try {
      const { data } = await api.get('/auth/me');
      console.log('Auth/me response:', data); // Debug
      const isSuperAdminUser = data.is_super_admin === true;
      setIsSuperAdmin(isSuperAdminUser);
      if (isSuperAdminUser) {
        setCredits({ available: 999999, used: 0 });
      }
    } catch (err) {
      console.error('Erreur checkSuperAdmin:', err);
    }
  };

  const loadRegions = async () => {
    try {
      const { data } = await api.get('/lead-availability/regions');
      setRegions(data.regions || []);
    } catch (err) {
      // Fallback
      setRegions([
        { code: '11', nom: 'Île-de-France' },
        { code: '93', nom: 'Provence-Alpes-Côte d\'Azur' },
        { code: '84', nom: 'Auvergne-Rhône-Alpes' },
        { code: '75', nom: 'Nouvelle-Aquitaine' },
        { code: '76', nom: 'Occitanie' },
        { code: '32', nom: 'Hauts-de-France' },
        { code: '44', nom: 'Grand Est' },
        { code: '52', nom: 'Pays de la Loire' },
        { code: '53', nom: 'Bretagne' },
        { code: '28', nom: 'Normandie' },
        { code: '27', nom: 'Bourgogne-Franche-Comté' },
        { code: '24', nom: 'Centre-Val de Loire' },
        { code: '94', nom: 'Corse' }
      ]);
    }
  };

  const loadDepartments = async (regionCode) => {
    try {
      const { data } = await api.get(`/lead-availability/departments/${regionCode}`);
      setDepartments(data.departments || []);
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  // Charger TOUS les départements de France
  const loadAllDepartments = async () => {
    try {
      const { data } = await api.get('/lead-availability/all-departments');
      setDepartments(data.departments || []);
    } catch (err) {
      console.error('Erreur:', err);
      // Fallback sur liste statique si API échoue
      setDepartments([
        { code: '75', nom: 'Paris' },
        { code: '92', nom: 'Hauts-de-Seine' },
        { code: '93', nom: 'Seine-Saint-Denis' },
        { code: '94', nom: 'Val-de-Marne' },
        { code: '91', nom: 'Essonne' },
        { code: '77', nom: 'Seine-et-Marne' },
        { code: '78', nom: 'Yvelines' },
        { code: '95', nom: 'Val-d\'Oise' },
        { code: '13', nom: 'Bouches-du-Rhône' },
        { code: '69', nom: 'Rhône' },
        { code: '33', nom: 'Gironde' },
        { code: '31', nom: 'Haute-Garonne' },
        { code: '59', nom: 'Nord' },
        { code: '44', nom: 'Loire-Atlantique' },
        { code: '06', nom: 'Alpes-Maritimes' }
      ]);
    }
  };

  const loadCredits = async () => {
    try {
      const { data } = await api.get('/lead-credits');
      setCredits({
        available: data.credits?.remaining || 0,
        used: data.credits?.used || 0
      });
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  const loadDatabases = async () => {
    try {
      const { data } = await api.get('/lead-databases');
      setDatabases(data.databases || []);
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  // Gestion de la sélection géographique
  const handleRegionChange = (code) => {
    setSelectedRegion(code);
    setSelectedItems([]);
    if (geoType === 'department') {
      loadDepartments(code);
    }
  };

  const toggleItem = (item) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.code === item.code);
      if (exists) {
        return prev.filter(i => i.code !== item.code);
      }
      return [...prev, item];
    });
    setAnalysis(null);
  };

  const removeItem = (code) => {
    setSelectedItems(prev => prev.filter(i => i.code !== code));
    setAnalysis(null);
  };

  // Recherche de ville (debounced)
  const searchCities = async (query) => {
    if (!query || query.length < 2) {
      setCityResults([]);
      return;
    }

    setIsSearchingCity(true);
    try {
      const response = await fetch(`https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(query)}&fields=nom,code,departement,region,population&limit=10`);
      const data = await response.json();
      setCityResults(data.map(c => ({
        code: c.code,
        nom: c.nom,
        departement: c.departement?.nom,
        region: c.region?.nom,
        population: c.population
      })));
    } catch (err) {
      console.error('Erreur recherche ville:', err);
      setCityResults([]);
    } finally {
      setIsSearchingCity(false);
    }
  };

  // Debounce pour la recherche de ville
  useEffect(() => {
    const timer = setTimeout(() => {
      if (citySearch) {
        searchCities(citySearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [citySearch]);

  // Analyser la disponibilité
  const handleAnalyze = async () => {
    if (!sector) {
      toast.error("Sélectionnez un secteur d'activité");
      return;
    }

    let geoCode = '';
    let geoName = '';

    if (geoType === 'region') {
      if (!selectedRegion) {
        toast.error("Sélectionnez une région");
        return;
      }
      geoCode = selectedRegion;
      geoName = regions.find(r => r.code === selectedRegion)?.nom || '';
    } else if (geoType === 'department') {
      if (selectedItems.length === 0) {
        toast.error("Sélectionnez au moins un département");
        return;
      }
      geoCode = selectedItems.map(i => i.code).join(',');
      geoName = selectedItems.map(i => i.nom).join(', ');
    } else if (geoType === 'city') {
      if (!selectedCity) {
        toast.error("Sélectionnez une ville");
        return;
      }
      geoCode = selectedCity.nom;
      geoName = `${selectedCity.nom} (${selectedCity.departement})`;
    }

    if (!isSuperAdmin && quantity > credits.available) {
      toast.error(`Crédits insuffisants. Disponible: ${credits.available}`);
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null);
    setSuggestions([]);

    try {
      const { data } = await api.post('/lead-availability/analyze', {
        sector,
        geoType,
        geoCode,
        quantity: parseInt(quantity)
      });

      setAnalysis({ ...data.analysis, geoName });

      if (!data.analysis.canFulfill && data.analysis.missing > 0) {
        const suggestResponse = await api.post('/lead-availability/suggest', {
          sector,
          geoType,
          geoCode,
          missing: data.analysis.missing
        });
        setSuggestions(suggestResponse.data.suggestions || []);
      }

    } catch (err) {
      console.error('Erreur analyse:', err);
      toast.error(err.response?.data?.error || "Erreur d'analyse");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Générer les leads
  const handleGenerate = async (finalQuantity) => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) {
      toast.error("Session expirée");
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setLeads([]);
    setMessage("Initialisation...");
    setGenerationComplete(false);

    const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') ||
      (window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://leadsynch-api.onrender.com');

    // Construire les paramètres géographiques
    let geoParams = {};

    if (geoType === 'region') {
      geoParams = {
        geoType: 'region',
        geoCode: selectedRegion
      };
    } else if (geoType === 'department') {
      // Multi-sélection de départements
      const deptCodes = selectedItems.map(item => item.code).join(',');
      geoParams = {
        geoType: 'department',
        geoCode: deptCodes
      };
    } else if (geoType === 'city') {
      // Ville unique
      geoParams = {
        geoType: 'city',
        geoCode: selectedCity?.nom || ''
      };
    }

    console.log('🚀 Génération avec params:', { sector, ...geoParams, quantity: finalQuantity });

    try {
      const response = await fetch(`${API_BASE}/api/generate-leads-v2`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          sector,
          ...geoParams,
          quantity: finalQuantity,
          searchId: Date.now().toString()
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const messages = buffer.split('\n\n');
        buffer = messages.pop() || '';

        for (const msg of messages) {
          const lines = msg.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                handleSSEEvent(data);
              } catch (e) {}
            }
          }
        }
      }

    } catch (err) {
      console.error('Erreur génération:', err);
      toast.error(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSSEEvent = (data) => {
    switch (data.type) {
      case 'progress':
        setProgress(data.percent);
        setMessage(data.message);
        break;
      case 'internal_lead':
      case 'cache_lead':
      case 'sirene_lead':
      case 'new_lead':
        setLeads(prev => [...prev, data.lead]);
        break;
      case 'internal_results':
      case 'cache_results':
      case 'sirene_results':
        setProgress(data.percent);
        setMessage(data.message);
        break;
      case 'complete':
        setProgress(100);
        setGenerationComplete(true);
        setMessage(`${data.total} leads générés !`);
        toast.success(`${data.total} leads générés !`);
        setShowSaveModal(true);
        loadCredits();
        break;
      case 'error':
        toast.error(data.message);
        break;
    }
  };

  // Sauvegarder
  const handleSave = async () => {
    if (!createNewDb && !selectedDatabase) {
      toast.error("Sélectionnez une base de données");
      return;
    }

    setIsSaving(true);

    try {
      const sectorLabel = SECTORS.find(s => s.value === sector)?.label || sector;
      const { data } = await api.post('/generate-leads-v2/save', {
        leads,
        database_id: createNewDb ? null : selectedDatabase,
        create_new_database: createNewDb,
        new_database_name: newDbName || `${sectorLabel} - ${analysis?.geoName || 'France'} - ${new Date().toLocaleDateString('fr-FR')}`
      });

      toast.success(`${data.inserted} leads sauvegardés !`);
      setShowSaveModal(false);

      if (data.database_id) {
        navigate(`/leads?database=${data.database_id}`);
      }

    } catch (err) {
      console.error('Erreur:', err);
      toast.error(err.response?.data?.error || "Erreur de sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };

  const maxCredits = isSuperAdmin ? 10000 : credits.available;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-3 bg-white px-6 py-3 rounded-2xl shadow-lg mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-gray-800">Génération de Leads</h1>
              <p className="text-sm text-gray-500">Trouvez vos futurs clients en quelques clics</p>
            </div>
          </div>
        </div>

        {/* Crédits */}
        <div className="mb-6">
          <div className="bg-white rounded-2xl shadow-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Crédits disponibles</p>
                <p className="text-xl font-bold text-gray-800">
                  {isSuperAdmin ? '∞ Illimité' : credits.available.toLocaleString()}
                </p>
              </div>
            </div>
            {!isSuperAdmin && (
              <button
                onClick={() => navigate('/lead-credits')}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:shadow-lg transition-all"
              >
                Acheter des crédits
              </button>
            )}
          </div>
        </div>

        {/* Formulaire principal */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Colonne gauche - Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Secteur */}
            <Card className="shadow-lg border-0 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white py-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="w-5 h-5" />
                  Secteur d'activité
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {SECTORS.map(s => (
                    <button
                      key={s.value}
                      onClick={() => { setSector(s.value); setAnalysis(null); }}
                      className={`p-3 rounded-xl text-left transition-all ${
                        sector === s.value
                          ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg scale-105'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <span className="text-xl">{s.icon}</span>
                      <p className="text-xs font-medium mt-1 truncate">{s.label}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Zone géographique */}
            <Card className="shadow-lg border-0 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Map className="w-5 h-5" />
                  Zone géographique
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Type de zone */}
                <div className="flex gap-2">
                  {[
                    { type: 'region', label: 'Région', icon: Globe },
                    { type: 'department', label: 'Département', icon: Layers },
                    { type: 'city', label: 'Ville', icon: MapPin }
                  ].map(({ type, label, icon: Icon }) => (
                    <button
                      key={type}
                      onClick={() => {
                        setGeoType(type);
                        setSelectedItems([]);
                        setAnalysis(null);
                        setDeptSearch('');
                        if (type === 'department') {
                          loadAllDepartments();
                        }
                      }}
                      className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                        geoType === type
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>

                {/* Sélection région */}
                {geoType === 'region' && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {regions.map(r => (
                      <button
                        key={r.code}
                        onClick={() => { handleRegionChange(r.code); setAnalysis(null); }}
                        className={`p-3 rounded-xl text-sm font-medium transition-all ${
                          selectedRegion === r.code
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        {r.nom}
                      </button>
                    ))}
                  </div>
                )}

                {/* Sélection département - multi-select avec tous les départements */}
                {geoType === 'department' && (
                  <div className="space-y-3">
                    {/* Barre de recherche */}
                    <div className="relative">
                      <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Rechercher un département (ex: 75, Paris, Rhône...)"
                        value={deptSearch}
                        onChange={(e) => setDeptSearch(e.target.value)}
                        className="w-full h-12 border-2 border-gray-200 rounded-xl pl-10 pr-4 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    {/* Tags des sélections */}
                    {selectedItems.length > 0 && (
                      <div className="flex flex-wrap gap-2 p-3 bg-emerald-50 rounded-xl">
                        {selectedItems.map(item => (
                          <span
                            key={item.code}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500 text-white text-sm rounded-full"
                          >
                            {item.code} - {item.nom}
                            <button onClick={() => removeItem(item.code)}>
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Liste des départements filtrés */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-1">
                      {departments
                        .filter(d => {
                          if (!deptSearch) return true;
                          const search = deptSearch.toLowerCase();
                          return d.code.toLowerCase().includes(search) ||
                                 d.nom.toLowerCase().includes(search);
                        })
                        .map(d => {
                          const isSelected = selectedItems.find(i => i.code === d.code);
                          return (
                            <button
                              key={d.code}
                              onClick={() => toggleItem(d)}
                              className={`p-2 rounded-lg text-sm text-left transition-all ${
                                isSelected
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                              }`}
                            >
                              <span className="font-bold">{d.code}</span> {d.nom}
                            </button>
                          );
                        })}
                    </div>

                    {departments.length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Chargement des départements...
                      </div>
                    )}
                  </div>
                )}

                {/* Sélection ville - recherche */}
                {geoType === 'city' && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={citySearch}
                        onChange={(e) => setCitySearch(e.target.value)}
                        placeholder="Rechercher une ville..."
                        className="w-full h-12 border-2 border-gray-200 rounded-xl pl-10 pr-4 focus:border-emerald-500 focus:outline-none"
                      />
                      {isSearchingCity && (
                        <Loader2 className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 animate-spin" />
                      )}
                    </div>

                    {/* Ville sélectionnée */}
                    {selectedCity && (
                      <div className="p-3 bg-emerald-50 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="font-medium text-emerald-800">{selectedCity.nom}</p>
                          <p className="text-sm text-emerald-600">{selectedCity.departement} • {selectedCity.region}</p>
                        </div>
                        <button
                          onClick={() => { setSelectedCity(null); setCitySearch(''); setAnalysis(null); }}
                          className="p-1 hover:bg-emerald-200 rounded-full"
                        >
                          <X className="w-4 h-4 text-emerald-700" />
                        </button>
                      </div>
                    )}

                    {/* Résultats de recherche */}
                    {!selectedCity && cityResults.length > 0 && (
                      <div className="border-2 border-gray-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                        {cityResults.map(city => (
                          <button
                            key={city.code}
                            onClick={() => { setSelectedCity(city); setCitySearch(''); setCityResults([]); setAnalysis(null); }}
                            className="w-full p-3 text-left hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                          >
                            <p className="font-medium text-gray-800">{city.nom}</p>
                            <p className="text-sm text-gray-500">{city.departement} • {city.population?.toLocaleString()} hab.</p>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Message si pas de résultats */}
                    {!selectedCity && citySearch.length >= 2 && cityResults.length === 0 && !isSearchingCity && (
                      <p className="text-sm text-gray-500 text-center py-4">Aucune ville trouvée pour "{citySearch}"</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quantité */}
            <Card className="shadow-lg border-0 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-amber-500 text-white py-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5" />
                  Nombre de leads
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="50"
                    max={maxCredits}
                    step="50"
                    value={quantity}
                    onChange={(e) => { setQuantity(parseInt(e.target.value)); setAnalysis(null); }}
                    className="flex-1 h-3 bg-gray-200 rounded-full appearance-none cursor-pointer accent-orange-500"
                  />
                  <div className="w-24">
                    <input
                      type="number"
                      min="10"
                      max={maxCredits}
                      value={quantity}
                      onChange={(e) => { setQuantity(parseInt(e.target.value) || 100); setAnalysis(null); }}
                      className="w-full h-12 border-2 border-gray-200 rounded-xl px-3 text-center text-lg font-bold focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-between mt-2 text-sm text-gray-500">
                  <span>50</span>
                  <span>{maxCredits.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Colonne droite - Résumé et actions */}
          <div className="space-y-6">
            {/* Résumé */}
            <Card className="shadow-lg border-0 overflow-hidden sticky top-6">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4">
                <CardTitle className="text-lg">Résumé</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                    <span className="text-gray-600">Secteur</span>
                    <span className="font-medium">
                      {sector ? SECTORS.find(s => s.value === sector)?.label : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                    <span className="text-gray-600">Zone</span>
                    <span className="font-medium text-right text-sm">
                      {geoType === 'region'
                        ? regions.find(r => r.code === selectedRegion)?.nom || '-'
                        : geoType === 'department' && selectedItems.length > 0
                          ? `${selectedItems.length} dépt.`
                          : geoType === 'city' && selectedCity
                            ? selectedCity.nom
                            : '-'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                    <span className="text-gray-600">Quantité</span>
                    <span className="font-bold text-lg text-blue-600">{quantity}</span>
                  </div>
                </div>

                {/* Bouton Analyser */}
                <button
                  onClick={handleAnalyze}
                  disabled={!sector || (geoType === 'region' && !selectedRegion) || (geoType === 'department' && selectedItems.length === 0) || (geoType === 'city' && !selectedCity) || isAnalyzing}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyse...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      Analyser la disponibilité
                    </>
                  )}
                </button>
              </CardContent>
            </Card>

            {/* Résultat analyse */}
            {analysis && (
              <Card className={`shadow-lg border-2 overflow-hidden ${analysis.canFulfill ? 'border-green-400' : 'border-orange-400'}`}>
                <CardContent className="p-4 space-y-4">
                  <div className={`text-center p-4 rounded-xl ${analysis.canFulfill ? 'bg-green-50' : 'bg-orange-50'}`}>
                    {analysis.canFulfill ? (
                      <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                    ) : (
                      <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-2" />
                    )}
                    <p className="text-lg font-bold">
                      {analysis.available} / {analysis.requested} disponibles
                    </p>
                    <p className="text-sm text-gray-600 mt-1">{analysis.message}</p>
                  </div>

                  {/* Suggestions */}
                  {suggestions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">💡 Suggestions :</p>
                      {suggestions.map((sug, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg text-sm">
                          <span>{sug.name}</span>
                          <span className="text-green-600 font-medium">+{sug.available}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Bouton Générer - toujours visible après analyse */}
                  <button
                    onClick={() => handleGenerate(analysis.requested)}
                    disabled={isGenerating}
                    className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Génération... {leads.length} leads
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        {analysis.available > 0
                          ? `Générer ${analysis.requested} leads (${analysis.available} en base)`
                          : `Rechercher ${analysis.requested} leads`
                        }
                      </>
                    )}
                  </button>
                </CardContent>
              </Card>
            )}

            {/* Progression */}
            {isGenerating && (
              <Card className="shadow-lg border-2 border-blue-400">
                <CardContent className="p-4">
                  <div className="text-center mb-4">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-gray-600">{message}</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-center text-lg font-bold text-blue-600 mt-2">
                    {leads.length} leads
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Modal Sauvegarde */}
        {showSaveModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Save className="w-5 h-5" />
                    Sauvegarder {leads.length} leads
                  </CardTitle>
                  <button onClick={() => setShowSaveModal(false)}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div
                  onClick={() => setCreateNewDb(true)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${createNewDb ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
                >
                  <div className="flex items-center gap-3">
                    <Plus className="w-5 h-5 text-green-600" />
                    <span className="font-medium">Nouvelle base</span>
                  </div>
                  {createNewDb && (
                    <input
                      type="text"
                      value={newDbName}
                      onChange={(e) => setNewDbName(e.target.value)}
                      placeholder="Nom de la base..."
                      className="w-full mt-3 h-10 border rounded-lg px-3"
                    />
                  )}
                </div>

                <div
                  onClick={() => setCreateNewDb(false)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${!createNewDb ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                >
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">Base existante</span>
                  </div>
                  {!createNewDb && (
                    <select
                      value={selectedDatabase}
                      onChange={(e) => setSelectedDatabase(e.target.value)}
                      className="w-full mt-3 h-10 border rounded-lg px-3"
                    >
                      <option value="">Sélectionnez...</option>
                      {databases.map(db => (
                        <option key={db.id} value={db.id}>{db.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sauvegarde...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Sauvegarder
                    </>
                  )}
                </button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
