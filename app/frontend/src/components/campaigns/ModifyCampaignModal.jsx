/**
 * Modal de modification d'une campagne existante
 *
 * Permet de :
 * - Modifier le contenu/template de la campagne
 * - Ajouter/supprimer des leads
 * - Ajouter/supprimer des commerciaux (avec options de reassignation)
 */

import { useState, useEffect } from 'react';
import { X, Mail, Users, UserMinus, UserPlus, Trash2, RefreshCw, AlertTriangle, Check, Edit3, FileText } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function ModifyCampaignModal({
  isOpen,
  onClose,
  campaignId,
  onCampaignUpdated
}) {
  const [activeTab, setActiveTab] = useState('content');
  const [loading, setLoading] = useState(false);
  const [campaign, setCampaign] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [users, setUsers] = useState([]);
  const [campaignUsers, setCampaignUsers] = useState([]);
  const [availableLeads, setAvailableLeads] = useState([]);

  // Content modification state
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [customSubject, setCustomSubject] = useState('');

  // User removal state
  const [userToRemove, setUserToRemove] = useState(null);
  const [reassignmentOption, setReassignmentOption] = useState('auto');
  const [reassignToUserId, setReassignToUserId] = useState('');

  // Lead management state
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [selectedLeadsToAdd, setSelectedLeadsToAdd] = useState([]);

  useEffect(() => {
    if (isOpen && campaignId) {
      loadData();
    }
  }, [isOpen, campaignId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load campaign, templates, users in parallel
      const [campaignRes, templatesRes, usersRes] = await Promise.all([
        api.get(`/campaigns/${campaignId}`),
        api.get('/email-templates'),
        api.get('/users')
      ]);

      setCampaign(campaignRes.data.campaign);
      setTemplates(templatesRes.data.templates || []);
      setUsers(usersRes.data.users || []);

      // Set current values
      setSelectedTemplateId(campaignRes.data.campaign.template_id || '');
      setCustomSubject(campaignRes.data.campaign.subject || '');

      // Load campaign users
      try {
        const campaignUsersRes = await api.get(`/campaigns/${campaignId}/commercials`);
        setCampaignUsers(campaignUsersRes.data.commercials || []);
      } catch (e) {
        setCampaignUsers([]);
      }

    } catch (error) {
      console.error('Erreur chargement:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  // ========== CONTENT MODIFICATION ==========
  const handleUpdateContent = async () => {
    setLoading(true);
    try {
      await api.put(`/campaigns/${campaignId}/content`, {
        template_id: selectedTemplateId,
        subject: customSubject
      });

      toast.success('Contenu de la campagne mis a jour');
      onCampaignUpdated?.();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la mise a jour');
    } finally {
      setLoading(false);
    }
  };

  // ========== USER MANAGEMENT ==========
  const handleAddUser = async (userId) => {
    setLoading(true);
    try {
      await api.post(`/campaigns/${campaignId}/users`, {
        user_ids: [userId]
      });

      toast.success('Commercial ajoute');
      loadData();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de l\'ajout');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveUser = async () => {
    if (!userToRemove) return;

    setLoading(true);
    try {
      await api.delete(`/campaigns/${campaignId}/users`, {
        data: {
          user_id: userToRemove.id,
          reassignment_option: reassignmentOption,
          reassign_to_user_id: reassignmentOption === 'specific' ? reassignToUserId : undefined
        }
      });

      toast.success('Commercial retire et leads reassignes');
      setUserToRemove(null);
      loadData();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  // ========== LEAD MANAGEMENT ==========
  const handleAddLeads = async () => {
    if (selectedLeadsToAdd.length === 0) return;

    setLoading(true);
    try {
      await api.post(`/campaigns/${campaignId}/leads`, {
        lead_ids: selectedLeadsToAdd
      });

      toast.success(`${selectedLeadsToAdd.length} lead(s) ajoute(s)`);
      setSelectedLeadsToAdd([]);
      loadData();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de l\'ajout');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLeads = async (leadIds) => {
    setLoading(true);
    try {
      await api.delete(`/campaigns/${campaignId}/leads`, {
        data: { lead_ids: leadIds }
      });

      toast.success(`${leadIds.length} lead(s) retire(s)`);
      loadData();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const availableUsersToAdd = users.filter(
    u => !campaignUsers.some(cu => cu.id === u.id)
  );

  const tabs = [
    { id: 'content', label: 'Contenu', icon: FileText },
    { id: 'users', label: 'Commerciaux', icon: Users },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Modifier la campagne</h2>
            <p className="text-purple-200 text-sm">{campaign?.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-semibold transition-colors ${
                    activeTab === tab.id
                      ? 'text-purple-600 border-b-2 border-purple-600 bg-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
            </div>
          )}

          {!loading && activeTab === 'content' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Template email
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-purple-500"
                >
                  <option value="">Selectionner un template</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Sujet personnalise (optionnel)
                </label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="Laisser vide pour utiliser le sujet du template"
                  className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-purple-500"
                />
              </div>

              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold mb-1">Attention</p>
                    <p>
                      La modification du template affectera uniquement les emails qui n'ont pas encore ete envoyes.
                      Les emails deja envoyes ne seront pas modifies.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleUpdateContent}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Edit3 className="w-5 h-5" />
                Mettre a jour le contenu
              </button>
            </div>
          )}

          {!loading && activeTab === 'users' && (
            <div className="space-y-6">
              {/* Current users */}
              <div>
                <h3 className="font-bold text-gray-900 mb-4">
                  Commerciaux affectes ({campaignUsers.length})
                </h3>

                {campaignUsers.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-xl">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">Aucun commercial affecte</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {campaignUsers.map(user => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between bg-gray-50 rounded-xl p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                            {user.first_name?.[0]}{user.last_name?.[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {user.first_name} {user.last_name}
                            </p>
                            <p className="text-sm text-gray-600">{user.email}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setUserToRemove(user)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          title="Retirer"
                        >
                          <UserMinus className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add users */}
              {availableUsersToAdd.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-4">
                    Ajouter un commercial
                  </h3>
                  <div className="space-y-3">
                    {availableUsersToAdd.map(user => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between bg-blue-50 rounded-xl p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
                            {user.first_name?.[0]}{user.last_name?.[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {user.first_name} {user.last_name}
                            </p>
                            <p className="text-sm text-gray-600">{user.email}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddUser(user.id)}
                          className="p-2 text-blue-600 hover:bg-blue-200 rounded-lg transition-colors"
                          title="Ajouter"
                        >
                          <UserPlus className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300"
          >
            Fermer
          </button>
        </div>
      </div>

      {/* Modal de confirmation pour retirer un commercial */}
      {userToRemove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserMinus className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Retirer {userToRemove.first_name} {userToRemove.last_name} ?
              </h3>
              <p className="text-gray-600">
                Que faire des leads assignes a ce commercial ?
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <label className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-purple-500">
                <input
                  type="radio"
                  name="reassignment"
                  value="auto"
                  checked={reassignmentOption === 'auto'}
                  onChange={() => setReassignmentOption('auto')}
                  className="w-5 h-5 text-purple-600"
                />
                <div>
                  <p className="font-semibold text-gray-900">Distribution automatique</p>
                  <p className="text-sm text-gray-600">Repartir equitablement entre les autres commerciaux</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-purple-500">
                <input
                  type="radio"
                  name="reassignment"
                  value="specific"
                  checked={reassignmentOption === 'specific'}
                  onChange={() => setReassignmentOption('specific')}
                  className="w-5 h-5 text-purple-600"
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">Assigner a un commercial specifique</p>
                  {reassignmentOption === 'specific' && (
                    <select
                      value={reassignToUserId}
                      onChange={(e) => setReassignToUserId(e.target.value)}
                      className="mt-2 w-full border border-gray-300 rounded-lg p-2"
                    >
                      <option value="">Selectionner...</option>
                      {campaignUsers.filter(u => u.id !== userToRemove.id).map(u => (
                        <option key={u.id} value={u.id}>
                          {u.first_name} {u.last_name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-red-500">
                <input
                  type="radio"
                  name="reassignment"
                  value="delete"
                  checked={reassignmentOption === 'delete'}
                  onChange={() => setReassignmentOption('delete')}
                  className="w-5 h-5 text-red-600"
                />
                <div>
                  <p className="font-semibold text-red-600">Supprimer les leads</p>
                  <p className="text-sm text-gray-600">Les leads non envoyes seront retires de la campagne</p>
                </div>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setUserToRemove(null)}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl font-semibold hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleRemoveUser}
                disabled={loading || (reassignmentOption === 'specific' && !reassignToUserId)}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Traitement...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
