import { log, error, warn } from "../lib/logger.js";
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sparkles, Loader2, Pause, Play, Square, Clock, CheckCircle2,
  ShoppingCart, CreditCard, Database, Globe, Building2, Users,
  Star, AlertCircle, Save, Plus, FolderOpen, X, Eye, ChevronDown, ChevronUp,
  Building, Phone, Mail, Globe2, MapPin, Award, Hash, Factory
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/axios";

// URL de l'API backend (sans /api car déjà inclus dans VITE_API_URL)
const getApiBase = () => {
  const url = import.meta.env.VITE_API_URL || (
    window.location.hostname === 'localhost'
      ? 'http://localhost:3000'
      : 'https://leadsynch-api.onrender.com'
  );
  // Retirer /api à la fin si présent pour éviter /api/api
  return url.replace(/\/api\/?$/, '');
};
const API_BASE = getApiBase();

// Couleurs par source de données
const SOURCE_COLORS = {
  internal_db: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', label: 'Votre base' },
  global_cache: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', label: 'Cache global' },
  sirene_insee: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300', label: 'Sirene INSEE' },
  google_maps: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', label: 'Google Maps' }
};

export default function LeadGeneration() {
  const navigate = useNavigate();

  // Formulaire
  const [sector, setSector] = useState("informatique");
  const [city, setCity] = useState("");
  const [radius, setRadius] = useState(10);
  const [quantity, setQuantity] = useState(50);

  // États de génération
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({
    fromInternalDb: 0,
    fromGlobalCache: 0,
    fromSirene: 0,
    fromGoogleMaps: 0,
    total: 0
  });
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [quotaError, setQuotaError] = useState(null);
  const [searchComplete, setSearchComplete] = useState(false);
  const [completeMessage, setCompleteMessage] = useState("");

  // Modal de destination
  const [showDestinationModal, setShowDestinationModal] = useState(false);
  const [databases, setDatabases] = useState([]);
  const [selectedDatabase, setSelectedDatabase] = useState(null);
  const [createNewDatabase, setCreateNewDatabase] = useState(false);
  const [newDatabaseName, setNewDatabaseName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Prévisualisation
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Vue détaillée des leads
  const [expandedLeadId, setExpandedLeadId] = useState(null);

  const searchIdRef = useRef(null);
  const timerRef = useRef(null);

  // Timer pour le temps écoulé
  useEffect(() => {
    if (isGenerating && !isPaused) {
      timerRef.current = setInterval(() => setTimeElapsed(prev => prev + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isGenerating, isPaused]);

  // Estimation du temps restant
  useEffect(() => {
    if (progress > 10 && progress < 100 && timeElapsed > 0) {
      const rate = progress / timeElapsed;
      const remaining = (100 - progress) / rate;
      setEstimatedTime(Math.ceil(remaining));
    }
  }, [progress, timeElapsed]);

  // Charger les bases de données
  useEffect(() => {
    loadDatabases();
  }, []);

  const loadDatabases = async () => {
    try {
      const { data } = await api.get('/lead-databases');
      setDatabases(data.databases || []);
    } catch (err) {
      error('Erreur chargement databases:', err);
    }
  };

  // Prévisualisation de la recherche
  const handlePreview = async () => {
    if (!sector || !city) {
      toast.error("Veuillez remplir le secteur et la ville");
      return;
    }

    setIsLoadingPreview(true);
    try {
      const { data } = await api.post('/generate-leads-v2/preview', {
        sector,
        city,
        quantity: parseInt(quantity)
      });

      setPreviewData(data.preview);
      setShowPreview(true);
    } catch (err) {
      error('Erreur preview:', err);
      toast.error(err.response?.data?.error || 'Erreur de prévisualisation');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Génération des leads
  const handleGenerate = async () => {
    if (!sector || !city || quantity < 1) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) {
      toast.error("Session expirée. Veuillez vous reconnecter.");
      return;
    }

    // Reset des états
    setIsGenerating(true);
    setIsPaused(false);
    setProgress(0);
    setLeads([]);
    setStats({ fromInternalDb: 0, fromGlobalCache: 0, fromSirene: 0, fromGoogleMaps: 0, total: 0 });
    setTimeElapsed(0);
    setEstimatedTime(null);
    setMessage("Démarrage de la recherche intelligente...");
    setQuotaError(null);
    setSearchComplete(false);
    setCompleteMessage("");
    setShowPreview(false);

    const searchId = Date.now().toString();
    searchIdRef.current = searchId;

    try {
      const response = await fetch(`${API_BASE}/api/generate-leads-v2`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          sector,
          city,
          radius: parseInt(radius),
          quantity: parseInt(quantity),
          searchId
        })
      });

      if (!response.ok) {
        if (response.status === 403) {
          try {
            const errorData = await response.json();
            setQuotaError(errorData);
            setIsGenerating(false);
            setMessage(errorData.message || "Quota insuffisant");
            toast.error(errorData.message || "Quota insuffisant", { duration: 5000 });
            return;
          } catch {
            throw new Error("Quota insuffisant");
          }
        }
        throw new Error(`Erreur HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              handleSSEEvent(data);
            } catch {
              // Ignorer les erreurs de parsing JSON
            }
          }
        }
      }
    } catch (err) {
      setIsGenerating(false);
      const errorMsg = err.message || "Erreur de connexion";
      setMessage(errorMsg);
      toast.error(errorMsg, { duration: 5000 });
    }
  };

  // Gérer les événements SSE
  const handleSSEEvent = (data) => {
    switch (data.type) {
      case 'start':
        setMessage(data.message);
        break;

      case 'progress':
        setProgress(data.percent);
        setMessage(data.message);
        break;

      case 'internal_results':
        setProgress(data.percent);
        setStats(prev => ({ ...prev, fromInternalDb: data.found }));
        setLeads(data.leads || []);
        setMessage(`${data.found} leads trouvés dans votre base`);
        toast.success(`${data.found} leads déjà dans votre base !`, { icon: '💾' });
        break;

      case 'cache_results':
        setProgress(data.percent);
        setStats(prev => ({ ...prev, fromGlobalCache: data.found }));
        setLeads(prev => [...prev, ...(data.leads || [])]);
        setMessage(`${data.found} leads trouvés dans le cache global`);
        break;

      case 'sirene_results':
        setProgress(data.percent);
        setStats(prev => ({ ...prev, fromSirene: data.found }));
        setLeads(prev => [...prev, ...(data.leads || [])]);
        setMessage(`${data.found} entreprises trouvées via Sirene INSEE`);
        toast.success(`${data.found} entreprises officielles trouvées`, { icon: '🏛️' });
        break;

      case 'new_lead':
        setProgress(data.percent);
        setLeads(prev => [...prev, data.lead]);
        setMessage(`Génération: ${data.generated} leads`);
        break;

      case 'complete':
        setProgress(100);
        setIsGenerating(false);
        setSearchComplete(true);
        setCompleteMessage(data.message);
        setStats(data.stats || stats);
        if (data.leads) {
          setLeads(data.leads);
        }

        if (data.total === 0) {
          toast("Aucun résultat trouvé", { icon: "⚠️", duration: 5000 });
        } else {
          toast.success(`${data.total} leads trouvés !`, { duration: 3000 });
          // Afficher le modal de destination
          setShowDestinationModal(true);
        }
        break;

      case 'error':
        setIsGenerating(false);
        setMessage(`Erreur: ${data.message}`);
        toast.error(data.message);
        break;
    }
  };

  // Contrôles de recherche
  const handlePause = async () => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    await fetch(`${API_BASE}/api/generate-leads-v2/pause`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ searchId: searchIdRef.current })
    });
    setIsPaused(true);
    setMessage("Recherche en pause...");
  };

  const handleResume = async () => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    await fetch(`${API_BASE}/api/generate-leads-v2/resume`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ searchId: searchIdRef.current })
    });
    setIsPaused(false);
    setMessage("Reprise de la recherche...");
  };

  const handleStop = async () => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    await fetch(`${API_BASE}/api/generate-leads-v2/stop`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ searchId: searchIdRef.current })
    });
    setIsGenerating(false);
    setMessage("Recherche arrêtée");
    if (leads.length > 0) {
      setShowDestinationModal(true);
    }
  };

  // Sauvegarder les leads
  const handleSaveLeads = async () => {
    if (!selectedDatabase && !createNewDatabase) {
      toast.error("Veuillez sélectionner une base ou en créer une nouvelle");
      return;
    }

    if (createNewDatabase && !newDatabaseName.trim()) {
      toast.error("Veuillez entrer un nom pour la nouvelle base");
      return;
    }

    setIsSaving(true);
    try {
      const { data } = await api.post('/generate-leads-v2/save', {
        leads,
        database_id: createNewDatabase ? null : selectedDatabase,
        create_new_database: createNewDatabase,
        new_database_name: newDatabaseName.trim() || `${sector} - ${city} - ${new Date().toLocaleDateString('fr-FR')}`
      });

      toast.success(`${data.inserted} leads sauvegardés ! (${data.duplicates} doublons ignorés)`);
      setShowDestinationModal(false);

      // Rafraîchir les bases
      loadDatabases();

      // Naviguer vers la base de données
      if (data.database_id) {
        navigate(`/leads?database=${data.database_id}`);
      }
    } catch (err) {
      error('Erreur sauvegarde:', err);
      toast.error(err.response?.data?.error || 'Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSourceBadge = (source) => {
    const config = SOURCE_COLORS[source] || SOURCE_COLORS.google_maps;
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text} ${config.border} border`}>
        {config.label}
      </span>
    );
  };

  const getQualityColor = (score) => {
    if (!score || score === 0) return 'text-gray-400';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <Sparkles className="w-10 h-10 text-yellow-500" />
          Génération de Leads IA
        </h1>
        <p className="text-gray-600 text-lg">
          Recherche intelligente : votre base → cache global → API Sirene → Google Maps
        </p>
      </div>

      {/* Formulaire de recherche */}
      <Card className="shadow-xl mb-6 border-2">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="text-2xl flex items-center gap-2">
            🎯 Paramètres de recherche
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-4 gap-6 mb-6">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Secteur *</label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full h-12 border-2 border-gray-300 rounded-lg px-4 text-base focus:border-blue-500 focus:outline-none"
              >
                <option value="informatique">💻 Informatique</option>
                <option value="comptabilite">📊 Comptabilité</option>
                <option value="juridique">⚖️ Juridique</option>
                <option value="sante">🏥 Santé</option>
                <option value="btp">🏗️ BTP</option>
                <option value="hotellerie">🍽️ Hôtellerie/Restauration</option>
                <option value="immobilier">🏠 Immobilier</option>
                <option value="commerce">🛒 Commerce</option>
                <option value="logistique">📦 Logistique</option>
                <option value="education">🎓 Éducation</option>
                <option value="consulting">💼 Consulting</option>
                <option value="marketing">📣 Marketing</option>
                <option value="rh">👥 Ressources Humaines</option>
                <option value="industrie">🏭 Industrie</option>
                <option value="automobile">🚗 Automobile</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Ville *</label>
              <input
                type="text"
                placeholder="Ex: Paris, Lyon, Marseille..."
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full h-12 border-2 border-gray-300 rounded-lg px-4 text-base focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Rayon (km)</label>
              <select
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="w-full h-12 border-2 border-gray-300 rounded-lg px-4 text-base focus:border-blue-500 focus:outline-none"
              >
                <option value="5">5 km</option>
                <option value="10">10 km</option>
                <option value="20">20 km</option>
                <option value="50">50 km</option>
                <option value="100">100 km</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Quantité</label>
              <input
                type="number"
                min="1"
                max="500"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full h-12 border-2 border-gray-300 rounded-lg px-4 text-base focus:border-blue-500 focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">💡 Max 500 leads par recherche</p>
            </div>
          </div>

          {/* Boutons d'action */}
          {!isGenerating ? (
            <div className="flex gap-4">
              <button
                onClick={handlePreview}
                disabled={!city || !sector || isLoadingPreview}
                className="px-6 h-16 bg-white border-2 border-blue-500 text-blue-600 hover:bg-blue-50 font-semibold text-lg rounded-lg shadow flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingPreview ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
                Prévisualiser
              </button>
              <button
                onClick={handleGenerate}
                disabled={!city || !sector}
                className="flex-1 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-lg rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
              >
                <Sparkles className="w-6 h-6" />
                Lancer la recherche ({quantity} leads)
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              {!isPaused ? (
                <button
                  onClick={handlePause}
                  className="flex-1 h-16 bg-white border-2 border-orange-500 text-orange-600 hover:bg-orange-50 font-semibold text-lg rounded-lg flex items-center justify-center gap-2 transition-all"
                >
                  <Pause className="w-5 h-5" />
                  Pause
                </button>
              ) : (
                <button
                  onClick={handleResume}
                  className="flex-1 h-16 bg-white border-2 border-green-500 text-green-600 hover:bg-green-50 font-semibold text-lg rounded-lg flex items-center justify-center gap-2 transition-all"
                >
                  <Play className="w-5 h-5" />
                  Reprendre
                </button>
              )}
              <button
                onClick={handleStop}
                className="flex-1 h-16 bg-white border-2 border-red-500 text-red-600 hover:bg-red-50 font-semibold text-lg rounded-lg flex items-center justify-center gap-2 transition-all"
              >
                <Square className="w-5 h-5" />
                Arrêter
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prévisualisation */}
      {showPreview && previewData && (
        <Card className="mb-6 border-2 border-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">
                  <Eye className="w-6 h-6" />
                  Prévisualisation de la recherche
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-4 shadow">
                    <p className="text-sm text-gray-600">Demandés</p>
                    <p className="text-2xl font-bold text-gray-900">{previewData.requested}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow">
                    <p className="text-sm text-green-600">Dans votre base</p>
                    <p className="text-2xl font-bold text-green-700">{previewData.foundInternal}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow">
                    <p className="text-sm text-blue-600">Dans le cache</p>
                    <p className="text-2xl font-bold text-blue-700">{previewData.foundGlobal}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow">
                    <p className="text-sm text-orange-600">À générer</p>
                    <p className="text-2xl font-bold text-orange-700">{previewData.needsGeneration}</p>
                    {previewData.estimatedCost > 0 && (
                      <p className="text-xs text-orange-500 mt-1">≈ {previewData.estimatedCost.toFixed(2)}€</p>
                    )}
                  </div>
                </div>
                {previewData.totalAvailable >= previewData.requested && (
                  <p className="mt-4 text-green-700 font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Tous les leads sont déjà disponibles sans frais !
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Erreur de quota */}
      {quotaError && (
        <Card className="mb-6 border-2 border-orange-400 bg-gradient-to-r from-orange-50 to-amber-50 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-orange-100 rounded-full">
                <CreditCard className="w-8 h-8 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-orange-800 mb-2">
                  ⚠️ {quotaError.error === 'Quota insuffisant' ? 'Crédits insuffisants' : 'Abonnement requis'}
                </h3>
                <p className="text-gray-700 mb-4">{quotaError.message}</p>
                {quotaError.available !== undefined && (
                  <div className="flex gap-4 mb-4 text-sm">
                    <span className="bg-white px-3 py-1 rounded-full border border-orange-200">
                      <strong>Disponibles:</strong> {quotaError.available} crédits
                    </span>
                    <span className="bg-white px-3 py-1 rounded-full border border-orange-200">
                      <strong>Demandés:</strong> {quotaError.requested} crédits
                    </span>
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate(quotaError.redirect || '/lead-credits')}
                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-lg shadow-md flex items-center gap-2 transition-all"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Acheter des crédits
                  </button>
                  <button
                    onClick={() => setQuotaError(null)}
                    className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progression */}
      {isGenerating && (
        <Card className="mb-6 border-4 border-blue-500 shadow-2xl">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-xl flex items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="text-blue-700">{message}</span>
              </h3>
              <div className="flex items-center gap-6 text-base font-semibold">
                <span className="flex items-center gap-2 text-gray-700">
                  <Clock className="w-5 h-5 text-blue-600" />
                  {formatTime(timeElapsed)}
                </span>
                {estimatedTime && (
                  <span className="text-orange-600">
                    Reste: ~{formatTime(estimatedTime)}
                  </span>
                )}
              </div>
            </div>

            <div className="w-full bg-gray-300 rounded-full h-10 mb-6 shadow-inner">
              <div
                className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 h-10 rounded-full transition-all duration-500 flex items-center justify-center text-white font-bold text-lg shadow-lg"
                style={{ width: `${progress}%` }}
              >
                {progress > 10 ? `${progress}%` : ''}
              </div>
            </div>

            {/* Stats par source */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl text-center border-2 border-green-200">
                <Database className="w-6 h-6 text-green-600 mx-auto mb-1" />
                <p className="text-xs text-gray-600 font-semibold">Votre base</p>
                <p className="text-2xl font-bold text-green-600">{stats.fromInternalDb}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl text-center border-2 border-blue-200">
                <Globe className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                <p className="text-xs text-gray-600 font-semibold">Cache global</p>
                <p className="text-2xl font-bold text-blue-600">{stats.fromGlobalCache}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl text-center border-2 border-purple-200">
                <Building2 className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                <p className="text-xs text-gray-600 font-semibold">Sirene INSEE</p>
                <p className="text-2xl font-bold text-purple-600">{stats.fromSirene}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl text-center border-2 border-orange-200">
                <MapPin className="w-6 h-6 text-orange-600 mx-auto mb-1" />
                <p className="text-xs text-gray-600 font-semibold">Google Maps</p>
                <p className="text-2xl font-bold text-orange-600">{stats.fromGoogleMaps}</p>
              </div>
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl text-center border-2 border-indigo-200">
                <Users className="w-6 h-6 text-indigo-600 mx-auto mb-1" />
                <p className="text-xs text-gray-600 font-semibold">Total</p>
                <p className="text-2xl font-bold text-indigo-600">{leads.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Message de fin */}
      {searchComplete && !isGenerating && leads.length === 0 && (
        <Card className="mb-6 border-2 border-yellow-400 bg-gradient-to-r from-yellow-50 to-amber-50 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-full">
                <AlertCircle className="w-8 h-8 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-yellow-800 mb-2">Recherche terminée</h3>
                <p className="text-gray-700">{completeMessage}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Essayez de modifier les paramètres (secteur, ville, rayon) pour obtenir plus de résultats.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Résultats */}
      {leads.length > 0 && (
        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl flex items-center gap-3">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
                Résultats ({leads.length} leads)
              </CardTitle>
              {searchComplete && !showDestinationModal && (
                <button
                  onClick={() => setShowDestinationModal(true)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg flex items-center gap-2 transition-all"
                >
                  <Save className="w-5 h-5" />
                  Sauvegarder
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {leads.map((lead, i) => (
                <div
                  key={lead.id || i}
                  className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  {/* En-tête du lead */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-bold text-lg text-gray-800">{lead.company_name}</p>
                        {getSourceBadge(lead.data_source)}
                        {lead.quality_score > 0 && (
                          <span className={`flex items-center gap-1 text-sm font-medium ${getQualityColor(lead.quality_score)}`}>
                            <Award className="w-4 h-4" />
                            {lead.quality_score}%
                          </span>
                        )}
                      </div>

                      {/* Infos principales */}
                      <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                        {lead.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-4 h-4 text-gray-400" />
                            {lead.phone}
                          </span>
                        )}
                        {lead.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-4 h-4 text-gray-400" />
                            {lead.email}
                          </span>
                        )}
                        {lead.website && (
                          <a
                            href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:underline"
                          >
                            <Globe2 className="w-4 h-4" />
                            Site web
                          </a>
                        )}
                        {(lead.city || lead.address) && (
                          <span className="flex items-center gap-1 text-gray-500">
                            <MapPin className="w-4 h-4" />
                            {lead.city || lead.address}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bouton expand */}
                    <button
                      onClick={() => setExpandedLeadId(expandedLeadId === (lead.id || i) ? null : (lead.id || i))}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-all"
                    >
                      {expandedLeadId === (lead.id || i) ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </button>
                  </div>

                  {/* Détails étendus */}
                  {expandedLeadId === (lead.id || i) && (
                    <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-4">
                      {lead.siret && (
                        <div>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            SIRET
                          </p>
                          <p className="font-mono text-sm">{lead.siret}</p>
                        </div>
                      )}
                      {lead.siren && (
                        <div>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            SIREN
                          </p>
                          <p className="font-mono text-sm">{lead.siren}</p>
                        </div>
                      )}
                      {lead.naf_code && (
                        <div>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Factory className="w-3 h-3" />
                            Code NAF
                          </p>
                          <p className="text-sm">{lead.naf_code}</p>
                          {lead.naf_label && <p className="text-xs text-gray-400">{lead.naf_label}</p>}
                        </div>
                      )}
                      {lead.employee_count && (
                        <div>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            Effectifs
                          </p>
                          <p className="text-sm">{lead.employee_count} {lead.employee_range && `(${lead.employee_range})`}</p>
                        </div>
                      )}
                      {lead.legal_form && (
                        <div>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Building className="w-3 h-3" />
                            Forme juridique
                          </p>
                          <p className="text-sm">{lead.legal_form}</p>
                        </div>
                      )}
                      {lead.creation_date && (
                        <div>
                          <p className="text-xs text-gray-500">Date création</p>
                          <p className="text-sm">{new Date(lead.creation_date).toLocaleDateString('fr-FR')}</p>
                        </div>
                      )}
                      {lead.contact_name && (
                        <div>
                          <p className="text-xs text-gray-500">Contact</p>
                          <p className="text-sm">{lead.contact_name}</p>
                          {lead.contact_role && <p className="text-xs text-gray-400">{lead.contact_role}</p>}
                        </div>
                      )}
                      {lead.rating && (
                        <div>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            Note Google
                          </p>
                          <p className="text-sm">{lead.rating}/5 ({lead.review_count} avis)</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de destination */}
      {showDestinationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Save className="w-6 h-6 text-green-600" />
                  Sauvegarder les leads
                </CardTitle>
                <button
                  onClick={() => setShowDestinationModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-gray-600 mb-6">
                Où souhaitez-vous sauvegarder les <strong>{leads.length} leads</strong> générés ?
              </p>

              <div className="space-y-4">
                {/* Option: Base existante */}
                <div
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    !createNewDatabase ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setCreateNewDatabase(false)}
                >
                  <div className="flex items-center gap-3">
                    <FolderOpen className="w-6 h-6 text-blue-600" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">Base existante</p>
                      <p className="text-sm text-gray-500">Ajouter à une base de données existante</p>
                    </div>
                    <input
                      type="radio"
                      checked={!createNewDatabase}
                      onChange={() => setCreateNewDatabase(false)}
                      className="w-5 h-5 text-blue-600"
                    />
                  </div>

                  {!createNewDatabase && (
                    <div className="mt-4">
                      <select
                        value={selectedDatabase || ''}
                        onChange={(e) => setSelectedDatabase(e.target.value)}
                        className="w-full h-12 border-2 border-gray-300 rounded-lg px-4 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">Sélectionner une base...</option>
                        {databases.map((db) => (
                          <option key={db.id} value={db.id}>
                            {db.name} ({db.leads_count || 0} leads)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Option: Nouvelle base */}
                <div
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    createNewDatabase ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setCreateNewDatabase(true)}
                >
                  <div className="flex items-center gap-3">
                    <Plus className="w-6 h-6 text-green-600" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">Nouvelle base</p>
                      <p className="text-sm text-gray-500">Créer une nouvelle base de données</p>
                    </div>
                    <input
                      type="radio"
                      checked={createNewDatabase}
                      onChange={() => setCreateNewDatabase(true)}
                      className="w-5 h-5 text-green-600"
                    />
                  </div>

                  {createNewDatabase && (
                    <div className="mt-4">
                      <input
                        type="text"
                        placeholder={`${sector} - ${city} - ${new Date().toLocaleDateString('fr-FR')}`}
                        value={newDatabaseName}
                        onChange={(e) => setNewDatabaseName(e.target.value)}
                        className="w-full h-12 border-2 border-gray-300 rounded-lg px-4 focus:border-green-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Boutons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowDestinationModal(false)}
                  className="flex-1 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveLeads}
                  disabled={isSaving || (!selectedDatabase && !createNewDatabase)}
                  className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
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
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
