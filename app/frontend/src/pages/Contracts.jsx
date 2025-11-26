import React, { useState, useEffect } from 'react';
import { FileCheck, Download, Mail, Eye, Trash2, Search, CheckCircle, Clock, Send, XCircle, Loader2, Sparkles, RefreshCw, Shield, PenTool } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const STATUS_CONFIG = {
  draft: { label: 'Brouillon', color: 'gray', icon: Clock },
  pending_validation: { label: 'En attente validation', color: 'amber', icon: Shield },
  sent: { label: 'Envoyé', color: 'blue', icon: Send },
  signed: { label: 'Signé', color: 'green', icon: PenTool },
  cancelled: { label: 'Annulé', color: 'red', icon: XCircle },
  expired: { label: 'Expiré', color: 'orange', icon: Clock }
};

const TABS = [
  { id: 'all', label: 'Tous' },
  { id: 'draft', label: 'Brouillons' },
  { id: 'pending_validation', label: 'En validation' },
  { id: 'sent', label: 'Envoyés' },
  { id: 'signed', label: 'Signés' }
];

export default function Contracts() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [downloading, setDownloading] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(null);
  const [validating, setValidating] = useState(null);

  const isManager = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'super_admin';
  const canValidate = isManager;

  useEffect(() => {
    loadContracts();
  }, [activeTab]);

  const loadContracts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'all') {
        params.append('status', activeTab);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await api.get(`/contracts?${params.toString()}`);
      setContracts(response.data.contracts || []);
    } catch (error) {
      console.error('Error loading contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (contractId) => {
    setDownloading(contractId);
    try {
      const response = await api.get(`/contracts/${contractId}?action=pdf`);

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
        link.download = response.data.filename || `contrat-${contractId}.pdf`;
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

  const handleValidate = async (contract) => {
    if (!canValidate) return;

    setValidating(contract.id);
    try {
      await api.put(`/contracts/${contract.id}`, { status: 'draft' });

      // Create task for commercial to send
      try {
        await api.post('/tasks', {
          title: `Contrat validé: ${contract.company_name || contract.offer_name}`,
          description: `Le contrat ${contract.reference} a été validé. Vous pouvez maintenant l'envoyer pour signature.`,
          type: 'contract_ready',
          priority: 'high',
          related_to: 'contract',
          related_id: contract.id,
          assigned_to: contract.created_by
        });
      } catch (e) {
        console.warn('Could not create task');
      }

      alert('Contrat validé avec succès !');
      loadContracts();
    } catch (error) {
      console.error('Error:', error);
      alert('Erreur lors de la validation');
    } finally {
      setValidating(null);
    }
  };

  const handleSendForSignature = async (contract) => {
    setSendingEmail(contract.id);
    try {
      // Download PDF first
      await handleDownloadPDF(contract.id);

      // Generate email with Asefi
      let emailBody = '';
      let emailSubject = `Contrat ${contract.reference} - ${contract.company_name || 'Signature requise'}`;

      try {
        const asefiResponse = await api.post('/asefi', {
          prompt: `Génère un email professionnel court pour accompagner l'envoi d'un contrat à signer.

Entreprise destinataire: ${contract.company_name || 'Client'}
Référence contrat: ${contract.reference}
Offre: ${contract.offer_name}
Montant mensuel HT: ${parseFloat(contract.monthly_price || 0).toFixed(2)}€

L'email doit:
- Être professionnel et chaleureux
- Mentionner le contrat en pièce jointe
- Expliquer brièvement le processus de signature
- Inviter à prendre contact pour toute question
- Être signé "L'équipe Trinexta"

Réponds uniquement avec le corps de l'email.`
        });

        if (asefiResponse.data.content) {
          emailBody = asefiResponse.data.content;
        }
      } catch (asefiError) {
        emailBody = `Bonjour,

Veuillez trouver ci-joint votre contrat ${contract.reference} pour l'${contract.offer_name}.

Montant: ${parseFloat(contract.monthly_price || 0).toFixed(2)}€ HT/mois

Merci de bien vouloir le signer et nous le retourner.

Cordialement,
L'équipe Trinexta`;
      }

      // Open mailto
      const mailtoLink = `mailto:${contract.lead_email || ''}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
      window.location.href = mailtoLink;

      // Update status
      await api.put(`/contracts/${contract.id}`, { status: 'sent' });
      loadContracts();

    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSendingEmail(null);
    }
  };

  const handleDelete = async (contractId) => {
    if (!confirm('Supprimer ce contrat ?')) return;

    try {
      await api.delete(`/contracts/${contractId}`);
      loadContracts();
    } catch (error) {
      console.error('Error:', error);
      alert(error.response?.data?.error || 'Erreur lors de la suppression');
    }
  };

  const filteredContracts = contracts.filter(c => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      c.reference?.toLowerCase().includes(search) ||
      c.company_name?.toLowerCase().includes(search) ||
      c.offer_name?.toLowerCase().includes(search)
    );
  });

  const getStatusStats = () => {
    return {
      all: contracts.length,
      draft: contracts.filter(c => c.status === 'draft').length,
      pending_validation: contracts.filter(c => c.status === 'pending_validation').length,
      sent: contracts.filter(c => c.status === 'sent').length,
      signed: contracts.filter(c => c.status === 'signed').length
    };
  };

  const stats = getStatusStats();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contrats</h1>
          <p className="text-gray-600 mt-1">
            {isManager ? 'Gérez tous les contrats de votre équipe' : 'Gérez vos contrats'}
          </p>
        </div>
        <button
          onClick={loadContracts}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-all flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      {/* Stats Tabs */}
      <div className="grid grid-cols-5 gap-4">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`p-4 rounded-xl border-2 transition-all ${
              activeTab === tab.id
                ? 'border-orange-500 bg-orange-50'
                : 'border-gray-200 hover:border-orange-300 bg-white'
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
              placeholder="Rechercher par référence, entreprise ou offre..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Contracts List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-orange-600" />
            <p className="text-gray-600 mt-2">Chargement...</p>
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="p-8 text-center">
            <FileCheck className="w-12 h-12 mx-auto text-gray-400" />
            <p className="text-gray-600 mt-2">Aucun contrat trouvé</p>
            <p className="text-sm text-gray-500 mt-1">
              Créez un contrat depuis le Pipeline ou convertissez un devis accepté
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Référence</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Offre</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Montant</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredContracts.map(contract => {
                const statusConfig = STATUS_CONFIG[contract.status] || STATUS_CONFIG.draft;
                const StatusIcon = statusConfig.icon;
                const canSend = (contract.status === 'draft' && isManager) || (contract.status === 'draft' && contract.created_by === user?.id);

                return (
                  <tr key={contract.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-mono font-semibold text-orange-600">
                        {contract.reference}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{contract.company_name || '-'}</p>
                      <p className="text-sm text-gray-500">{contract.lead_email || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{contract.offer_name}</p>
                      <p className="text-sm text-gray-500">
                        {contract.contract_type === 'avec_engagement_12' ? '12 mois' : 'Sans engagement'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-900">
                        {parseFloat(contract.monthly_price || 0).toFixed(2)} €/mois
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-${statusConfig.color}-100 text-${statusConfig.color}-700`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(contract.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {/* Download PDF */}
                        <button
                          onClick={() => handleDownloadPDF(contract.id)}
                          disabled={downloading === contract.id}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Télécharger PDF"
                        >
                          {downloading === contract.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>

                        {/* Validate (managers only for pending_validation) */}
                        {contract.status === 'pending_validation' && canValidate && (
                          <button
                            onClick={() => handleValidate(contract)}
                            disabled={validating === contract.id}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                            title="Valider le contrat"
                          >
                            {validating === contract.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </button>
                        )}

                        {/* Send for signature */}
                        {canSend && (
                          <button
                            onClick={() => handleSendForSignature(contract)}
                            disabled={sendingEmail === contract.id}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                            title="Envoyer pour signature"
                          >
                            {sendingEmail === contract.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Mail className="w-4 h-4" />
                            )}
                          </button>
                        )}

                        {/* View signed */}
                        {contract.status === 'signed' && (
                          <button
                            onClick={() => handleDownloadPDF(contract.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                            title="Voir contrat signé"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}

                        {/* Delete (only drafts) */}
                        {contract.status === 'draft' && (
                          <button
                            onClick={() => handleDelete(contract.id)}
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
