import React, { useState } from 'react';
import { Mail, Phone, FileText, FileCheck, FileSignature, DollarSign, Calendar, User, MoreVertical, Eye, Clock, Edit, History, AlertCircle, UserCheck, Star, Ban } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const STAGE_CONFIG = {
  cold_call: { name: 'Cold Call', color: 'bg-blue-500', textColor: 'text-blue-700', bgLight: 'bg-blue-50' },
  nrp: { name: 'NRP', color: 'bg-gray-500', textColor: 'text-gray-700', bgLight: 'bg-gray-50' },
  qualifie: { name: 'Qualifié', color: 'bg-blue-600', textColor: 'text-blue-700', bgLight: 'bg-blue-50' },
  relancer: { name: 'À Relancer', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgLight: 'bg-yellow-50' },
  tres_qualifie: { name: 'Très Qualifié', color: 'bg-green-500', textColor: 'text-green-700', bgLight: 'bg-green-50' },
  proposition: { name: 'Proposition', color: 'bg-purple-500', textColor: 'text-purple-700', bgLight: 'bg-purple-50' },
  gagne: { name: 'Gagné', color: 'bg-emerald-600', textColor: 'text-emerald-700', bgLight: 'bg-emerald-50' },
  hors_scope: { name: 'Hors Scope', color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50' }
};

const PROPOSAL_STATUS = {
  not_sent: { label: 'Non envoyé', color: 'text-gray-400', icon: '⚪', bg: 'bg-gray-50' },
  sent: { label: 'Envoyé', color: 'text-blue-600', icon: '📤', bg: 'bg-blue-50' },
  viewed: { label: 'Vu', color: 'text-purple-600', icon: '👁️', bg: 'bg-purple-50' },
  accepted: { label: 'Accepté', color: 'text-green-600', icon: '✅', bg: 'bg-green-50' },
  rejected: { label: 'Refusé', color: 'text-red-600', icon: '❌', bg: 'bg-red-50' }
};

const CONTRACT_STATUS = {
  not_sent: { label: 'Non envoyé', color: 'text-gray-400', icon: '⚪', bg: 'bg-gray-50' },
  sent: { label: 'Envoyé', color: 'text-blue-600', icon: '📤', bg: 'bg-blue-50' },
  signed: { label: 'Signé', color: 'text-green-600', icon: '✅', bg: 'bg-green-50' },
  rejected: { label: 'Refusé', color: 'text-red-600', icon: '❌', bg: 'bg-red-50' }
};

export default function LeadCard({ lead, onEmailClick, onCallClick, onProposalClick, onContractClick, onEditClick, onViewHistory, onManagerHelp, onManagerValidation, onProspectShow, onDoNotContact }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const proposalStatus = PROPOSAL_STATUS[lead.proposal_status] || PROPOSAL_STATUS.not_sent;
  const contractStatus = CONTRACT_STATUS[lead.contract_status] || CONTRACT_STATUS.not_sent;
  const stageConfig = STAGE_CONFIG[lead.stage] || STAGE_CONFIG.cold_call;

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  const handleViewDetails = () => {
    navigate(`/LeadDetails?id=${lead.lead_id}`);
  };

  return (
    <div 
      className={`bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border-l-4 ${stageConfig.color} overflow-hidden ${expanded ? 'ring-2 ring-blue-400' : ''}`}
    >
      {/* Header Compact */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-base mb-1 truncate">
              {lead.company_name || 'Entreprise'}
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <User className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{lead.contact_name || 'Contact inconnu'}</span>
            </div>
            {lead.email && (
              <p className="text-xs text-gray-500 mt-1 truncate">{lead.email}</p>
            )}
          </div>
          
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              title={expanded ? 'Réduire' : 'Développer'}
            >
              <Eye className={`w-4 h-4 ${expanded ? 'text-blue-600' : 'text-gray-400'}`} />
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <MoreVertical className="w-4 h-4 text-gray-400" />
              </button>
              
              {showActions && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 w-44 z-20">
                    <button
                      onClick={() => { handleViewDetails(); setShowActions(false); }}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm flex items-center gap-2 text-gray-700"
                    >
                      <Eye className="w-4 h-4" />
                      Voir détails
                    </button>
                    <button
                      onClick={() => { onEditClick && onEditClick(lead); setShowActions(false); }}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm flex items-center gap-2 text-gray-700"
                    >
                      <Edit className="w-4 h-4" />
                      Éditer
                    </button>
                    <button
                      onClick={() => { onViewHistory && onViewHistory(lead); setShowActions(false); }}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm flex items-center gap-2 text-gray-700"
                    >
                      <History className="w-4 h-4" />
                      Historique
                    </button>
                    <div className="border-t border-gray-200 my-1"></div>
                    <button
                      onClick={() => { onDoNotContact && onDoNotContact(lead); setShowActions(false); }}
                      className="w-full px-3 py-2 text-left hover:bg-red-50 text-sm flex items-center gap-2 text-red-600 font-semibold"
                    >
                      <Ban className="w-4 h-4" />
                      Ne pas contacter
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats Mini */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-2 text-center border border-green-100">
            <p className="text-xs text-green-600 font-semibold mb-0.5">💰 Valeur</p>
            <p className="text-sm font-bold text-green-700">
              {lead.deal_value ? `${lead.deal_value.toLocaleString()}€` : '-'}
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-2 text-center border border-blue-100">
            <p className="text-xs text-blue-600 font-semibold mb-0.5">📧 Emails</p>
            <p className="text-sm font-bold text-blue-700">{lead.emails_sent || 0}</p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-2 text-center border border-purple-100">
            <p className="text-xs text-purple-600 font-semibold mb-0.5">📞 Appels</p>
            <p className="text-sm font-bold text-purple-700">{lead.calls_made || 0}</p>
          </div>
        </div>

        {/* Statuts Proposition/Contrat */}
        <div className="space-y-2 mb-3">
          <div className={`flex items-center justify-between ${proposalStatus.bg} rounded-lg p-2 border border-opacity-20`}>
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-gray-600" />
              <span className="text-xs font-semibold text-gray-700">Devis</span>
            </div>
            <span className={`text-xs font-bold ${proposalStatus.color} flex items-center gap-1`}>
              <span>{proposalStatus.icon}</span>
              <span>{proposalStatus.label}</span>
            </span>
          </div>
          
          <div className={`flex items-center justify-between ${contractStatus.bg} rounded-lg p-2 border border-opacity-20`}>
            <div className="flex items-center gap-2">
              <FileCheck className="w-3.5 h-3.5 text-gray-600" />
              <span className="text-xs font-semibold text-gray-700">Contrat</span>
            </div>
            <span className={`text-xs font-bold ${contractStatus.color} flex items-center gap-1`}>
              <span>{contractStatus.icon}</span>
              <span>{contractStatus.label}</span>
            </span>
          </div>
        </div>

        {/* Actions Rapides */}
        <div className="space-y-1.5">
          {/* Rangée 1: Actions commerciales */}
          <div className="grid grid-cols-4 gap-1.5">
            <button
              onClick={() => onEmailClick && onEmailClick(lead)}
              className="flex flex-col items-center justify-center p-2 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-lg transition-all group"
              title="Envoyer email"
            >
              <Mail className="w-4 h-4 text-blue-600 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-blue-700">Email</span>
            </button>

            <button
              onClick={() => onCallClick && onCallClick(lead)}
              className="flex flex-col items-center justify-center p-2 bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-lg transition-all group"
              title="Logger appel"
            >
              <Phone className="w-4 h-4 text-green-600 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-green-700">Appel</span>
            </button>

            <button
              onClick={() => onProposalClick && onProposalClick(lead)}
              className="flex flex-col items-center justify-center p-2 bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-lg transition-all group"
              title="Créer devis"
            >
              <FileText className="w-4 h-4 text-purple-600 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-purple-700">Devis</span>
            </button>

            <button
              onClick={() => onContractClick && onContractClick(lead)}
              className="flex flex-col items-center justify-center p-2 bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 rounded-lg transition-all group"
              title="Créer contrat"
            >
              <FileCheck className="w-4 h-4 text-orange-600 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-orange-700">Contrat</span>
            </button>
          </div>

          {/* Rangée 2: Actions Manager */}
          <div className="grid grid-cols-4 gap-1.5">
            <button
              onClick={() => onManagerHelp && onManagerHelp(lead)}
              className="flex flex-col items-center justify-center p-2 bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 rounded-lg transition-all group border border-orange-200"
              title="Demander aide manager"
            >
              <AlertCircle className="w-4 h-4 text-orange-600 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-orange-700">Aide</span>
            </button>

            <button
              onClick={() => onManagerValidation && onManagerValidation(lead)}
              className="flex flex-col items-center justify-center p-2 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-lg transition-all group border border-blue-200"
              title="Demander validation manager"
            >
              <UserCheck className="w-4 h-4 text-blue-600 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-blue-700">Valid.</span>
            </button>

            <button
              onClick={() => onProspectShow && onProspectShow(lead)}
              className="flex flex-col items-center justify-center p-2 bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-lg transition-all group border border-purple-200"
              title="Marquer comme prioritaire"
            >
              <Star className="w-4 h-4 text-purple-600 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-purple-700">Prior.</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewHistory && onViewHistory(lead);
              }}
              className="flex flex-col items-center justify-center p-2 bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 rounded-lg transition-all group"
              title="Voir l'historique"
            >
              <History className="w-4 h-4 text-gray-600 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-gray-700">Histo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section développée */}
      {expanded && (
        <div className="border-t border-gray-200 bg-gradient-to-br from-gray-50 to-blue-50 p-4">
          <h4 className="font-bold text-gray-900 mb-3 text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            Historique détaillé
          </h4>
          
          <div className="space-y-2">
            {lead.last_email_date && (
              <div className="flex items-center gap-2 text-xs bg-white rounded-lg p-2 border border-blue-100">
                <Mail className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="text-gray-600">Dernier email:</span>
                <span className="font-bold text-blue-700">{formatDate(lead.last_email_date)}</span>
              </div>
            )}
            
            {lead.proposal_sent_date && (
              <div className="flex items-center gap-2 text-xs bg-white rounded-lg p-2 border border-purple-100">
                <FileText className="w-4 h-4 text-purple-500 flex-shrink-0" />
                <span className="text-gray-600">Devis envoyé:</span>
                <span className="font-bold text-purple-700">{formatDate(lead.proposal_sent_date)}</span>
              </div>
            )}
            
            {lead.contract_sent_date && (
              <div className="flex items-center gap-2 text-xs bg-white rounded-lg p-2 border border-orange-100">
                <FileCheck className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <span className="text-gray-600">Contrat envoyé:</span>
                <span className="font-bold text-orange-700">{formatDate(lead.contract_sent_date)}</span>
              </div>
            )}
            
            {lead.won_date && (
              <div className="flex items-center gap-2 text-xs bg-white rounded-lg p-2 border border-green-100">
                <Calendar className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-gray-600">Gagné le:</span>
                <span className="font-bold text-green-700">{formatDate(lead.won_date)}</span>
              </div>
            )}
            
            {lead.notes && (
              <div className="bg-white rounded-lg border border-gray-200 p-3 mt-3">
                <p className="text-xs text-gray-600 mb-1 font-bold">📝 Notes:</p>
                <p className="text-xs text-gray-700 leading-relaxed">{lead.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}