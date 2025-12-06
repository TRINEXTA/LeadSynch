/**
 * LeadGenerationSmart - Génération de leads intelligente
 *
 * Flow:
 * 1. Client sélectionne secteur + zone géographique + quantité
 * 2. Système analyse la disponibilité
 * 3. Affiche: "Demandé: X, Disponible: Y"
 * 4. Options si pas assez: élargir la recherche
 * 5. Client valide → génération
 */

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sparkles, Loader2, CheckCircle2, AlertTriangle, MapPin, Building2,
  ChevronRight, Search, Database, Globe, Users, Save, Plus, X,
  Map, Layers, ArrowRight, RefreshCw, Info
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/axios";

// Secteurs disponibles
const SECTORS = [
  { value: "immobilier", label: "Immobilier", icon: "🏠" },
  { value: "juridique", label: "Juridique", icon: "⚖️" },
  { value: "comptabilite", label: "Comptabilité", icon: "📊" },
  { value: "informatique", label: "Informatique", icon: "💻" },
  { value: "sante", label: "Santé", icon: "🏥" },
  { value: "btp", label: "BTP / Construction", icon: "🏗️" },
  { value: "hotellerie", label: "Hôtellerie / Restauration", icon: "🍽️" },
  { value: "commerce", label: "Commerce", icon: "🛒" },
  { value: "logistique", label: "Logistique", icon: "📦" },
  { value: "education", label: "Éducation / Formation", icon: "🎓" },
  { value: "consulting", label: "Consulting", icon: "💼" },
  { value: "marketing", label: "Marketing / Communication", icon: "📣" },
  { value: "rh", label: "Ressources Humaines", icon: "👥" },
  { value: "industrie", label: "Industrie", icon: "🏭" },
  { value: "automobile", label: "Automobile", icon: "🚗" },
  { value: "assurance", label: "Assurance", icon: "🛡️" },
  { value: "banque", label: "Banque / Finance", icon: "🏦" }
];

export default function LeadGenerationSmart() {
  const navigate = useNavigate();

  // État du formulaire
  const [sector, setSector] = useState("");
  const [geoType, setGeoType] = useState("region"); // city, department, region
  const [geoCode, setGeoCode] = useState("");
  const [geoName, setGeoName] = useState("");
  const [quantity, setQuantity] = useState(100);

  // Données géographiques
  const [regions, setRegions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [citySearch, setCitySearch] = useState("");

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

  // Crédits client
  const [credits, setCredits] = useState({ available: 0, used: 0 });

  // Charger les régions au démarrage
  useEffect(() => {
    loadRegions();
    loadCredits();
    loadDatabases();
  }, []);

  const loadRegions = async () => {
    try {
      const { data } = await api.get('/lead-availability/regions');
      setRegions(data.regions || []);
    } catch (err) {
      console.error('Erreur chargement régions:', err);
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
      console.error('Erreur chargement départements:', err);
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
      console.error('Erreur chargement crédits:', err);
    }
  };

  const loadDatabases = async () => {
    try {
      const { data } = await api.get('/lead-databases');
      setDatabases(data.databases || []);
    } catch (err) {
      console.error('Erreur chargement bases:', err);
    }
  };

  // Analyser la disponibilité
  const handleAnalyze = async () => {
    if (!sector || !geoCode || !quantity) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    if (quantity > credits.available) {
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
        geoCode: geoType === 'city' ? citySearch : geoCode,
        quantity: parseInt(quantity)
      });

      setAnalysis(data.analysis);

      // Si pas assez de leads, charger les suggestions
      if (!data.analysis.canFulfill && data.analysis.missing > 0) {
        const suggestResponse = await api.post('/lead-availability/suggest', {
          sector,
          geoType,
          geoCode: geoType === 'city' ? citySearch : geoCode,
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
    setMessage("Démarrage de la génération...");
    setGenerationComplete(false);

    const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') ||
      (window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://leadsynch-api.onrender.com');

    try {
      const response = await fetch(`${API_BASE}/api/generate-leads-v2`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          sector,
          city: geoType === 'city' ? citySearch : geoName,
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
              } catch (e) {
                // Ignore parse errors
              }
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
        setMessage(`${data.index || leads.length + 1} leads récupérés...`);
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
        setMessage(data.message);
        toast.success(`${data.total} leads générés !`);
        setShowSaveModal(true);
        // Recharger les crédits
        loadCredits();
        break;
      case 'error':
        toast.error(data.message);
        break;
    }
  };

  // Sauvegarder les leads
  const handleSave = async () => {
    if (!createNewDb && !selectedDatabase) {
      toast.error("Sélectionnez une base de données");
      return;
    }

    setIsSaving(true);

    try {
      const { data } = await api.post('/generate-leads-v2/save', {
        leads,
        database_id: createNewDb ? null : selectedDatabase,
        create_new_database: createNewDb,
        new_database_name: newDbName || `${SECTORS.find(s => s.value === sector)?.label} - ${geoName} - ${new Date().toLocaleDateString('fr-FR')}`
      });

      toast.success(`${data.inserted} leads sauvegardés !`);
      setShowSaveModal(false);

      // Rediriger vers la base
      if (data.database_id) {
        navigate(`/leads?database=${data.database_id}`);
      }

    } catch (err) {
      console.error('Erreur sauvegarde:', err);
      toast.error(err.response?.data?.error || "Erreur de sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };

  // Sélection géographique
  const handleGeoTypeChange = (type) => {
    setGeoType(type);
    setGeoCode("");
    setGeoName("");
    setDepartments([]);
    setAnalysis(null);
  };

  const handleRegionChange = (code) => {
    const region = regions.find(r => r.code === code);
    setGeoCode(code);
    setGeoName(region?.nom || "");
    setAnalysis(null);

    if (geoType === 'department') {
      loadDepartments(code);
    }
  };

  const handleDepartmentChange = (code) => {
    const dept = departments.find(d => d.code === code);
    setGeoCode(code);
    setGeoName(dept?.nom || "");
    setAnalysis(null);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-yellow-500" />
          Générer des Leads
        </h1>
        <p className="text-gray-600">
          Sélectionnez votre secteur et zone géographique pour générer des leads qualifiés.
        </p>
      </div>

      {/* Crédits disponibles */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="w-6 h-6 text-blue-600" />
              <span className="font-medium text-gray-700">Vos crédits</span>
            </div>
            <div className="text-2xl font-bold text-blue-700">
              {credits.available.toLocaleString()} leads disponibles
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulaire */}
      <Card className="mb-6 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Paramètres de recherche
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Secteur */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Secteur d'activité *
            </label>
            <select
              value={sector}
              onChange={(e) => { setSector(e.target.value); setAnalysis(null); }}
              className="w-full h-12 border-2 border-gray-300 rounded-lg px-4 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Sélectionnez un secteur...</option>
              {SECTORS.map(s => (
                <option key={s.value} value={s.value}>{s.icon} {s.label}</option>
              ))}
            </select>
          </div>

          {/* Type de zone géographique */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Zone géographique *
            </label>
            <div className="flex gap-2 mb-4">
              {[
                { type: 'region', label: 'Région', icon: Map },
                { type: 'department', label: 'Département', icon: Layers },
                { type: 'city', label: 'Ville', icon: MapPin }
              ].map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => handleGeoTypeChange(type)}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all flex items-center justify-center gap-2 ${
                    geoType === type
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* Sélecteur selon le type */}
            {geoType === 'region' && (
              <select
                value={geoCode}
                onChange={(e) => handleRegionChange(e.target.value)}
                className="w-full h-12 border-2 border-gray-300 rounded-lg px-4 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Sélectionnez une région...</option>
                {regions.map(r => (
                  <option key={r.code} value={r.code}>{r.nom}</option>
                ))}
              </select>
            )}

            {geoType === 'department' && (
              <div className="space-y-3">
                <select
                  value={geoCode.length === 2 ? '' : geoCode.slice(0, 2)}
                  onChange={(e) => { handleRegionChange(e.target.value); setGeoCode(''); }}
                  className="w-full h-12 border-2 border-gray-300 rounded-lg px-4 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">D'abord, sélectionnez une région...</option>
                  {regions.map(r => (
                    <option key={r.code} value={r.code}>{r.nom}</option>
                  ))}
                </select>
                {departments.length > 0 && (
                  <select
                    value={geoCode}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    className="w-full h-12 border-2 border-gray-300 rounded-lg px-4 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Sélectionnez un département...</option>
                    {departments.map(d => (
                      <option key={d.code} value={d.code}>{d.code} - {d.nom}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {geoType === 'city' && (
              <input
                type="text"
                value={citySearch}
                onChange={(e) => { setCitySearch(e.target.value); setGeoName(e.target.value); setAnalysis(null); }}
                placeholder="Entrez le nom de la ville (ex: Paris, Lyon, Marseille...)"
                className="w-full h-12 border-2 border-gray-300 rounded-lg px-4 focus:border-blue-500 focus:outline-none"
              />
            )}
          </div>

          {/* Quantité */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Nombre de leads souhaités *
            </label>
            <input
              type="number"
              min="10"
              max={credits.available}
              value={quantity}
              onChange={(e) => { setQuantity(e.target.value); setAnalysis(null); }}
              className="w-full h-12 border-2 border-gray-300 rounded-lg px-4 focus:border-blue-500 focus:outline-none"
            />
            <p className="text-sm text-gray-500 mt-1">
              Maximum: {credits.available.toLocaleString()} (vos crédits disponibles)
            </p>
          </div>

          {/* Bouton Analyser */}
          <button
            onClick={handleAnalyze}
            disabled={!sector || !geoCode && geoType !== 'city' || geoType === 'city' && !citySearch || isAnalyzing}
            className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-lg rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-all"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyse en cours...
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

      {/* Résultat de l'analyse */}
      {analysis && (
        <Card className={`mb-6 shadow-lg ${analysis.canFulfill ? 'border-green-400' : 'border-orange-400'}`}>
          <CardHeader className={analysis.canFulfill ? 'bg-green-50' : 'bg-orange-50'}>
            <CardTitle className="flex items-center gap-2">
              {analysis.canFulfill ? (
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              )}
              Résultat de l'analyse
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-lg mb-4">{analysis.message}</div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-100 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600">Demandés</p>
                <p className="text-2xl font-bold text-gray-800">{analysis.requested}</p>
              </div>
              <div className={`rounded-lg p-4 text-center ${analysis.canFulfill ? 'bg-green-100' : 'bg-orange-100'}`}>
                <p className="text-sm text-gray-600">Disponibles</p>
                <p className={`text-2xl font-bold ${analysis.canFulfill ? 'text-green-700' : 'text-orange-700'}`}>
                  {analysis.available}
                </p>
              </div>
              {analysis.missing > 0 && (
                <div className="bg-red-100 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600">Manquants</p>
                  <p className="text-2xl font-bold text-red-700">{analysis.missing}</p>
                </div>
              )}
            </div>

            {/* Répartition par ville */}
            {analysis.breakdown && analysis.breakdown.length > 0 && (
              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-700 mb-2">Répartition par ville :</p>
                <div className="flex flex-wrap gap-2">
                  {analysis.breakdown.map((item, i) => (
                    <span key={i} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      {item.city} ({item.count})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions si pas assez */}
            {suggestions.length > 0 && (
              <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Suggestions pour compléter votre demande :
                </p>
                <div className="space-y-2">
                  {suggestions.map((sug, i) => (
                    <div key={i} className="flex items-center justify-between bg-white p-3 rounded-lg">
                      <span>{sug.name}</span>
                      <span className="font-medium text-green-700">+{sug.available} leads</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Boutons d'action */}
            <div className="flex gap-4">
              {analysis.available > 0 && (
                <button
                  onClick={() => handleGenerate(Math.min(analysis.available, analysis.requested))}
                  disabled={isGenerating}
                  className="flex-1 h-14 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold text-lg rounded-lg flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Génération...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Générer {Math.min(analysis.available, analysis.requested)} leads
                    </>
                  )}
                </button>
              )}

              {analysis.missing > 0 && (
                <button
                  onClick={() => {/* TODO: Élargir recherche */}}
                  className="flex-1 h-14 border-2 border-orange-500 text-orange-600 hover:bg-orange-50 font-bold text-lg rounded-lg flex items-center justify-center gap-3 transition-all"
                >
                  <Globe className="w-5 h-5" />
                  Élargir la recherche
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progression de la génération */}
      {isGenerating && (
        <Card className="mb-6 border-2 border-blue-400">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <span className="font-medium text-gray-700">{message}</span>
              <span className="text-blue-600 font-bold">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-4 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-center text-gray-600 mt-4">
              {leads.length} leads récupérés...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modal de sauvegarde */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="bg-green-50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Save className="w-5 h-5 text-green-600" />
                  Sauvegarder les leads
                </CardTitle>
                <button onClick={() => setShowSaveModal(false)}>
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-gray-600 mb-6">
                <strong>{leads.length} leads</strong> générés. Où souhaitez-vous les sauvegarder ?
              </p>

              <div className="space-y-4">
                {/* Nouvelle base */}
                <div
                  onClick={() => setCreateNewDb(true)}
                  className={`p-4 rounded-lg border-2 cursor-pointer ${createNewDb ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
                >
                  <div className="flex items-center gap-3">
                    <Plus className="w-5 h-5 text-green-600" />
                    <span className="font-medium">Nouvelle base de données</span>
                  </div>
                  {createNewDb && (
                    <input
                      type="text"
                      value={newDbName}
                      onChange={(e) => setNewDbName(e.target.value)}
                      placeholder={`${SECTORS.find(s => s.value === sector)?.label} - ${geoName}`}
                      className="w-full mt-3 h-10 border rounded-lg px-3"
                    />
                  )}
                </div>

                {/* Base existante */}
                <div
                  onClick={() => setCreateNewDb(false)}
                  className={`p-4 rounded-lg border-2 cursor-pointer ${!createNewDb ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
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
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full mt-6 h-12 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
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
  );
}
