import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Clock,
  MapPin,
  Users,
  Edit2,
  Trash2,
  Phone,
  Video,
  Briefcase,
  Coffee,
  AlertCircle,
  Check,
  Filter,
  Bell,
  BellRing,
  UserX,
  Thermometer,
  Palmtree,
  Timer,
  Sun,
  SunDim,
  CalendarCheck,
  Loader2
} from 'lucide-react';

// Event types with new categories
const EVENT_TYPES = {
  meeting: { label: 'Réunion', color: 'bg-blue-500', icon: Users },
  call: { label: 'Appel', color: 'bg-green-500', icon: Phone },
  video: { label: 'Visio', color: 'bg-purple-500', icon: Video },
  task: { label: 'Tâche', color: 'bg-orange-500', icon: Briefcase },
  break: { label: 'Pause', color: 'bg-gray-500', icon: Coffee },
  other: { label: 'Autre', color: 'bg-indigo-500', icon: Calendar },
  absence: { label: 'Absent', color: 'bg-red-500', icon: UserX },
  sick_leave: { label: 'Maladie', color: 'bg-rose-500', icon: Thermometer },
  vacation: { label: 'Congé', color: 'bg-teal-500', icon: Palmtree },
  late: { label: 'Retard', color: 'bg-amber-500', icon: Timer },
  full_day: { label: 'Journée', color: 'bg-sky-500', icon: Sun },
  half_day: { label: 'Demi-journée', color: 'bg-sky-400', icon: SunDim },
  follow_up: { label: 'Rappel', color: 'bg-pink-500', icon: BellRing }
};

const USER_COLORS = [
  '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#14B8A6',
  '#6366F1', '#78716C'
];

const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const DAYS_FULL = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);

export default function Planning() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [viewMode, setViewMode] = useState('month');
  const [showTeamEvents, setShowTeamEvents] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [userColorMap, setUserColorMap] = useState({});
  const [notifications, setNotifications] = useState([]);
  const notificationIntervalRef = useRef(null);
  const [selectedMemberId, setSelectedMemberId] = useState(null); // Pour filtrer le planning d'un membre
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'meeting',
    start_date: '',
    start_time: '09:00',
    end_date: '',
    end_time: '10:00',
    location: '',
    attendees: [],
    all_day: false
  });

  const isManager = user?.role === 'manager' || user?.role === 'admin';

  useEffect(() => {
    loadEvents();
    if (isManager) {
      loadTeamMembers();
    }
    loadFollowUps();

    notificationIntervalRef.current = setInterval(checkNotifications, 60000);
    checkNotifications();

    return () => {
      if (notificationIntervalRef.current) {
        clearInterval(notificationIntervalRef.current);
      }
    };
  }, [currentDate, showTeamEvents, viewMode]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      let startDate, endDate;

      if (viewMode === 'month') {
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      } else if (viewMode === 'week') {
        const day = currentDate.getDay();
        const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1);
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), diff);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
      } else {
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
        endDate = new Date(startDate);
      }

      const response = await api.get('/planning', {
        params: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          include_team: showTeamEvents
        }
      });
      setEvents(response.data.events || []);
    } catch (err) {
      console.error('Erreur chargement planning:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamMembers = async () => {
    try {
      const response = await api.get('/users/team');
      const members = response.data.users || [];
      setTeamMembers(members);

      const colorMap = {};
      members.forEach((member, index) => {
        colorMap[member.id] = member.planning_color || USER_COLORS[index % USER_COLORS.length];
      });
      colorMap[user?.id] = user?.planning_color || USER_COLORS[0];
      setUserColorMap(colorMap);
    } catch (err) {
      console.error('Erreur chargement équipe:', err);
    }
  };

  const loadFollowUps = async () => {
    try {
      const response = await api.get('/follow-ups', {
        params: { status: 'pending' }
      });
      const fups = (response.data.followups || []).map(f => ({
        ...f,
        id: `followup-${f.id}`,
        original_id: f.id,
        title: f.title || `Rappel: ${f.company_name || 'Lead'}`,
        event_type: 'follow_up',
        start_date: f.scheduled_date,
        start_time: f.scheduled_time || '09:00',
        end_time: f.scheduled_time ? addMinutes(f.scheduled_time, 30) : '09:30',
        is_follow_up: true,
        all_day: false
      }));
      setFollowUps(fups);
    } catch (err) {
      console.error('Erreur chargement rappels:', err);
    }
  };

  const addMinutes = (time, mins) => {
    const [h, m] = time.split(':').map(Number);
    const totalMins = h * 60 + m + mins;
    const newH = Math.floor(totalMins / 60) % 24;
    const newM = totalMins % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  };

  const checkNotifications = useCallback(() => {
    const now = new Date();
    const allEvts = [...events, ...followUps];

    allEvts.forEach(event => {
      const eventDate = new Date(event.start_date);
      if (event.start_time) {
        const [h, m] = event.start_time.split(':');
        eventDate.setHours(parseInt(h), parseInt(m), 0, 0);
      }

      const diffMs = eventDate - now;
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins > 28 && diffMins <= 32 && !event.notified_30) {
        showNotificationPopup(event, '30 minutes');
        event.notified_30 = true;
      }
      if (diffMins > 13 && diffMins <= 17 && !event.notified_15) {
        showNotificationPopup(event, '15 minutes');
        event.notified_15 = true;
      }
      if (diffMins >= -2 && diffMins <= 2 && !event.notified_ontime) {
        showNotificationPopup(event, "C'est maintenant!");
        event.notified_ontime = true;
      }
    });
  }, [events, followUps]);

  const showNotificationPopup = (event, timeText) => {
    const newNotif = {
      id: `${event.id}-${Date.now()}`,
      event,
      timeText,
      show: true
    };
    setNotifications(prev => [...prev, newNotif]);

    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
    }, 10000);

    if (Notification.permission === 'granted') {
      new Notification(`Rappel: ${event.title}`, {
        body: `Dans ${timeText}`,
        icon: '/favicon.ico'
      });
    }
  };

  const dismissNotification = (notifId) => {
    setNotifications(prev => prev.filter(n => n.id !== notifId));
  };

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const allEvents = useMemo(() => {
    const combined = [...events, ...followUps];
    // Si un membre spécifique est sélectionné, filtrer ses événements uniquement
    if (selectedMemberId) {
      return combined.filter(e => e.user_id === selectedMemberId);
    }
    return combined;
  }, [events, followUps, selectedMemberId]);

  const handlePrevPeriod = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (viewMode === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - 7);
      setCurrentDate(newDate);
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - 1);
      setCurrentDate(newDate);
    }
  };

  const handleNextPeriod = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (viewMode === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 7);
      setCurrentDate(newDate);
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 1);
      setCurrentDate(newDate);
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    let startDayOfWeek = firstDay.getDay();
    if (startDayOfWeek === 0) startDayOfWeek = 7;
    startDayOfWeek -= 1;

    const days = [];

    const prevMonth = new Date(year, month, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        isCurrentMonth: false
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }

    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }

    return days;
  };

  const getWeekDays = () => {
    const days = [];
    const day = currentDate.getDay();
    const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(currentDate.getFullYear(), currentDate.getMonth(), diff);

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push({ date: d, isCurrentMonth: true });
    }
    return days;
  };

  const getEventsForDate = (date) => {
    return allEvents.filter(event => {
      const eventDate = new Date(event.start_date);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const getEventsForHour = (date, hour) => {
    return allEvents.filter(event => {
      const eventDate = new Date(event.start_date);
      if (eventDate.toDateString() !== date.toDateString()) return false;
      if (!event.start_time) return false;
      const eventHour = parseInt(event.start_time.split(':')[0]);
      return eventHour === hour;
    });
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getEventColor = (event) => {
    if (showTeamEvents && event.user_id && event.user_id !== user?.id) {
      return userColorMap[event.user_id] || '#6B7280';
    }
    return null;
  };

  const openCreateModal = (date, hour = null) => {
    const dateStr = date.toISOString().split('T')[0];
    setFormData({
      title: '',
      description: '',
      event_type: 'meeting',
      start_date: dateStr,
      start_time: hour ? `${String(hour).padStart(2, '0')}:00` : '09:00',
      end_date: dateStr,
      end_time: hour ? `${String(hour + 1).padStart(2, '0')}:00` : '10:00',
      location: '',
      attendees: [],
      all_day: false
    });
    setSelectedEvent(null);
    setShowModal(true);
  };

  const openEditModal = (event) => {
    if (event.is_follow_up) return;
    const startDate = new Date(event.start_date);
    const endDate = event.end_date ? new Date(event.end_date) : startDate;

    setFormData({
      title: event.title || '',
      description: event.description || '',
      event_type: event.event_type || 'meeting',
      start_date: startDate.toISOString().split('T')[0],
      start_time: event.start_time || '09:00',
      end_date: endDate.toISOString().split('T')[0],
      end_time: event.end_time || '10:00',
      location: event.location || '',
      attendees: event.attendees || [],
      all_day: event.all_day || false
    });
    setSelectedEvent(event);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🚀 handleSubmit appelé avec formData:', formData);

    if (!formData.title.trim()) {
      alert('Veuillez entrer un titre');
      return;
    }

    if (!formData.start_date) {
      alert('Veuillez sélectionner une date');
      return;
    }

    try {
      setSaving(true);
      console.log('📝 Envoi de la requête API...');

      const payload = {
        ...formData,
        title: formData.title.trim()
      };
      console.log('📦 Payload:', payload);

      if (selectedEvent) {
        const response = await api.put(`/planning/${selectedEvent.id}`, payload);
        console.log('✅ Réponse PUT:', response.data);
      } else {
        const response = await api.post('/planning', payload);
        console.log('✅ Réponse POST:', response.data);
      }

      setShowModal(false);
      setFormData({
        title: '',
        description: '',
        event_type: 'meeting',
        start_date: '',
        start_time: '09:00',
        end_date: '',
        end_time: '10:00',
        location: '',
        attendees: [],
        all_day: false
      });
      loadEvents();
    } catch (err) {
      console.error('❌ Erreur sauvegarde événement:', err);
      console.error('❌ Response data:', err.response?.data);
      alert(err.response?.data?.error || err.response?.data?.details || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (eventId) => {
    if (!confirm('Supprimer cet événement ?')) return;

    try {
      await api.delete(`/planning/${eventId}`);
      loadEvents();
    } catch (err) {
      console.error('Erreur suppression événement:', err);
    }
  };

  const days = useMemo(() => {
    console.log('📆 days useMemo - viewMode:', viewMode, 'currentDate:', currentDate, 'currentDate.getDay():', currentDate.getDay());
    if (viewMode === 'month') return getDaysInMonth();
    if (viewMode === 'week') return getWeekDays();
    // Pour la vue jour, créer un nouveau Date pour éviter les problèmes de référence
    const dayDate = new Date(currentDate.getTime());
    console.log('📆 Vue jour - dayDate:', dayDate, 'dayDate.getDay():', dayDate.getDay());
    return [{ date: dayDate, isCurrentMonth: true }];
  }, [currentDate, viewMode]);

  const getPeriodLabel = () => {
    if (viewMode === 'month') {
      return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    } else if (viewMode === 'week') {
      const weekDays = getWeekDays();
      const start = weekDays[0].date;
      const end = weekDays[6].date;
      if (start.getMonth() === end.getMonth()) {
        return `${start.getDate()} - ${end.getDate()} ${MONTHS[start.getMonth()]} ${start.getFullYear()}`;
      }
      return `${start.getDate()} ${MONTHS[start.getMonth()]} - ${end.getDate()} ${MONTHS[end.getMonth()]} ${start.getFullYear()}`;
    }
    return `${DAYS_FULL[currentDate.getDay()]} ${currentDate.getDate()} ${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  };

  // Membres de l'équipe sans le manager actuel (pour éviter le doublon)
  const otherTeamMembers = useMemo(() => {
    return teamMembers.filter(m => m.id !== user?.id);
  }, [teamMembers, user?.id]);

  const handleMemberClick = (memberId) => {
    if (selectedMemberId === memberId) {
      setSelectedMemberId(null); // Désélectionner si déjà sélectionné
    } else {
      setSelectedMemberId(memberId);
    }
  };

  const getSelectedMemberName = () => {
    if (!selectedMemberId) return null;
    if (selectedMemberId === user?.id) return 'Moi';
    const member = teamMembers.find(m => m.id === selectedMemberId);
    return member ? `${member.first_name} ${member.last_name}` : null;
  };

  const TeamLegend = () => {
    if (!showTeamEvents || (otherTeamMembers.length === 0 && !user)) return null;

    return (
      <div className="mb-4 p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Membres de l'équipe
          </h4>
          {selectedMemberId && (
            <button
              onClick={() => setSelectedMemberId(null)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Voir tous
            </button>
          )}
        </div>
        {selectedMemberId && (
          <div className="mb-3 px-3 py-2 bg-indigo-50 rounded-lg text-sm text-indigo-700 font-medium">
            Affichage du planning de : {getSelectedMemberName()}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {/* Moi (utilisateur actuel) - toujours en premier */}
          <button
            onClick={() => handleMemberClick(user?.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all cursor-pointer ${
              selectedMemberId === user?.id
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-300'
                : selectedMemberId === null
                  ? 'bg-indigo-50 hover:bg-indigo-100'
                  : 'bg-gray-100 hover:bg-gray-200 opacity-60'
            }`}
          >
            <div
              className="w-3 h-3 rounded-full shadow-sm"
              style={{ backgroundColor: selectedMemberId === user?.id ? '#fff' : (userColorMap[user?.id] || '#3B82F6') }}
            />
            <span className={`text-sm font-medium ${selectedMemberId === user?.id ? 'text-white' : 'text-indigo-700'}`}>
              Moi
            </span>
          </button>
          {/* Autres membres de l'équipe */}
          {otherTeamMembers.map(member => (
            <button
              key={member.id}
              onClick={() => handleMemberClick(member.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                selectedMemberId === member.id
                  ? 'ring-2 ring-offset-1 text-white'
                  : selectedMemberId === null
                    ? 'bg-gray-50 hover:bg-gray-100'
                    : 'bg-gray-100 hover:bg-gray-200 opacity-60'
              }`}
              style={selectedMemberId === member.id ? { backgroundColor: userColorMap[member.id] || '#6B7280' } : {}}
            >
              <div
                className="w-3 h-3 rounded-full shadow-sm"
                style={{ backgroundColor: selectedMemberId === member.id ? '#fff' : (userColorMap[member.id] || '#6B7280') }}
              />
              <span className={`text-sm ${selectedMemberId === member.id ? 'text-white font-medium' : 'text-gray-600'}`}>
                {member.first_name} {member.last_name}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Cliquez sur un membre pour voir uniquement son planning
        </p>
      </div>
    );
  };

  const renderDayCell = (day, index) => {
    const dayEvents = getEventsForDate(day.date);
    const isTodayDate = isToday(day.date);

    return (
      <div
        key={index}
        onClick={() => openCreateModal(day.date)}
        className={`min-h-[100px] p-2 border rounded-xl cursor-pointer transition-all duration-200 ${
          day.isCurrentMonth
            ? 'bg-white hover:bg-indigo-50/50 border-gray-100 hover:border-indigo-200 hover:shadow-sm'
            : 'bg-gray-50/50 border-gray-50 text-gray-400'
        } ${isTodayDate ? 'ring-2 ring-indigo-500 ring-offset-2 bg-indigo-50/30' : ''}`}
      >
        <div className={`text-sm font-semibold mb-1 ${
          isTodayDate ? 'text-indigo-600' : day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
        }`}>
          {day.date.getDate()}
        </div>

        <div className="space-y-1">
          {dayEvents.slice(0, 3).map(event => {
            const eventType = EVENT_TYPES[event.event_type] || EVENT_TYPES.other;
            const customColor = getEventColor(event);
            return (
              <div
                key={event.id}
                onClick={(e) => {
                  e.stopPropagation();
                  openEditModal(event);
                }}
                className={`text-xs px-2 py-1 rounded-lg truncate text-white font-medium shadow-sm ${customColor ? '' : eventType.color} hover:opacity-90 transition-opacity`}
                style={customColor ? { backgroundColor: customColor } : {}}
                title={`${event.title}${event.owner_name ? ` - ${event.owner_name}` : ''}`}
              >
                {event.start_time && <span className="opacity-80 mr-1">{event.start_time}</span>}
                {event.title}
              </div>
            );
          })}
          {dayEvents.length > 3 && (
            <div className="text-xs text-indigo-600 font-medium pl-1">
              +{dayEvents.length - 3} autres
            </div>
          )}
        </div>
      </div>
    );
  };

  // Vue jour/semaine améliorée
  const renderTimeGrid = () => {
    // Utiliser le tableau days mémorisé pour assurer la cohérence
    const gridDays = days;
    console.log('🗓️ renderTimeGrid - viewMode:', viewMode, 'gridDays:', gridDays.length, 'currentDate:', currentDate);

    return (
      <div className="bg-white rounded-2xl overflow-hidden">
        {/* Header avec les jours */}
        <div className="grid border-b border-gray-200" style={{ gridTemplateColumns: `100px repeat(${gridDays.length}, 1fr)` }}>
          <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 border-r border-gray-200">
            <Clock className="w-5 h-5 text-gray-400 mx-auto" />
          </div>
          {gridDays.map((day, idx) => {
            const isTodayDate = isToday(day.date);
            // S'assurer que day.date est bien un objet Date
            const dateObj = day.date instanceof Date ? day.date : new Date(day.date);
            const dayOfWeek = dateObj.getDay();
            const dayName = DAYS[dayOfWeek];
            console.log(`📅 Jour ${idx}: date=${dateObj.toISOString()}, getDay()=${dayOfWeek}, dayName=${dayName}`);
            return (
              <div
                key={idx}
                className={`p-4 text-center border-r border-gray-100 last:border-r-0 transition-colors ${
                  isTodayDate
                    ? 'bg-gradient-to-br from-indigo-50 to-purple-50'
                    : 'bg-gradient-to-br from-gray-50 to-white'
                }`}
              >
                <div className={`text-sm font-medium ${isTodayDate ? 'text-indigo-600' : 'text-gray-500'}`}>
                  {dayName}
                </div>
                <div className={`text-2xl font-bold mt-1 ${isTodayDate ? 'text-indigo-700' : 'text-gray-900'}`}>
                  {dateObj.getDate()}
                </div>
                {isTodayDate && (
                  <div className="text-xs text-indigo-500 font-medium mt-1">Aujourd'hui</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Grille horaire */}
        <div className="max-h-[600px] overflow-y-auto">
          {HOURS.map((hour, hourIdx) => (
            <div
              key={hour}
              className="grid border-b border-gray-100 last:border-b-0"
              style={{ gridTemplateColumns: `100px repeat(${gridDays.length}, 1fr)` }}
            >
              {/* Colonne des heures */}
              <div className="p-3 border-r border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-start justify-end">
                <span className="text-sm font-medium text-gray-500 tabular-nums">
                  {String(hour).padStart(2, '0')}:00
                </span>
              </div>

              {/* Cellules pour chaque jour */}
              {gridDays.map((day, dayIdx) => {
                const hourEvents = getEventsForHour(day.date, hour);
                const isTodayDate = isToday(day.date);

                return (
                  <div
                    key={dayIdx}
                    onClick={() => openCreateModal(day.date, hour)}
                    className={`min-h-[70px] p-2 border-r border-gray-100 last:border-r-0 cursor-pointer transition-all duration-200 group relative ${
                      isTodayDate
                        ? 'bg-indigo-50/20 hover:bg-indigo-50/50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {/* Indicateur de survol */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="absolute inset-2 border-2 border-dashed border-indigo-300 rounded-xl flex items-center justify-center">
                        <Plus className="w-5 h-5 text-indigo-400" />
                      </div>
                    </div>

                    {/* Événements */}
                    <div className="relative z-10 space-y-1">
                      {hourEvents.map(event => {
                        const eventType = EVENT_TYPES[event.event_type] || EVENT_TYPES.other;
                        const customColor = getEventColor(event);
                        const Icon = eventType.icon;

                        return (
                          <div
                            key={event.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(event);
                            }}
                            className={`p-2 rounded-xl text-white shadow-md hover:shadow-lg transition-shadow cursor-pointer ${customColor ? '' : eventType.color}`}
                            style={customColor ? { backgroundColor: customColor } : {}}
                            title={event.title}
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="w-3.5 h-3.5 flex-shrink-0 opacity-80" />
                              <span className="text-xs font-semibold truncate">{event.title}</span>
                            </div>
                            <div className="text-[10px] opacity-80 mt-0.5">
                              {event.start_time} - {event.end_time}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Chargement du planning...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-3">
        {notifications.map(notif => (
          <div
            key={notif.id}
            className="bg-white rounded-2xl shadow-2xl border border-indigo-100 p-4 max-w-sm animate-bounce-in"
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                <BellRing className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900">{notif.event.title}</p>
                <p className="text-sm text-indigo-600 font-semibold">{notif.timeText}</p>
                {notif.event.location && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" /> {notif.event.location}
                  </p>
                )}
              </div>
              <button
                onClick={() => dismissNotification(notif.id)}
                className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              Planning
            </h1>
            <p className="text-gray-600 mt-2">
              Gérez votre emploi du temps et vos rendez-vous
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isManager && (
              <button
                onClick={() => setShowTeamEvents(!showTeamEvents)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                  showTeamEvents
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200'
                    : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50'
                }`}
              >
                <Users className="w-5 h-5" />
                Planning équipe
              </button>
            )}
            <button
              onClick={() => openCreateModal(new Date())}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-200"
            >
              <Plus className="w-5 h-5" />
              Nouvel événement
            </button>
          </div>
        </div>
      </div>

      <TeamLegend />

      {/* Calendar Navigation */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-4 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrevPeriod}
              className="p-2.5 hover:bg-indigo-50 rounded-xl transition-colors border border-gray-200"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h2 className="text-xl font-bold text-gray-900 min-w-[280px] text-center">
              {getPeriodLabel()}
            </h2>
            <button
              onClick={handleNextPeriod}
              className="p-2.5 hover:bg-indigo-50 rounded-xl transition-colors border border-gray-200"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleToday}
              className="px-4 py-2 text-sm font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-xl transition-colors"
            >
              Aujourd'hui
            </button>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              {['day', 'week', 'month'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    viewMode === mode
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {mode === 'day' ? 'Jour' : mode === 'week' ? 'Semaine' : 'Mois'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="p-4">
          {viewMode === 'month' ? (
            <>
              <div className="grid grid-cols-7 mb-3">
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                  <div key={day} className="text-center text-sm font-semibold text-gray-500 py-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {days.map((day, index) => renderDayCell(day, index))}
              </div>
            </>
          ) : (
            renderTimeGrid()
          )}
        </div>
      </div>

      {/* Event List for Today */}
      <div className="mt-6 bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
            <Clock className="w-5 h-5 text-indigo-600" />
          </div>
          Événements d'aujourd'hui
        </h3>

        {getEventsForDate(new Date()).length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucun événement aujourd'hui</p>
          </div>
        ) : (
          <div className="space-y-3">
            {getEventsForDate(new Date()).map(event => {
              const eventType = EVENT_TYPES[event.event_type] || EVENT_TYPES.other;
              const Icon = eventType.icon;
              const customColor = getEventColor(event);

              return (
                <div
                  key={event.id}
                  className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all"
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md ${customColor ? '' : eventType.color}`}
                    style={customColor ? { backgroundColor: customColor } : {}}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{event.title}</h4>
                    <p className="text-sm text-gray-500">
                      {event.start_time} - {event.end_time}
                      {event.location && ` • ${event.location}`}
                      {event.owner_name && event.user_id !== user?.id && ` • ${event.owner_name}`}
                    </p>
                  </div>
                  {!event.is_follow_up && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(event)}
                        className="p-2.5 text-gray-400 hover:text-indigo-600 rounded-xl hover:bg-indigo-50 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="p-2.5 text-gray-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {event.is_follow_up && (
                    <span className="text-xs bg-pink-100 text-pink-700 px-3 py-1.5 rounded-full font-medium">
                      Rappel
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Create/Edit Event */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedEvent ? 'Modifier l\'événement' : 'Nouvel événement'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-white rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Titre *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                  placeholder="Ex: Réunion client, Appel prospect..."
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Type
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(EVENT_TYPES).slice(0, 8).map(([key, type]) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData({ ...formData, event_type: key })}
                        className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border-2 transition-all ${
                          formData.event_type === key
                            ? `${type.color} text-white border-transparent shadow-lg`
                            : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs font-medium">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Date de début *
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value, end_date: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Heure de début
                  </label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                    disabled={formData.all_day}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Date de fin
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Heure de fin
                  </label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                    disabled={formData.all_day}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <input
                  type="checkbox"
                  id="all_day"
                  checked={formData.all_day}
                  onChange={(e) => setFormData({ ...formData, all_day: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="all_day" className="text-sm font-medium text-gray-700">
                  Journée entière
                </label>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Lieu
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                    placeholder="Adresse ou lien visio"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all resize-none"
                  placeholder="Détails de l'événement..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-medium shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    selectedEvent ? 'Mettre à jour' : 'Créer'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce-in {
          0% { transform: translateX(100px); opacity: 0; }
          50% { transform: translateX(-10px); }
          100% { transform: translateX(0); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
