import React, { useState, useEffect } from 'react';
import { X, Clock, Mail, Phone, FileText, User } from 'lucide-react';
import api from '../../api/axios';

export default function HistoryModal({ lead, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [lead.id]);

  const loadHistory = async () => {
    try {
      const response = await api.get(`/pipeline-leads/${lead.id}/history`);
      setHistory(response.data.history || []);
      setLoading(false);
    } catch (error) {
      console.error('❌ Erreur chargement historique:', error);
      setLoading(false);
    }
  };

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'call': return <Phone className="w-5 h-5 text-green-600" />;
      case 'email': return <Mail className="w-5 h-5 text-blue-600" />;
      case 'qualification': return <FileText className="w-5 h-5 text-purple-600" />;
      default: return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getActionLabel = (actionType) => {
    switch (actionType) {
      case 'call': return '📞 Appel';
      case 'email': return '📧 Email';
      case 'qualification': return '📋 Qualification';
      default: return '📝 Action';
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6" />
            <div>
              <h2 className="text-2xl font-bold">Historique des actions</h2>
              <p className="text-purple-100 text-sm mt-1">{lead.company_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement de l'historique...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg font-semibold">Aucun historique</p>
              <p className="text-gray-500 text-sm mt-2">Les actions sur ce lead apparaîtront ici</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item, index) => (
                <div key={index} className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200 hover:border-purple-300 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{getActionIcon(item.action_type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-gray-900">{getActionLabel(item.action_type)}</h3>
                        <span className="text-xs text-gray-500">{formatDate(item.created_at)}</span>
                      </div>
                      
                      {item.author_name && (
                        <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                          <User className="w-4 h-4" />
                          <span>{item.author_name}</span>
                        </div>
                      )}

                      {item.stage_before && item.stage_after && (
                        <div className="text-sm text-gray-700 mb-2">
                          <span className="font-semibold">Stage:</span> {item.stage_before} → {item.stage_after}
                        </div>
                      )}

                      {item.qualification && (
                        <div className="text-sm mb-2">
                          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded font-semibold text-xs">
                            {item.qualification}
                          </span>
                        </div>
                      )}

                      {item.notes && (
                        <div className="bg-white rounded-lg p-3 mt-2 border border-gray-200">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.notes}</p>
                        </div>
                      )}

                      {item.call_duration && (
                        <div className="text-xs text-gray-500 mt-2">
                          ⏱️ Durée: {Math.floor(item.call_duration / 60)}min {item.call_duration % 60}s
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}