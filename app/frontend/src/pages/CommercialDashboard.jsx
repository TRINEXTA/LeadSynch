import { log, error, warn } from "./../lib/logger.js";
import React, { useState, useEffect } from 'react';
import {
  Target, Phone, Mail, CheckCircle, Clock, TrendingUp,
  AlertCircle, Briefcase, Calendar, Award, Users,
  ThumbsUp, ThumbsDown, HelpCircle, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function CommercialDashboard() {
  const [campaigns, setCampaigns] = useState([]);
  const [validationRequests, setValidationRequests] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [todayLeads, setTodayLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
    // Auto-refresh toutes les 5 minutes
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [campaignsRes, validationsRes, followUpsRes, leadsRes, statsRes] = await Promise.all([
        api.get('/campaigns/my-campaigns'),
        api.get('/validation-requests?my_requests=true'),
        api.get('/follow-ups'),
        api.get('/leads/today').catch(() => ({ data: { leads: [] } })),
        api.get('/stats/commercial').catch(() => ({ data: { stats: {} } }))
      ]);

      setCampaigns(campaignsRes.data.campaigns || []);
      setValidationRequests(validationsRes.data.requests || []);
      setFollowUps(followUpsRes.data.followups || []);
      setTodayLeads(leadsRes.data.leads || []);
      setStats(statsRes.data.stats || {});
    } catch (error) {
      error('Erreur chargement dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'En attente', icon: Clock },
      approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approuvé', icon: ThumbsUp },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Refusé', icon: ThumbsDown },
      resolved: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Résolu', icon: CheckCircle }
    };
    return badges[status] || badges.pending;
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      urgent: { bg: 'bg-red-500', text: 'text-white', label: '🔥 Urgent' },
      high: { bg: 'bg-orange-500', text: 'text-white', label: 'Élevée' },
      normal: { bg: 'bg-blue-500', text: 'text-white', label: 'Normale' },
      low: { bg: 'bg-gray-500', text: 'text-white', label: 'Basse' }
    };
    return badges[priority] || badges.normal;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">Chargement de votre espace commercial...</p>
        </div>
      </div>
    );
  }

  // Stats pour validation requests
  const pendingValidations = validationRequests.filter(v => v.status === 'pending').length;
  const approvedValidations = validationRequests.filter(v => v.status === 'approved').length;
  const todayFollowUps = followUps.filter(f => {
    const today = new Date().toISOString().split('T')[0];
    const scheduledDate = new Date(f.scheduled_date).toISOString().split('T')[0];
    return scheduledDate === today && !f.completed;
  }).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header avec style Pipeline */}
      <div className="bg-white shadow-lg border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-3">
              <Briefcase className="w-10 h-10 text-purple-600" />
              Mon Espace Commercial
            </h1>
            <p className="text-gray-600 mt-2 font-medium">Pilotez votre activité en temps réel</p>
          </div>
          <button
            onClick={loadData}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg flex items-center gap-2"
          >
            <TrendingUp className="w-5 h-5" />
            Actualiser
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Stats Cards avec gradients magnifiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white hover:scale-105 transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">Leads du jour</p>
                <p className="text-4xl font-bold mt-2">{todayLeads.length}</p>
                <p className="text-xs mt-2 opacity-75">À contacter</p>
              </div>
              <div className="bg-white/20 p-4 rounded-xl">
                <Target className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white hover:scale-105 transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">Tâches du jour</p>
                <p className="text-4xl font-bold mt-2">{todayFollowUps}</p>
                <p className="text-xs mt-2 opacity-75">Rappels programmés</p>
              </div>
              <div className="bg-white/20 p-4 rounded-xl">
                <Calendar className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white hover:scale-105 transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">Validations en attente</p>
                <p className="text-4xl font-bold mt-2">{pendingValidations}</p>
                <p className="text-xs mt-2 opacity-75">Approbations requises</p>
              </div>
              <div className="bg-white/20 p-4 rounded-xl">
                <HelpCircle className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg p-6 text-white hover:scale-105 transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">Mes campagnes</p>
                <p className="text-4xl font-bold mt-2">{campaigns.length}</p>
                <p className="text-xs mt-2 opacity-75">Actives</p>
              </div>
              <div className="bg-white/20 p-4 rounded-xl">
                <Mail className="w-8 h-8" />
              </div>
            </div>
          </div>
        </div>

        {/* Grid principal 2 colonnes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Mes Campagnes */}
          <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-100">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-2xl">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Mail className="w-6 h-6" />
                Mes Campagnes Actives
              </h2>
              <p className="text-white/80 text-sm mt-1">Campagnes auxquelles vous êtes affecté</p>
            </div>

            <div className="p-6">
              {campaigns.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">Aucune campagne assignée</p>
                  <p className="text-gray-400 text-sm mt-2">Les campagnes apparaîtront ici</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {campaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      className="p-5 border-2 border-gray-200 rounded-xl hover:border-purple-400 hover:shadow-lg cursor-pointer transition-all group"
                      onClick={() => navigate(`/CampaignDetails?id=${campaign.id}`)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-gray-900 text-lg group-hover:text-purple-600 transition-colors">
                          {campaign.name}
                        </h3>
                        <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                          campaign.status === 'active' ? 'bg-green-100 text-green-700' :
                          campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {campaign.status === 'active' ? '🟢 Active' :
                           campaign.status === 'paused' ? '⏸️ Pause' :
                           campaign.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Users className="w-4 h-4" />
                          <span className="font-semibold">{campaign.my_leads_count || 0}</span>
                          <span>leads</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail className="w-4 h-4" />
                          <span className="font-semibold">{campaign.emails_sent || 0}</span>
                          <span>envoyés</span>
                        </div>
                      </div>

                      {campaign.database_name && (
                        <div className="mt-2 text-xs text-gray-500">
                          📁 {campaign.database_name}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Demandes de Validation */}
          <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-100">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 rounded-t-2xl">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Award className="w-6 h-6" />
                Mes Demandes de Validation
              </h2>
              <p className="text-white/80 text-sm mt-1">Statut de vos demandes d'approbation</p>
            </div>

            <div className="p-6">
              {validationRequests.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">Aucune demande de validation</p>
                  <p className="text-gray-400 text-sm mt-2">Vos demandes apparaîtront ici</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {validationRequests.map((request) => {
                    const statusInfo = getStatusBadge(request.status);
                    const priorityInfo = getPriorityBadge(request.priority);
                    const StatusIcon = statusInfo.icon;

                    return (
                      <div
                        key={request.id}
                        className="p-5 border-2 border-gray-200 rounded-xl hover:shadow-lg cursor-pointer transition-all"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-xs px-3 py-1 rounded-full font-bold ${priorityInfo.bg} ${priorityInfo.text}`}>
                                {priorityInfo.label}
                              </span>
                              <span className={`text-xs px-3 py-1 rounded-full font-semibold ${statusInfo.bg} ${statusInfo.text} flex items-center gap-1`}>
                                <StatusIcon className="w-3 h-3" />
                                {statusInfo.label}
                              </span>
                            </div>
                            <h3 className="font-bold text-gray-900">
                              {request.type === 'validation' ? '✅ ' : '❓ '}
                              {request.subject}
                            </h3>
                          </div>
                        </div>

                        {request.message && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{request.message}</p>
                        )}

                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center gap-4">
                            {request.company_name && (
                              <span className="font-medium">🏢 {request.company_name}</span>
                            )}
                            {request.campaign_name && (
                              <span>📧 {request.campaign_name}</span>
                            )}
                          </div>
                          <span>{new Date(request.created_at).toLocaleDateString('fr-FR')}</span>
                        </div>

                        {request.manager_response && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                            <p className="text-xs font-semibold text-blue-900 mb-1">Réponse du manager :</p>
                            <p className="text-sm text-blue-800">{request.manager_response}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Grid 2ème ligne */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mes Tâches */}
          <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-100">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 rounded-t-2xl">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Calendar className="w-6 h-6" />
                Mes Tâches & Rappels
              </h2>
              <p className="text-white/80 text-sm mt-1">Follow-ups et actions à réaliser</p>
            </div>

            <div className="p-6">
              {followUps.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">Aucune tâche en attente</p>
                  <p className="text-gray-400 text-sm mt-2">Excellent travail ! 🎉</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {followUps
                    .filter(f => !f.completed)
                    .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))
                    .slice(0, 8)
                    .map((task) => {
                      const isToday = new Date(task.scheduled_date).toDateString() === new Date().toDateString();
                      const isPast = new Date(task.scheduled_date) < new Date() && !isToday;

                      return (
                        <div
                          key={task.id}
                          className={`p-4 border-2 rounded-xl transition-all cursor-pointer ${
                            isPast ? 'border-red-300 bg-red-50 hover:shadow-lg' :
                            isToday ? 'border-orange-300 bg-orange-50 hover:shadow-lg' :
                            'border-gray-200 hover:border-green-400 hover:shadow-lg'
                          }`}
                          onClick={() => navigate('/follow-ups')}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs px-2 py-1 rounded font-semibold ${
                                  task.type === 'call' ? 'bg-blue-100 text-blue-700' :
                                  task.type === 'email' ? 'bg-purple-100 text-purple-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {task.type === 'call' ? '📞 Appel' :
                                   task.type === 'email' ? '📧 Email' :
                                   task.type}
                                </span>
                                {isPast && <span className="text-xs bg-red-500 text-white px-2 py-1 rounded font-bold">⚠️ En retard</span>}
                                {isToday && <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded font-bold">🔥 Aujourd'hui</span>}
                              </div>
                              <h3 className="font-bold text-gray-900">{task.title || 'Tâche sans titre'}</h3>
                              {task.company_name && (
                                <p className="text-sm text-gray-600 mt-1">🏢 {task.company_name}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(task.scheduled_date).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            <span className={`font-semibold ${
                              task.priority === 'urgent' ? 'text-red-600' :
                              task.priority === 'high' ? 'text-orange-600' :
                              'text-gray-600'
                            }`}>
                              {task.priority === 'urgent' ? '🔴 Urgent' :
                               task.priority === 'high' ? '🟠 Élevée' :
                               task.priority === 'normal' ? '🟢 Normale' :
                               '⚪ Basse'}
                            </span>
                          </div>

                          {task.notes && (
                            <p className="text-xs text-gray-600 mt-2 line-clamp-1">💬 {task.notes}</p>
                          )}
                        </div>
                      );
                    })}

                  {followUps.filter(f => !f.completed).length > 8 && (
                    <button
                      onClick={() => navigate('/follow-ups')}
                      className="w-full py-3 text-green-600 hover:bg-green-50 rounded-lg text-sm font-bold transition-all"
                    >
                      Voir toutes les tâches ({followUps.filter(f => !f.completed).length})
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Leads à contacter aujourd'hui */}
          <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-100">
            <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6 rounded-t-2xl">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Phone className="w-6 h-6" />
                Leads à Contacter Aujourd'hui
              </h2>
              <p className="text-white/80 text-sm mt-1">Priorités de prospection du jour</p>
            </div>

            <div className="p-6">
              {todayLeads.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">Tous les leads du jour contactés ! 🎉</p>
                  <p className="text-gray-400 text-sm mt-2">Excellent travail</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {todayLeads.slice(0, 8).map((lead) => (
                    <div
                      key={lead.id}
                      className="p-4 border-2 border-gray-200 rounded-xl hover:border-orange-400 hover:shadow-lg cursor-pointer transition-all group"
                      onClick={() => navigate(`/LeadDetails?id=${lead.id}`)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
                            {lead.company_name}
                          </h3>
                          {lead.contact_name && (
                            <p className="text-sm text-gray-600">👤 {lead.contact_name}</p>
                          )}
                        </div>
                        <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        {lead.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {lead.email}
                          </span>
                        )}
                        {lead.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {lead.phone}
                          </span>
                        )}
                      </div>

                      {lead.city && (
                        <p className="text-xs text-gray-500 mt-2">📍 {lead.city}</p>
                      )}
                    </div>
                  ))}

                  {todayLeads.length > 8 && (
                    <button
                      onClick={() => navigate('/MyLeads')}
                      className="w-full py-3 text-orange-600 hover:bg-orange-50 rounded-lg text-sm font-bold transition-all"
                    >
                      Voir tous les leads ({todayLeads.length})
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer TRINEXTA */}
        <div className="mt-12 pb-6 flex items-center justify-center">
          <div className="flex items-center gap-3 text-gray-600 text-sm bg-white px-6 py-3 rounded-full shadow-md">
            <span className="font-medium">Propulsé par</span>
            <a
              href="https://trinexta.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-all hover:scale-110"
            >
              <img
                src="https://trinexta.com/wp-content/uploads/2025/07/Logosignaturetrinexta-e1752825280915.png"
                alt="TRINEXTA - TrusTech IT Support"
                className="h-8"
              />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
