import { useState, useEffect, useCallback } from 'react';
import { Bell, BellRing, X, Phone, Clock, Building2, User, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function Header() {
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

        const upcoming = response.data.followups.filter(f => {
          const scheduledDate = new Date(f.scheduled_date);
          return scheduledDate <= fifteenMinutesFromNow && !f.completed;
        });

        setUpcomingRappels(upcoming);

        // Notifier pour les nouveaux rappels imminents
        upcoming.forEach(rappel => {
          if (!notifiedIds.has(rappel.id)) {
            const scheduledDate = new Date(rappel.scheduled_date);
            const isOverdue = scheduledDate < now;

            toast.custom((t) => (
              <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-2xl rounded-xl pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden`}>
                <div className={`p-4 ${isOverdue ? 'bg-red-50 border-l-4 border-red-500' : 'bg-orange-50 border-l-4 border-orange-500'}`}>
                  <div className="flex items-start">
                    <div className={`flex-shrink-0 p-2 rounded-full ${isOverdue ? 'bg-red-100' : 'bg-orange-100'}`}>
                      <BellRing className={`h-6 w-6 ${isOverdue ? 'text-red-600 animate-pulse' : 'text-orange-600'}`} />
                    </div>
                    <div className="ml-3 flex-1">
                      <p className={`text-sm font-bold ${isOverdue ? 'text-red-800' : 'text-orange-800'}`}>
                        {isOverdue ? '⚠️ Rappel en retard !' : '🔔 Rappel imminent !'}
                      </p>
                      <p className="mt-1 text-sm text-gray-900 font-semibold">{rappel.company_name || 'Lead'}</p>
                      <p className="text-xs text-gray-600">{rappel.title || 'Rappel programmé'}</p>
                      <div className="mt-3 flex gap-2 flex-wrap">
                        {rappel.lead_id && (
                          <button
                            onClick={() => { navigate(`/LeadDetails?id=${rappel.lead_id}`); toast.dismiss(t.id); }}
                            className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700"
                          >
                            Voir le lead
                          </button>
                        )}
                        <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-300">
                          Plus tard
                        </button>
                      </div>
                    </div>
                    <button onClick={() => toast.dismiss(t.id)} className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ), { duration: 30000, position: 'top-right' });

            setNotifiedIds(prev => new Set([...prev, rappel.id]));
          }
        });
      }
    } catch (err) {
      console.error('Erreur vérification rappels:', err);
    }
  }, [notifiedIds, navigate]);

  useEffect(() => {
    checkUpcomingRappels();
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
    }
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const overdueCount = upcomingRappels.filter(r => new Date(r.scheduled_date) < new Date()).length;

  return (
    <header className='bg-white border-b border-gray-200 px-6 py-3'>
      <div className='flex items-center justify-end'>
        {/* Bouton Rappels */}
        <div className="relative">
          <button
            onClick={() => setShowPanel(!showPanel)}
            className={`p-2 rounded-lg relative transition-all ${
              upcomingRappels.length > 0
                ? overdueCount > 0
                  ? 'text-red-600 bg-red-50 hover:bg-red-100'
                  : 'text-orange-600 bg-orange-50 hover:bg-orange-100'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
          >
            {upcomingRappels.length > 0 ? (
              <BellRing className={`w-6 h-6 ${overdueCount > 0 ? 'animate-pulse' : ''}`} />
            ) : (
              <Bell className='w-6 h-6' />
            )}
            {upcomingRappels.length > 0 && (
              <span className={`absolute -top-1 -right-1 w-5 h-5 text-xs font-bold rounded-full flex items-center justify-center text-white ${
                overdueCount > 0 ? 'bg-red-600' : 'bg-orange-500'
              }`}>
                {upcomingRappels.length}
              </span>
            )}
          </button>

          {/* Panel des rappels */}
          {showPanel && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowPanel(false)} />
              <div className="absolute top-full right-0 mt-2 z-50 w-96 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
                <div className={`p-4 ${overdueCount > 0 ? 'bg-red-600' : 'bg-orange-500'} text-white`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BellRing className="w-5 h-5" />
                      <h3 className="font-bold">Rappels ({upcomingRappels.length})</h3>
                    </div>
                    <button onClick={() => setShowPanel(false)}>
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="overflow-y-auto max-h-[50vh]">
                  {upcomingRappels.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      <Bell className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      <p>Aucun rappel imminent</p>
                    </div>
                  ) : (
                    upcomingRappels.map(rappel => {
                      const isOverdue = new Date(rappel.scheduled_date) < new Date();
                      return (
                        <div key={rappel.id} className={`p-4 border-b hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : ''}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-blue-600" />
                                <span className="font-semibold text-gray-900">{rappel.company_name || 'Lead'}</span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{rappel.title || 'Rappel'}</p>
                              <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${isOverdue ? 'text-red-600' : 'text-orange-600'}`}>
                                <Clock className="w-3 h-3" />
                                {formatDateTime(rappel.scheduled_date)}
                              </div>
                              <div className="flex gap-2 mt-3">
                                {rappel.lead_id && (
                                  <button
                                    onClick={() => { navigate(`/LeadDetails?id=${rappel.lead_id}`); setShowPanel(false); }}
                                    className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded hover:bg-purple-200 flex items-center gap-1"
                                  >
                                    <User className="w-3 h-3" /> Voir lead
                                  </button>
                                )}
                                {rappel.lead_phone && (
                                  <a
                                    href={`tel:${rappel.lead_phone.replace(/[\s\-\(\)]/g, '')}`}
                                    className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded hover:bg-green-200 flex items-center gap-1"
                                  >
                                    <Phone className="w-3 h-3" /> Appeler
                                  </a>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="p-3 bg-gray-50 border-t">
                  <button
                    onClick={() => { navigate('/FollowUps'); setShowPanel(false); }}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                  >
                    Voir tous les rappels
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
