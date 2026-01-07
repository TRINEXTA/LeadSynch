import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, Plus, Check, X, AlertCircle,
  User, Phone, Mail, Building2, ChevronDown, Filter,
  CheckCircle, XCircle, Clock3, TrendingUp, Users, Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';

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
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-blue-600" />
                          <span className="font-semibold text-gray-900">{followup.company_name || 'Lead inconnu'}</span>
                        </div>
                        {followup.lead_email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4" />
                            {followup.lead_email}
                          </div>
                        )}
                        {followup.lead_phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4" />
                            {followup.lead_phone}
                          </div>
                        )}
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
    </div>
  );
}
