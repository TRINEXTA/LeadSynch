import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, CheckCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const SECTEURS_MAPPING = {
  juridique: { label: "Juridique / Légal", icon: "⚖️" },
  comptabilite: { label: "Comptabilité", icon: "💼" },
  sante: { label: "Santé", icon: "🏥" },
  informatique: { label: "Informatique / IT", icon: "💻" },
  btp: { label: "BTP / Construction", icon: "🏗️" },
  hotellerie: { label: "Hôtellerie-Restauration", icon: "🏨" },
  immobilier: { label: "Immobilier", icon: "🏢" },
  logistique: { label: "Logistique / Transport", icon: "🚚" },
  commerce: { label: "Commerce / Retail", icon: "🛒" },
  education: { label: "Éducation", icon: "📚" },
  consulting: { label: "Consulting", icon: "💡" },
  rh: { label: "Ressources Humaines", icon: "👥" },
  services: { label: "Services", icon: "🔧" },
  industrie: { label: "Industrie", icon: "🏭" },
  automobile: { label: "Automobile", icon: "🚗" },
  autre: { label: "Autre", icon: "📁" }
};

export default function ImportLeads() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [databaseName, setDatabaseName] = useState('');
  const [databaseDescription, setDatabaseDescription] = useState('');
  const [importProgress, setImportProgress] = useState(0);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile);
      setDatabaseName(selectedFile.name.replace('.csv', ''));
    } else {
      alert('Veuillez sélectionner un fichier CSV');
    }
  };

  const analyzeFile = async () => {
    if (!file || !databaseName) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    setStep(2);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:3000/api/leads/analyze-csv', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        setAnalysisResult(data.analysis);
        setStep(3);
      } else {
        alert('Erreur: ' + (data.error || 'Erreur inconnue'));
        setStep(1);
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'analyse');
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const createDatabaseAndImport = async () => {
    setLoading(true);
    setStep(4); // Nouvelle étape : import en cours

    try {
      // 1. Créer la base de données
      const createResponse = await fetch('http://localhost:3000/api/leads/import-csv', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: databaseName,
          description: databaseDescription,
          source: 'import_csv',
          fileName: file.name,
          segmentation: analysisResult.segmentation
        })
      });

      const createData = await createResponse.json();
      
      if (!createData.success) {
        throw new Error(createData.error || 'Erreur création base');
      }

      const databaseId = createData.database.id;

      // 2. Importer les leads par batch
      const formData = new FormData();
      formData.append('file', file);
      formData.append('database_id', databaseId);

      const importResponse = await fetch('http://localhost:3000/api/leads/import-batch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const importData = await importResponse.json();
      
      if (importData.success) {
        setImportProgress(100);
        setTimeout(() => {
          alert(`✅ ${importData.imported} leads importés avec succès !`);
          window.location.href = '/lead-databases';
        }, 500);
      } else {
        throw new Error(importData.error || 'Erreur import');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur: ' + error.message);
      setStep(3);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => window.history.back()} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
        <h1 className="text-3xl font-bold">Importer des Leads</h1>
        <p className="text-gray-600">Importez vos leads depuis un fichier CSV</p>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>1</div>
            <span className="font-medium">Sélection</span>
          </div>
          <div className="w-16 h-1 bg-gray-200" />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>2</div>
            <span className="font-medium">Analyse</span>
          </div>
          <div className="w-16 h-1 bg-gray-200" />
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>3</div>
            <span className="font-medium">Import</span>
          </div>
        </div>
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <Card>
          <CardContent className="pt-6">
            <div className="border-2 border-dashed rounded-lg p-8 text-center mb-6">
              {!file ? (
                <>
                  <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="mb-3">Sélectionnez un fichier CSV</p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="mb-2"
                  />
                </>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <FileSpreadsheet className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              )}
            </div>

            {file && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom de la base *</label>
                  <input
                    type="text"
                    required
                    className="w-full border rounded-lg px-3 py-2"
                    value={databaseName}
                    onChange={(e) => setDatabaseName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    rows="2"
                    className="w-full border rounded-lg px-3 py-2"
                    value={databaseDescription}
                    onChange={(e) => setDatabaseDescription(e.target.value)}
                  />
                </div>

                <Button 
                  onClick={analyzeFile} 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg"
                  disabled={!databaseName}
                >
                  Analyser le fichier
                </Button>
              </div>
            )}

            <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
              <p className="font-medium mb-1">📋 Format attendu:</p>
              <code className="text-xs">company_name,email,phone,city,address,website</code>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2 - Analyzing */}
      {step === 2 && loading && (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-lg font-medium">Analyse en cours...</p>
            <p className="text-sm text-gray-500">Notre IA détecte les secteurs d'activité</p>
          </CardContent>
        </Card>
      )}

      {/* Step 3 - Validation */}
      {step === 3 && analysisResult && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
                Analyse terminée !
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded">
                  <p className="text-3xl font-bold text-blue-600">{analysisResult.totalLeads}</p>
                  <p className="text-sm">Leads détectés</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded">
                  <p className="text-3xl font-bold text-green-600">{analysisResult.validLeads}</p>
                  <p className="text-sm">Valides</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded">
                  <p className="text-3xl font-bold text-purple-600">
                    {Object.keys(analysisResult.segmentation || {}).length}
                  </p>
                  <p className="text-sm">Secteurs</p>
                </div>
              </div>

              <h3 className="font-semibold mb-3">Répartition par secteur:</h3>
              <div className="space-y-2">
                {Object.entries(analysisResult.segmentation || {})
                  .sort(([,a], [,b]) => b - a)
                  .map(([secteur, count]) => {
                    const secteurInfo = SECTEURS_MAPPING[secteur];
                    const percentage = ((count / analysisResult.totalLeads) * 100).toFixed(1);
                    
                    return (
                      <div key={secteur} className="flex items-center gap-3">
                        <Badge variant="secondary" className="min-w-[180px]">
                          {secteurInfo?.icon} {secteurInfo?.label}
                        </Badge>
                        <div className="flex-1 bg-gray-200 rounded-full h-6">
                          <div 
                            className="bg-blue-500 h-6 rounded-full flex items-center justify-center text-white text-sm font-medium"
                            style={{width: `${Math.max(percentage, 5)}%`}}
                          >
                            {count}
                          </div>
                        </div>
                        <span className="text-sm font-medium w-16">{percentage}%</span>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
              Annuler
            </Button>
            <Button onClick={createDatabaseAndImport} disabled={loading} className="flex-1 bg-green-600 hover:bg-green-700">
              Confirmer et importer
            </Button>
          </div>
        </div>
      )}

      {/* Step 4 - Importing */}
      {step === 4 && (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Loader2 className="w-16 h-16 animate-spin text-green-600 mx-auto mb-4" />
            <p className="text-lg font-medium">Import en cours...</p>
            <p className="text-sm text-gray-500 mb-4">
              {analysisResult.totalLeads} leads en cours d'importation
            </p>
            <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
              <div 
                className="bg-green-600 h-4 rounded-full transition-all duration-500"
                style={{width: `${importProgress}%`}}
              />
            </div>
            <p className="text-xs text-gray-500">Veuillez patienter, cela peut prendre quelques secondes...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
