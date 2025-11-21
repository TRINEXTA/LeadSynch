import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  Filter,
  Download,
  Mail,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  DollarSign,
  Calendar,
  RefreshCw
} from 'lucide-react';
import api from '../api/axios';

export default function SuperAdminInvoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({
    total_billed: 0,
    total_paid: 0,
    total_pending: 0,
    total_overdue: 0,
    count_paid: 0,
    count_pending: 0,
    count_overdue: 0
  });

  useEffect(() => {
    loadInvoices();
    loadStats();
  }, [statusFilter]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await api.get(`/super-admin/invoices?${params.toString()}`);
      setInvoices(response.data.invoices || []);
    } catch (error) {
      console.error('Erreur chargement factures:', error);
      alert('Erreur lors du chargement des factures');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/super-admin/invoices/stats');
      setStats(response.data.stats || {});
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  const handleMarkAsPaid = async (invoiceId) => {
    if (!confirm('Marquer cette facture comme payée ?')) return;

    try {
      await api.post(`/super-admin/invoices/${invoiceId}/mark-paid`);
      alert('Facture marquée comme payée');
      loadInvoices();
      loadStats();
    } catch (error) {
      console.error('Erreur marquage paiement:', error);
      alert('Erreur lors du marquage comme payée');
    }
  };

  const handleSendReminder = async (invoiceId) => {
    if (!confirm('Envoyer un rappel de paiement au client ?')) return;

    try {
      await api.post(`/super-admin/invoices/${invoiceId}/send-reminder`);
      alert('Rappel envoyé avec succès');
    } catch (error) {
      console.error('Erreur envoi rappel:', error);
      alert('Erreur lors de l\'envoi du rappel');
    }
  };

  const handleDownloadPDF = async (invoiceId, invoiceNumber) => {
    try {
      const response = await api.get(`/super-admin/invoices/${invoiceId}/pdf`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Facture_${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Erreur téléchargement PDF:', error);
      alert('Erreur lors du téléchargement du PDF');
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch =
      invoice.tenant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.tenant_email?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const getStatusBadge = (status) => {
    const badges = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-blue-100 text-blue-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    const icons = {
      paid: <CheckCircle className="w-4 h-4" />,
      pending: <Clock className="w-4 h-4" />,
      overdue: <AlertTriangle className="w-4 h-4" />,
      cancelled: <XCircle className="w-4 h-4" />
    };
    return icons[status] || <Clock className="w-4 h-4" />;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const isOverdue = (dueDate, status) => {
    if (status === 'paid' || status === 'cancelled') return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-800 to-indigo-800 border-b border-purple-700">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                📄 Factures & Paiements
              </h1>
              <p className="text-purple-200">
                Gérer toutes les factures et paiements LeadSynch
              </p>
            </div>
            <button
              onClick={loadInvoices}
              className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-xl font-semibold hover:from-yellow-600 hover:to-yellow-700 transition-all shadow-lg flex items-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Actualiser
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 opacity-80" />
              <FileText className="w-5 h-5 opacity-60" />
            </div>
            <div className="text-3xl font-bold mb-1">{formatCurrency(stats.total_billed)}</div>
            <div className="text-purple-100 text-sm">Total Facturé</div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 opacity-80" />
              <span className="text-2xl font-bold opacity-60">{stats.count_paid}</span>
            </div>
            <div className="text-3xl font-bold mb-1">{formatCurrency(stats.total_paid)}</div>
            <div className="text-green-100 text-sm">Payé</div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 opacity-80" />
              <span className="text-2xl font-bold opacity-60">{stats.count_pending}</span>
            </div>
            <div className="text-3xl font-bold mb-1">{formatCurrency(stats.total_pending)}</div>
            <div className="text-blue-100 text-sm">En Attente</div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-8 h-8 opacity-80" />
              <span className="text-2xl font-bold opacity-60">{stats.count_overdue}</span>
            </div>
            <div className="text-3xl font-bold mb-1">{formatCurrency(stats.total_overdue)}</div>
            <div className="text-red-100 text-sm">En Retard</div>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6 border border-purple-400/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-300" />
              <input
                type="text"
                placeholder="Rechercher une facture, client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-purple-400/30 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>

            {/* Filtre statut */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-300" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-purple-400/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 appearance-none"
              >
                <option value="all" className="bg-purple-900">Tous les statuts</option>
                <option value="pending" className="bg-purple-900">En attente</option>
                <option value="paid" className="bg-purple-900">Payées</option>
                <option value="overdue" className="bg-purple-900">En retard</option>
                <option value="cancelled" className="bg-purple-900">Annulées</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table des factures */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-purple-400/30 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-purple-200">
              <RefreshCw className="w-12 h-12 mx-auto mb-4 animate-spin" />
              <p>Chargement des factures...</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-12 text-center text-purple-200">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-40" />
              <p className="text-lg">Aucune facture trouvée</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-purple-800/50 border-b border-purple-400/30">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-purple-200">N° Facture</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-purple-200">Client</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-purple-200">Montant</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-purple-200">Date Émission</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-purple-200">Date Échéance</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-purple-200">Statut</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-purple-200">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-400/20">
                  {filteredInvoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className={`hover:bg-white/5 transition-colors ${
                        isOverdue(invoice.due_date, invoice.status) ? 'bg-red-500/10' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-purple-300" />
                          <span className="text-white font-mono font-semibold">{invoice.invoice_number}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-white font-medium">{invoice.tenant_name}</div>
                        <div className="text-purple-300 text-sm">{invoice.tenant_email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-white font-bold text-lg">{formatCurrency(invoice.amount)}</div>
                        <div className="text-purple-300 text-xs">{invoice.plan_name}</div>
                      </td>
                      <td className="px-6 py-4 text-purple-200 text-sm">
                        {formatDate(invoice.issue_date)}
                      </td>
                      <td className="px-6 py-4">
                        <div className={`text-sm ${isOverdue(invoice.due_date, invoice.status) ? 'text-red-300 font-semibold' : 'text-purple-200'}`}>
                          {formatDate(invoice.due_date)}
                          {isOverdue(invoice.due_date, invoice.status) && (
                            <div className="text-xs text-red-400 mt-1">⚠️ En retard</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(invoice.status)}`}>
                          {getStatusIcon(invoice.status)}
                          {invoice.status === 'paid' && 'Payée'}
                          {invoice.status === 'pending' && 'En attente'}
                          {invoice.status === 'overdue' && 'En retard'}
                          {invoice.status === 'cancelled' && 'Annulée'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDownloadPDF(invoice.id, invoice.invoice_number)}
                            className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-colors"
                            title="Télécharger PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                            <>
                              <button
                                onClick={() => handleSendReminder(invoice.id)}
                                className="p-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 rounded-lg transition-colors"
                                title="Envoyer rappel"
                              >
                                <Mail className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleMarkAsPaid(invoice.id)}
                                className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg transition-colors"
                                title="Marquer comme payée"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
