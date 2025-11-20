import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  CheckCircle, Clock, Calendar, UserCheck, AlertCircle, MessageSquare,
  UserCog, RefreshCw, ArrowLeft, XCircle, Send, Eye
} from 'lucide-react';

export default function MyTasks() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tâches assignées à moi
  const [myTasks, setMyTasks] = useState([]);

  // Mes demandes envoyées
  const [myRequests, setMyRequests] = useState([]);

  // Modal compléter tâche
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [completionNotes, setCompletionNotes] = useState('');

  useEffect(() => {
    fetchMyTasks();
  }, []);

  const fetchMyTasks = async () => {
    try {
      setRefreshing(true);

      // Charger les tâches assignées à moi
      const tasksRes = await api.get('/follow-ups?assigned_to_me=true&status=pending')
        .catch(() => ({ data: { followups: [] } }));
      setMyTasks(tasksRes.data.followups || []);

      // Charger mes demandes (validation/aide/leadshow) que j'ai envoyées
      const requestsRes = await api.get('/validation-requests?my_requests=true')
        .catch(() => ({ data: { requests: [] } }));
      setMyRequests(requestsRes.data.requests || []);

    } catch (error) {
      console.error('Erreur chargement mes tâches:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCompleteTask = async () => {
    if (!selectedTask) return;

    try {
      await api.put(`/follow-ups/${selectedTask.id}/complete`, {
        completed_notes: completionNotes
      });

      toast.success('✅ Tâche complétée !');
      setShowCompleteModal(false);
      setSelectedTask(null);
      setCompletionNotes('');
      fetchMyTasks();
    } catch (error) {
      console.error('Erreur complétion tâche:', error);
      toast.error('Erreur lors de la complétion');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Chargement de vos tâches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white/60 rounded-lg transition-all"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Mes Tâches
              </h1>
              <p className="text-gray-600 mt-2">
                Gérez vos tâches assignées et suivez vos demandes
              </p>
            </div>
          </div>
          <button
            onClick={fetchMyTasks}
            disabled={refreshing}
            className="flex items-center gap-2 px-6 py-3 bg-white/60 backdrop-blur-md border border-white/60 rounded-xl hover:bg-white/80 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="font-medium">Actualiser</span>
          </button>
        </div>

        {/* Grid 2 colonnes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tâches assignées à moi */}
          <div className="bg-white/60 backdrop-blur-md border border-white/60 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Tâches Assignées</h2>
              </div>
              {myTasks.length > 0 && (
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                  {myTasks.length}
                </span>
              )}
            </div>

            {myTasks.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Aucune tâche en attente</p>
                <p className="text-sm text-gray-500 mt-2">
                  Vous êtes à jour ! 🎉
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {myTasks.map((task) => (
                  <div key={task.id} className="bg-white/80 rounded-xl p-4 border border-gray-200 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                            task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                            task.priority === 'medium' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {task.priority === 'urgent' ? '🔥 Urgent' :
                             task.priority === 'high' ? '⚡ Haute' :
                             task.priority === 'medium' ? '📋 Normale' : '📌 Basse'}
                          </span>
                        </div>
                        <p className="font-semibold text-gray-900 text-lg">{task.title || 'Tâche'}</p>
                        <p className="text-sm text-gray-600 mt-2">{task.notes || 'Aucune description'}</p>

                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>Échéance: {new Date(task.scheduled_date).toLocaleDateString('fr-FR')}</span>
                          </div>
                          {task.created_by_name && (
                            <div className="flex items-center gap-1">
                              <UserCheck className="w-3 h-3" />
                              <span>De: {task.created_by_name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedTask(task);
                          setShowCompleteModal(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all font-semibold shadow-md hover:shadow-lg"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Compléter
                      </button>
                      {task.lead_id && (
                        <button
                          onClick={() => navigate(`/leads/${task.lead_id}`)}
                          className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-semibold"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mes demandes envoyées */}
          <div className="bg-white/60 backdrop-blur-md border border-white/60 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                  <Send className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Mes Demandes</h2>
              </div>
              {myRequests.length > 0 && (
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                  {myRequests.length}
                </span>
              )}
            </div>

            {myRequests.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Aucune demande envoyée</p>
                <p className="text-sm text-gray-500 mt-2">
                  Vos demandes apparaîtront ici
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {myRequests.map((request) => (
                  <div key={request.id} className="bg-white/80 rounded-xl p-4 border border-gray-200 hover:shadow-md transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      {request.type === 'validation' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : request.type === 'leadshow' ? (
                        <UserCog className="w-5 h-5 text-purple-600" />
                      ) : (
                        <MessageSquare className="w-5 h-5 text-blue-600" />
                      )}
                      <span className="font-semibold text-gray-900">{request.subject}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        request.type === 'validation' ? 'bg-green-100 text-green-700' :
                        request.type === 'leadshow' ? 'bg-purple-100 text-purple-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {request.type === 'validation' ? '✅ Validation' :
                         request.type === 'leadshow' ? '👤 Lead Show' :
                         '💬 Aide'}
                      </span>

                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        request.status === 'approved' ? 'bg-green-100 text-green-700' :
                        request.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        request.status === 'resolved' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {request.status === 'approved' ? '✅ Approuvé' :
                         request.status === 'rejected' ? '❌ Refusé' :
                         request.status === 'resolved' ? '✔️ Résolu' :
                         '⏳ En attente'}
                      </span>
                    </div>

                    {request.message && (
                      <p className="text-sm text-gray-600 mb-2">{request.message}</p>
                    )}

                    {/* Réponse du manager */}
                    {request.manager_response && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs font-semibold text-blue-900 mb-1">
                          📝 Réponse du manager:
                        </p>
                        <p className="text-sm text-blue-800">{request.manager_response}</p>
                        {request.reviewer_first_name && (
                          <p className="text-xs text-blue-600 mt-1">
                            - {request.reviewer_first_name} {request.reviewer_last_name}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(request.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Compléter Tâche */}
      {showCompleteModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b">
              <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Compléter la tâche</h3>
            </div>

            <div className="mb-4">
              <p className="font-semibold text-gray-900 mb-2">{selectedTask.title}</p>
              <p className="text-sm text-gray-600">{selectedTask.notes}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Notes de complétion (optionnel)
              </label>
              <textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                rows={4}
                placeholder="Ex: Tâche terminée, prospect contacté avec succès..."
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCompleteModal(false);
                  setSelectedTask(null);
                  setCompletionNotes('');
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleCompleteTask}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-semibold hover:shadow-lg"
              >
                ✅ Valider
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
