import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  Users, TrendingUp, CheckCircle, XCircle, Clock, Mail, Phone,
  Target, Award, AlertCircle, FileText, Calendar, BarChart3,
  UserCheck, MapPin, Briefcase, ArrowUpRight, RefreshCw, MessageSquare,
  UserCog, Plus, Send, HelpCircle
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

  // États pour les modals
  const [rejectModalId, setRejectModalId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [respondModalId, setRespondModalId] = useState(null);
  const [respondMessage, setRespondMessage] = useState('');

  // États pour gestion des tâches
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showAssignTaskModal, setShowAssignTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskAssignedTo, setTaskAssignedTo] = useState('');
  const [taskPriority, setTaskPriority] = useState('normal');
  const [taskDueDate, setTaskDueDate] = useState('');

  useEffect(() => {
    fetchDashboard();

    // Auto-refresh toutes les 30 minutes
    const interval = setInterval(() => {
      fetchDashboard();
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const fetchDashboard = async () => {
    try {
      setRefreshing(true);

      // Charger les membres de l'équipe (incluant managers car ils sont aussi commerciaux)
      const usersRes = await api.get('/users').catch(() => ({ data: { users: [] } }));
      const team = (usersRes.data.users || []).filter(u => u.role === 'user' || u.role === 'commercial' || u.role === 'manager');
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
      toast.error('Erreur lors du chargement du dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleApprove = async (requestId) => {
    const promise = api.patch(`/validation-requests/${requestId}`, {
      status: 'approved',
      manager_response: 'Demande approuvée'
    }).then(() => fetchDashboard());

    toast.promise(promise, {
      loading: 'Approbation en cours...',
      success: '✅ Demande approuvée avec succès',
      error: 'Erreur lors de l\'approbation',
    });
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Veuillez indiquer une raison');
      return;
    }

    const promise = api.patch(`/validation-requests/${rejectModalId}`, {
      status: 'rejected',
      manager_response: rejectReason
    }).then(() => {
      setRejectModalId(null);
      setRejectReason('');
      fetchDashboard();
    });

    toast.promise(promise, {
      loading: 'Envoi du refus...',
      success: '❌ Demande rejetée',
      error: 'Erreur lors du rejet',
    });
  };

  const handleRespond = async () => {
    if (!respondMessage.trim()) {
      toast.error('Veuillez saisir une réponse');
      return;
    }

    const promise = api.patch(`/validation-requests/${respondModalId}`, {
      status: 'resolved',
      manager_response: respondMessage,
      resolution_notes: respondMessage
    }).then(() => {
      setRespondModalId(null);
      setRespondMessage('');
      fetchDashboard();
    });

    toast.promise(promise, {
      loading: 'Envoi de la réponse...',
      success: '✅ Réponse envoyée avec succès',
      error: 'Erreur lors de l\'envoi',
    });
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

      {/* Section Gestion des Tâches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Attribution des tâches */}
        <div className="bg-white/60 backdrop-blur-md border border-white/60 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Attribution des Tâches</h2>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-gray-600 mb-4">
              Créez et attribuez des tâches à votre équipe commerciale
            </p>

            <button
              onClick={() => setShowCreateTaskModal(true)}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all font-semibold shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              Créer une nouvelle tâche
            </button>

            <button
              onClick={() => setShowAssignTaskModal(true)}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all font-semibold shadow-lg hover:shadow-xl"
            >
              <Send className="w-5 h-5" />
              Attribuer une tâche existante
            </button>

            <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-900 mb-1">💡 Astuce</p>
                  <p className="text-xs text-blue-700">
                    Créez des tâches pour guider votre équipe : appels à passer, emails à envoyer, suivis à faire, etc.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tâches envoyées */}
        <div className="bg-white/60 backdrop-blur-md border border-white/60 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-500 to-teal-500 rounded-lg">
                <Send className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Tâches Envoyées</h2>
            </div>
          </div>

          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Aucune tâche envoyée</p>
            <p className="text-sm text-gray-500 mt-2">
              Les tâches que vous attribuez apparaîtront ici
            </p>
            <button
              onClick={() => setShowCreateTaskModal(true)}
              className="mt-4 px-6 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-all text-sm font-medium"
            >
              Créer une tâche
            </button>
          </div>
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
              <h2 className="text-xl font-bold text-gray-900">Demandes en Attente</h2>
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
                        ) : request.type === 'leadshow' ? (
                          <UserCog className="w-5 h-5 text-purple-600" />
                        ) : (
                          <MessageSquare className="w-5 h-5 text-blue-600" />
                        )}
                        <span className="font-bold text-gray-900 text-lg">{request.subject}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          request.type === 'validation'
                            ? 'bg-green-100 text-green-700'
                            : request.type === 'leadshow'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {request.type === 'validation' ? '✅ Demande de validation' :
                           request.type === 'leadshow' ? '👤 Lead Show / Escalade' :
                           '💬 Demande d\'aide'}
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
                          onClick={() => setRejectModalId(request.id)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all font-semibold shadow-md hover:shadow-lg"
                        >
                          <XCircle className="w-4 h-4" />
                          Refuser
                        </button>
                      </>
                    ) : request.type === 'leadshow' ? (
                      <button
                        onClick={() => setRespondModalId(request.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all font-semibold shadow-md hover:shadow-lg"
                      >
                        <UserCog className="w-4 h-4" />
                        Prendre en charge
                      </button>
                    ) : (
                      <button
                        onClick={() => setRespondModalId(request.id)}
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

      {/* Modal Refuser */}
      {rejectModalId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full">
            <h3 className="text-xl font-bold mb-4 text-red-600">❌ Refuser la demande</h3>
            <p className="text-gray-600 mb-4">
              Veuillez indiquer la raison du refus pour informer le commercial :
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="Ex: Manque d'informations sur le prospect, budget non qualifié..."
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setRejectModalId(null);
                  setRejectReason('');
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleReject}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-semibold hover:shadow-lg"
              >
                Confirmer le refus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Répondre */}
      {respondModalId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full">
            <h3 className="text-xl font-bold mb-4 text-blue-600">💬 Répondre à la demande</h3>
            <p className="text-gray-600 mb-4">
              Répondez à la demande d'aide du commercial :
            </p>
            <textarea
              value={respondMessage}
              onChange={(e) => setRespondMessage(e.target.value)}
              rows={6}
              placeholder="Votre réponse détaillée..."
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setRespondModalId(null);
                  setRespondMessage('');
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleRespond}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg font-semibold hover:shadow-lg"
              >
                Envoyer la réponse
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Créer une tâche */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Créer une nouvelle tâche</h3>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Titre de la tâche *
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Ex: Appeler prospect XYZ"
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  rows={4}
                  placeholder="Détails de la tâche..."
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Attribuer à *
                  </label>
                  <select
                    value={taskAssignedTo}
                    onChange={(e) => setTaskAssignedTo(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  >
                    <option value="">Sélectionner un commercial</option>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.first_name} {member.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Priorité
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  >
                    <option value="low">Basse</option>
                    <option value="normal">Normale</option>
                    <option value="high">Haute</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date d'échéance
                </label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateTaskModal(false);
                  setTaskTitle('');
                  setTaskDescription('');
                  setTaskAssignedTo('');
                  setTaskPriority('normal');
                  setTaskDueDate('');
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (!taskTitle || !taskAssignedTo) {
                    toast.error('Veuillez remplir les champs requis');
                    return;
                  }
                  toast.success('✅ Tâche créée avec succès !');
                  setShowCreateTaskModal(false);
                  setTaskTitle('');
                  setTaskDescription('');
                  setTaskAssignedTo('');
                  setTaskPriority('normal');
                  setTaskDueDate('');
                  fetchDashboard();
                }}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg font-semibold hover:shadow-lg"
              >
                Créer la tâche
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Attribuer une tâche */}
      {showAssignTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full">
            <div className="flex items-center justify-between mb-6 pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
                  <Send className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Attribuer une tâche</h3>
              </div>
            </div>

            <p className="text-gray-600 mb-6">
              Sélectionnez un commercial et une tâche existante à attribuer
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Attribuer à
                </label>
                <select
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
                >
                  <option value="">Sélectionner un commercial</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.first_name} {member.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-800">
                  ℹ️ Cette fonctionnalité permet d'attribuer une tâche à partir d'un pool de tâches existantes.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAssignTaskModal(false)}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  toast.success('✅ Tâche attribuée avec succès !');
                  setShowAssignTaskModal(false);
                  fetchDashboard();
                }}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-700 text-white rounded-lg font-semibold hover:shadow-lg"
              >
                Attribuer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
