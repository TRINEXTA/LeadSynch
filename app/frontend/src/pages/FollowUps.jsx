import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Clock, Plus, Check, X, AlertCircle,
  User, Phone, Mail, Building2, ChevronDown, Filter,
  CheckCircle, XCircle, Clock3, TrendingUp, Users, Shield,
  PhoneCall, Send, ExternalLink, MessageSquare, Target, Eye
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';

// Options de qualification (synchronisées avec le pipeline)
const QUALIFICATION_OPTIONS = [
  { value: 'qualifie', label: 'Qualifié', icon: '✅', color: 'bg-blue-100 text-blue-700', stage: 'qualifie' },
  { value: 'tres_qualifie', label: 'Très Qualifié / RDV', icon: '🎯', color: 'bg-green-100 text-green-700', stage: 'tres_qualifie' },
  { value: 'a_relancer', label: 'À Relancer', icon: '🔄', color: 'bg-yellow-100 text-yellow-700', stage: 'relancer' },
  { value: 'proposition', label: 'Proposition envoyée', icon: '📄', color: 'bg-purple-100 text-purple-700', stage: 'proposition' },
  { value: 'nrp', label: 'NRP / Pas de réponse', icon: '📵', color: 'bg-gray-100 text-gray-700', stage: 'nrp' },
  { value: 'pas_interesse', label: 'Pas intéressé', icon: '❌', color: 'bg-red-100 text-red-700', stage: 'hors_scope' },
];

const PRIORITY_COLORS = {
  high: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', badge: 'bg-red-100' },
  medium: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', badge: 'bg-orange-100' },
  low: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badge: 'bg-blue-100' }
};

const FOLLOWUP_TYPES = [
  { value: 'call', label: 'Appel téléphonique', icon: '📞' },
  { value: 'email', label: 'Envoi email', icon: '📧' },
  { value: 'meeting', label: 'Rendez-vous', icon: '🤝' },
  { value: 'demo', label: 'Démo produit', icon: '🎯' },
  { value: 'quote', label: 'Envoi proposition', icon: '💰' },
  { value: 'other', label: 'Autre', icon: '📝' }
];

const ROLE_LABELS = {
  admin: { label: 'Administrateur', color: 'bg-purple-100 text-purple-700' },
  manager: { label: 'Manager', color: 'bg-blue-100 text-blue-700' },
  supervisor: { label: 'Superviseur', color: 'bg-indigo-100 text-indigo-700' },
  commercial: { label: 'Commercial', color: 'bg-green-100 text-green-700' },
  user: { label: 'Utilisateur', color: 'bg-gray-100 text-gray-700' }
};

export default function FollowUps() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Permissions basées sur le rôle
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager' || user?.role === 'supervisor';
  const canViewTeam = isAdmin || isManager;

  const [followups, setFollowups] = useState([]);
  const [leads, setLeads] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState('all');
  const [filterStatus, setFilterStatus] = useState('upcoming');
  const [filterPriority, setFilterPriority] = useState('all');
  const [canViewAll, setCanViewAll] = useState(false);

  // États pour les modals
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [rescheduleModalId, setRescheduleModalId] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');

  // État pour le modal de qualification (action sur rappel)
  const [qualifyModal, setQualifyModal] = useState(null); // followup object
  const [qualifyData, setQualifyData] = useState({
    qualification: '',
    notes: '',
    nextFollowupDate: '',
    nextFollowupTime: '',
    dealValue: ''
  });

  const [stats, setStats] = useState({
    total: 0,
    upcoming: 0,
    overdue: 0,
    completed: 0,
    today: 0
  });

  const [newFollowup, setNewFollowup] = useState({
    lead_id: '',
    user_id: '', // Pour assigner à un membre de l'équipe
    type: 'call',
    priority: 'medium',
    scheduled_date: '',
    scheduled_time: '',
    notes: '',
    title: ''
  });

  useEffect(() => {
    fetchTeamMembers();
    fetchLeads();
  }, []);

  useEffect(() => {
    fetchFollowups();
  }, [selectedUser]);

  useEffect(() => {
    calculateStats();
  }, [followups]);

  const fetchTeamMembers = async () => {
    try {
      const response = await api.get('/follow-ups/team-members');
      const data = response.data;

      if (data.success) {
        setTeamMembers(data.members || []);
        setCanViewAll(data.canViewAll);
      }
    } catch (err) {
      console.error('Erreur chargement équipe:', err);
    }
  };

  const fetchFollowups = async () => {
    try {
      setLoading(true);
      let url = '/follow-ups';

      // Ajouter le filtre utilisateur seulement si on peut voir l'équipe
      if (canViewTeam && selectedUser !== 'all') {
        url += `?user_id=${selectedUser}`;
      }

      const response = await api.get(url);
      const data = response.data;

      if (data.success) {
        setFollowups(data.followups || []);
      }
    } catch (err) {
      console.error('Erreur chargement rappels:', err);
      toast.error('Erreur lors du chargement des rappels');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async () => {
    try {
      const response = await api.get('/leads');
      const data = response.data;

      if (data.success) {
        // Pour les commerciaux, filtrer les leads assignés
        const filteredLeads = canViewTeam
          ? data.leads
          : data.leads.filter(lead => user && lead.assigned_to === user.id);
        setLeads(filteredLeads);
      }
    } catch (err) {
      console.error('Erreur chargement leads:', err);
    }
  };

  const calculateStats = () => {
    // Utiliser le fuseau horaire Paris
    const timeZone = 'Europe/Paris';
    const now = new Date();

    // Obtenir la date "aujourd'hui" en timezone Paris (minuit)
    const todayInParis = new Date(now.toLocaleString('en-US', { timeZone }));
    todayInParis.setHours(0, 0, 0, 0);

    const upcoming = followups.filter(f => {
      if (f.completed) return false;
      const followupDate = new Date(f.scheduled_date);
      const followupInParis = new Date(followupDate.toLocaleString('en-US', { timeZone }));
      followupInParis.setHours(0, 0, 0, 0);
      return followupInParis >= todayInParis;
    }).length;

    const overdue = followups.filter(f => {
      if (f.completed) return false;
      const followupDate = new Date(f.scheduled_date);
      return followupDate < now;
    }).length;

    const completed = followups.filter(f => f.completed).length;

    const todayCount = followups.filter(f => {
      if (f.completed) return false;
      const followupDate = new Date(f.scheduled_date);
      const followupInParis = new Date(followupDate.toLocaleString('en-US', { timeZone }));
      return followupInParis.toDateString() === todayInParis.toDateString();
    }).length;

    setStats({
      total: followups.length,
      upcoming,
      overdue,
      completed,
      today: todayCount
    });
  };

  const handleCreateFollowup = async (e) => {
    e.preventDefault();

    if (!newFollowup.lead_id || !newFollowup.scheduled_date) {
      toast.error('Lead et date sont requis');
      return;
    }

    const scheduledDateTime = `${newFollowup.scheduled_date}T${newFollowup.scheduled_time || '09:00'}:00`;

    const payload = {
      lead_id: newFollowup.lead_id,
      type: newFollowup.type,
      priority: newFollowup.priority,
      scheduled_date: scheduledDateTime,
      notes: newFollowup.notes,
      title: newFollowup.title
    };

    // Ajouter user_id seulement si assignation à quelqu'un d'autre
    if (canViewTeam && newFollowup.user_id && newFollowup.user_id !== user.id) {
      payload.user_id = newFollowup.user_id;
    }

    const promise = api.post('/follow-ups', payload).then(() => {
      setShowModal(false);
      setNewFollowup({
        lead_id: '',
        user_id: '',
        type: 'call',
        priority: 'medium',
        scheduled_date: '',
        scheduled_time: '',
        notes: '',
        title: ''
      });
      fetchFollowups();
    });

    toast.promise(promise, {
      loading: 'Création du rappel...',
      success: 'Rappel créé avec succès',
      error: (err) => err.response?.data?.error || 'Erreur lors de la création',
    });
  };

  const handleComplete = async (id) => {
    const promise = api.put(`/follow-ups/${id}/complete`)
      .then(() => fetchFollowups());

    toast.promise(promise, {
      loading: 'Marquage comme terminé...',
      success: 'Rappel marqué comme terminé',
      error: (err) => err.response?.data?.error || 'Erreur lors de la complétion',
    });
  };

  const handleDelete = async (id) => {
    const promise = api.delete(`/follow-ups/${id}`)
      .then(() => fetchFollowups());

    toast.promise(promise, {
      loading: 'Suppression...',
      success: 'Rappel supprimé',
      error: (err) => err.response?.data?.error || 'Erreur lors de la suppression',
    });
  };

  const handleReschedule = async () => {
    if (!rescheduleDate) {
      toast.error('Veuillez sélectionner une date');
      return;
    }

    const scheduledDateTime = `${rescheduleDate}T${rescheduleTime || '09:00'}:00`;

    const promise = api.patch(`/follow-ups/${rescheduleModalId}/reschedule`, {
      scheduled_date: scheduledDateTime
    }).then(() => {
      setRescheduleModalId(null);
      setRescheduleDate('');
      setRescheduleTime('');
      fetchFollowups();
    });

    toast.promise(promise, {
      loading: 'Reprogrammation...',
      success: 'Rappel reprogrammé',
      error: (err) => err.response?.data?.error || 'Erreur lors de la reprogrammation',
    });
  };

  // =============================
  // ACTIONS SUR RAPPELS
  // =============================

  // Lance l'appel puis ouvre le modal de qualification
  const handleCallAction = (followup) => {
    // 1. Lancer l'appel téléphonique
    if (followup.lead_phone) {
      const cleanPhone = followup.lead_phone.replace(/[\s\-\(\)]/g, '');
      window.location.href = `tel:${cleanPhone}`;
    }

    // 2. Ouvrir le modal de qualification
    setQualifyModal(followup);
    setQualifyData({
      qualification: '',
      notes: '',
      nextFollowupDate: '',
      nextFollowupTime: '',
      dealValue: ''
    });
  };

  // Ouvre le client email
  const handleEmailAction = (followup) => {
    const email = followup.lead_email;
    const companyName = followup.company_name || 'Lead';

    if (!email) {
      toast.error('Pas d\'email disponible pour ce lead');
      return;
    }

    const subject = encodeURIComponent(`Suivi - ${companyName}`);
    const body = encodeURIComponent(`Bonjour,\n\nSuite à notre conversation...\n\nCordialement`);
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');

    toast.success('Client email ouvert');
  };

  // Qualifier le lead depuis le rappel (synchronise avec le pipeline)
  const handleQualifyFromRappel = async () => {
    if (!qualifyData.qualification) {
      toast.error('Veuillez sélectionner une qualification');
      return;
    }

    const followup = qualifyModal;
    const selectedOption = QUALIFICATION_OPTIONS.find(o => o.value === qualifyData.qualification);

    try {
      // 1. Trouver le pipeline_lead associé à ce lead
      const pipelineResponse = await api.get('/pipeline-leads');
      const pipelineLeads = pipelineResponse.data?.leads || [];
      const pipelineLead = pipelineLeads.find(pl => pl.lead_id === followup.lead_id);

      if (pipelineLead) {
        // 2. Mettre à jour le pipeline avec la qualification
        const qualifyPayload = {
          qualification: qualifyData.qualification,
          stage: selectedOption?.stage || qualifyData.qualification,
          notes: qualifyData.notes,
          deal_value: qualifyData.dealValue ? parseFloat(qualifyData.dealValue) : undefined
        };

        // Ajouter la date de suivi si spécifiée
        if (qualifyData.nextFollowupDate) {
          qualifyPayload.scheduled_date = `${qualifyData.nextFollowupDate}T${qualifyData.nextFollowupTime || '09:00'}:00`;
        }

        await api.post(`/pipeline-leads/${pipelineLead.id}/qualify`, qualifyPayload);
        toast.success(`Lead qualifié: ${selectedOption?.label || qualifyData.qualification}`);
      } else {
        // Pas dans le pipeline, juste mettre à jour le lead
        await api.patch(`/leads/${followup.lead_id}`, {
          pipeline_stage: qualifyData.qualification,
          notes: qualifyData.notes
        });
        toast.success('Lead mis à jour');
      }

      // 3. Marquer le rappel comme terminé
      await api.put(`/follow-ups/${followup.id}/complete`, {
        completed_notes: qualifyData.notes
      });

      // 4. Fermer le modal et rafraîchir
      setQualifyModal(null);
      setQualifyData({
        qualification: '',
        notes: '',
        nextFollowupDate: '',
        nextFollowupTime: '',
        dealValue: ''
      });
      fetchFollowups();

    } catch (error) {
      console.error('Erreur qualification:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la qualification');
    }
  };

  const getFilteredFollowups = () => {
    // Fuseau horaire Paris
    const timeZone = 'Europe/Paris';
    const now = new Date();
    const todayInParis = new Date(now.toLocaleString('en-US', { timeZone }));
    todayInParis.setHours(0, 0, 0, 0);

    return followups.filter(followup => {
      const followupDate = new Date(followup.scheduled_date);
      const followupInParis = new Date(followupDate.toLocaleString('en-US', { timeZone }));
      followupInParis.setHours(0, 0, 0, 0);
      let matchStatus = true;

      if (filterStatus === 'upcoming') {
        matchStatus = !followup.completed && followupInParis >= todayInParis;
      } else if (filterStatus === 'overdue') {
        matchStatus = !followup.completed && followupDate < now;
      } else if (filterStatus === 'completed') {
        matchStatus = followup.completed;
      }

      const matchPriority = filterPriority === 'all' || followup.priority === filterPriority;

      return matchStatus && matchPriority;
    }).sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
  };

  const getLeadInfo = (leadId) => {
    return leads.find(l => l.id === leadId) || {};
  };

  const getTypeInfo = (type) => {
    return FOLLOWUP_TYPES.find(t => t.value === type) || FOLLOWUP_TYPES[0];
  };

  const isOverdue = (date, completed) => {
    if (completed) return false;
    // Comparer en timezone Paris
    const timeZone = 'Europe/Paris';
    const followupDate = new Date(date);
    const now = new Date();
    // Comparer les timestamps directement (UTC)
    return followupDate < now;
  };

  const formatDate = (dateString) => {
    // Fuseau horaire Paris
    const timeZone = 'Europe/Paris';
    const date = new Date(dateString);
    const now = new Date();

    // Comparer les dates en timezone Paris
    const dateInParis = new Date(date.toLocaleString('en-US', { timeZone }));
    const todayInParis = new Date(now.toLocaleString('en-US', { timeZone }));
    const tomorrowInParis = new Date(todayInParis);
    tomorrowInParis.setDate(tomorrowInParis.getDate() + 1);

    // Formater l'heure en Paris timezone
    const timeFormat = { hour: '2-digit', minute: '2-digit', timeZone };
    const timeStr = date.toLocaleTimeString('fr-FR', timeFormat);

    if (dateInParis.toDateString() === todayInParis.toDateString()) {
      return `Aujourd'hui à ${timeStr}`;
    } else if (dateInParis.toDateString() === tomorrowInParis.toDateString()) {
      return `Demain à ${timeStr}`;
    } else {
      return date.toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone
      });
    }
  };

  const getRoleLabel = (role) => {
    return ROLE_LABELS[role] || ROLE_LABELS.user;
  };

  const filteredFollowups = getFilteredFollowups();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des rappels...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Calendar className="w-8 h-8 text-blue-600" />
              {canViewTeam ? 'Rappels' : 'Mes Rappels'}
            </h1>
            <p className="text-gray-600 mt-1 flex items-center gap-2">
              {isAdmin && (
                <>
                  <Shield className="w-4 h-4 text-purple-600" />
                  <span className="text-purple-600 font-medium">Admin</span> - Accès à tous les rappels
                </>
              )}
              {isManager && !isAdmin && (
                <>
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-blue-600 font-medium">Manager</span> - Accès aux rappels de votre équipe
                </>
              )}
              {!canViewTeam && (
                <>
                  <User className="w-4 h-4 text-green-600" />
                  Vos rappels personnels
                </>
              )}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium shadow-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            Nouveau Rappel
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6 shadow-lg">
            <Calendar className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-3xl font-bold">{stats.total}</p>
            <p className="text-sm opacity-90">Total Rappels</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl p-6 shadow-lg">
            <Clock className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-3xl font-bold">{stats.today}</p>
            <p className="text-sm opacity-90">Aujourd'hui</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-6 shadow-lg">
            <TrendingUp className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-3xl font-bold">{stats.upcoming}</p>
            <p className="text-sm opacity-90">À venir</p>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl p-6 shadow-lg">
            <AlertCircle className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-3xl font-bold">{stats.overdue}</p>
            <p className="text-sm opacity-90">En retard</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-6 shadow-lg">
            <CheckCircle className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-3xl font-bold">{stats.completed}</p>
            <p className="text-sm opacity-90">Complétés</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center gap-4">
            {/* Filtre par utilisateur - seulement pour admin/manager */}
            {canViewTeam && teamMembers.length > 1 && (
              <div className="flex-1">
                <select
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                >
                  <option value="all">
                    {isAdmin ? '👥 Tous les utilisateurs' : '👥 Mon équipe'}
                  </option>
                  {teamMembers.map(member => {
                    const roleInfo = getRoleLabel(member.role);
                    return (
                      <option key={member.id} value={member.id}>
                        {member.first_name} {member.last_name} ({roleInfo.label})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            <select
              className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Tous</option>
              <option value="upcoming">À venir</option>
              <option value="overdue">En retard</option>
              <option value="completed">Complétés</option>
            </select>

            <select
              className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
            >
              <option value="all">Toutes priorités</option>
              <option value="high">Haute</option>
              <option value="medium">Moyenne</option>
              <option value="low">Basse</option>
            </select>
          </div>
        </div>
      </div>

      {/* Liste des rappels */}
      <div className="space-y-4">
        {filteredFollowups.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-lg">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun rappel</h3>
            <p className="text-gray-600 mb-6">
              {filterStatus === 'completed'
                ? 'Aucun rappel complété pour le moment'
                : 'Créez votre premier rappel pour organiser votre prospection'
              }
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg transition-all"
            >
              <Plus className="w-5 h-5" />
              Créer un rappel
            </button>
          </div>
        ) : (
          filteredFollowups.map(followup => {
            const typeInfo = getTypeInfo(followup.type);
            const priorityStyle = PRIORITY_COLORS[followup.priority] || PRIORITY_COLORS.medium;
            const overdue = isOverdue(followup.scheduled_date, followup.completed);
            const isOwnFollowup = followup.user_id === user?.id;

            return (
              <div
                key={followup.id}
                className={`bg-white rounded-xl shadow-lg hover:shadow-xl transition-all p-6 border-l-4 ${
                  followup.completed
                    ? 'border-green-500 opacity-60'
                    : overdue
                    ? 'border-red-500'
                    : priorityStyle.border
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{typeInfo.icon}</span>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                          {followup.title || typeInfo.label}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${priorityStyle.badge} ${priorityStyle.text}`}>
                            {followup.priority === 'high' ? 'Haute' : followup.priority === 'medium' ? 'Moyenne' : 'Basse'}
                          </span>
                          <span className={`text-sm font-medium flex items-center gap-1 ${
                            overdue ? 'text-red-600' : followup.completed ? 'text-green-600' : 'text-gray-600'
                          }`}>
                            <Clock className="w-4 h-4" />
                            {formatDate(followup.scheduled_date)}
                          </span>
                          {overdue && (
                            <span className="text-xs font-semibold px-2 py-1 bg-red-100 text-red-700 rounded">
                              EN RETARD
                            </span>
                          )}
                          {followup.completed && (
                            <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded">
                              COMPLÉTÉ
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Lead Info - Utilise les données directement du followup (JOIN API) */}
                    <div
                      className="bg-gray-50 rounded-lg p-4 mb-4 cursor-pointer hover:bg-blue-50 hover:border-blue-200 border border-transparent transition-all group"
                      onClick={() => followup.lead_id && navigate(`/LeadDetails?id=${followup.lead_id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-wrap flex-1">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-blue-600" />
                            <span className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {followup.company_name || 'Lead inconnu'}
                            </span>
                          </div>
                          {followup.lead_email && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail className="w-4 h-4" />
                              {followup.lead_email}
                            </div>
                          )}
                          {followup.lead_phone && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const cleanPhone = followup.lead_phone.replace(/[\s\-\(\)]/g, '');
                                window.location.href = `tel:${cleanPhone}`;
                              }}
                              className="flex items-center gap-2 px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium transition-all"
                            >
                              <Phone className="w-4 h-4" />
                              {followup.lead_phone}
                            </button>
                          )}
                        </div>
                        {/* Bouton voir le lead */}
                        <div className="flex items-center gap-2 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-sm font-medium">Voir le lead</span>
                          <Eye className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    {followup.notes && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-700 italic">"{followup.notes}"</p>
                      </div>
                    )}

                    {/* User info (pour manager/admin) */}
                    {canViewTeam && followup.user_name && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-600">Assigné à :</span>
                        <span className={`font-medium px-2 py-0.5 rounded ${
                          isOwnFollowup ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {isOwnFollowup ? 'Moi' : followup.user_name}
                        </span>
                        {followup.user_role && (
                          <span className={`text-xs px-2 py-0.5 rounded ${getRoleLabel(followup.user_role).color}`}>
                            {getRoleLabel(followup.user_role).label}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 ml-4">
                    {!followup.completed ? (
                      <>
                        {/* Boutons d'action principaux */}
                        <button
                          onClick={() => handleCallAction(followup)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all shadow-md"
                        >
                          <PhoneCall className="w-4 h-4" />
                          Appeler
                        </button>
                        <button
                          onClick={() => handleEmailAction(followup)}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-all shadow-md"
                        >
                          <Send className="w-4 h-4" />
                          Email
                        </button>
                        <button
                          onClick={() => followup.lead_id && navigate(`/LeadDetails?id=${followup.lead_id}`)}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-all shadow-md"
                        >
                          <Eye className="w-4 h-4" />
                          Voir le lead
                        </button>

                        {/* Séparateur */}
                        <div className="border-t border-gray-200 my-1"></div>

                        <button
                          onClick={() => handleComplete(followup.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-all"
                        >
                          <Check className="w-4 h-4" />
                          Terminé
                        </button>
                        <button
                          onClick={() => {
                            setRescheduleModalId(followup.id);
                            setRescheduleDate(new Date(followup.scheduled_date).toISOString().split('T')[0]);
                            setRescheduleTime(new Date(followup.scheduled_date).toTimeString().slice(0, 5));
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-all"
                        >
                          <Clock className="w-4 h-4" />
                          Repousser
                        </button>
                      </>
                    ) : null}
                    <button
                      onClick={() => setDeleteConfirmId(followup.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all"
                    >
                      <X className="w-4 h-4" />
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Nouveau Rappel */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Nouveau Rappel</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateFollowup} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Lead / Prospect *</label>
                <select
                  required
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  value={newFollowup.lead_id}
                  onChange={(e) => setNewFollowup({...newFollowup, lead_id: e.target.value})}
                >
                  <option value="">-- Sélectionner un lead --</option>
                  {leads.map(lead => (
                    <option key={lead.id} value={lead.id}>
                      {lead.company_name} {lead.email ? `(${lead.email})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assignation - seulement pour manager/admin */}
              {canViewTeam && teamMembers.length > 1 && (
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    Assigner à
                    <span className="text-gray-500 font-normal ml-2">(optionnel)</span>
                  </label>
                  <select
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    value={newFollowup.user_id}
                    onChange={(e) => setNewFollowup({...newFollowup, user_id: e.target.value})}
                  >
                    <option value="">Moi-même</option>
                    {teamMembers.filter(m => m.id !== user?.id).map(member => {
                      const roleInfo = getRoleLabel(member.role);
                      return (
                        <option key={member.id} value={member.id}>
                          {member.first_name} {member.last_name} ({roleInfo.label})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Titre du rappel</label>
                <input
                  type="text"
                  placeholder="Ex: Relance suite à démo"
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  value={newFollowup.title}
                  onChange={(e) => setNewFollowup({...newFollowup, title: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Type d'action *</label>
                  <select
                    required
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    value={newFollowup.type}
                    onChange={(e) => setNewFollowup({...newFollowup, type: e.target.value})}
                  >
                    {FOLLOWUP_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Priorité *</label>
                  <select
                    required
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    value={newFollowup.priority}
                    onChange={(e) => setNewFollowup({...newFollowup, priority: e.target.value})}
                  >
                    <option value="low">Basse</option>
                    <option value="medium">Moyenne</option>
                    <option value="high">Haute</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Date *</label>
                  <input
                    type="date"
                    required
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    value={newFollowup.scheduled_date}
                    onChange={(e) => setNewFollowup({...newFollowup, scheduled_date: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Heure</label>
                  <input
                    type="time"
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    value={newFollowup.scheduled_time}
                    onChange={(e) => setNewFollowup({...newFollowup, scheduled_time: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Notes / Contexte</label>
                <textarea
                  rows="4"
                  placeholder="Ajoutez des notes sur ce rappel..."
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  value={newFollowup.notes}
                  onChange={(e) => setNewFollowup({...newFollowup, notes: e.target.value})}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all"
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  Créer le rappel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmation Suppression */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md">
            <h3 className="text-xl font-bold mb-4 text-red-600">Confirmer la suppression</h3>
            <p className="text-gray-700 mb-6">
              Êtes-vous sûr de vouloir supprimer ce rappel ? Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  handleDelete(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-semibold hover:shadow-lg"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reprogrammer */}
      {rescheduleModalId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4 text-orange-600">Reprogrammer le rappel</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Nouvelle date</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Nouvelle heure</label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setRescheduleModalId(null);
                  setRescheduleDate('');
                  setRescheduleTime('');
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleReschedule}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg font-semibold hover:shadow-lg"
              >
                Reprogrammer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Qualification (après appel) */}
      {qualifyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header avec infos lead */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Target className="w-6 h-6" />
                  Qualifier le lead
                </h3>
                <button
                  onClick={() => setQualifyModal(null)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Infos du lead */}
              <div className="bg-white/10 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Building2 className="w-5 h-5" />
                  <span className="font-bold text-lg">{qualifyModal.company_name || 'Lead'}</span>
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  {qualifyModal.lead_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {qualifyModal.lead_email}
                    </div>
                  )}
                  {qualifyModal.lead_phone && (
                    <a
                      href={`tel:${qualifyModal.lead_phone}`}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <Phone className="w-4 h-4" />
                      {qualifyModal.lead_phone}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Contenu du modal */}
            <div className="p-6 space-y-6">
              {/* Sélection de qualification */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Résultat de l'appel *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {QUALIFICATION_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setQualifyData({...qualifyData, qualification: option.value})}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        qualifyData.qualification === option.value
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{option.icon}</span>
                        <span className="font-semibold text-gray-900">{option.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Notes de l'appel
                </label>
                <textarea
                  rows="3"
                  placeholder="Résumé de la conversation, points importants..."
                  value={qualifyData.notes}
                  onChange={(e) => setQualifyData({...qualifyData, notes: e.target.value})}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                />
              </div>

              {/* Prochain suivi (optionnel) */}
              {(qualifyData.qualification === 'a_relancer' || qualifyData.qualification === 'qualifie') && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <label className="block text-sm font-bold text-yellow-800 mb-3">
                    Programmer un nouveau rappel
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Date</label>
                      <input
                        type="date"
                        value={qualifyData.nextFollowupDate}
                        onChange={(e) => setQualifyData({...qualifyData, nextFollowupDate: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Heure</label>
                      <input
                        type="time"
                        value={qualifyData.nextFollowupTime}
                        onChange={(e) => setQualifyData({...qualifyData, nextFollowupTime: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Valeur du deal (optionnel) */}
              {(qualifyData.qualification === 'tres_qualifie' || qualifyData.qualification === 'proposition') && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <label className="block text-sm font-bold text-green-800 mb-2">
                    Valeur estimée du deal (€)
                  </label>
                  <input
                    type="number"
                    placeholder="Ex: 5000"
                    value={qualifyData.dealValue}
                    onChange={(e) => setQualifyData({...qualifyData, dealValue: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-green-500 outline-none"
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-gray-50 border-t flex gap-3 rounded-b-2xl">
              <button
                onClick={() => setQualifyModal(null)}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleQualifyFromRappel}
                disabled={!qualifyData.qualification}
                className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${
                  qualifyData.qualification
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Valider & Mettre à jour le pipeline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
