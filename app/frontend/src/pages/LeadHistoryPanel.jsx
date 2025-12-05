<<<<<<< HEAD
import { log, error, warn } from "./../lib/logger.js";
=======
import { log, error, warn } from "../lib/logger.js";
>>>>>>> origin/main
import React, { useState, useEffect } from 'react';
import { Phone, Mail, MessageSquare, TrendingUp, Clock, User, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../api/axios';

const ACTION_ICONS = {
  qualification: { icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
  call: { icon: Phone, color: 'text-green-600', bg: 'bg-green-50' },
  email: { icon: Mail, color: 'text-purple-600', bg: 'bg-purple-50' },
  note: { icon: MessageSquare, color: 'text-gray-600', bg: 'bg-gray-50' }
};

const STAGE_LABELS = {
  cold_call: 'Cold Call',
  leads_click: 'Lead Click',
  nrp: 'NRP',
  qualifie: 'Qualifié',
  relancer: 'À Relancer',
  tres_qualifie: 'Très Qualifié/RDV',
  proposition: 'Proposition',
  gagne: 'Gagné',
  hors_scope: 'Hors Scope'
};

export default function LeadHistoryPanel({ pipelineLeadId, leadId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (pipelineLeadId) {
      loadHistory();
    }
  }, [pipelineLeadId]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/pipeline-leads/${pipelineLeadId}/history`);
      setHistory(res.data.history || []);
    } catch (error) {
      error('Erreur chargement historique:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `Il y a ${minutes}min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-100 rounded"></div>
            <div className="h-16 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-purple-600" />
          <h3 className="font-bold text-gray-900">
            Historique des actions
            {history.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({history.length})
              </span>
            )}
          </h3>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </div>

      {/* Content */}
      {expanded && (
        <div className="border-t border-gray-200">
          {history.length === 0 ? (
            <div className="p-6 text-center">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">Aucune action enregistrée</p>
              <p className="text-sm text-gray-400 mt-1">
                Les appels, notes et emails apparaîtront ici
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {history.map((item, index) => {
                const actionConfig = ACTION_ICONS[item.action_type] || ACTION_ICONS.note;
                const Icon = actionConfig.icon;

                return (
                  <div 
                    key={item.id} 
                    className={`p-4 hover:bg-gray-50 transition ${
                      index === 0 ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full ${actionConfig.bg} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${actionConfig.color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Header line */}
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex-1">
                            {/* Action type */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-900">
                                {item.action_type === 'qualification' && 'Qualification'}
                                {item.action_type === 'call' && 'Appel téléphonique'}
                                {item.action_type === 'email' && 'Email envoyé'}
                                {item.action_type === 'note' && 'Note ajoutée'}
                              </span>
                              
                              {/* Stage change badge */}
                              {item.stage_before && item.stage_after && item.stage_before !== item.stage_after && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 rounded-full text-xs font-medium">
                                  {STAGE_LABELS[item.stage_before] || item.stage_before}
                                  <span>→</span>
                                  {STAGE_LABELS[item.stage_after] || item.stage_after}
                                </span>
                              )}

                              {/* Qualification badge */}
                              {item.qualification && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                  {item.qualification}
                                </span>
                              )}
                            </div>

                            {/* Meta info */}
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                              {/* Author */}
                              {item.author_name && (
                                <div className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  <span>{item.author_name}</span>
                                </div>
                              )}
                              
                              {/* Date */}
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{formatDate(item.created_at)}</span>
                              </div>

                              {/* Call duration */}
                              {item.call_duration && (
                                <div className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  <span>{formatDuration(item.call_duration)}</span>
                                </div>
                              )}

                              {/* Deal value */}
                              {item.deal_value && (
                                <span className="font-semibold text-green-600">
                                  {parseFloat(item.deal_value).toLocaleString('fr-FR')}€
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Notes */}
                        {item.notes && (
                          <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                              {item.notes}
                            </p>
                          </div>
                        )}

                        {/* Next action */}
                        {item.next_action && (
                          <div className="mt-2 flex items-center gap-2 text-sm">
                            <span className="text-gray-500">Prochaine action:</span>
                            <span className="text-gray-700 font-medium">{item.next_action}</span>
                          </div>
                        )}

                        {/* Scheduled date */}
                        {item.scheduled_date && (
                          <div className="mt-2 flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-orange-500" />
                            <span className="text-gray-500">Prévu le:</span>
                            <span className="text-orange-600 font-medium">
                              {new Date(item.scheduled_date).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}