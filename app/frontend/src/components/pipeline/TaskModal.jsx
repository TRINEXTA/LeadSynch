<<<<<<< HEAD
import { log, error, warn } from "./../../lib/logger.js";
=======
import { log, error, warn } from "../lib/logger.js";
>>>>>>> origin/main
import React, { useState, useEffect } from 'react';
import { X, Calendar, User, Flag, Clock, MessageSquare, Save } from 'lucide-react';
import api from '../../api/axios';

const TASK_TYPES = [
  { value: 'call', label: '📞 Appel', icon: '📞' },
  { value: 'email', label: '📧 Email', icon: '📧' },
  { value: 'meeting', label: '🤝 Réunion', icon: '🤝' },
  { value: 'demo', label: '🎬 Démo', icon: '🎬' },
  { value: 'quote', label: '💰 Proposition', icon: '💰' },
  { value: 'other', label: '📋 Autre', icon: '📋' }
];

const PRIORITIES = [
  { value: 'low', label: 'Basse', color: 'bg-gray-500' },
  { value: 'medium', label: 'Moyenne', color: 'bg-yellow-500' },
  { value: 'high', label: 'Haute', color: 'bg-red-500' }
];

export default function TaskModal({ isOpen, onClose, lead, onSuccess, mode = 'create' }) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [task, setTask] = useState({
    type: 'call',
    priority: 'medium',
    title: '',
    notes: '',
    scheduled_date: '',
    assigned_to: '' // user_id
  });

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      // Pré-remplir le titre selon le lead
      if (lead && !task.title) {
        setTask(prev => ({
          ...prev,
          title: `Relancer ${lead.company_name || 'le prospect'}`
        }));
      }
    }
  }, [isOpen, lead]);

  const loadUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data.users || []);
    } catch (error) {
      error('Erreur chargement utilisateurs:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!task.title || !task.scheduled_date || !task.assigned_to) {
      alert('❌ Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      await api.post('/follow-ups', {
        lead_id: lead.lead_id || lead.id,
        user_id: task.assigned_to,
        type: task.type,
        priority: task.priority,
        title: task.title,
        notes: task.notes,
        scheduled_date: task.scheduled_date
      });

      alert('✅ Tâche créée avec succès !');
      onSuccess && onSuccess();
      onClose();
    } catch (error) {
      error('Erreur création tâche:', error);
      alert('❌ Erreur lors de la création de la tâche');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">
                  {mode === 'create' ? 'Créer une Tâche' : 'Assigner une Tâche'}
                </h2>
                <p className="text-purple-100 text-sm mt-1">
                  {lead?.company_name || 'Lead'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Type de tâche */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Type de tâche <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {TASK_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setTask({ ...task, type: type.value })}
                  className={`p-3 rounded-xl border-2 transition-all text-center ${
                    task.type === type.value
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{type.icon}</div>
                  <div className="text-xs font-semibold">{type.label.replace(/[^\w\s]/gi, '')}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Priorité */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Flag className="w-4 h-4" />
              Priorité <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {PRIORITIES.map((priority) => (
                <button
                  key={priority.value}
                  type="button"
                  onClick={() => setTask({ ...task, priority: priority.value })}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    task.priority === priority.value
                      ? `border-${priority.color.replace('bg-', '')} ${priority.color} bg-opacity-10`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full ${priority.color} mx-auto mb-2`}></div>
                  <div className="text-sm font-semibold text-gray-700">{priority.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Titre */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Titre de la tâche <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={task.title}
              onChange={(e) => setTask({ ...task, title: e.target.value })}
              placeholder="Ex: Appeler pour faire le point"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Assigner à */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <User className="w-4 h-4" />
              Assigner à <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={task.assigned_to}
              onChange={(e) => setTask({ ...task, assigned_to: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="">-- Choisir un utilisateur --</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          {/* Date prévue */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Date et heure prévues <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              required
              value={task.scheduled_date}
              onChange={(e) => setTask({ ...task, scheduled_date: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Notes (optionnel)
            </label>
            <textarea
              value={task.notes}
              onChange={(e) => setTask({ ...task, notes: e.target.value })}
              placeholder="Informations complémentaires..."
              rows="4"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Création...' : 'Créer la tâche'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
