import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../api/axios';

export default function ImportLeads() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [databaseName, setDatabaseName] = useState('');
  const [databaseDescription, setDatabaseDescription] = useState('');
  const [sector, setSector] = useState('autre');
  const [result, setResult] = useState(null);

  const SECTEURS = [
    { value: 'juridique', label: 'Juridique / Legal', icon: '⚖️' },
    { value: 'comptabilite', label: 'Comptabilité', icon: '💼' },
    { value: 'sante', label: 'Santé', icon: '🏥' },
    { value: 'informatique', label: 'Informatique / IT', icon: '💻' },
    { value: 'btp', label: 'BTP / Construction', icon: '🏗️' },
    { value: 'hotellerie', label: 'Hôtellerie-Restauration', icon: '🏨' },
    { value: 'immobilier', label: 'Immobilier', icon: '🏢' },
    { value: 'logistique', label: 'Logistique / Transport', icon: '🚚' },
    { value: 'commerce', label: 'Commerce / Retail', icon: '🛒' },
    { value: 'autre', label: 'Autre', icon: '📁' }
  ];

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile);
      if (!databaseName) {
        setDatabaseName(selectedFile.name.replace('.csv', ''));
      }
    } else {
      alert('Veuillez sélectionner un fichier CSV');
    }
  };

  const handleImport = async () => {
    if (!file || !databaseName) {
      alert('Veuillez remplir tous les champs requis');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // 1. Lire le fichier CSV
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const csvContent = e.target.result;

        try {
          // 2. Créer la base de données
          console.log('📊 Création de la base de données...');
          const createDbResponse = await api.post('/lead-databases', {
            name: databaseName,
            description: databaseDescription,
            source: 'import_csv',
            segmentation: { [sector]: 0 }
          });

          if (!createDbResponse.data.success) {
            throw new Error('Erreur création base de données');
          }

          const databaseId = createDbResponse.data.database.id;
          console.log('✅ Base créée:', databaseId);

          // 3. Importer les leads
          console.log('📥 Import des leads...');
          const importResponse = await api.post('/import-csv', {
            database_id: databaseId,
            csv_content: csvContent,
            sector: sector
          });

          if (importResponse.data.success) {
            setResult({
              success: true,
              stats: importResponse.data.stats
            });
            console.log('✅ Import réussi:', importResponse.data.stats);
          } else {
            throw new Error(importResponse.data.error || 'Erreur import');
          }
        } catch (error) {
          console.error('❌ Erreur:', error);
          setResult({
            success: false,
            error: error.response?.data?.error || error.message
          });
        } finally {
          setLoading(false);
        }
      };

      reader.onerror = () => {
        setLoading(false);
        alert('Erreur lecture du fichier');
      };

      reader.readAsText(file);
    } catch (error) {
      console.error('❌ Erreur:', error);
      setLoading(false);
      alert('Erreur: ' + error.message);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/lead-databases')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux bases
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Importer des Leads</h1>
        <p className="text-gray-600">Importez vos leads depuis un fichier CSV</p>
      </div>

      {/* Form */}
      {!result && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Fichier CSV *
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-500 transition-all">
              {!file ? (
                <>
                  <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-600 mb-3">Sélectionnez un fichier CSV</p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="block mx-auto"
                  />
                </>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Database Name */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nom de la base *
            </label>
            <input
              type="text"
              value={databaseName}
              onChange={(e) => setDatabaseName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
              placeholder="Ex: Leads Janvier 2025"
              required
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description (optionnel)
            </label>
            <textarea
              value={databaseDescription}
              onChange={(e) => setDatabaseDescription(e.target.value)}
              rows="3"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
              placeholder="Décrivez cette base de données..."
            />
          </div>

          {/* Sector */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Secteur d'activité *
            </label>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none bg-white"
            >
              {SECTEURS.map(s => (
                <option key={s.value} value={s.value}>
                  {s.icon} {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
            <p className="font-semibold text-blue-900 mb-1">📋 Format CSV attendu:</p>
            <code className="text-sm text-blue-700">
              company_name, email, phone, city, address, website
            </code>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleImport}
            disabled={!file || !databaseName || loading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Import en cours...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Importer les leads
              </>
            )}
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <Loader2 className="w-16 h-16 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-xl font-bold text-gray-900 mb-2">Import en cours...</p>
          <p className="text-gray-600">Veuillez patienter, cela peut prendre quelques secondes</p>
        </div>
      )}

      {/* Success Result */}
      {result && result.success && (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-6">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-600 mb-2">Import réussi !</h2>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{result.stats.added}</p>
              <p className="text-sm text-gray-600">Ajoutés</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{result.stats.updated}</p>
              <p className="text-sm text-gray-600">Mis à jour</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-gray-600">{result.stats.skipped}</p>
              <p className="text-sm text-gray-600">Ignorés</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/lead-databases')}
            className="w-full bg-purple-600 text-white py-3 rounded-xl font-semibold hover:bg-purple-700"
          >
            Retour aux bases
          </button>
        </div>
      )}

      {/* Error Result */}
      {result && !result.success && (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-6">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-600 mb-2">Erreur d'import</h2>
            <p className="text-gray-600">{result.error}</p>
          </div>

          <button
            onClick={() => {
              setResult(null);
              setFile(null);
            }}
            className="w-full bg-gray-600 text-white py-3 rounded-xl font-semibold hover:bg-gray-700"
          >
            Réessayer
          </button>
        </div>
      )}
    </div>
  );
}