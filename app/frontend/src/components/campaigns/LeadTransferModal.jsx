import { log, error, warn } from "../lib/logger.js";
import React, { useState, useEffect } from 'react';
import {
  X, Users, UserMinus, ArrowRight, Check, AlertCircle,
  RefreshCw, UserPlus, ChevronDown, Search
} from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const TRANSFER_MODES = {
  SINGLE: 'single',      // Transférer vers un seul commercial
  DISTRIBUTE: 'distribute' // Distribuer équitablement entre plusieurs
};

export default function LeadTransferModal({
  isOpen,
  onClose,
  campaignId,
  commercials = [],
  onTransferComplete
}) {
  const [mode, setMode] = useState(TRANSFER_MODES.SINGLE);
  const [step, setStep] = useState(1); // 1: Source, 2: Leads, 3: Target, 4: Confirm

  // Source selection
  const [sourceUser, setSourceUser] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Leads selection
  const [transferAll, setTransferAll] = useState(true);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [sourceLeads, setSourceLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leadSearch, setLeadSearch] = useState('');

  // Target selection
  const [targetUsers, setTargetUsers] = useState([]);

  // Processing
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (isOpen && campaignId) {
      loadAvailableUsers();
      resetState();
    }
  }, [isOpen, campaignId]);

  const resetState = () => {
    setStep(1);
    setMode(TRANSFER_MODES.SINGLE);
    setSourceUser(null);
    setTransferAll(true);
    setSelectedLeads([]);
    setSourceLeads([]);
    setTargetUsers([]);
    setResult(null);
    setLeadSearch('');
  };

  const loadAvailableUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await api.get(`/campaigns/${campaignId}/available-users`);
      setAvailableUsers(response.data.users || []);
    } catch (error) {
      error('Erreur chargement utilisateurs:', error);
      toast.error('Erreur chargement des utilisateurs');
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadSourceLeads = async (userId) => {
    setLoadingLeads(true);
    try {
      const response = await api.get(`/campaign-leads?campaign_id=${campaignId}`);
      const leads = response.data.leads || [];
      // Filtrer les leads du commercial source
      const userLeads = leads.filter(l => l.assigned_to === userId);
      setSourceLeads(userLeads);
    } catch (error) {
      error('Erreur chargement leads:', error);
      toast.error('Erreur chargement des leads');
    } finally {
      setLoadingLeads(false);
    }
  };

  const handleSourceSelect = (user) => {
    setSourceUser(user);
    loadSourceLeads(user.id);
    setStep(2);
  };

  const handleLeadToggle = (leadId) => {
    setSelectedLeads(prev =>
      prev.includes(leadId)
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const handleSelectAllLeads = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map(l => l.id));
    }
  };

  const handleTargetToggle = (userId) => {
    if (mode === TRANSFER_MODES.SINGLE) {
      setTargetUsers([userId]);
    } else {
      setTargetUsers(prev =>
        prev.includes(userId)
          ? prev.filter(id => id !== userId)
          : [...prev, userId]
      );
    }
  };

  const getLeadsToTransfer = () => {
    return transferAll ? sourceLeads.length : selectedLeads.length;
  };

  const handleTransfer = async () => {
    if (targetUsers.length === 0) {
      toast.error('Sélectionnez au moins un commercial cible');
      return;
    }

    const leadsCount = getLeadsToTransfer();
    if (leadsCount === 0) {
      toast.error('Aucun lead à transférer');
      return;
    }

    setProcessing(true);

    try {
      let response;

      if (mode === TRANSFER_MODES.SINGLE) {
        // Transfert vers un seul utilisateur
        response = await api.post(`/campaigns/${campaignId}/transfer-leads`, {
          target_user_id: targetUsers[0],
          source_user_id: sourceUser.id,
          transfer_all: transferAll,
          lead_ids: transferAll ? undefined : selectedLeads
        });
      } else {
        // Distribution vers plusieurs utilisateurs
        response = await api.post(`/campaigns/${campaignId}/distribute-leads`, {
          target_user_ids: targetUsers,
          source_user_id: sourceUser.id,
          transfer_all: transferAll,
          lead_ids: transferAll ? undefined : selectedLeads
        });
      }

      setResult(response.data);
      setStep(5); // Success step
      toast.success(response.data.message);

      if (onTransferComplete) {
        onTransferComplete();
      }

    } catch (error) {
      error('Erreur transfert:', error);
      toast.error(error.response?.data?.message || 'Erreur lors du transfert');
    } finally {
      setProcessing(false);
    }
  };

  const filteredLeads = sourceLeads.filter(lead => {
    if (!leadSearch) return true;
    const search = leadSearch.toLowerCase();
    return (
      lead.company_name?.toLowerCase().includes(search) ||
      lead.email?.toLowerCase().includes(search) ||
      lead.contact_name?.toLowerCase().includes(search)
    );
  });

  const availableTargets = availableUsers.filter(u => u.id !== sourceUser?.id);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-6 h-6 text-white" />
              <h2 className="text-xl font-bold text-white">Transfert de leads</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Progress steps */}
          {step < 5 && (
            <div className="flex items-center gap-2 mt-4">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    step >= s ? 'bg-white text-blue-600' : 'bg-white/30 text-white'
                  }`}>
                    {step > s ? <Check className="w-4 h-4" /> : s}
                  </div>
                  {s < 4 && (
                    <div className={`w-8 h-1 ${step > s ? 'bg-white' : 'bg-white/30'}`} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Step 1: Source Selection */}
          {step === 1 && (
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <UserMinus className="w-5 h-5 text-red-500" />
                Sélectionnez le commercial source
              </h3>
              <p className="text-gray-600 mb-4">
                De quel commercial souhaitez-vous transférer les leads ?
              </p>

              {loadingUsers ? (
                <div className="text-center py-8">
                  <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="space-y-2">
                  {commercials.length > 0 ? (
                    commercials.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleSourceSelect(user)}
                        className="w-full p-4 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-xl flex items-center justify-between transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                            {user.first_name?.[0]}{user.last_name?.[0]}
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-gray-800">{user.first_name} {user.last_name}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-blue-600">{user.leads_assigned || 0}</p>
                          <p className="text-xs text-gray-500">leads</p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>Aucun commercial avec des leads</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Leads Selection */}
          {step === 2 && (
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                Quels leads transférer ?
              </h3>

              <div className="mb-4 p-4 bg-blue-50 rounded-xl">
                <p className="text-sm text-blue-800">
                  <strong>{sourceUser?.first_name} {sourceUser?.last_name}</strong> a{' '}
                  <strong>{sourceLeads.length}</strong> lead(s) dans cette campagne
                </p>
              </div>

              <div className="space-y-4">
                <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="radio"
                    checked={transferAll}
                    onChange={() => setTransferAll(true)}
                    className="w-5 h-5 text-blue-600"
                  />
                  <div>
                    <p className="font-semibold text-gray-800">Transférer TOUS les leads</p>
                    <p className="text-sm text-gray-500">{sourceLeads.length} lead(s) seront transférés</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="radio"
                    checked={!transferAll}
                    onChange={() => setTransferAll(false)}
                    className="w-5 h-5 text-blue-600"
                  />
                  <div>
                    <p className="font-semibold text-gray-800">Sélectionner des leads spécifiques</p>
                    <p className="text-sm text-gray-500">Choisissez les leads à transférer</p>
                  </div>
                </label>

                {!transferAll && (
                  <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden">
                    <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
                      <Search className="w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Rechercher un lead..."
                        value={leadSearch}
                        onChange={(e) => setLeadSearch(e.target.value)}
                        className="flex-1 bg-transparent outline-none text-sm"
                      />
                      <button
                        onClick={handleSelectAllLeads}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        {selectedLeads.length === filteredLeads.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                      </button>
                    </div>

                    {loadingLeads ? (
                      <div className="p-8 text-center">
                        <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto">
                        {filteredLeads.map((lead) => (
                          <label
                            key={lead.id}
                            className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                          >
                            <input
                              type="checkbox"
                              checked={selectedLeads.includes(lead.id)}
                              onChange={() => handleLeadToggle(lead.id)}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-800 truncate">{lead.company_name}</p>
                              <p className="text-xs text-gray-500 truncate">{lead.email || lead.contact_name}</p>
                            </div>
                            {lead.pipeline_stage && (
                              <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                                {lead.pipeline_stage}
                              </span>
                            )}
                          </label>
                        ))}
                      </div>
                    )}

                    {!loadingLeads && filteredLeads.length === 0 && (
                      <div className="p-8 text-center text-gray-500">
                        Aucun lead trouvé
                      </div>
                    )}
                  </div>
                )}

                {!transferAll && selectedLeads.length > 0 && (
                  <p className="text-sm text-blue-600 font-medium">
                    {selectedLeads.length} lead(s) sélectionné(s)
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Target Selection */}
          {step === 3 && (
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-green-500" />
                Vers qui transférer ?
              </h3>

              {/* Mode selection */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => { setMode(TRANSFER_MODES.SINGLE); setTargetUsers([]); }}
                  className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                    mode === TRANSFER_MODES.SINGLE
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-semibold">Un seul commercial</p>
                  <p className="text-xs text-gray-500">Tous les leads vont à une personne</p>
                </button>
                <button
                  onClick={() => { setMode(TRANSFER_MODES.DISTRIBUTE); setTargetUsers([]); }}
                  className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                    mode === TRANSFER_MODES.DISTRIBUTE
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-semibold">Plusieurs commerciaux</p>
                  <p className="text-xs text-gray-500">Distribution équitable</p>
                </button>
              </div>

              <p className="text-gray-600 mb-4">
                {mode === TRANSFER_MODES.SINGLE
                  ? 'Sélectionnez le commercial qui recevra les leads'
                  : 'Sélectionnez les commerciaux entre lesquels distribuer les leads'
                }
              </p>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableTargets.map((user) => {
                  const isSelected = targetUsers.includes(user.id);
                  return (
                    <button
                      key={user.id}
                      onClick={() => handleTargetToggle(user.id)}
                      className={`w-full p-4 border rounded-xl flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-green-50 border-green-300'
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          isSelected
                            ? 'bg-green-500 text-white'
                            : 'bg-gradient-to-br from-gray-400 to-gray-500 text-white'
                        }`}>
                          {isSelected ? <Check className="w-5 h-5" /> : `${user.first_name?.[0]}${user.last_name?.[0]}`}
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-gray-800">{user.first_name} {user.last_name}</p>
                          <p className="text-sm text-gray-500">{user.role}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {targetUsers.length > 0 && mode === TRANSFER_MODES.DISTRIBUTE && (
                <div className="mt-4 p-4 bg-purple-50 rounded-xl">
                  <p className="text-sm text-purple-800">
                    <strong>{getLeadsToTransfer()}</strong> leads seront distribués équitablement entre{' '}
                    <strong>{targetUsers.length}</strong> commerciaux
                    ({Math.floor(getLeadsToTransfer() / targetUsers.length)} leads chacun
                    {getLeadsToTransfer() % targetUsers.length > 0 && `, +1 pour ${getLeadsToTransfer() % targetUsers.length} d'entre eux`})
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && (
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                Confirmer le transfert
              </h3>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-600 mb-2">Source</p>
                  <p className="font-bold text-gray-800">{sourceUser?.first_name} {sourceUser?.last_name}</p>
                </div>

                <div className="flex justify-center">
                  <ArrowRight className="w-8 h-8 text-blue-500" />
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-600 mb-2">Destination</p>
                  {targetUsers.map(id => {
                    const user = availableTargets.find(u => u.id === id);
                    return user && (
                      <p key={id} className="font-bold text-gray-800">
                        {user.first_name} {user.last_name}
                      </p>
                    );
                  })}
                </div>

                <div className="p-4 bg-blue-50 rounded-xl">
                  <p className="text-sm text-blue-800">
                    <strong>{getLeadsToTransfer()}</strong> lead(s) seront transférés
                    {mode === TRANSFER_MODES.DISTRIBUTE && ` (distribution équitable)`}
                  </p>
                </div>

                <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                  <p className="text-sm text-orange-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Cette action est irréversible. Les leads seront définitivement réassignés.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Success */}
          {step === 5 && result && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Transfert réussi !</h3>
              <p className="text-gray-600 mb-6">{result.message}</p>

              {result.distribution && (
                <div className="text-left max-w-sm mx-auto space-y-2">
                  {result.distribution.map((d, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">{d.user_name}</span>
                      <span className="text-blue-600 font-bold">{d.leads_assigned} leads</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between">
          {step < 5 ? (
            <>
              <button
                onClick={step === 1 ? onClose : () => setStep(step - 1)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                {step === 1 ? 'Annuler' : 'Retour'}
              </button>

              {step < 4 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={
                    (step === 1 && !sourceUser) ||
                    (step === 2 && !transferAll && selectedLeads.length === 0) ||
                    (step === 3 && targetUsers.length === 0)
                  }
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continuer
                </button>
              ) : (
                <button
                  onClick={handleTransfer}
                  disabled={processing}
                  className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {processing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Transfert en cours...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Confirmer le transfert
                    </>
                  )}
                </button>
              )}
            </>
          ) : (
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              Fermer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
