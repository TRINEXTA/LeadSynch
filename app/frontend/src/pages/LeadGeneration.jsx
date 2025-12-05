import { log, error, warn } from "../lib/logger.js";
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader, Pause, Play, Square, Clock, CheckCircle2, ShoppingCart, CreditCard } from "lucide-react";
import toast from "react-hot-toast";

// URL de l'API backend - utilise la variable d'environnement
const API_BASE = import.meta.env.VITE_API_URL || (
  window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://leadsynch-api.onrender.com'
);

export default function LeadGeneration() {
  const navigate = useNavigate();
  const [sector, setSector] = useState("informatique");
  const [city, setCity] = useState("");
  const [radius, setRadius] = useState(10);
  const [quantity, setQuantity] = useState(100);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({ found: 0, generated: 0, total: 0 });
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [quotaError, setQuotaError] = useState(null);
  const [searchComplete, setSearchComplete] = useState(false);
  const [completeMessage, setCompleteMessage] = useState("");
  const searchIdRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isGenerating && !isPaused) {
      timerRef.current = setInterval(() => setTimeElapsed(prev => prev + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isGenerating, isPaused]);

  useEffect(() => {
    if (progress > 10 && progress < 100 && timeElapsed > 0) {
      const rate = progress / timeElapsed;
      const remaining = (100 - progress) / rate;
      setEstimatedTime(Math.ceil(remaining));
    }
  }, [progress, timeElapsed]);

  const handleGenerate = async () => {
    if (!sector || !city || quantity < 1) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    // Récupérer le token (localStorage ou sessionStorage)
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) {
      toast.error("Session expirée. Veuillez vous reconnecter.");
      return;
    }

    setIsGenerating(true);
    setIsPaused(false);
    setProgress(0);
    setLeads([]);
    setStats({ found: 0, generated: 0, total: 0 });
    setTimeElapsed(0);
    setEstimatedTime(null);
    setMessage("Demarrage...");
    setQuotaError(null);
    setSearchComplete(false);
    setCompleteMessage("");

    const searchId = Date.now().toString();
    searchIdRef.current = searchId;

    try {
      const response = await fetch(`${API_BASE}/api/generate-leads-stream`, {
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
        // Gérer les erreurs de quota (403)
        if (response.status === 403) {
          try {
            const errorData = await response.json();
            setQuotaError(errorData);
            setIsGenerating(false);
            setMessage(errorData.message || "Quota insuffisant");
            toast.error(errorData.message || "Quota insuffisant", { duration: 5000, id: 'quota-error' });
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

              switch (data.type) {
                case 'start':
                  setMessage(data.message);
                  break;
                case 'progress':
                  setProgress(data.percent);
                  setMessage(data.message);
                  break;
                case 'cache_results':
                  setProgress(data.percent);
                  setStats(prev => ({ ...prev, found: data.found }));
                  setLeads(data.leads || []);
                  setMessage(`${data.found} leads trouves en cache`);
                  break;
                case 'new_lead':
                  setProgress(data.percent);
                  setStats({ found: stats.found, generated: data.generated, total: data.total });
                  setLeads(prev => [...prev, data.lead]);
                  setMessage(`Generation: ${data.generated} generes`);
                  break;
                case 'complete':
                  setProgress(100);
                  setIsGenerating(false);
                  setSearchComplete(true);
                  setCompleteMessage(data.message || `Terminé ! ${data.total} leads trouvés`);
                  setStats(prev => ({ ...prev, found: data.fromCache || prev.found, generated: data.generated || prev.generated, total: data.total }));
                  setMessage(data.message || `Terminé ! ${data.total} leads trouvés`);
                  if (data.total === 0) {
                    toast("Aucun résultat trouvé", { icon: "⚠️", duration: 5000 });
                  } else {
                    toast.success(`${data.total} leads trouvés !`, { duration: 3000 });
                  }
                  break;
                case 'error':
                  setIsGenerating(false);
                  setMessage(`Erreur: ${data.message}`);
                  toast.error(data.message);
                  break;
              }
            } catch {
              // Ignorer les erreurs de parsing JSON
            }
          }
        }
      }
    } catch (error) {
      setIsGenerating(false);
      const errorMsg = error.message || "Erreur de connexion";
      setMessage(errorMsg);
      toast.error(errorMsg, { id: 'generation-error', duration: 5000 });
    }
  };

  const handlePause = async () => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    await fetch(`${API_BASE}/api/pause-search`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ searchId: searchIdRef.current })
    });
    setIsPaused(true);
    setMessage("En pause...");
  };

  const handleResume = async () => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    await fetch(`${API_BASE}/api/resume-search`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ searchId: searchIdRef.current })
    });
    setIsPaused(false);
    setMessage("Reprise...");
  };

  const handleStop = async () => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    await fetch(`${API_BASE}/api/stop-search`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ searchId: searchIdRef.current })
    });
    setIsGenerating(false);
    setMessage("Arrete - leads sauvegardes");
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <Sparkles className="w-10 h-10 text-yellow-500" />
          Generation de Leads IA
        </h1>
        <p className="text-gray-600 text-lg">Recherche intelligente : base locale d abord, puis Google Maps</p>
      </div>

      <Card className="shadow-xl mb-6 border-2">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="text-2xl">🎯 Parametres de recherche</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-4 gap-6 mb-6">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Secteur *</label>
              <select value={sector} onChange={(e) => setSector(e.target.value)} className="w-full h-12 border-2 border-gray-300 rounded-lg px-4 text-base focus:border-blue-500 focus:outline-none">
                <option value="informatique">💻 Informatique</option>
                <option value="comptabilite">📊 Comptabilite</option>
                <option value="juridique">⚖️ Juridique</option>
                <option value="sante">🏥 Sante</option>
                <option value="btp">🏗️ BTP</option>
                <option value="hotellerie">🍽️ Hotellerie</option>
                <option value="immobilier">🏠 Immobilier</option>
                <option value="commerce">🛒 Commerce</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Ville *</label>
              <input type="text" placeholder="Ex: Paris, Lyon, Marseille..." value={city} onChange={(e) => setCity(e.target.value)} className="w-full h-12 border-2 border-gray-300 rounded-lg px-4 text-base focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Rayon (km)</label>
              <select value={radius} onChange={(e) => setRadius(e.target.value)} className="w-full h-12 border-2 border-gray-300 rounded-lg px-4 text-base focus:border-blue-500 focus:outline-none">
                <option value="5">5 km</option>
                <option value="10">10 km</option>
                <option value="20">20 km</option>
                <option value="50">50 km</option>
                <option value="100">100 km</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Quantite</label>
              <input type="number" min="1" max="10000" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full h-12 border-2 border-gray-300 rounded-lg px-4 text-base focus:border-blue-500 focus:outline-none" />
              <p className="text-xs text-gray-500 mt-1">💡 Max 10,000 leads</p>
            </div>
          </div>

          {!isGenerating ? (
            <button onClick={handleGenerate} disabled={!city || !sector} className="w-full h-16 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-lg rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3">
              <Sparkles className="w-6 h-6" />
              Lancer recherche ({quantity} leads dans {radius} km)
            </button>
          ) : (
            <div className="flex gap-3">
              {!isPaused ? (
                <button onClick={handlePause} className="flex-1 h-16 bg-white border-2 border-orange-500 text-orange-600 hover:bg-orange-50 font-semibold text-lg rounded-lg flex items-center justify-center gap-2 transition-all">
                  <Pause className="w-5 h-5" />Pause
                </button>
              ) : (
                <button onClick={handleResume} className="flex-1 h-16 bg-white border-2 border-green-500 text-green-600 hover:bg-green-50 font-semibold text-lg rounded-lg flex items-center justify-center gap-2 transition-all">
                  <Play className="w-5 h-5" />Reprendre
                </button>
              )}
              <button onClick={handleStop} className="flex-1 h-16 bg-white border-2 border-red-500 text-red-600 hover:bg-red-50 font-semibold text-lg rounded-lg flex items-center justify-center gap-2 transition-all">
                <Square className="w-5 h-5" />Arreter
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Affichage erreur de quota */}
      {quotaError && (
        <Card className="mb-6 border-2 border-orange-400 bg-gradient-to-r from-orange-50 to-amber-50 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-orange-100 rounded-full">
                <CreditCard className="w-8 h-8 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-orange-800 mb-2">
                  {quotaError.error === 'Quota insuffisant' ? '⚠️ Crédits insuffisants' : '⚠️ Abonnement requis'}
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
                    onClick={() => navigate(quotaError.redirect || '/settings/billing')}
                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-lg shadow-md flex items-center gap-2 transition-all"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {quotaError.action === 'subscribe' ? 'Voir les plans' : 'Acheter des crédits'}
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

      {isGenerating && (
        <Card className="mb-6 border-4 border-blue-500 shadow-2xl animate-pulse">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-xl flex items-center gap-3">
                <Loader className="w-6 h-6 animate-spin text-blue-600" />
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
              <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 h-10 rounded-full transition-all duration-500 flex items-center justify-center text-white font-bold text-lg shadow-lg" style={{ width: `${progress}%` }}>
                {progress}%
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl text-center border-2 border-blue-200 shadow-md">
                <p className="text-sm text-gray-600 font-semibold mb-1">En cache</p>
                <p className="text-4xl font-bold text-blue-600">{stats.found}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl text-center border-2 border-green-200 shadow-md">
                <p className="text-sm text-gray-600 font-semibold mb-1">Generes</p>
                <p className="text-4xl font-bold text-green-600">{stats.generated}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-xl text-center border-2 border-purple-200 shadow-md">
                <p className="text-sm text-gray-600 font-semibold mb-1">Total</p>
                <p className="text-4xl font-bold text-purple-600">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Message de fin de recherche */}
      {searchComplete && !isGenerating && leads.length === 0 && (
        <Card className="mb-6 border-2 border-yellow-400 bg-gradient-to-r from-yellow-50 to-amber-50 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-full">
                <Sparkles className="w-8 h-8 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-yellow-800 mb-2">Recherche terminée</h3>
                <p className="text-gray-700">{completeMessage}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Essayez de modifier les paramètres de recherche (secteur, ville, rayon) pour obtenir plus de résultats.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {leads.length > 0 && (
        <Card className="shadow-xl">
          <CardHeader className="bg-green-50 border-b-2">
            <CardTitle className="text-2xl flex items-center gap-3">
              <CheckCircle2 className="w-7 h-7 text-green-600" />
              Resultats ({leads.length} leads)
              {searchComplete && <span className="text-sm font-normal text-gray-500 ml-2">- {completeMessage}</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {leads.map((lead, i) => (
                <div key={i} className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg hover:from-blue-50 hover:to-indigo-50 transition-all border border-gray-200 hover:border-blue-300 hover:shadow-md">
                  <p className="font-bold text-lg text-gray-800 mb-2">{lead.company_name}</p>
                  <div className="text-sm text-gray-600 flex flex-wrap gap-4">
                    {lead.phone && <span className="flex items-center gap-1">📞 <span className="font-medium">{lead.phone}</span></span>}
                    {lead.email && <span className="flex items-center gap-1">📧 <span className="font-medium">{lead.email}</span></span>}
                    {lead.website && <span className="flex items-center gap-1">🌐 <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{lead.website}</a></span>}
                    {lead.address && <span className="text-gray-500">📍 {lead.address}</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
