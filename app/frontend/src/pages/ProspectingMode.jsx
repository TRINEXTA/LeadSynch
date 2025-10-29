import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Target, Phone, Mail, MessageSquare, Calendar, Clock, 
  PlayCircle, PauseCircle, Check, X, ChevronRight, AlertCircle,
  Zap, Users, TrendingUp, Star, Edit, Send, Sparkles, 
  PhoneCall, PhoneOff, ArrowRight, Plus, Eye, BarChart3,
  Timer, Activity, CheckCircle, XCircle, Loader, Building2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PIPELINE_STAGES = {
  'nouveau': { label: 'Nouveau', color: 'bg-gray-500', icon: '📋' },
  'contacted': { label: 'Contacté', color: 'bg-blue-500', icon: '📞' },
  'qualified': { label: 'Qualifié', color: 'bg-purple-500', icon: '⭐' },
  'proposal': { label: 'Proposition', color: 'bg-orange-500', icon: '📄' },
  'negotiation': { label: 'Négociation', color: 'bg-yellow-500', icon: '💬' },
  'won': { label: 'Gagné', color: 'bg-green-500', icon: '🎉' },
  'lost': { label: 'Perdu', color: 'bg-red-500', icon: '❌' }
};

const AI_IMPROVEMENT_LEVELS = {
  free: { name: 'Gratuit', maxChars: 0, features: [] },
  basic: { name: 'Basic', maxChars: 500, features: ['Correction orthographe', 'Amélioration style'] },
  pro: { name: 'Pro', maxChars: 2000, features: ['Tout Basic', 'Tonalité personnalisée', 'Suggestions avancées'] },
  enterprise: { name: 'Enterprise', maxChars: 10000, features: ['Tout Pro', 'Templates personnalisés', 'Analyse sentiment'] }
};

const EMAIL_TEMPLATES = [
  { value: 'first_contact', label: '📧 Premier contact', icon: '👋' },
  { value: 'follow_up', label: '🔄 Relance', icon: '📮' },
  { value: 'meeting_request', label: '📅 Demande RDV', icon: '🤝' },
  { value: 'proposal', label: '💼 Proposition', icon: '📊' },
  { value: 'thank_you', label: '🙏 Remerciement', icon: '✨' },
  { value: 'reconnection', label: '🔗 Reprise contact', icon: '🔄' }
];

export default function ProspectingMode() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [leads, setLeads] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Session stats
  const [sessionStats, setSessionStats] = useState({
    startTime: null,
    calls: 0,
    emails: 0,
    meetings: 0,
    movedLeads: 0,
    duration: 0
  });
  
  const [isSessionActive, setIsSessionActive] = useState(false);
  
  // Action modals
  const [showCallModal, setShowCallModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  
  // AI Enhancement
  const [emailContent, setEmailContent] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [aiImproving, setAiImproving] = useState(false);
  const [callNotes, setCallNotes] = useState('');
  const [callOutcome, setCallOutcome] = useState('');
  
  // User subscription level (à récupérer depuis l'API ou user.subscription_level)
  const [subscriptionLevel, setSubscriptionLevel] = useState('pro'); // free, basic, pro, enterprise

  useEffect(() => {
    fetchCampaigns();
    fetchFollowups();
  }, []);

  useEffect(() => {
    if (selectedCampaign) {
      fetchCampaignLeads(selectedCampaign.id);
    }
  }, [selectedCampaign]);

  useEffect(() => {
    let interval;
    if (isSessionActive && sessionStats.startTime) {
      interval = setInterval(() => {
        const duration = Math.floor((Date.now() - sessionStats.startTime) / 1000);
        setSessionStats(prev => ({ ...prev, duration }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSessionActive, sessionStats.startTime]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/api/campaigns-full', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        // Filtrer les campagnes actives assignées au commercial
        const activeCampaigns = data.campaigns.filter(c => 
          c.status === 'active' && 
          (c.assigned_to === user.id || user.role === 'admin')
        );
        setCampaigns(activeCampaigns);
      }
    } catch (error) {
      console.error('Erreur chargement campagnes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaignLeads = async (campaignId) => {
    try {
      const response = await fetch(`http://localhost:3000/api/campaign-leads/${campaignId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setLeads(data.leads || []);
      }
    } catch (error) {
      console.error('Erreur chargement leads:', error);
    }
  };

  const fetchFollowups = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/follow-ups', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        const today = new Date().toDateString();
        const todayFollowups = data.followups.filter(f => 
          !f.completed && 
          new Date(f.scheduled_date).toDateString() === today
        );
        setFollowups(todayFollowups);
      }
    } catch (error) {
      console.error('Erreur chargement rappels:', error);
    }
  };

  const startSession = () => {
    setIsSessionActive(true);
    setSessionStats({
      startTime: Date.now(),
      calls: 0,
      emails: 0,
      meetings: 0,
      movedLeads: 0,
      duration: 0
    });
  };

  const pauseSession = () => {
    setIsSessionActive(false);
  };

  const endSession = async () => {
    if (!confirm('Terminer la session de prospection ?')) return;

    try {
      // Sauvegarder les stats de session
      await fetch('http://localhost:3000/api/prospection-sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          campaign_id: selectedCampaign?.id,
          duration: sessionStats.duration,
          calls_made: sessionStats.calls,
          emails_sent: sessionStats.emails,
          meetings_scheduled: sessionStats.meetings,
          leads_moved: sessionStats.movedLeads
        })
      });

      setIsSessionActive(false);
      setSelectedCampaign(null);
      setLeads([]);
      alert('✅ Session terminée avec succès !');
    } catch (error) {
      console.error('Erreur fin de session:', error);
    }
  };

  const handleCallLead = async () => {
    if (!callOutcome) {
      alert('❌ Veuillez sélectionner un résultat d\'appel');
      return;
    }

    try {
      // Enregistrer l'appel
      await fetch(`http://localhost:3000/api/leads/${selectedLead.id}/call`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          outcome: callOutcome,
          notes: callNotes,
          duration: 0
        })
      });

      // Mettre à jour les stats
      setSessionStats(prev => ({ ...prev, calls: prev.calls + 1 }));

      // Si appel réussi, passer au stage suivant
      if (callOutcome === 'answered' || callOutcome === 'interested') {
        await moveLeadToStage(selectedLead.id, 'contacted');
      }

      setShowCallModal(false);
      setCallNotes('');
      setCallOutcome('');
      fetchCampaignLeads(selectedCampaign.id);
      alert('✅ Appel enregistré !');
    } catch (error) {
      console.error('Erreur enregistrement appel:', error);
      alert('❌ Erreur enregistrement appel');
    }
  };

  const handleSendEmail = async () => {
    if (!emailSubject || !emailContent) {
      alert('❌ Sujet et contenu requis');
      return;
    }

    try {
      await fetch(`http://localhost:3000/api/leads/${selectedLead.id}/email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject: emailSubject,
          content: emailContent,
          campaign_id: selectedCampaign.id
        })
      });

      setSessionStats(prev => ({ ...prev, emails: prev.emails + 1 }));
      setShowEmailModal(false);
      setEmailSubject('');
      setEmailContent('');
      alert('✅ Email envoyé !');
    } catch (error) {
      console.error('Erreur envoi email:', error);
      alert('❌ Erreur envoi email');
    }
  };

  const improveWithAI = async (text, type = 'email') => {
    const aiLevel = AI_IMPROVEMENT_LEVELS[subscriptionLevel];
    
    if (aiLevel.maxChars === 0) {
      alert('⚠️ Amélioration IA non disponible sur le plan gratuit. Passez à un plan supérieur !');
      return;
    }

    if (text.length > aiLevel.maxChars) {
      alert(`❌ Texte trop long. Maximum ${aiLevel.maxChars} caractères pour votre plan ${aiLevel.name}`);
      return;
    }

    setAiImproving(true);

    try {
      const response = await fetch('http://localhost:3000/api/asefi/improve-text', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          type,
          lead_context: {
            company_name: selectedLead?.company_name,
            industry: selectedLead?.industry,
            status: selectedLead?.status
          },
          improvement_level: subscriptionLevel
        })
      });

      const data = await response.json();

      if (data.success) {
        if (type === 'email') {
          setEmailContent(data.improved_text);
        }
        alert(`✨ Texte amélioré par Asefi ! (${data.tokens_used} tokens utilisés)`);
      } else {
        if (data.upgrade_required) {
          alert('⚠️ ' + data.error);
        } else {
          alert('❌ ' + data.error);
        }
      }
    } catch (error) {
      console.error('Erreur amélioration IA:', error);
      alert('❌ Erreur amélioration IA');
    } finally {
      setAiImproving(false);
    }
  };

  const generateQuickEmail = async (templateType) => {
    if (subscriptionLevel === 'free') {
      alert('⚠️ Génération IA non disponible sur le plan gratuit');
      return;
    }

    setAiImproving(true);

    try {
      const response = await fetch('http://localhost:3000/api/asefi/generate-quick-email', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          template_type: templateType,
          lead_info: {
            company_name: selectedLead?.company_name,
            industry: selectedLead?.industry,
            status: selectedLead?.status
          },
          tone: 'professionnel et amical',
          user_signature: {
            name: `${user.first_name} ${user.last_name}`,
            title: user.title || 'Commercial',
            company: user.company || 'LeadSynch'
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        setEmailSubject(data.email.subject);
        setEmailContent(data.email.body + '\n\n' + data.email.cta);
        alert('✨ Email généré par Asefi !');
      }
    } catch (error) {
      console.error('Erreur génération email:', error);
      alert('❌ Erreur génération email');
    } finally {
      setAiImproving(false);
    }
  };

  const moveLeadToStage = async (leadId, newStage) => {
    try {
      await fetch(`http://localhost:3000/api/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pipeline_stage: newStage
        })
      });

      setSessionStats(prev => ({ ...prev, movedLeads: prev.movedLeads + 1 }));
      fetchCampaignLeads(selectedCampaign.id);
    } catch (error) {
      console.error('Erreur déplacement lead:', error);
    }
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getLeadsByStage = (stage) => {
    return leads.filter(lead => lead.pipeline_stage === stage);
  };

  // SÉLECTION DE CAMPAGNE
  if (!selectedCampaign) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-2">
            <Target className="w-8 h-8 text-blue-600" />
            Mode Prospection
          </h1>
          <p className="text-gray-600">Sélectionnez une campagne pour démarrer votre session</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Chargement des campagnes...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-lg">
            <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune campagne active</h3>
            <p className="text-gray-600 mb-6">Demandez à votre manager de vous assigner une campagne</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map(campaign => (
              <div
                key={campaign.id}
                className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all p-6 border-2 border-transparent hover:border-blue-300 cursor-pointer"
                onClick={() => {
                  setSelectedCampaign(campaign);
                  startSession();
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{campaign.name}</h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{campaign.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <Users className="w-5 h-5 text-blue-600 mb-1" />
                    <p className="text-2xl font-bold text-blue-900">{campaign.total_leads || 0}</p>
                    <p className="text-xs text-blue-600">Leads</p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-3">
                    <TrendingUp className="w-5 h-5 text-green-600 mb-1" />
                    <p className="text-2xl font-bold text-green-900">
                      {campaign.total_leads > 0 ? Math.round((campaign.converted_leads || 0) / campaign.total_leads * 100) : 0}%
                    </p>
                    <p className="text-xs text-green-600">Conversion</p>
                  </div>
                </div>

                <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all">
                  <PlayCircle className="w-5 h-5" />
                  Démarrer la prospection
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // MODE PROSPECTION ACTIF
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header fixe */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={endSession}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedCampaign.name}</h2>
                <p className="text-sm text-gray-600">{leads.length} leads dans le pipeline</p>
              </div>
            </div>

            {/* Session Timer */}
            <div className="flex items-center gap-4">
              <div className="bg-blue-50 px-4 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <Timer className="w-5 h-5 text-blue-600" />
                  <span className="text-xl font-mono font-bold text-blue-900">
                    {formatDuration(sessionStats.duration)}
                  </span>
                </div>
              </div>

              {isSessionActive ? (
                <button
                  onClick={pauseSession}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-all"
                >
                  <PauseCircle className="w-5 h-5" />
                  Pause
                </button>
              ) : (
                <button
                  onClick={startSession}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all"
                >
                  <PlayCircle className="w-5 h-5" />
                  Reprendre
                </button>
              )}
            </div>
          </div>

          {/* Stats en temps réel */}
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-3">
              <Phone className="w-5 h-5 mb-1 opacity-80" />
              <p className="text-2xl font-bold">{sessionStats.calls}</p>
              <p className="text-xs opacity-90">Appels</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-3">
              <Mail className="w-5 h-5 mb-1 opacity-80" />
              <p className="text-2xl font-bold">{sessionStats.emails}</p>
              <p className="text-xs opacity-90">Emails</p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-3">
              <Calendar className="w-5 h-5 mb-1 opacity-80" />
              <p className="text-2xl font-bold">{sessionStats.meetings}</p>
              <p className="text-xs opacity-90">RDV</p>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg p-3">
              <Activity className="w-5 h-5 mb-1 opacity-80" />
              <p className="text-2xl font-bold">{sessionStats.movedLeads}</p>
              <p className="text-xs opacity-90">Avancés</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-4 gap-6">
          {/* Pipeline principal (3 colonnes) */}
          <div className="col-span-3">
            <div className="grid grid-cols-3 gap-4">
              {['nouveau', 'contacted', 'qualified'].map(stage => {
                const stageInfo = PIPELINE_STAGES[stage];
                const stageLeads = getLeadsByStage(stage);

                return (
                  <div key={stage} className="bg-white rounded-xl shadow-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <span className="text-xl">{stageInfo.icon}</span>
                        {stageInfo.label}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold text-white ${stageInfo.color}`}>
                        {stageLeads.length}
                      </span>
                    </div>

                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {stageLeads.map(lead => (
                        <div
                          key={lead.id}
                          className="bg-gray-50 rounded-lg p-3 hover:shadow-md transition-all cursor-pointer border-2 border-transparent hover:border-blue-300"
                          onClick={() => setSelectedLead(lead)}
                        >
                          <h4 className="font-semibold text-gray-900 text-sm mb-2">
                            {lead.company_name}
                          </h4>
                          <div className="space-y-1 text-xs text-gray-600">
                            {lead.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                <span className="truncate">{lead.email}</span>
                              </div>
                            )}
                            {lead.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                <span>{lead.phone}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-1 mt-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLead(lead);
                                setShowCallModal(true);
                              }}
                              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-all"
                              title="Appeler"
                            >
                              <Phone className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLead(lead);
                                setShowEmailModal(true);
                              }}
                              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs transition-all"
                              title="Email"
                            >
                              <Mail className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const nextStage = stage === 'nouveau' ? 'contacted' : stage === 'contacted' ? 'qualified' : 'proposal';
                                moveLeadToStage(lead.id, nextStage);
                              }}
                              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs transition-all"
                              title="Avancer"
                            >
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {stageLeads.length === 0 && (
                        <p className="text-center text-sm text-gray-500 py-8">
                          Aucun lead
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar - Rappels du jour (1 colonne) */}
          <div className="col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-4 sticky top-24">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-orange-600" />
                Rappels du jour
                <span className="ml-auto bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-semibold">
                  {followups.length}
                </span>
              </h3>

              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {followups.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Aucun rappel aujourd'hui
                  </p>
                ) : (
                  followups.map(followup => (
                    <div
                      key={followup.id}
                      className="bg-orange-50 border border-orange-200 rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-sm text-gray-900">
                          {followup.company_name}
                        </h4>
                        <span className="text-xs text-orange-600 font-semibold">
                          {new Date(followup.scheduled_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">
                        {followup.title || followup.type}
                      </p>
                      <button
                        onClick={() => {
                          const lead = leads.find(l => l.id === followup.lead_id);
                          if (lead) {
                            setSelectedLead(lead);
                            if (followup.type === 'call') {
                              setShowCallModal(true);
                            } else if (followup.type === 'email') {
                              setShowEmailModal(true);
                            }
                          }
                        }}
                        className="w-full flex items-center justify-center gap-1 px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs transition-all"
                      >
                        <Zap className="w-3 h-3" />
                        Action rapide
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Appel */}
      {showCallModal && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Phone className="w-6 h-6 text-blue-600" />
                Appel - {selectedLead.company_name}
              </h2>
              <button onClick={() => setShowCallModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {selectedLead.email && (
                    <div>
                      <span className="text-gray-600">Email:</span>
                      <p className="font-semibold">{selectedLead.email}</p>
                    </div>
                  )}
                  {selectedLead.phone && (
                    <div>
                      <span className="text-gray-600">Téléphone:</span>
                      <p className="font-semibold">{selectedLead.phone}</p>
                    </div>
                  )}
                  {selectedLead.industry && (
                    <div>
                      <span className="text-gray-600">Secteur:</span>
                      <p className="font-semibold">{selectedLead.industry}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Résultat de l'appel *</label>
                <select
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  value={callOutcome}
                  onChange={(e) => setCallOutcome(e.target.value)}
                >
                  <option value="">-- Sélectionner --</option>
                  <option value="answered">✅ Répondu - Intéressé</option>
                  <option value="not_interested">❌ Pas intéressé</option>
                  <option value="voicemail">📞 Répondeur</option>
                  <option value="no_answer">🔇 Pas de réponse</option>
                  <option value="wrong_number">❓ Mauvais numéro</option>
                  <option value="callback">🔄 Rappeler plus tard</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Notes d'appel</label>
                <textarea
                  rows="4"
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  placeholder="Notez les détails de la conversation..."
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowCallModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCallLead}
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all"
                >
                  Enregistrer l'appel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Email avec IA Asefi */}
      {showEmailModal && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Mail className="w-6 h-6 text-purple-600" />
                Email - {selectedLead.company_name}
              </h2>
              <button onClick={() => setShowEmailModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* AI Plan Info */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold text-gray-900">
                    Plan {AI_IMPROVEMENT_LEVELS[subscriptionLevel].name}
                  </span>
                </div>
                <span className="text-sm text-gray-600">
                  Max {AI_IMPROVEMENT_LEVELS[subscriptionLevel].maxChars} caractères
                </span>
              </div>
              {AI_IMPROVEMENT_LEVELS[subscriptionLevel].features.length > 0 && (
                <div className="mt-2 text-xs text-gray-600">
                  {AI_IMPROVEMENT_LEVELS[subscriptionLevel].features.join(' • ')}
                </div>
              )}
            </div>

            {/* Templates rapides Asefi */}
            {subscriptionLevel !== 'free' && (
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2">🤖 Templates Asefi IA</label>
                <div className="grid grid-cols-3 gap-2">
                  {EMAIL_TEMPLATES.map(template => (
                    <button
                      key={template.value}
                      type="button"
                      onClick={() => generateQuickEmail(template.value)}
                      disabled={aiImproving}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                    >
                      <span>{template.icon}</span>
                      <span className="text-xs">{template.label.split(' ')[1]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Sujet *</label>
                <input
                  type="text"
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  placeholder="Objet de l'email"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold">Message *</label>
                  <span className={`text-xs ${emailContent.length > AI_IMPROVEMENT_LEVELS[subscriptionLevel].maxChars ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                    {emailContent.length} / {AI_IMPROVEMENT_LEVELS[subscriptionLevel].maxChars || '∞'} caractères
                  </span>
                </div>
                <textarea
                  rows="10"
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  placeholder="Rédigez votre message..."
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                />
              </div>

              {subscriptionLevel !== 'free' && emailContent && (
                <button
                  onClick={() => improveWithAI(emailContent, 'email')}
                  disabled={aiImproving || !emailContent}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all disabled:opacity-50"
                >
                  {aiImproving ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Amélioration en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Améliorer avec Asefi IA
                    </>
                  )}
                </button>
              )}

              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSendEmail}
                  className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-all"
                >
                  <Send className="w-5 h-5" />
                  Envoyer l'email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}