import { log, error, warn } from "./../lib/logger.js";
﻿import React, { useState } from "react";
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Upload, FileText, Database, CheckCircle, AlertCircle,
  Sparkles, TrendingUp, BarChart3, FileSpreadsheet,
  Building2, Users, MapPin, Zap
} from "lucide-react";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";

export default function ImportLeads() {
  const [file, setFile] = useState(null);
  const [databaseName, setDatabaseName] = useState("");
  const [importing, setImporting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const navigate = useNavigate();

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (selectedFile) => {
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      analyzeCSVPreview(selectedFile);
    } else {
      toast.error('Veuillez sélectionner un fichier CSV');
    }
  };

  const analyzeCSVPreview = (file) => {
    setAnalyzing(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').slice(0, 6);
      const headers = lines[0].split(',').map(h => h.trim());
      
      setPreview({
        headers: headers,
        rowCount: text.split('\n').length - 1,
        fileSize: (file.size / 1024).toFixed(2) + ' KB'
      });
      setAnalyzing(false);
    };
    
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!file || !databaseName) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setImporting(true);

    try {
      // Créer d'abord la base de données
      const dbResponse = await api.post('/lead-databases', {
        name: databaseName,
        description: `Import CSV du ${new Date().toLocaleDateString('fr-FR')}`,
        source: 'import_csv',
        segmentation: {}
      });

      const databaseId = dbResponse.data.database.id;

      // Lire et envoyer le CSV au backend import-csv.js
      const reader = new FileReader();
      reader.onload = async (e) => {
        const csvContent = e.target.result;

        // L'API /import-csv analyse automatiquement les secteurs !
        const importResponse = await api.post('/import-csv', {
          database_id: databaseId,
          csv_content: csvContent
          // PAS de sector, l'API détecte automatiquement via NAF, SIRET, nom entreprise
        });

        setResult({
          ...importResponse.data.stats,
          segmentation: importResponse.data.segmentation // Les secteurs détectés automatiquement
        });

        toast.success(`Import réussi ! ${importResponse.data.stats?.added || 0} leads importés`);

        // Redirection après 3 secondes vers DatabaseDetails avec le bon format d'URL
        setTimeout(() => {
          navigate(`/DatabaseDetails?id=${databaseId}`);
        }, 3000);
      };

      reader.readAsText(file);
    } catch (error) {
      error('Erreur import:', error);
      toast.error('Erreur lors de l\'import : ' + (error.response?.data?.error || error.message));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        {/* Header animé */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Import CSV Intelligent
          </h1>
          <p className="text-gray-600 text-lg flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            Analyse automatique des secteurs avec IA
            <Sparkles className="w-5 h-5 text-yellow-500" />
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Carte principale */}
          <div className="lg:col-span-2">
            <Card className="shadow-xl border-2 border-blue-100">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <FileSpreadsheet className="w-8 h-8" />
                  Importer vos leads
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Nom de la base */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Nom de la base de données *
                  </label>
                  <div className="relative">
                    <Database className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={databaseName}
                      onChange={(e) => setDatabaseName(e.target.value)}
                      placeholder="Ex: Prospects Paris Q1 2025"
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Zone de drag & drop */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Fichier CSV *
                  </label>
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`
                      border-3 border-dashed rounded-xl p-8 text-center transition-all
                      ${dragActive 
                        ? 'border-blue-500 bg-blue-50 scale-105' 
                        : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                      }
                    `}
                  >
                    <Upload className={`w-16 h-16 mx-auto mb-4 ${dragActive ? 'text-blue-500' : 'text-gray-400'}`} />
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => handleFile(e.target.files[0])}
                      className="hidden"
                      id="csv-upload"
                    />
                    <label
                      htmlFor="csv-upload"
                      className="cursor-pointer"
                    >
                      <p className="text-lg font-semibold text-gray-700 mb-2">
                        Glissez votre fichier ici
                      </p>
                      <p className="text-sm text-gray-500">ou</p>
                      <span className="inline-block mt-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all">
                        Parcourir les fichiers
                      </span>
                    </label>
                    
                    {file && !analyzing && (
                      <div className="mt-6 bg-green-50 border-2 border-green-200 rounded-lg p-4">
                        <div className="flex items-center justify-center gap-3">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                          <div className="text-left">
                            <p className="font-semibold text-green-800">{file.name}</p>
                            {preview && (
                              <p className="text-sm text-green-600">
                                {preview.rowCount} lignes • {preview.fileSize}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Aperçu des colonnes détectées */}
                {preview && (
                  <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                    <h3 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Colonnes détectées
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {preview.headers.map((header, i) => (
                        <span key={i} className="px-3 py-1 bg-white text-purple-700 border border-purple-300 rounded-full text-sm font-medium">
                          {header}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Résultat avec secteurs */}
                {result && (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                        <div>
                          <p className="text-xl font-bold text-green-800">Import réussi !</p>
                          <p className="text-green-600">
                            {result.added} nouveaux leads ajoutés
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-white rounded-lg p-2">
                          <p className="text-2xl font-bold text-blue-600">{result.added}</p>
                          <p className="text-xs text-gray-600">Ajoutés</p>
                        </div>
                        <div className="bg-white rounded-lg p-2">
                          <p className="text-2xl font-bold text-yellow-600">{result.updated}</p>
                          <p className="text-xs text-gray-600">Mis à jour</p>
                        </div>
                        <div className="bg-white rounded-lg p-2">
                          <p className="text-2xl font-bold text-gray-600">{result.skipped}</p>
                          <p className="text-xs text-gray-600">Ignorés</p>
                        </div>
                      </div>
                    </div>

                    {/* Secteurs détectés automatiquement */}
                    {result.segmentation && Object.keys(result.segmentation).length > 0 && (
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-lg p-5">
                        <h3 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                          <Zap className="w-5 h-5 text-yellow-500" />
                          Secteurs détectés automatiquement par l'IA
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(result.segmentation).map(([sector, count]) => (
                            <div key={sector} className="flex items-center justify-between bg-white rounded-lg p-2">
                              <span className="font-medium capitalize">{sector}</span>
                              <span className="px-3 py-1 bg-purple-600 text-white rounded-full text-sm font-bold">
                                {count}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="text-center">
                      <p className="text-gray-600">Redirection dans 3 secondes...</p>
                    </div>
                  </div>
                )}

                {/* BOUTON IMPORT - ULTRA VISIBLE */}
                <div className="mt-8 relative">
                  {/* Animation de fond pulsante */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur-xl opacity-50 animate-pulse"></div>
                  
                  <Button
                    onClick={handleImport}
                    disabled={!file || !databaseName || importing}
                    className="relative w-full h-16 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xl font-black shadow-2xl hover:shadow-purple-500/50 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border-4 border-white rounded-2xl"
                  >
                    {importing ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="relative">
                          <div className="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent" />
                          <Sparkles className="absolute inset-0 w-8 h-8 text-yellow-300 animate-pulse" />
                        </div>
                        <span className="animate-pulse text-lg">⏳ Analyse et import en cours...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-3">
                        <Sparkles className="w-8 h-8 animate-bounce" />
                        <span className="tracking-wide">LANCER L'IMPORT INTELLIGENT</span>
                        <Zap className="w-8 h-8 text-yellow-300 animate-bounce" />
                      </div>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Carte info latérale */}
          <div className="space-y-6">
            <Card className="shadow-lg border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-900">
                  <Sparkles className="w-6 h-6 text-yellow-500" />
                  IA Intelligente
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <p>Détection automatique des secteurs via code NAF</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <p>Analyse des SIRET et étiquettes</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <p>Classification par nom d'entreprise</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <p>Déduplication automatique</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-gray-700">Format CSV accepté</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600 space-y-2">
                <p className="font-semibold">Colonnes reconnues :</p>
                <ul className="space-y-1">
                  <li>• Nom de la société ✓</li>
                  <li>• Email</li>
                  <li>• Téléphone</li>
                  <li>• Ville / Code postal</li>
                  <li>• Site web</li>
                  <li>• Description</li>
                  <li>• SIRET / Code NAF</li>
                  <li>• Étiquette (secteur)</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}