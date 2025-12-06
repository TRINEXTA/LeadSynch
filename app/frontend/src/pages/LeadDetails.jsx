<<<<<<< HEAD
import { log, error, warn } from "./../lib/logger.js";
=======
import { log, error, warn } from "../lib/logger.js";
>>>>>>> origin/main
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building, Mail, Phone, MapPin, Globe, Calendar, User, Tag, DollarSign, BarChart3, History, FileText, MessageSquare } from 'lucide-react';
import api from '../api/axios';

export default function LeadDetails() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const leadId = searchParams.get('id');

  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    if (leadId) {
      loadLeadDetails();
      loadHistory();
      loadTasks();
    }
  }, [leadId]);

  const loadLeadDetails = async () => {
    try {
      const response = await api.get(`/leads/${leadId}`);
      setLead(response.data.lead);
      setLoading(false);
    } catch (error) {
      error('Erreur chargement lead:', error);
      // Si 404, le lead n'existe pas/plus
      if (error.response?.status === 404) {
        setLead(null);
      }
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await api.get(`/pipeline-leads/${leadId}/history`);
      setHistory(response.data.history || []);
    } catch (error) {
      error('Erreur chargement historique:', error);
    }
  };

  const loadTasks = async () => {
    try {
      const response = await api.get(`/follow-ups?lead_id=${leadId}`);
      setTasks(response.data.followups || []);
    } catch (error) {
      error('Erreur chargement tâches:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600"></div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-2xl mx-auto mt-12">
          <div className="mb-4">
            <Building className="w-16 h-16 text-red-400 mx-auto mb-3" />
            <p className="text-red-700 font-bold text-xl mb-2">Lead introuvable</p>
            <p className="text-red-600 text-sm">
              Le lead avec l'ID <code className="bg-red-100 px-2 py-1 rounded">{leadId}</code> n'existe pas ou a été supprimé.
            </p>
          </div>
          <div className="flex gap-3 justify-center mt-6">
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-semibold"
            >
              <ArrowLeft className="w-4 h-4 inline mr-2" />
              Retour
            </button>
            <button
              onClick={() => navigate('/pipeline')}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all font-semibold"
            >
              Voir le Pipeline
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/pipeline')}
          className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-semibold mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour au Pipeline
        </button>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{lead.company_name}</h1>
              {lead.contact_name && (
                <p className="text-xl text-gray-600 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  {lead.contact_name}
                </p>
              )}
            </div>
            {lead.score && (
              <div className="bg-yellow-100 text-yellow-800 px-6 py-3 rounded-xl">
                <p className="text-sm font-semibold">Score</p>
                <p className="text-3xl font-bold">{lead.score}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche - Informations principales */}
        <div className="lg:col-span-2 space-y-6">
          {/* Coordonnées */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Building className="w-6 h-6 text-purple-600" />
              Coordonnées
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lead.email && (
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-blue-600 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline font-semibold">
                      {lead.email}
                    </a>
                  </div>
                </div>
              )}

              {lead.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-green-600 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Téléphone</p>
                    <a href={`tel:${lead.phone}`} className="text-green-600 hover:underline font-semibold">
                      {lead.phone}
                    </a>
                  </div>
                </div>
              )}

              {lead.city && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-red-600 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Ville</p>
                    <p className="font-semibold">{lead.city}</p>
                  </div>
                </div>
              )}

              {lead.website && (
                <div className="flex items-start gap-3">
                  <Globe className="w-5 h-5 text-purple-600 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Site Web</p>
                    <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline font-semibold">
                      {lead.website}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Informations commerciales */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-purple-600" />
              Informations Commerciales
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {lead.sector && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Tag className="w-4 h-4 text-blue-600" />
                    <p className="text-sm text-blue-600 font-semibold">Secteur</p>
                  </div>
                  <p className="font-bold text-gray-900">{lead.sector}</p>
                </div>
              )}

              {lead.status && (
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="w-4 h-4 text-green-600" />
                    <p className="text-sm text-green-600 font-semibold">Statut</p>
                  </div>
                  <p className="font-bold text-gray-900">{lead.status}</p>
                </div>
              )}

              {lead.deal_value && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4 text-purple-600" />
                    <p className="text-sm text-purple-600 font-semibold">Valeur</p>
                  </div>
                  <p className="font-bold text-gray-900">{lead.deal_value.toLocaleString()}€</p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {lead.notes && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-purple-600" />
                Notes
              </h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 whitespace-pre-wrap">{lead.notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Colonne droite - Historique & Tâches */}
        <div className="space-y-6">
          {/* Tâches */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FileText className="w-6 h-6 text-purple-600" />
              Tâches ({tasks.length})
            </h2>
            {tasks.length === 0 ? (
              <p className="text-gray-500 text-sm">Aucune tâche</p>
            ) : (
              <div className="space-y-3">
                {tasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="bg-gray-50 rounded-lg p-3 border-l-4 border-purple-600">
                    <p className="font-semibold text-sm">{task.title}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(task.scheduled_date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Historique */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <History className="w-6 h-6 text-purple-600" />
              Historique ({history.length})
            </h2>
            {history.length === 0 ? (
              <p className="text-gray-500 text-sm">Aucun historique</p>
            ) : (
              <div className="space-y-3">
                {history.slice(0, 10).map((item, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-gray-600" />
                      <p className="text-xs text-gray-500">
                        {new Date(item.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">{item.action_type}</p>
                    {item.notes && <p className="text-xs text-gray-600 mt-1">{item.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
