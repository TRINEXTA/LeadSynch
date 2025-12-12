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
  CalendarCheck
} from 'lucide-react';

// Event types with new categories
const EVENT_TYPES = {
  meeting: { label: 'Réunion', color: 'bg-blue-500', icon: Users },
  call: { label: 'Appel', color: 'bg-green-500', icon: Phone },
  video: { label: 'Visio', color: 'bg-purple-500', icon: Video },
  task: { label: 'Tâche', color: 'bg-orange-500', icon: Briefcase },
  break: { label: 'Pause', color: 'bg-gray-500', icon: Coffee },
  other: { label: 'Autre', color: 'bg-indigo-500', icon: Calendar },
  // New categories
  absence: { label: 'Absent', color: 'bg-red-500', icon: UserX },
  sick_leave: { label: 'Maladie', color: 'bg-rose-500', icon: Thermometer },
  vacation: { label: 'Congé', color: 'bg-teal-500', icon: Palmtree },
  late: { label: 'Retard', color: 'bg-amber-500', icon: Timer },
  full_day: { label: 'Journée', color: 'bg-sky-500', icon: Sun },
  half_day: { label: 'Demi-journée', color: 'bg-sky-400', icon: SunDim },
  follow_up: { label: 'Rappel', color: 'bg-pink-500', icon: BellRing }
};

// User colors for team planning
const USER_COLORS = [
  '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#14B8A6',
  '#6366F1', '#78716C'
];

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DAYS_FULL = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7h to 20h

export default function Planning() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewMode, setViewMode] = useState('month'); // month, week, day
  const [showTeamEvents, setShowTeamEvents] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [userColorMap, setUserColorMap] = useState({});
  const [notifications, setNotifications] = useState([]);
  const notificationIntervalRef = useRef(null);
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

    // Setup notification checker
    notificationIntervalRef.current = setInterval(checkNotifications, 60000); // Check every minute
    checkNotifications(); // Initial check

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
        startDate = new Date(currentDate.setDate(diff));
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), startDate.getDate());
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

      // Create color map for team members
      const colorMap = {};
      members.forEach((member, index) => {
        colorMap[member.id] = member.planning_color || USER_COLORS[index % USER_COLORS.length];
      });
      // Add current user
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
    const allEvents = [...events, ...followUps];

    allEvents.forEach(event => {
      const eventDate = new Date(event.start_date);
      if (event.start_time) {
        const [h, m] = event.start_time.split(':');
        eventDate.setHours(parseInt(h), parseInt(m), 0, 0);
      }

      const diffMs = eventDate - now;
      const diffMins = Math.floor(diffMs / 60000);

      // Check for 30 min notification
      if (diffMins > 28 && diffMins <= 32 && !event.notified_30) {
        showNotification(event, '30 minutes');
        event.notified_30 = true;
      }
      // Check for 15 min notification
      if (diffMins > 13 && diffMins <= 17 && !event.notified_15) {
        showNotification(event, '15 minutes');
        event.notified_15 = true;
      }
      // Check for on-time notification
      if (diffMins >= -2 && diffMins <= 2 && !event.notified_ontime) {
        showNotification(event, "C'est maintenant!");
        event.notified_ontime = true;
      }
    });
  }, [events, followUps]);

  const showNotification = (event, timeText) => {
    const newNotif = {
      id: `${event.id}-${Date.now()}`,
      event,
      timeText,
      show: true
    };
    setNotifications(prev => [...prev, newNotif]);

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
    }, 10000);

    // Browser notification if permission granted
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

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Combined events + follow-ups
  const allEvents = useMemo(() => {
    return [...events, ...followUps];
  }, [events, followUps]);

  const handlePrevPeriod = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000));
    } else {
      setCurrentDate(new Date(currentDate.getTime() - 24 * 60 * 60 * 1000));
    }
  };

  const handleNextPeriod = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000));
    } else {
      setCurrentDate(new Date(currentDate.getTime() + 24 * 60 * 60 * 1000));
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

    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6;

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
    const eventType = EVENT_TYPES[event.event_type] || EVENT_TYPES.other;
    return null; // Use CSS class instead
  };

  const openCreateModal = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    setFormData({
      title: '',
      description: '',
      event_type: 'meeting',
      start_date: dateStr,
      start_time: '09:00',
      end_date: dateStr,
      end_time: '10:00',
      location: '',
      attendees: [],
      all_day: false
    });
    setSelectedEvent(null);
    setSelectedDate(date);
    setShowModal(true);
  };

  const openEditModal = (event) => {
    if (event.is_follow_up) {
      // Can't edit follow-ups from here, just view
      return;
    }
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

    try {
      if (selectedEvent) {
        await api.put(`/planning/${selectedEvent.id}`, formData);
      } else {
        await api.post('/planning', formData);
      }
      setShowModal(false);
      loadEvents();
    } catch (err) {
      console.error('Erreur sauvegarde événement:', err);
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
    if (viewMode === 'month') return getDaysInMonth();
    if (viewMode === 'week') return getWeekDays();
    return [{ date: currentDate, isCurrentMonth: true }];
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
    return `${DAYS_FULL[(currentDate.getDay() + 6) % 7]} ${currentDate.getDate()} ${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  };

  // Team members legend
  const TeamLegend = () => {
    if (!showTeamEvents || teamMembers.length === 0) return null;

    return (
      <div className="mb-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Membres de l'équipe
        </h4>
        <div className="flex flex-wrap gap-3">
          {teamMembers.map(member => (
            <div key={member.id} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: userColorMap[member.id] || '#6B7280' }}
              />
              <span className="text-sm text-gray-600">{member.first_name} {member.last_name}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: userColorMap[user?.id] || '#3B82F6' }}
            />
            <span className="text-sm text-gray-600 font-medium">Moi</span>
          </div>
        </div>
      </div>
    );
  };

  // Render day cell for month view
  const renderDayCell = (day, index) => {
    const dayEvents = getEventsForDate(day.date);
    const isTodayDate = isToday(day.date);

    return (
      <div
        key={index}
        onClick={() => openCreateModal(day.date)}
        className={`min-h-[100px] p-2 border rounded-lg cursor-pointer transition-colors ${
          day.isCurrentMonth
            ? 'bg-white hover:bg-gray-50 border-gray-100'
            : 'bg-gray-50 border-gray-50 text-gray-400'
        } ${isTodayDate ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
      >
        <div className={`text-sm font-medium mb-1 ${
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
                className={`text-xs px-1.5 py-0.5 rounded truncate text-white ${customColor ? '' : eventType.color} hover:opacity-80`}
                style={customColor ? { backgroundColor: customColor } : {}}
                title={`${event.title}${event.owner_name ? ` - ${event.owner_name}` : ''}`}
              >
                {event.start_time && <span className="opacity-75 mr-1">{event.start_time}</span>}
                {event.title}
              </div>
            );
          })}
          {dayEvents.length > 3 && (
            <div className="text-xs text-gray-500">
              +{dayEvents.length - 3} autres
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render week/day view with hours
  const renderTimeGrid = () => {
    const displayDays = viewMode === 'day' ? [{ date: currentDate, isCurrentMonth: true }] : days;

    return (
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header with days */}
          <div className="grid" style={{ gridTemplateColumns: `80px repeat(${displayDays.length}, 1fr)` }}>
            <div className="p-2 border-b border-r bg-gray-50"></div>
            {displayDays.map((day, idx) => (
              <div
                key={idx}
                className={`p-3 border-b text-center ${isToday(day.date) ? 'bg-indigo-50' : 'bg-gray-50'}`}
              >
                <div className="text-sm text-gray-500">{DAYS[idx % 7]}</div>
                <div className={`text-xl font-bold ${isToday(day.date) ? 'text-indigo-600' : 'text-gray-900'}`}>
                  {day.date.getDate()}
                </div>
              </div>
            ))}
          </div>

          {/* Hour rows */}
          {HOURS.map(hour => (
            <div
              key={hour}
              className="grid"
              style={{ gridTemplateColumns: `80px repeat(${displayDays.length}, 1fr)` }}
            >
              <div className="p-2 border-r border-b bg-gray-50 text-xs text-gray-500 text-right pr-3">
                {hour}:00
              </div>
              {displayDays.map((day, dayIdx) => {
                const hourEvents = getEventsForHour(day.date, hour);
                return (
                  <div
                    key={dayIdx}
                    onClick={() => {
                      const d = new Date(day.date);
                      d.setHours(hour, 0, 0, 0);
                      const dateStr = day.date.toISOString().split('T')[0];
                      setFormData(prev => ({
                        ...prev,
                        start_date: dateStr,
                        end_date: dateStr,
                        start_time: `${String(hour).padStart(2, '0')}:00`,
                        end_time: `${String(hour + 1).padStart(2, '0')}:00`
                      }));
                      setSelectedEvent(null);
                      setShowModal(true);
                    }}
                    className={`min-h-[60px] border-b border-r p-1 cursor-pointer hover:bg-gray-50 ${
                      isToday(day.date) ? 'bg-indigo-50/30' : ''
                    }`}
                  >
                    {hourEvents.map(event => {
                      const eventType = EVENT_TYPES[event.event_type] || EVENT_TYPES.other;
                      const customColor = getEventColor(event);
                      return (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(event);
                          }}
                          className={`text-xs p-1 mb-1 rounded text-white truncate ${customColor ? '' : eventType.color}`}
                          style={customColor ? { backgroundColor: customColor } : {}}
                          title={event.title}
                        >
                          {event.start_time} {event.title}
                        </div>
                      );
                    })}
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
      {notifications.map(notif => (
        <div
          key={notif.id}
          className="fixed top-4 right-4 z-50 bg-white rounded-xl shadow-2xl border border-indigo-200 p-4 max-w-sm animate-bounce-in"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <BellRing className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{notif.event.title}</p>
              <p className="text-sm text-indigo-600 font-medium">{notif.timeText}</p>
              {notif.event.location && (
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" /> {notif.event.location}
                </p>
              )}
            </div>
            <button
              onClick={() => dismissNotification(notif.id)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      ))}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Calendar className="w-8 h-8 text-indigo-600" />
              Planning
            </h1>
            <p className="text-gray-600 mt-1">
              Gérez votre emploi du temps et vos rendez-vous
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isManager && (
              <button
                onClick={() => setShowTeamEvents(!showTeamEvents)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  showTeamEvents
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Users className="w-4 h-4" />
                Planning équipe
              </button>
            )}
            <button
              onClick={() => openCreateModal(new Date())}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nouvel événement
            </button>
          </div>
        </div>
      </div>

      {/* Team Legend */}
      <TeamLegend />

      {/* Calendar Navigation */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handlePrevPeriod}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900 min-w-[250px] text-center">
              {getPeriodLabel()}
            </h2>
            <button
              onClick={handleNextPeriod}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Aujourd'hui
            </button>
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1.5 text-sm ${
                  viewMode === 'day' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Jour
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 text-sm ${
                  viewMode === 'week' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Semaine
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 text-sm ${
                  viewMode === 'month' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Mois
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="p-4">
          {viewMode === 'month' ? (
            <>
              {/* Days Header */}
              <div className="grid grid-cols-7 mb-2">
                {DAYS.map(day => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((day, index) => renderDayCell(day, index))}
              </div>
            </>
          ) : (
            renderTimeGrid()
          )}
        </div>
      </div>

      {/* Event List for Today */}
      <div className="mt-6 bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-600" />
          Événements d'aujourd'hui
        </h3>

        {getEventsForDate(new Date()).length === 0 ? (
          <p className="text-gray-500 text-center py-4">Aucun événement aujourd'hui</p>
        ) : (
          <div className="space-y-3">
            {getEventsForDate(new Date()).map(event => {
              const eventType = EVENT_TYPES[event.event_type] || EVENT_TYPES.other;
              const Icon = eventType.icon;
              const customColor = getEventColor(event);

              return (
                <div
                  key={event.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${customColor ? '' : eventType.color}`}
                    style={customColor ? { backgroundColor: customColor } : {}}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{event.title}</h4>
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
                        className="p-2 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-white transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-white transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {event.is_follow_up && (
                    <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedEvent ? 'Modifier l\'événement' : 'Nouvel événement'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titre *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(EVENT_TYPES).map(([key, type]) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData({ ...formData, event_type: key })}
                        className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg border transition-colors ${
                          formData.event_type === key
                            ? `${type.color} text-white border-transparent`
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-xs">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de début
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Heure de début
                  </label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    disabled={formData.all_day}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de fin
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Heure de fin
                  </label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    disabled={formData.all_day}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="all_day"
                  checked={formData.all_day}
                  onChange={(e) => setFormData({ ...formData, all_day: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="all_day" className="text-sm text-gray-700">
                  Journée entière
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lieu
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Adresse ou visio"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  placeholder="Détails de l'événement..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {selectedEvent ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce-in {
          0% { transform: translateY(-20px); opacity: 0; }
          50% { transform: translateY(5px); }
          100% { transform: translateY(0); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
