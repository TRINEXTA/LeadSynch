import React, { useState, useEffect } from 'react';
import { FileText, Download, Mail, Eye, Trash2, Filter, Search, Plus, CheckCircle, Clock, Send, XCircle, ArrowRight, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const STATUS_CONFIG = {
  draft: { label: 'Brouillon', color: 'gray', icon: Clock },
  sent: { label: 'Envoyé', color: 'blue', icon: Send },
  viewed: { label: 'Consulté', color: 'purple', icon: Eye },
  accepted: { label: 'Accepté', color: 'green', icon: CheckCircle },
  rejected: { label: 'Refusé', color: 'red', icon: XCircle },
  expired: { label: 'Expiré', color: 'orange', icon: Clock }
};

const TABS = [
  { id: 'all', label: 'Toutes les propositions' },
  { id: 'draft', label: 'Brouillons' },
  { id: 'sent', label: 'Envoyées' },
  { id: 'accepted', label: 'Acceptées' }
];

export default function Proposals() {
  const { user } = useAuth();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [downloading, setDownloading] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(null);
  const [converting, setConverting] = useState(null);

  const isManager = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'super_admin';

  useEffect(() => {
    loadProposals();
  }, [activeTab]);

  const loadProposals = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'all') {
        params.append('status', activeTab);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await api.get(`/proposals?${params.toString()}`);
      setProposals(response.data.proposals || []);
    } catch (error) {
      console.error('Error loading proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (proposalId) => {
    setDownloading(proposalId);
    try {
      const response = await api.get(`/proposals/${proposalId}?action=pdf`);

      if (response.data.pdf_base64) {
        const byteCharacters = atob(response.data.pdf_base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = response.data.filename || `proposition-${proposalId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Erreur lors du téléchargement');
    } finally {
      setDownloading(null);
    }
  };

  const handleSendEmail = async (proposal) => {
    setSendingEmail(proposal.id);
    try {
      // Download PDF first
      await handleDownloadPDF(proposal.id);

      // Generate email with Asefi
      let emailBody = '';
      let emailSubject = `Proposition ${proposal.reference} - ${proposal.company_name || 'Client'}`;

      try {
        const asefiResponse = await api.post('/asefi', {
          prompt: `Génère un email professionnel court pour accompagner l'envoi d'une proposition commerciale.

Entreprise destinataire: ${proposal.company_name || 'Client'}
Référence proposition: ${proposal.reference}
Montant HT: ${parseFloat(proposal.total_ht || 0).toFixed(2)}€

L'email doit:
- Être professionnel et chaleureux
- Mentionner la proposition en pièce jointe
- Inviter à prendre contact pour toute question
- Être signé "L'équipe Trinexta"

Réponds uniquement avec le corps de l'email.`
        });

        if (asefiResponse.data.content) {
          emailBody = asefiResponse.data.content;
        }
      } catch (asefiError) {
        emailBody = `Bonjour,

Veuillez trouver ci-joint notre proposition ${proposal.reference}.

Montant total HT: ${parseFloat(proposal.total_ht || 0).toFixed(2)}€

N'hésitez pas à nous contacter pour toute question.

Cordialement,
L'équipe Trinexta`;
      }

      // Open mailto
      const mailtoLink = `mailto:${proposal.lead_email || ''}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
      window.location.href = mailtoLink;

      // Update status
      await api.put(`/proposals/${proposal.id}`, { status: 'sent' });
      loadProposals();

    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSendingEmail(null);
    }
  };

  const handleConvertToContract = async (proposal) => {
    setConverting(proposal.id);
    try {
      // Navigate to pipeline with contract creation from this proposal
      window.location.href = `/pipeline?action=create_contract&proposal_id=${proposal.id}&lead_id=${proposal.lead_id}`;
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setConverting(null);
    }
  };

  const handleDelete = async (proposalId) => {
    if (!confirm('Supprimer cette proposition ?')) return;

    try {
      await api.delete(`/proposals/${proposalId}`);
      loadProposals();
    } catch (error) {
      console.error('Error:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const filteredProposals = proposals.filter(p => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      p.reference?.toLowerCase().includes(search) ||
      p.company_name?.toLowerCase().includes(search)
    );
  });

  const getStatusStats = () => {
    const stats = {
      all: proposals.length,
      draft: proposals.filter(p => p.status === 'draft').length,
      sent: proposals.filter(p => p.status === 'sent' || p.status === 'viewed').length,
      accepted: proposals.filter(p => p.status === 'accepted').length
    };
    return stats;
  };

  const stats = getStatusStats();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mes Propositions</h1>
          <p className="text-gray-600 mt-1">
            {isManager ? 'Gérez toutes les propositions de votre équipe' : 'Gérez vos propositions commerciales'}
          </p>
        </div>
        <button
          onClick={loadProposals}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-all flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`p-4 rounded-xl border-2 transition-all ${
              activeTab === tab.id
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-purple-300 bg-white'
            }`}
          >
            <p className="text-sm text-gray-600">{tab.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats[tab.id]}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par référence ou entreprise..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Proposals List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600" />
            <p className="text-gray-600 mt-2">Chargement...</p>
          </div>
        ) : filteredProposals.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-400" />
            <p className="text-gray-600 mt-2">Aucune proposition trouvée</p>
            <p className="text-sm text-gray-500 mt-1">
              Créez une proposition depuis le Pipeline
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Référence</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Montant HT</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProposals.map(proposal => {
                const statusConfig = STATUS_CONFIG[proposal.status] || STATUS_CONFIG.draft;
                const StatusIcon = statusConfig.icon;

                return (
                  <tr key={proposal.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-mono font-semibold text-purple-600">
                        {proposal.reference}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{proposal.company_name || '-'}</p>
                      <p className="text-sm text-gray-500">{proposal.lead_email || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-900">
                        {parseFloat(proposal.total_ht || 0).toFixed(2)} €
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-${statusConfig.color}-100 text-${statusConfig.color}-700`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(proposal.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {/* Download PDF */}
                        <button
                          onClick={() => handleDownloadPDF(proposal.id)}
                          disabled={downloading === proposal.id}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Télécharger PDF"
                        >
                          {downloading === proposal.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>

                        {/* Send Email */}
                        {(proposal.status === 'draft' || proposal.status === 'sent') && (
                          <button
                            onClick={() => handleSendEmail(proposal)}
                            disabled={sendingEmail === proposal.id}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                            title="Envoyer par email"
                          >
                            {sendingEmail === proposal.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Mail className="w-4 h-4" />
                            )}
                          </button>
                        )}

                        {/* Convert to Contract */}
                        {proposal.status === 'accepted' && (
                          <button
                            onClick={() => handleConvertToContract(proposal)}
                            disabled={converting === proposal.id}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                            title="Générer contrat"
                          >
                            {converting === proposal.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <ArrowRight className="w-4 h-4" />
                            )}
                          </button>
                        )}

                        {/* Delete (only drafts) */}
                        {proposal.status === 'draft' && (
                          <button
                            onClick={() => handleDelete(proposal.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
