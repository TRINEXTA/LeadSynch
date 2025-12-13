import { log, error, warn } from "../lib/logger.js";
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database, Search, Eye, Trash2, Archive, RefreshCw,
  Download, Lock, ChevronLeft, ChevronRight, LayoutGrid, List,
  Filter, Calendar, Building2, TrendingUp, Users, Loader2,
  CheckSquare, Square, MoreHorizontal
} from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

// Sources autorisées pour l'export
const EXPORTABLE_SOURCES = ['import_csv', 'manual'];

const SOURCE_LABELS = {
  import_csv: { label: 'CSV', color: 'bg-blue-100 text-blue-700', icon: '📥' },
  ai_generation: { label: 'IA', color: 'bg-purple-100 text-purple-700', icon: '🤖' },
  google_maps: { label: 'Google', color: 'bg-red-100 text-red-700', icon: '📍' },
  api_gouv: { label: 'API Gouv', color: 'bg-green-100 text-green-700', icon: '🏛️' },
  sirene: { label: 'Sirene', color: 'bg-teal-100 text-teal-700', icon: '🔍' },
  manual: { label: 'Manuel', color: 'bg-gray-100 text-gray-700', icon: '✏️' }
};

export default function LeadDatabasesAdmin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperAdmin = user?.is_super_admin;

  // State
  const [databases, setDatabases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [pagination, setPagination] = useState(null);

  // Filtres
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [tenantFilter, setTenantFilter] = useState('');
  const [tenants, setTenants] = useState([]);

  // Vue
  const [viewMode, setViewMode] = useState('table'); // 'table' ou 'cards'

  // Sélection multiple
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Charger les données
  const loadDatabases = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      if (search) params.append('search', search);
      if (sourceFilter && sourceFilter !== 'all') params.append('source', sourceFilter);
      if (tenantFilter) params.append('tenant_id', tenantFilter);

      const response = await api.get(`/lead-databases?${params}`);
      setDatabases(response.data.databases || []);
      setPagination(response.data.pagination);
    } catch (err) {
      error('Erreur chargement bases:', err);
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, sourceFilter, tenantFilter]);

  // Charger les stats
  const loadStats = async () => {
    try {
      const response = await api.get('/lead-databases/stats');
      setStats(response.data.stats);
    } catch (err) {
      error('Erreur stats:', err);
    }
  };

  // Charger les tenants (super admin)
  const loadTenants = async () => {
    if (!isSuperAdmin) return;
    try {
      const response = await api.get('/tenants');
      setTenants(response.data.tenants || []);
    } catch (err) {
      // Ignorer si pas d'accès
    }
  };

  useEffect(() => {
    loadStats();
    loadTenants();
  }, []);

  useEffect(() => {
    loadDatabases();
  }, [loadDatabases]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadDatabases();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Actions
  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette base ? Cette action est irréversible.')) return;

    try {
      await api.delete(`/lead-databases/${id}`);
      toast.success('Base supprimée');
      loadDatabases();
      loadStats();
    } catch (err) {
      toast.error('Erreur suppression');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Supprimer ${selectedIds.size} base(s) ? Cette action est irréversible.`)) return;

    try {
      await Promise.all([...selectedIds].map(id => api.delete(`/lead-databases/${id}`)));
      toast.success(`${selectedIds.size} base(s) supprimée(s)`);
      setSelectedIds(new Set());
      setSelectAll(false);
      loadDatabases();
      loadStats();
    } catch (err) {
      toast.error('Erreur suppression');
    }
  };

  const handleExport = async (database) => {
    if (!EXPORTABLE_SOURCES.includes(database.source)) {
      toast.error('Export non autorisé pour cette base');
      return;
    }

    try {
      toast.loading('Export en cours...');
      const response = await api.get(`/export/leads/csv?database_id=${database.id}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${database.name}_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success('Export téléchargé');
    } catch (err) {
      toast.dismiss();
      toast.error('Erreur export');
    }
  };

  // Sélection
  const toggleSelect = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(databases.map(d => d.id)));
    }
    setSelectAll(!selectAll);
  };

  const canExport = (database) => EXPORTABLE_SOURCES.includes(database.source);

  const formatDate = (date) => new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bases de Données</h1>
            <p className="text-sm text-gray-600">
              {pagination?.total?.toLocaleString() || 0} bases au total
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle vue */}
            <div className="flex bg-white rounded-lg border p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded ${viewMode === 'table' ? 'bg-purple-100 text-purple-700' : 'text-gray-500'}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2 rounded ${viewMode === 'cards' ? 'bg-purple-100 text-purple-700' : 'text-gray-500'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => { loadDatabases(); loadStats(); }}
              className="p-2 bg-white border rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-5 gap-3 mb-4">
            <div className="bg-white rounded-lg p-4 border shadow-sm">
              <div className="flex items-center gap-2 text-purple-600 mb-1">
                <Database className="w-4 h-4" />
                <span className="text-xs font-medium">Bases</span>
              </div>
              <p className="text-2xl font-bold">{parseInt(stats.total_databases).toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border shadow-sm">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-medium">Leads</span>
              </div>
              <p className="text-2xl font-bold">{parseInt(stats.total_leads).toLocaleString()}</p>
            </div>
            {isSuperAdmin && (
              <div className="bg-white rounded-lg p-4 border shadow-sm">
                <div className="flex items-center gap-2 text-green-600 mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-xs font-medium">Tenants</span>
                </div>
                <p className="text-2xl font-bold">{parseInt(stats.total_tenants).toLocaleString()}</p>
              </div>
            )}
            <div className="bg-white rounded-lg p-4 border shadow-sm">
              <div className="flex items-center gap-2 text-orange-600 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-medium">Cette semaine</span>
              </div>
              <p className="text-2xl font-bold">+{parseInt(stats.this_week).toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border shadow-sm">
              <div className="flex items-center gap-2 text-pink-600 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-medium">Ce mois</span>
              </div>
              <p className="text-2xl font-bold">+{parseInt(stats.this_month).toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Filtres */}
        <div className="bg-white rounded-lg border p-3 mb-4 flex items-center gap-3 flex-wrap">
          {/* Recherche */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          {/* Source */}
          <select
            value={sourceFilter}
            onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="all">Toutes sources</option>
            <option value="import_csv">CSV</option>
            <option value="ai_generation">IA</option>
            <option value="google_maps">Google Maps</option>
            <option value="api_gouv">API Gouv</option>
            <option value="sirene">Sirene</option>
            <option value="manual">Manuel</option>
          </select>

          {/* Tenant (super admin) */}
          {isSuperAdmin && tenants.length > 0 && (
            <select
              value={tenantFilter}
              onChange={(e) => { setTenantFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">Tous les tenants</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}

          {/* Limite */}
          <select
            value={limit}
            onChange={(e) => { setLimit(parseInt(e.target.value)); setPage(1); }}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="25">25/page</option>
            <option value="50">50/page</option>
            <option value="100">100/page</option>
          </select>

          {/* Actions bulk */}
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
            >
              Supprimer ({selectedIds.size})
            </button>
          )}
        </div>

        {/* Contenu */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : viewMode === 'table' ? (
          /* Vue Tableau */
          <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="w-10 p-3">
                    <button onClick={toggleSelectAll} className="text-gray-500 hover:text-gray-700">
                      {selectAll ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="text-left p-3 font-semibold text-gray-700">Nom</th>
                  {isSuperAdmin && <th className="text-left p-3 font-semibold text-gray-700">Tenant</th>}
                  <th className="text-left p-3 font-semibold text-gray-700">Source</th>
                  <th className="text-right p-3 font-semibold text-gray-700">Leads</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Date</th>
                  <th className="text-right p-3 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {databases.map(db => {
                  const sourceInfo = SOURCE_LABELS[db.source] || SOURCE_LABELS.manual;
                  const isSelected = selectedIds.has(db.id);

                  return (
                    <tr key={db.id} className={`hover:bg-gray-50 ${isSelected ? 'bg-purple-50' : ''}`}>
                      <td className="p-3">
                        <button onClick={() => toggleSelect(db.id)} className="text-gray-500 hover:text-gray-700">
                          {isSelected ? <CheckSquare className="w-4 h-4 text-purple-600" /> : <Square className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-gray-900 truncate max-w-xs" title={db.name}>
                          {db.name}
                        </div>
                        {db.description && (
                          <div className="text-xs text-gray-500 truncate max-w-xs">{db.description}</div>
                        )}
                      </td>
                      {isSuperAdmin && (
                        <td className="p-3 text-gray-600">{db.tenant_name || '-'}</td>
                      )}
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${sourceInfo.color}`}>
                          {sourceInfo.icon} {sourceInfo.label}
                        </span>
                      </td>
                      <td className="p-3 text-right font-medium text-gray-900">
                        {parseInt(db.lead_count || 0).toLocaleString()}
                      </td>
                      <td className="p-3 text-gray-600">
                        {formatDate(db.created_at)}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => navigate(`/DatabaseDetails?id=${db.id}`)}
                            className="p-1.5 hover:bg-blue-100 text-blue-600 rounded"
                            title="Voir"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canExport(db) ? (
                            <button
                              onClick={() => handleExport(db)}
                              className="p-1.5 hover:bg-green-100 text-green-600 rounded"
                              title="Exporter"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              disabled
                              className="p-1.5 text-gray-300 cursor-not-allowed"
                              title="Export non autorisé"
                            >
                              <Lock className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(db.id)}
                            className="p-1.5 hover:bg-red-100 text-red-600 rounded"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {databases.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                Aucune base trouvée
              </div>
            )}
          </div>
        ) : (
          /* Vue Cartes (existante simplifiée) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {databases.map(db => {
              const sourceInfo = SOURCE_LABELS[db.source] || SOURCE_LABELS.manual;
              return (
                <div key={db.id} className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 truncate flex-1">{db.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded ${sourceInfo.color}`}>
                      {sourceInfo.icon}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-purple-600 mb-2">
                    {parseInt(db.lead_count || 0).toLocaleString()} leads
                  </p>
                  <p className="text-xs text-gray-500 mb-3">{formatDate(db.created_at)}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/DatabaseDetails?id=${db.id}`)}
                      className="flex-1 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                    >
                      Voir
                    </button>
                    <button
                      onClick={() => handleDelete(db.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div className="flex items-center justify-between mt-4 bg-white rounded-lg border p-3">
            <div className="text-sm text-gray-600">
              Page {pagination.page} sur {pagination.total_pages} ({pagination.total.toLocaleString()} résultats)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={!pagination.has_prev}
                className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Pages rapides */}
              {[...Array(Math.min(5, pagination.total_pages))].map((_, i) => {
                let pageNum;
                if (pagination.total_pages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= pagination.total_pages - 2) {
                  pageNum = pagination.total_pages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-1 rounded text-sm ${
                      pageNum === page
                        ? 'bg-purple-600 text-white'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setPage(p => Math.min(pagination.total_pages, p + 1))}
                disabled={!pagination.has_next}
                className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
