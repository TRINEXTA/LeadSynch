import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Zap, Archive, Trash2, Upload, 
  Mail, Phone, Globe, MapPin, Calendar, Database,
  Plus, Filter, Search, X, FileUp
} from 'lucide-react';

export default function DatabaseDetails() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const databaseId = searchParams.get('id');

  const [database, setDatabase] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (databaseId) {
      fetchDatabaseDetails();
    }
  }, [databaseId]);

  const fetchDatabaseDetails = async () => {
    try {
      const dbResponse = await fetch('http://localhost:3000/api/lead-databases', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const dbData = await dbResponse.json();
      
      if (dbData.success) {
        const db = dbData.databases.find(d => d.id === databaseId);
        setDatabase(db);
      }

      const leadsResponse = await fetch('http://localhost:3000/api/leads', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const leadsData = await leadsResponse.json();
      
      if (leadsData.success) {
        const filteredLeads = leadsData.leads.filter(l => l.database_id === databaseId);
        setLeads(filteredLeads);
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm('Archiver cette base ? Elle disparaîtra du tableau de bord.')) return;

    try {
      const response = await fetch(`http://localhost:3000/api/lead-databases/${databaseId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ archived: true })
      });

      if (response.ok) {
        alert('✅ Base archivée !');
        navigate('/LeadDatabases');
      }
    } catch (error) {
      console.error('Erreur archivage:', error);
      alert('Erreur lors de l\'archivage');
    }
  };

  const handleDelete = async () => {
    if (!confirm('⚠️ ATTENTION : Supprimer définitivement cette base et tous ses leads ?')) return;
    if (!confirm('Êtes-vous vraiment sûr ? Cette action est irréversible !')) return;

    try {
      const response = await fetch(`http://localhost:3000/api/lead-databases/${databaseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        alert('✅ Base supprimée !');
        navigate('/LeadDatabases');
      }
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleGenerateMore = () => {
    const nameParts = database.name.split(' - ');
    const sector = nameParts[0]?.toLowerCase().trim();
    const city = nameParts[1]?.trim();
    navigate(`/LeadGeneration?sector=${sector}&city=${city}&db_id=${databaseId}`);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
    } else {
      alert('Veuillez sélectionner un fichier CSV');
    }
  };

  const handleImportCsv = async () => {
    if (!csvFile) {
      alert('Veuillez sélectionner un fichier');
      return;
    }

    setImporting(true);

    try {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        const csvContent = event.target.result;
        
        const response = await fetch('http://localhost:3000/api/import-csv', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            database_id: databaseId,
            csv_content: csvContent,
            sector: database.name.split(' - ')[0]?.toLowerCase() || 'autre'
          })
        });

        const data = await response.json();

        if (data.success) {
          alert(`✅ Import réussi !\n\n📊 Statistiques :\n- Total: ${data.stats.total}\n- Ajoutés à global_leads: ${data.stats.added}\n- Enrichis: ${data.stats.updated}\n- Ignorés: ${data.stats.skipped}`);
          setShowImportModal(false);
          setCsvFile(null);
          fetchDatabaseDetails();
        } else {
          alert('❌ Erreur: ' + (data.error || 'Erreur inconnue'));
        }
      };

      reader.readAsText(csvFile);
    } catch (error) {
      console.error('Erreur import:', error);
      alert('Erreur lors de l\'import');
    } finally {
      setImporting(false);
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchSearch = searchTerm === '' || 
      lead.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone?.includes(searchTerm);
    
    const matchStatus = filterStatus === 'all' || lead.status === filterStatus;

    return matchSearch && matchStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!database) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Database className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">Base de données introuvable</p>
          <button
            onClick={() => navigate('/LeadDatabases')}
            className="mt-4 text-blue-600 hover:underline"
          >
            Retour aux bases
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Modal Import CSV */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FileUp className="w-6 h-6 text-blue-600" />
                Importer des leads
              </h3>
              <button onClick={() => setShowImportModal(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Fichier CSV</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Format attendu : company_name, phone, email, website, address, city
                </p>
              </div>

              {csvFile && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    ✅ Fichier sélectionné : <strong>{csvFile.name}</strong>
                  </p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  💡 <strong>Intelligence du système :</strong><br/>
                  • Les doublons sont détectés automatiquement<br/>
                  • Les informations manquantes sont enrichies<br/>
                  • Vos données enrichissent notre base globale
                </p>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleImportCsv}
                  disabled={!csvFile || importing}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importing ? 'Import en cours...' : 'Importer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/LeadDatabases')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour aux bases
        </button>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{database.name}</h1>
              <p className="text-gray-600 mb-4">{database.description || 'Aucune description'}</p>
              
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">{leads.length} leads</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-600" />
                  <span>Créée le {new Date(database.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    {database.source || 'google_maps'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 ml-4">
              <button
                onClick={handleGenerateMore}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Générer + de leads
              </button>
              <button
                onClick={handleArchive}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
              >
                <Archive className="w-4 h-4" />
                Archiver
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un lead..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="border rounded-lg px-4 py-2"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Tous les statuts</option>
            <option value="nouveau">Nouveau</option>
            <option value="contacte">Contacté</option>
            <option value="qualifie">Qualifié</option>
            <option value="converti">Converti</option>
          </select>

          <button 
            onClick={() => setShowImportModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            <Upload className="w-4 h-4" />
            Importer des leads
          </button>
        </div>
        
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
          <Filter className="w-4 h-4" />
          <span className="font-medium">{filteredLeads.length}</span>
          <span>lead(s) affiché(s) sur {leads.length}</span>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">Total</p>
          <p className="text-2xl font-bold">{leads.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">Avec email</p>
          <p className="text-2xl font-bold text-green-600">
            {leads.filter(l => l.email).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">Avec téléphone</p>
          <p className="text-2xl font-bold text-blue-600">
            {leads.filter(l => l.phone).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">Avec site web</p>
          <p className="text-2xl font-bold text-purple-600">
            {leads.filter(l => l.website).length}
          </p>
        </div>
      </div>

      {/* Liste des leads */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Entreprise</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Email</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Téléphone</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Ville</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Statut</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">
                    Aucun lead trouvé
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{lead.company_name}</p>
                        {lead.address && (
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" />
                            {lead.address}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {lead.email ? (
                        <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline flex items-center gap-1 text-sm">
                          <Mail className="w-4 h-4" />
                          {lead.email}
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {lead.phone ? (
                        <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline flex items-center gap-1 text-sm">
                          <Phone className="w-4 h-4" />
                          {lead.phone}
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">{lead.city || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        lead.status === 'nouveau' ? 'bg-blue-100 text-blue-700' :
                        lead.status === 'contacte' ? 'bg-yellow-100 text-yellow-700' :
                        lead.status === 'qualifie' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{lead.score || 50}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}