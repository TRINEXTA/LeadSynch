import React, { useState } from "react";
import { Search, MapPin, Target, Zap, Database, Loader2, Phone, Mail, Globe, CheckCircle, AlertCircle } from "lucide-react";

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
  const [creating, setCreating] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [quotaError, setQuotaError] = useState(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [existingDatabase, setExistingDatabase] = useState(null);

  const handleGenerate = async (e) => {
    e.preventDefault();
    
    if (!formData.sector || !formData.city) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    setResult(null);
    setQuotaError(null);

    try {
      // 1. VÉRIFIER LES QUOTAS
      const quotaCheck = await fetch('http://localhost:3000/api/quotas/check', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'google_leads',
          quantity: formData.quantity
        })
      });

      const quotaData = await quotaCheck.json();

      if (!quotaData.allowed) {
        setQuotaError({
          message: quotaData.message,
          remaining: quotaData.remaining,
          plan: quotaData.plan,
          upgrade_suggestion: quotaData.upgrade_suggestion
        });
        setShowQuotaModal(true);
        setLoading(false);
        return;
      }

      // 2. VÉRIFIER S'IL EXISTE UNE BASE SIMILAIRE
      const databasesResponse = await fetch('http://localhost:3000/api/lead-databases', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const databasesData = await databasesResponse.json();
      
      if (databasesData.success) {
        const similarBase = databasesData.databases.find(db => 
          db.name.toLowerCase().includes(formData.sector) && 
          db.name.toLowerCase().includes(formData.city.toLowerCase())
        );

        if (similarBase) {
          setExistingDatabase(similarBase);
          setShowDuplicateModal(true);
          setLoading(false);
          return;
        }
      }

      // 3. GÉNÉRER LES LEADS
      await generateLeads();

    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la vérification');
      setLoading(false);
    }
  };

  const generateLeads = async (addToExisting = false, existingDbId = null) => {
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
        
        // Si on doit ajouter à une base existante
        if (addToExisting && existingDbId) {
          await addLeadsToExistingDatabase(existingDbId, data.leads);
        }
      } else {
        alert('Erreur: ' + (data.error || 'Erreur inconnue'));
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la génération');
    } finally {
      setLoading(false);
      setShowDuplicateModal(false);
    }
  };

  const addLeadsToExistingDatabase = async (databaseId, leads) => {
    setCreating(true);
    let insertedCount = 0;

    for (const lead of leads) {
      try {
        const insertResponse = await fetch('http://localhost:3000/api/leads', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            database_id: databaseId,
            company_name: lead.company_name,
            phone: lead.phone,
            email: lead.email || null,
            website: lead.website,
            address: lead.address,
            city: lead.city,
            industry: formData.sector,
            status: 'nouveau',
            score: 50
          })
        });

        if (insertResponse.ok) insertedCount++;
      } catch (error) {
        console.error('Erreur insertion:', error);
      }
    }

    alert(`✅ ${insertedCount} leads ajoutés à la base existante !`);
    window.location.href = '/LeadDatabases';
    setCreating(false);
  };

  const handleCreateDatabase = async () => {
    if (!result || !result.leads || result.leads.length === 0) {
      alert('Aucun lead à enregistrer');
      return;
    }

    const databaseName = prompt('Nom de la base de données:', `${formData.sector} - ${formData.city}`);
    if (!databaseName) return;

    setCreating(true);

    try {
      const createResponse = await fetch('http://localhost:3000/api/lead-databases', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: databaseName,
          description: `Leads ${formData.sector} à ${formData.city}`,
          source: 'google_maps',
          total_leads: result.leads.length,
          segmentation: { [formData.sector]: result.total }
        })
      });

      const createData = await createResponse.json();
      
      if (!createData.success) {
        throw new Error(createData.error || 'Erreur création base');
      }

      const databaseId = createData.database.id;
      let insertedCount = 0;
      
      for (const lead of result.leads) {
        try {
          const insertResponse = await fetch('http://localhost:3000/api/leads', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              database_id: databaseId,
              company_name: lead.company_name,
              phone: lead.phone,
              email: lead.email || null,
              website: lead.website,
              address: lead.address,
              city: lead.city,
              industry: formData.sector,
              status: 'nouveau',
              score: 50
            })
          });

          if (insertResponse.ok) insertedCount++;
        } catch (error) {
          console.error('Erreur insertion:', error);
        }
      }

      alert(`✅ Base créée avec ${insertedCount} leads !`);
      window.location.href = '/LeadDatabases';
      
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* MODAL QUOTA DÉPASSÉ */}
      {showQuotaModal && quotaError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-8 h-8 text-orange-500" />
              <h3 className="text-xl font-bold">Quota insuffisant</h3>
            </div>
            <p className="text-gray-700 mb-4">{quotaError.message}</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">
                💡 <strong>Reste disponible :</strong> {quotaError.remaining} leads Google Maps
              </p>
            </div>
            <div className="space-y-2">
              {quotaError.remaining > 0 && (
                <button
                  onClick={() => {
                    setFormData({...formData, quantity: quotaError.remaining});
                    setShowQuotaModal(false);
                    handleGenerate({ preventDefault: () => {} });
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium"
                >
                  Générer {quotaError.remaining} leads seulement
                </button>
              )}
              <button
                onClick={() => alert('Redirection vers la page tarifs...')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium"
              >
                🚀 {quotaError.upgrade_suggestion}
              </button>
              <button
                onClick={() => setShowQuotaModal(false)}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg font-medium"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BASE SIMILAIRE */}
      {showDuplicateModal && existingDatabase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-8 h-8 text-blue-500" />
              <h3 className="text-xl font-bold">Base similaire détectée</h3>
            </div>
            <p className="text-gray-700 mb-2">
              Vous avez déjà une base <strong>"{existingDatabase.name}"</strong> avec {existingDatabase.total_leads} leads.
            </p>
            <p className="text-gray-600 text-sm mb-4">
              Que voulez-vous faire ?
            </p>
            <div className="space-y-2">
              <button
                onClick={() => generateLeads(true, existingDatabase.id)}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
              >
                ➕ Ajouter à la base existante
                <span className="text-sm">({existingDatabase.total_leads} → {existingDatabase.total_leads + formData.quantity})</span>
              </button>
              <button
                onClick={() => {
                  setShowDuplicateModal(false);
                  generateLeads(false, null);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium"
              >
                📁 Créer une nouvelle base "{formData.sector} - {formData.city} (2)"
              </button>
              <button
                onClick={() => setShowDuplicateModal(false)}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg font-medium"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Zap className="w-8 h-8 text-yellow-500" />
          Générer des Leads
        </h1>
        <p className="text-gray-600">Trouvez des prospects qualifiés via Google Maps</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* FORMULAIRE */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 sticky top-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Paramètres
            </h2>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Secteur *</label>
                <select
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={formData.sector}
                  onChange={(e) => setFormData({...formData, sector: e.target.value})}
                >
                  <option value="">Sélectionner</option>
                  {SECTEURS.map(s => (
                    <option key={s.value} value={s.value}>{s.icon} {s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ville *</label>
                <input
                  type="text"
                  required
                  placeholder="Paris, Lyon..."
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Rayon: {formData.radius} km</label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  className="w-full"
                  value={formData.radius}
                  onChange={(e) => setFormData({...formData, radius: parseInt(e.target.value)})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Quantité</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value)})}
                >
                  <option value={10}>10 leads</option>
                  <option value={25}>25 leads</option>
                  <option value={50}>50 leads</option>
                  <option value={100}>100 leads</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Vérification...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Générer
                  </>
                )}
              </button>
            </form>

            {result && (
              <div className="mt-6 pt-6 border-t">
                <div className="text-center mb-4">
                  <p className="text-4xl font-bold text-green-600">{result.total}</p>
                  <p className="text-sm text-gray-600">Leads trouvés</p>
                </div>
                <button
                  onClick={handleCreateDatabase}
                  disabled={creating}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {creating ? 'Création...' : 'Créer la base'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* LISTE DES LEADS */}
        <div className="lg:col-span-3">
          {!result && !loading && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">Configurez votre recherche et générez des leads</p>
            </div>
          )}

          {loading && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-blue-600" />
              <p className="font-medium">Vérification des quotas...</p>
            </div>
          )}

          {result && result.leads && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b bg-gray-50">
                <h2 className="text-xl font-semibold">Résultats ({result.total} leads)</h2>
              </div>
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {result.leads.map((lead, index) => (
                  <div key={index} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{lead.company_name}</h3>
                        {lead.address && (
                          <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                            <MapPin className="w-4 h-4" />
                            {lead.address}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-3 mt-2">
                          {lead.phone && (
                            <a href={`tel:${lead.phone}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                              <Phone className="w-4 h-4" />
                              {lead.phone}
                            </a>
                          )}
                          {lead.email && (
                            <a href={`mailto:${lead.email}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                              <Mail className="w-4 h-4" />
                              {lead.email}
                            </a>
                          )}
                          {lead.website && (
                            <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                              <Globe className="w-4 h-4" />
                              Site web
                            </a>
                          )}
                        </div>
                        {lead.rating && (
                          <div className="mt-2 text-sm text-gray-600">
                            ⭐ {lead.rating}/5 ({lead.review_count} avis)
                          </div>
                        )}
                      </div>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
