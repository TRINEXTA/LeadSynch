import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Phone, Clock, Play, Pause, Square, 
  Filter, Search, X, Mail, MapPin, Globe,
  Calendar, MessageSquare, CheckCircle
} from 'lucide-react';

const PIPELINE_STAGES = {
  'new': { label: '📋 Nouveau', color: 'bg-blue-100 text-blue-700' },
  'nrp': { label: '📵 NRP', color: 'bg-gray-100 text-gray-700' },
  'meeting_requested': { label: '📞 RDV Demandé', color: 'bg-yellow-100 text-yellow-700' },
  'meeting_scheduled': { label: '📅 RDV Programmé', color: 'bg-green-100 text-green-700' },
  'qualified': { label: '💼 Qualifié', color: 'bg-purple-100 text-purple-700' },
  'disqualified': { label: '❌ Disqualifié', color: 'bg-red-100 text-red-700' },
  'not_interested': { label: '🚫 Pas intéressé', color: 'bg-red-100 text-red-700' },
  'won': { label: '🏆 Gagné', color: 'bg-green-100 text-green-700' }
};

export default function Pipeline() {
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get('campaign_id');

  const [campaign, setCampaign] = useState(null);
  const [leads, setLeads] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState('all');
  
  // Modal lead
  const [selectedLead, setSelectedLead] = useState(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callStartTime, setCallStartTime] = useState(null);
  const [showQualification, setShowQualification] = useState(false);
  
  // Formulaire qualification
  const [qualification, setQualification] = useState({
    status: '',
    notes: '',
    follow_up_date: ''
  });

  const [timer, setTimer] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (campaignId) {
      fetchPipelineData();
      checkActiveSession();
    }
  }, [campaignId]);

  // Chronomètre session
  useEffect(() => {
    let interval;
    if (isRunning && sessionStartTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
        setTimer(elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, sessionStartTime]);

  // Chronomètre appel
  useEffect(() => {
    let interval;
    if (isCallActive && callStartTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
        setCallDuration(elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCallActive, callStartTime]);

  const fetchPipelineData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const campaignRes = await fetch(`http://localhost:3000/api/campaigns-full`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const campaignData = await campaignRes.json();
      
      if (campaignData.success) {
        const camp = campaignData.campaigns.find(c => c.id === campaignId);
        setCampaign(camp);
      }

      const leadsRes = await fetch(`http://localhost:3000/api/campaign-leads?campaign_id=${campaignId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const leadsData = await leadsRes.json();
      
      if (leadsData.success) {
        setLeads(leadsData.leads);
      }
    } catch (error) {
      console.error('Erreur chargement pipeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkActiveSession = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/prospection-sessions/active', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      if (data.success && data.session) {
        setActiveSession(data.session);
        setIsRunning(data.session.status === 'active');
        setSessionStartTime(new Date(data.session.start_time).getTime());
        
        const elapsed = Math.floor((Date.now() - new Date(data.session.start_time).getTime()) / 1000);
        setTimer(elapsed);
      }
    } catch (error) {
      console.error('Erreur session:', error);
    }
  };

  const startSession = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/prospection-sessions/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ campaign_id: campaignId })
      });

      const data = await response.json();
      if (data.success) {
        setActiveSession(data.session);
        setIsRunning(true);
        setSessionStartTime(Date.now());
        setTimer(0);
        alert('✅ Session démarrée !');
      }
    } catch (error) {
      console.error('Erreur démarrage session:', error);
      alert('Erreur lors du démarrage');
    }
  };

  const pauseSession = async () => {
    const reason = prompt('Raison de la pause :\n- coffee\n- lunch\n- email\n- other');
    if (!reason) return;

    try {
      await fetch('http://localhost:3000/api/prospection-sessions/pause', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          session_id: activeSession.id,
          pause_reason: reason 
        })
      });

      setIsRunning(false);
      alert('⏸️ Session en pause');
    } catch (error) {
      console.error('Erreur pause:', error);
    }
  };

  const resumeSession = async () => {
    try {
      await fetch('http://localhost:3000/api/prospection-sessions/resume', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ session_id: activeSession.id })
      });

      setIsRunning(true);
      alert('▶️ Session reprise !');
    } catch (error) {
      console.error('Erreur reprise:', error);
    }
  };

  const endSession = async () => {
    if (!confirm('Terminer la session de prospection ?')) return;

    try {
      const response = await fetch('http://localhost:3000/api/prospection-sessions/end', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ session_id: activeSession.id })
      });

      const data = await response.json();
      if (data.success) {
        const { summary } = data;
        const hours = Math.floor(summary.duration / 3600);
        const minutes = Math.floor((summary.duration % 3600) / 60);
        const seconds = summary.duration % 60;

        alert(`🎉 Session terminée !

⏱️ Temps total : ${hours}h ${minutes}min ${seconds}s
📞 Appels passés : ${summary.calls}
✅ RDV obtenus : ${summary.meetings}
📧 Docs envoyées : ${summary.docs_sent}
🔄 Relances créées : ${summary.follow_ups}
❌ Disqualifiés : ${summary.disqualified}
📵 NRP : ${summary.nrp}

💪 Beau travail !`);

        setActiveSession(null);
        setIsRunning(false);
        setSessionStartTime(null);
        setTimer(0);
        fetchPipelineData();
      }
    } catch (error) {
      console.error('Erreur fin session:', error);
    }
  };

  const openLeadModal = (lead) => {
    setSelectedLead(lead);
    setQualification({
      status: '',
      notes: lead.notes || '',
      follow_up_date: ''
    });
  };

  const startCall = () => {
    setIsCallActive(true);
    setCallStartTime(Date.now());
    setCallDuration(0);
  };

  const endCall = () => {
    setIsCallActive(false);
    setShowQualification(true);
  };

  const saveQualification = async () => {
    if (!qualification.status) {
      alert('❌ Veuillez sélectionner un statut');
      return;
    }

    try {
      await fetch('http://localhost:3000/api/prospection-sessions/call', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: activeSession.id,
          lead_id: selectedLead.id,
          duration: callDuration,
          qualification: qualification.status,
          notes: qualification.notes,
          follow_up_date: qualification.follow_up_date || null
        })
      });

      alert('✅ Appel enregistré !');
      setSelectedLead(null);
      setShowQualification(false);
      setCallDuration(0);
      setCallStartTime(null);
      fetchPipelineData();
      checkActiveSession();
    } catch (error) {
      console.error('Erreur enregistrement:', error);
      alert('❌ Erreur lors de l\'enregistrement');
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const filteredLeads = leads.filter(lead => {
    const matchSearch = searchTerm === '' || 
      lead.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStage = selectedStage === 'all' || lead.pipeline_stage === selectedStage;
    return matchSearch && matchStage;
  });

  const groupedLeads = {};
  Object.keys(PIPELINE_STAGES).forEach(stage => {
    groupedLeads[stage] = filteredLeads.filter(l => l.pipeline_stage === stage);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Chargement du pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-full mx-auto">
      {/* Header avec chrono */}
      <div className="mb-6 bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Pipeline - {campaign?.name}</h1>
            <p className="text-gray-600">{leads.length} leads affectés</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 bg-gray-50 px-6 py-3 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600" />
              <span className="text-2xl font-mono font-bold">
                {formatTime(timer)}
              </span>
            </div>

            {!activeSession ? (
              <button
                onClick={startSession}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
              >
                <Play className="w-5 h-5" />
                Démarrer Prospection
              </button>
            ) : (
              <div className="flex gap-2">
                {isRunning ? (
                  <button
                    onClick={pauseSession}
                    className="flex items-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
                  >
                    <Pause className="w-5 h-5" />
                    Pause
                  </button>
                ) : (
                  <button
                    onClick={resumeSession}
                    className="flex items-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                  >
                    <Play className="w-5 h-5" />
                    Reprendre
                  </button>
                )}
                <button
                  onClick={endSession}
                  className="flex items-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                >
                  <Square className="w-5 h-5" />
                  Terminer
                </button>
              </div>
            )}
          </div>
        </div>

        {activeSession && (
          <div className="mt-4 flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-blue-600" />
              <span>{activeSession.calls_made || 0} appels</span>
            </div>
            <div className="flex items-center gap-2">
              <span>✅</span>
              <span>{activeSession.meetings_obtained || 0} RDV</span>
            </div>
            <div className="flex items-center gap-2">
              <span>📧</span>
              <span>{activeSession.docs_sent || 0} docs</span>
            </div>
          </div>
        )}
      </div>

      {/* Filtres */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un lead..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="border rounded-lg px-4 py-2"
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
          >
            <option value="all">Tous les statuts</option>
            {Object.entries(PIPELINE_STAGES).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Pipeline Kanban */}
      <div className="grid grid-cols-4 gap-4">
        {Object.entries(PIPELINE_STAGES).slice(0, 8).map(([stage, { label, color }]) => (
          <div key={stage} className="bg-white rounded-lg shadow">
            <div className={`p-4 rounded-t-lg ${color} font-semibold`}>
              {label}
              <span className="ml-2 px-2 py-1 bg-white rounded text-sm">
                {groupedLeads[stage]?.length || 0}
              </span>
            </div>
            <div className="p-2 space-y-2 max-h-[600px] overflow-y-auto">
              {groupedLeads[stage]?.map(lead => (
                <div
                  key={lead.id}
                  onClick={() => openLeadModal(lead)}
                  className="p-3 bg-gray-50 rounded border hover:border-blue-500 cursor-pointer transition-all hover:shadow-md"
                >
                  <p className="font-medium text-sm">{lead.company_name}</p>
                  {lead.phone && (
                    <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                      <Phone className="w-3 h-3" />
                      {lead.phone}
                    </p>
                  )}
                  {lead.city && (
                    <p className="text-xs text-gray-500 mt-1">{lead.city}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Lead */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">{selectedLead.company_name}</h2>
                <p className="text-gray-600">{selectedLead.industry || 'Secteur inconnu'}</p>
              </div>
              <button onClick={() => setSelectedLead(null)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Infos lead */}
            <div className="space-y-4 mb-6">
              {selectedLead.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-blue-600" />
                  <a href={`tel:${selectedLead.phone}`} className="text-blue-600 hover:underline font-medium">
                    {selectedLead.phone}
                  </a>
                </div>
              )}
              {selectedLead.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-green-600" />
                  <a href={`mailto:${selectedLead.email}`} className="text-green-600 hover:underline">
                    {selectedLead.email}
                  </a>
                </div>
              )}
              {selectedLead.website && (
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-purple-600" />
                  <a href={selectedLead.website} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
                    {selectedLead.website}
                  </a>
                </div>
              )}
              {selectedLead.address && (
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-red-600" />
                  <span className="text-gray-700">{selectedLead.address}</span>
                </div>
              )}
            </div>

            {/* Bouton appel */}
            {!isCallActive && !showQualification && (
              <button
                onClick={startCall}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-lg"
              >
                <Phone className="w-6 h-6" />
                Démarrer l'appel
              </button>
            )}

            {/* Appel en cours */}
            {isCallActive && (
              <div className="bg-green-50 border-2 border-green-600 rounded-lg p-6 text-center">
                <Phone className="w-12 h-12 text-green-600 mx-auto mb-4 animate-pulse" />
                <p className="text-2xl font-bold text-green-600 mb-2">Appel en cours</p>
                <p className="text-4xl font-mono font-bold text-gray-900 mb-6">
                  {formatTime(callDuration)}
                </p>
                <button
                  onClick={endCall}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
                >
                  Terminer l'appel
                </button>
              </div>
            )}

            {/* Formulaire qualification */}
            {showQualification && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    ⏱️ Durée de l'appel : <strong>{formatTime(callDuration)}</strong>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Qualification *</label>
                  <select
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3"
                    value={qualification.status}
                    onChange={(e) => setQualification({...qualification, status: e.target.value})}
                  >
                    <option value="">-- Sélectionner --</option>
                    <option value="nrp">📵 Pas de réponse (NRP)</option>
                    <option value="meeting_requested">📞 RDV Demandé</option>
                    <option value="meeting_scheduled">📅 RDV Programmé</option>
                    <option value="not_interested">❌ Pas intéressé</option>
                    <option value="disqualified">🚫 Disqualifié</option>
                    <option value="qualified">💼 Qualifié</option>
                  </select>
                </div>

                {(qualification.status === 'meeting_scheduled' || qualification.status === 'meeting_requested') && (
                  <div>
                    <label className="block text-sm font-semibold mb-2">Date de rappel</label>
                    <input
                      type="date"
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-3"
                      value={qualification.follow_up_date}
                      onChange={(e) => setQualification({...qualification, follow_up_date: e.target.value})}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold mb-2">Notes</label>
                  <textarea
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3"
                    rows={4}
                    value={qualification.notes}
                    onChange={(e) => setQualification({...qualification, notes: e.target.value})}
                    placeholder="Détails de l'appel..."
                  />
                </div>

                <button
                  onClick={saveQualification}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  <CheckCircle className="w-5 h-5 inline mr-2" />
                  Enregistrer
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
