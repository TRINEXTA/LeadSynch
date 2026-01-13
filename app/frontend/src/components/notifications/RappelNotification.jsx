import React, { useState, useEffect, useCallback } from 'react';
import { Bell, BellRing, X, Phone, Mail, Clock, Building2, User, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';

// Composant de notification pour les rappels imminents
export default function RappelNotification() {
  const navigate = useNavigate();
  const [upcomingRappels, setUpcomingRappels] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const [notifiedIds, setNotifiedIds] = useState(new Set());

  // Vérifier les rappels toutes les 60 secondes
  const checkUpcomingRappels = useCallback(async () => {
    try {
      const response = await api.get('/follow-ups?status=pending');
      if (response.data.success) {
        const now = new Date();
        const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);

        // Filtrer les rappels dans les 15 prochaines minutes ou en retard
        const upcoming = response.data.followups.filter(f => {
          const scheduledDate = new Date(f.scheduled_date);
          return scheduledDate <= fifteenMinutesFromNow && !f.completed;
        });

        setUpcomingRappels(upcoming);

        // Notifier pour les nouveaux rappels imminents (pas encore notifiés)
        upcoming.forEach(rappel => {
          if (!notifiedIds.has(rappel.id)) {
            const scheduledDate = new Date(rappel.scheduled_date);
            const isOverdue = scheduledDate < now;

            // Notification toast
            toast.custom((t) => (
              <div
                className={`${
                  t.visible ? 'animate-enter' : 'animate-leave'
                } max-w-md w-full bg-white shadow-2xl rounded-xl pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden`}
              >
                <div className={`p-4 ${isOverdue ? 'bg-red-50 border-l-4 border-red-500' : 'bg-orange-50 border-l-4 border-orange-500'}`}>
                  <div className="flex items-start">
                    <div className={`flex-shrink-0 p-2 rounded-full ${isOverdue ? 'bg-red-100' : 'bg-orange-100'}`}>
                      <BellRing className={`h-6 w-6 ${isOverdue ? 'text-red-600 animate-pulse' : 'text-orange-600'}`} />
                    </div>
                    <div className="ml-3 flex-1">
                      <p className={`text-sm font-bold ${isOverdue ? 'text-red-800' : 'text-orange-800'}`}>
                        {isOverdue ? '⚠️ Rappel en retard !' : '🔔 Rappel imminent !'}
                      </p>
                      <p className="mt-1 text-sm text-gray-900 font-semibold">
                        {rappel.company_name || 'Lead'}
                      </p>
                      <p className="text-xs text-gray-600">
                        {rappel.title || 'Rappel programmé'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDateTime(rappel.scheduled_date)}
                      </p>
                      <div className="mt-3 flex gap-2 flex-wrap">
                        {rappel.lead_id && (
                          <button
                            onClick={() => {
                              navigate(`/LeadDetails?id=${rappel.lead_id}`);
                              toast.dismiss(t.id);
                            }}
                            className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700"
                          >
                            Voir le lead
                          </button>
                        )}
                        <button
                          onClick={() => {
                            navigate('/FollowUps');
                            toast.dismiss(t.id);
                          }}
                          className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700"
                        >
                          Tous les rappels
                        </button>
                        <button
                          onClick={() => toast.dismiss(t.id)}
                          className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-300"
                        >
                          Plus tard
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => toast.dismiss(t.id)}
                      className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ), {
              duration: 30000, // 30 secondes
              position: 'top-right',
            });

            // Marquer comme notifié
            setNotifiedIds(prev => new Set([...prev, rappel.id]));
          }
        });
      }
    } catch (error) {
      console.error('Erreur vérification rappels:', error);
    }
  }, [notifiedIds, navigate]);

  useEffect(() => {
    // Vérifier immédiatement au chargement
    checkUpcomingRappels();

    // Puis toutes les 60 secondes
    const interval = setInterval(checkUpcomingRappels, 60000);

    return () => clearInterval(interval);
  }, [checkUpcomingRappels]);

  const formatDateTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date - now;
    const diffMins = Math.round(diffMs / 60000);

    if (diffMins < 0) {
      const absMins = Math.abs(diffMins);
      if (absMins < 60) return `En retard de ${absMins} min`;
      return `En retard de ${Math.floor(absMins / 60)}h${absMins % 60 > 0 ? absMins % 60 + 'min' : ''}`;
    } else if (diffMins === 0) {
      return 'Maintenant !';
    } else if (diffMins < 60) {
      return `Dans ${diffMins} min`;
    } else {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
    }
  };

  const overdueCount = upcomingRappels.filter(r => new Date(r.scheduled_date) < new Date()).length;
  const imminentCount = upcomingRappels.length - overdueCount;

  if (upcomingRappels.length === 0) return null;

  return (
    <>
      {/* Bouton flottant avec badge */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-2xl transition-all transform hover:scale-110 ${
          overdueCount > 0
            ? 'bg-red-600 animate-pulse'
            : 'bg-orange-500'
        }`}
        title={`${upcomingRappels.length} rappel(s) imminent(s)`}
      >
        <BellRing className="w-6 h-6 text-white" />
        <span className="absolute -top-1 -right-1 bg-white text-red-600 text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
          {upcomingRappels.length}
        </span>
      </button>

      {/* Panel des rappels imminents */}
      {showPanel && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-30 z-40"
            onClick={() => setShowPanel(false)}
          />
          <div className="fixed bottom-24 right-6 z-50 w-96 bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[70vh]">
            <div className={`p-4 ${overdueCount > 0 ? 'bg-red-600' : 'bg-orange-500'} text-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BellRing className="w-5 h-5" />
                  <h3 className="font-bold">Rappels Imminents</h3>
                </div>
                <button onClick={() => setShowPanel(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex gap-4 mt-2 text-sm">
                {overdueCount > 0 && (
                  <span className="bg-white/20 px-2 py-1 rounded">
                    {overdueCount} en retard
                  </span>
                )}
                {imminentCount > 0 && (
                  <span className="bg-white/20 px-2 py-1 rounded">
                    {imminentCount} à venir
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-y-auto max-h-[50vh]">
              {upcomingRappels.map(rappel => {
                const isOverdue = new Date(rappel.scheduled_date) < new Date();
                return (
                  <div
                    key={rappel.id}
                    className={`p-4 border-b hover:bg-gray-50 ${
                      isOverdue ? 'bg-red-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-blue-600" />
                          <span className="font-semibold text-gray-900">
                            {rappel.company_name || 'Lead inconnu'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {rappel.title || 'Rappel'}
                        </p>
                        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${
                          isOverdue ? 'text-red-600' : 'text-orange-600'
                        }`}>
                          <Clock className="w-3 h-3" />
                          {formatDateTime(rappel.scheduled_date)}
                        </div>
                        {/* Boutons d'action rapide */}
                        <div className="flex gap-2 mt-3">
                          {rappel.lead_id && (
                            <button
                              onClick={() => {
                                navigate(`/LeadDetails?id=${rappel.lead_id}`);
                                setShowPanel(false);
                              }}
                              className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded hover:bg-purple-200 flex items-center gap-1"
                            >
                              <User className="w-3 h-3" />
                              Voir lead
                            </button>
                          )}
                          {rappel.lead_phone && (
                            <a
                              href={`tel:${rappel.lead_phone.replace(/[\s\-\(\)]/g, '')}`}
                              className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded hover:bg-green-200 flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Phone className="w-3 h-3" />
                              Appeler
                            </a>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-gray-50 border-t">
              <button
                onClick={() => {
                  navigate('/FollowUps');
                  setShowPanel(false);
                }}
                className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                Voir tous les rappels
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
