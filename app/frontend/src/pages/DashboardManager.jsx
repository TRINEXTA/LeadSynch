import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  Users, TrendingUp, CheckCircle, XCircle, Clock, Mail, Phone,
  Target, Award, AlertCircle, FileText, Calendar, BarChart3,
  UserCheck, MapPin, Briefcase, ArrowUpRight, RefreshCw, MessageSquare
} from 'lucide-react';

export default function DashboardManager() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Données du dashboard
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamStats, setTeamStats] = useState({
    total_members: 0,
    active_leads: 0,
    total_deals: 0,
    total_revenue: 0,
    avg_conversion: 0
  });
  const [pendingValidations, setPendingValidations] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    fetchDashboard();

    // Auto-refresh toutes les 30 minutes
    const interval = setInterval(() => {
      console.log('🔄 Auto-refresh DashboardManager (30min)');
      fetchDashboard();
    }, 30 * 60 * 1000); // 30 minutes en millisecondes

    return () => clearInterval(interval);
  }, []);

  const fetchDashboard = async () => {
    try {
      setRefreshing(true);

      // Charger les membres de l'équipe
      const usersRes = await api.get('/users').catch(() => ({ data: { users: [] } }));
      const team = (usersRes.data.users || []).filter(u => u.role === 'user' || u.role === 'commercial');
      setTeamMembers(team);

      // Stats de l'équipe
      const statsRes = await api.get('/stats').catch(() => ({ data: { stats: {} } }));
      setTeamStats({
        total_members: team.length,
        active_leads: statsRes.data.stats?.total_leads || 0,
        total_deals: statsRes.data.stats?.total_campaigns || 0,
        total_revenue: statsRes.data.stats?.conversion_rate || 0,
        avg_conversion: statsRes.data.stats?.conversion_rate || 0
      });

      // Campagnes actives de l'équipe
      const campaignsRes = await api.get('/campaigns').catch(() => ({ data: { campaigns: [] } }));
      const activeCampaigns = (campaignsRes.data.campaigns || [])
        .filter(c => c.status === 'active' || c.status === 'running')
        .slice(0, 5);
      setCampaigns(activeCampaigns);

      // Activités récentes (follow-ups)
      const followUpsRes = await api.get('/follow-ups?limit=10').catch(() => ({ data: { followups: [] } }));
      setRecentActivities((followUpsRes.data.followups || []).slice(0, 5));

      // Charger les demandes de validation et d'aide en attente
      const validationsRes = await api.get('/validation-requests?status=pending&assigned_to_me=true')
        .catch(() => ({ data: { requests: [] } }));
      setPendingValidations(validationsRes.data.requests || []);

    } catch (error) {
      console.error('Erreur chargement dashboard manager:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleApprove = async (requestId) => {
    try {
      await api.patch(`/validation-requests/${requestId}`, {
        status: 'approved',
        manager_response: 'Demande approuvée'
      });
      alert('Demande approuvée avec succès');
      fetchDashboard();
    } catch (error) {
      console.error('Erreur approbation:', error);
      alert('Erreur lors de l\'approbation');
    }
  };

  const handleReject = async (requestId) => {
    const reason = prompt('Raison du refus:');
    if (!reason) return;

    try {
      await api.patch(`/validation-requests/${requestId}`, {
        status: 'rejected',
        manager_response: reason
      });
      alert('Demande rejetée');
      fetchDashboard();
    } catch (error) {
      console.error('Erreur rejet:', error);
      alert('Erreur lors du rejet');
    }
  };

  const handleRespond = async (requestId) => {
    const response = prompt('Votre réponse à la demande d\'aide:');
    if (!response) return;

    try {
      await api.patch(`/validation-requests/${requestId}`, {
        status: 'resolved',
        manager_response: response,
        resolution_notes: response
      });
      alert('Réponse envoyée avec succès');
      fetchDashboard();
    } catch (error) {
      console.error('Erreur réponse:', error);
      alert('Erreur lors de l\'envoi de la réponse');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Chargement du dashboard manager...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Dashboard Manager
            </h1>
            <p className="text-gray-600 mt-2">
              Bienvenue {user?.first_name}, gérez votre équipe et validez les demandes
            </p>
          </div>
          <button
            onClick={fetchDashboard}
            disabled={refreshing}
            className="flex items-center gap-2 px-6 py-3 bg-white/60 backdrop-blur-md border border-white/60 rounded-xl hover:bg-white/80 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="font-medium">Actualiser</span>
          </button>
        </div>
      </div>

      {/* KPIs Équipe */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white/60 backdrop-blur-md border border-white/60 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105"
          onClick={() => navigate('/users')}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
              <Users className="w-6 h-6 text-white" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-gray-600 text-sm font-medium mb-1">Équipe</p>
          <p className="text-3xl font-bold text-gray-900">{teamStats.total_members}</p>
          <p className="text-xs text-gray-500 mt-2">Commerciaux actifs</p>
        </div>

        <div className="bg-white/60 backdrop-blur-md border border-white/60 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105"
          onClick={() => navigate('/leads')}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl">
              <Target className="w-6 h-6 text-white" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-gray-600 text-sm font-medium mb-1">Leads Actifs</p>
          <p className="text-3xl font-bold text-gray-900">{teamStats.active_leads}</p>
          <p className="text-xs text-gray-500 mt-2">Prospects en cours</p>
        </div>

        <div className="bg-white/60 backdrop-blur-md border border-white/60 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105"
          onClick={() => navigate('/Campaigns')}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-gray-600 text-sm font-medium mb-1">Campagnes</p>
          <p className="text-3xl font-bold text-gray-900">{teamStats.total_deals}</p>
          <p className="text-xs text-gray-500 mt-2">Campagnes totales</p>
        </div>

        <div className="bg-white/60 backdrop-blur-md border border-white/60 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl">
              <Award className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-gray-600 text-sm font-medium mb-1">Taux Conversion</p>
          <p className="text-3xl font-bold text-gray-900">{teamStats.avg_conversion.toFixed(1)}%</p>
          <p className="text-xs text-gray-500 mt-2">Moyenne équipe</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Validations en attente */}
        <div className="bg-white/60 backdrop-blur-md border border-white/60 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Validations en Attente</h2>
            </div>
            {pendingValidations.length > 0 && (
              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold animate-pulse">
                {pendingValidations.length}
              </span>
            )}
          </div>

          {pendingValidations.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Aucune demande en attente</p>
              <p className="text-sm text-gray-500 mt-2">Toutes les demandes ont été traitées</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {pendingValidations.map((request) => (
                <div key={request.id} className="bg-white/80 rounded-xl p-5 border border-gray-200 hover:shadow-lg transition-all">
                  {/* En-tête */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {request.type === 'validation' ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <MessageSquare className="w-5 h-5 text-blue-600" />
                        )}
                        <span className="font-bold text-gray-900 text-lg">{request.subject}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          request.type === 'validation'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {request.type === 'validation' ? '✅ Demande de validation' : '💬 Demande d\'aide'}
                        </span>

                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          request.priority === 'urgent' ? 'bg-red-100 text-red-700 animate-pulse' :
                          request.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                          request.priority === 'normal' ? 'bg-gray-100 text-gray-700' :
                          'bg-gray-50 text-gray-600'
                        }`}>
                          {request.priority === 'urgent' ? '🔥 Urgent' :
                           request.priority === 'high' ? '⚡ Prioritaire' :
                           request.priority === 'normal' ? '📌 Normal' : '📋 Bas'}
                        </span>
                      </div>

                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          <span className="font-semibold">De:</span> {request.requester_first_name} {request.requester_last_name}
                        </p>
                        {request.company_name && (
                          <p>
                            <span className="font-semibold">Lead:</span> {request.company_name}
                            {request.contact_name && ` (${request.contact_name})`}
                          </p>
                        )}
                        {request.campaign_name && (
                          <p>
                            <span className="font-semibold">Campagne:</span> {request.campaign_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Message */}
                  {request.message && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{request.message}</p>
                    </div>
                  )}

                  {/* Métadonnées */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(request.created_at).toLocaleDateString('fr-FR')} à {new Date(request.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {request.type === 'validation' ? (
                      <>
                        <button
                          onClick={() => handleApprove(request.id)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all font-semibold shadow-md hover:shadow-lg"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approuver
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all font-semibold shadow-md hover:shadow-lg"
                        >
                          <XCircle className="w-4 h-4" />
                          Refuser
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleRespond(request.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all font-semibold shadow-md hover:shadow-lg"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Répondre
                      </button>
                    )}
                    {request.lead_id && (
                      <button
                        onClick={() => navigate(`/LeadDetails?id=${request.lead_id}`)}
                        className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-semibold"
                      >
                        Voir Lead
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Membres de l'équipe */}
        <div className="bg-white/60 backdrop-blur-md border border-white/60 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Mon Équipe</h2>
            </div>
            <button
              onClick={() => navigate('/users')}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all text-sm font-medium"
            >
              Gérer
            </button>
          </div>

          {teamMembers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Aucun membre dans l'équipe</p>
              <p className="text-sm text-gray-500 mt-2">Commencez par ajouter des commerciaux</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {teamMembers.map((member) => (
                <div key={member.id} className="bg-white/80 rounded-xl p-4 border border-gray-200 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                        {member.first_name?.[0]}{member.last_name?.[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {member.first_name} {member.last_name}
                        </p>
                        <p className="text-xs text-gray-500">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        member.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {member.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  </div>
                  {/* TODO: Afficher secteur géographique assigné quand le système sera implémenté */}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campagnes actives */}
        <div className="bg-white/60 backdrop-blur-md border border-white/60 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Campagnes Actives</h2>
            </div>
            <button
              onClick={() => navigate('/Campaigns')}
              className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-all text-sm font-medium"
            >
              Voir tout
            </button>
          </div>

          {campaigns.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Aucune campagne active</p>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((campaign) => {
                const openRate = campaign.sent_count > 0
                  ? ((campaign.opened_count || 0) / campaign.sent_count * 100).toFixed(1)
                  : 0;

                return (
                  <div
                    key={campaign.id}
                    onClick={() => navigate(`/CampaignDetails?id=${campaign.id}`)}
                    className="bg-white/80 rounded-xl p-4 border border-gray-200 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-gray-900">{campaign.name}</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        campaign.status === 'active' || campaign.status === 'running'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {campaign.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">Envoyés</p>
                        <p className="font-bold text-gray-900">{campaign.sent_count || 0}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Ouverts</p>
                        <p className="font-bold text-green-600">{campaign.opened_count || 0}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Taux</p>
                        <p className="font-bold text-blue-600">{openRate}%</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Activités récentes */}
        <div className="bg-white/60 backdrop-blur-md border border-white/60 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-500 to-teal-500 rounded-lg">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Activités Récentes</h2>
            </div>
          </div>

          {recentActivities.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Aucune activité récente</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="bg-white/80 rounded-xl p-4 border border-gray-200 hover:shadow-md transition-all">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      activity.type === 'call' ? 'bg-blue-100' : 'bg-green-100'
                    }`}>
                      {activity.type === 'call' ? (
                        <Phone className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Mail className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{activity.notes || 'Suivi programmé'}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {activity.scheduled_date
                          ? new Date(activity.scheduled_date).toLocaleDateString('fr-FR')
                          : 'Date non définie'}
                      </p>
                      {activity.completed && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 mt-1">
                          <CheckCircle className="w-3 h-3" />
                          Terminé
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer TRINEXTA */}
      <div className="mt-8 text-center">
        <div className="inline-block bg-white/60 backdrop-blur-md border border-white/60 rounded-xl px-6 py-3 shadow-lg">
          <p className="text-sm text-gray-600">
            Propulsé par{' '}
            <span className="font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              TRINEXTA
            </span>
            {' '}• TrusTech IT Support
          </p>
        </div>
      </div>
    </div>
  );
}
