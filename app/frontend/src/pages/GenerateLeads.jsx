import React, { useState } from "react";
import { Search, MapPin, Target, Zap, Database, Loader2 } from "lucide-react";

const SECTEURS = [
  { value: "juridique", label: "Juridique / Légal", icon: "⚖️" },
  { value: "comptabilite", label: "Comptabilité", icon: "💼" },
  { value: "sante", label: "Santé", icon: "🏥" },
  { value: "informatique", label: "Informatique / IT", icon: "💻" },
  { value: "btp", label: "BTP / Construction", icon: "🏗️" },
  { value: "hotellerie", label: "Hôtellerie-Restauration", icon: "🏨" },
  { value: "immobilier", label: "Immobilier", icon: "🏢" },
  { value: "logistique", label: "Logistique / Transport", icon: "🚚" },
  { value: "commerce", label: "Commerce / Retail", icon: "🛒" },
  { value: "education", label: "Éducation", icon: "📚" },
  { value: "consulting", label: "Consulting", icon: "💡" },
  { value: "rh", label: "Ressources Humaines", icon: "👥" },
  { value: "services", label: "Services", icon: "🔧" },
  { value: "industrie", label: "Industrie", icon: "🏭" },
  { value: "automobile", label: "Automobile", icon: "🚗" }
];

export default function GenerateLeads() {
  const [formData, setFormData] = useState({
    sector: '',
    city: '',
    radius: 10,
    quantity: 50
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleGenerate = async (e) => {
    e.preventDefault();
    
    if (!formData.sector || !formData.city) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('http://localhost:3000/api/generate-leads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success) {
        setResult(data);
      } else {
        alert('Erreur: ' + (data.error || 'Erreur inconnue'));
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la génération');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Zap className="w-8 h-8 text-yellow-500" />
          Générer des Leads
        </h1>
        <p className="text-gray-600">Trouvez des prospects qualifiés via Google Maps</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulaire */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Paramètres de recherche
            </h2>

            <form onSubmit={handleGenerate} className="space-y-6">
              {/* Secteur */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Secteur d'activité *
                </label>
                <select
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.sector}
                  onChange={(e) => setFormData({...formData, sector: e.target.value})}
                >
                  <option value="">Sélectionnez un secteur</option>
                  {SECTEURS.map(s => (
                    <option key={s.value} value={s.value}>
                      {s.icon} {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ville */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Ville / Zone géographique *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Paris, Lyon, Marseille..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                />
              </div>

              {/* Rayon */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Rayon de recherche: {formData.radius} km
                </label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  value={formData.radius}
                  onChange={(e) => setFormData({...formData, radius: parseInt(e.target.value)})}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>5 km</span>
                  <span>50 km</span>
                </div>
              </div>

              {/* Quantité */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Nombre de leads souhaité
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value)})}
                >
                  <option value={10}>10 leads</option>
                  <option value={25}>25 leads</option>
                  <option value={50}>50 leads</option>
                  <option value={100}>100 leads</option>
                  <option value={250}>250 leads</option>
                  <option value={500}>500 leads</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 px-6 rounded-lg text-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Générer les leads
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Résultats */}
        <div>
          <div className="bg-white rounded-lg shadow p-6 sticky top-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Database className="w-5 h-5" />
              Résultats
            </h2>

            {!result && !loading && (
              <div className="text-center py-8 text-gray-500">
                <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Configurez votre recherche et lancez la génération</p>
              </div>
            )}

            {loading && (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 mx-auto mb-3 animate-spin text-blue-600" />
                <p className="text-sm font-medium">Recherche en cours...</p>
                <p className="text-xs text-gray-500 mt-1">Analyse de notre base + Google Maps</p>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-3xl font-bold text-green-700">{result.total}</p>
                  <p className="text-sm text-green-600">Leads trouvés</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm">💾 Depuis notre base</span>
                    <span className="font-bold text-blue-700">{result.found_in_database}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm">🔍 Depuis Google Maps</span>
                    <span className="font-bold text-purple-700">{result.fetched_from_google}</span>
                  </div>
                </div>

                <button className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors">
                  Créer la base avec ces leads
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
