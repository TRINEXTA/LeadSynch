import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Phone, Mail, ThumbsUp, ThumbsDown, ArrowRight, Timer, TrendingUp, Target, Sparkles, MessageSquare, Eye, CheckCircle, HelpCircle, Calendar, Briefcase, Pause, Play, Coffee, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { toast } from '../lib/toast';
import ValidationRequestModal from '../components/pipeline/ValidationRequestModal';
import RDVSchedulerModal from '../components/pipeline/RDVSchedulerModal';
import RappelModal from '../components/pipeline/RappelModal';
import EmailGeneratorModal from '../components/pipeline/EmailGeneratorModal';

const QUICK_QUALIFICATIONS = [
  { id: 'tres_qualifie', label: '🔥 Très Chaud / RDV', color: 'bg-green-500', stage: 'tres_qualifie', needsRDV: true },
  { id: 'qualifie', label: '👍 Qualifié', color: 'bg-blue-500', stage: 'qualifie' },
  { id: 'a_relancer', label: '⏰ À Relancer', color: 'bg-yellow-500', stage: 'relancer', needsRappel: true },
  { id: 'nrp', label: '📵 NRP', color: 'bg-gray-500', stage: 'nrp' },
  { id: 'pas_interesse', label: '👎 Pas Intéressé', color: 'bg-red-500', stage: 'perdu' },
  { id: 'hors_scope', label: '🚫 Hors Scope', color: 'bg-orange-500', stage: 'hors_scope' },
];

// Clé unique pour la progression basée sur campaign et filter
const getProgressionKey = (campaignId, filter) => {
  return `prospection_progress_${campaignId || 'all'}_${filter || 'all'}`;
};

// Charger la progression sauvegardée
const loadSavedProgression = (campaignId, filter) => {
  try {
    const key = getProgressionKey(campaignId, filter);
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Erreur chargement progression:', e);
  }
  return null;
};

// Sauvegarder la progression
const saveProgression = (campaignId, filter, processedLeadIds, stats, totalLeads) => {
  try {
    const key = getProgressionKey(campaignId, filter);
    localStorage.setItem(key, JSON.stringify({
      processedLeadIds,
      stats,
      totalLeads, // Sauvegarder le total initial
      savedAt: Date.now()
    }));
  } catch (e) {
    console.error('Erreur sauvegarde progression:', e);
  }
};

// Effacer la progression
const clearProgression = (campaignId, filter) => {
  try {
    const key = getProgressionKey(campaignId, filter);
    localStorage.removeItem(key);
  } catch (e) {
    console.error('Erreur suppression progression:', e);
  }
};

export default function ProspectionMode({ leads = [], campaign, filterType, onExit, onLeadUpdated }) {
  const navigate = useNavigate();

  // Charger la progression sauvegardée au montage
  const savedProgression = useRef(loadSavedProgression(campaign?.id, filterType));

  // Total de leads pour cette session (ne change pas pendant la session)
  // Utilise le total sauvegardé s'il existe, sinon le nombre de leads actuels
  const [totalLeadsForSession] = useState(() => {
    const saved = savedProgression.current;
    // Si on a une progression sauvegardée avec un total, utiliser ce total
    if (saved?.totalLeads && saved.totalLeads > 0) {
      return saved.totalLeads;
    }
    // Sinon, utiliser le nombre de leads actuels comme total initial
    return leads.length;
  });

  // Utiliser un ref EN PLUS de state pour éviter les race conditions
  // Le ref est mis à jour immédiatement, le state déclenche les re-renders
  const processedLeadIdsRef = useRef(savedProgression.current?.processedLeadIds || []);
  const [processedLeadIds, setProcessedLeadIds] = useState(() => {
    return savedProgression.current?.processedLeadIds || [];
  });

  // Fonction helper pour ajouter un lead traité - met à jour ref ET state de manière synchrone
  const addProcessedLead = useCallback((leadId) => {
    // Mettre à jour le ref immédiatement (synchrone)
    if (!processedLeadIdsRef.current.includes(leadId)) {
      processedLeadIdsRef.current = [...processedLeadIdsRef.current, leadId];
    }
    // Mettre à jour le state (async, déclenche re-render et sauvegarde)
    setProcessedLeadIds(prev => {
      if (prev.includes(leadId)) return prev;
      return [...prev, leadId];
    });
  }, []);

  // Calculer l'index initial basé sur les leads non traités
  const getInitialIndex = useCallback(() => {
    if (!leads || leads.length === 0) return 0;
    const savedIds = processedLeadIdsRef.current;
    // Trouver le premier lead qui n'a pas été traité
    const firstUnprocessedIndex = leads.findIndex(lead => !savedIds.includes(lead.id));
    return firstUnprocessedIndex >= 0 ? firstUnprocessedIndex : 0;
  }, [leads]);

  const [currentIndex, setCurrentIndex] = useState(getInitialIndex);
  const [notes, setNotes] = useState('');

  // Stats - restaurer depuis la sauvegarde si disponible
  const [processed, setProcessed] = useState(() => {
    return savedProgression.current?.stats?.processed || 0;
  });
  const [qualified, setQualified] = useState(() => {
    return savedProgression.current?.stats?.qualified || 0;
  });
  const [rdvCount, setRdvCount] = useState(() => {
    return savedProgression.current?.stats?.rdvCount || 0;
  });

  // Session state
  const [sessionId, setSessionId] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionStartTime] = useState(Date.now());
  const [sessionDuration, setSessionDuration] = useState(0);
  const [pauseDuration, setPauseDuration] = useState(0);
  const pauseStartRef = useRef(null);

  // Lead timer
  const [leadStartTime, setLeadStartTime] = useState(Date.now());
  const [leadDuration, setLeadDuration] = useState(0);

  // Modals state
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationRequestType, setValidationRequestType] = useState('validation');
  const [showRDVModal, setShowRDVModal] = useState(false);
  const [showRappelModal, setShowRappelModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [pendingQualification, setPendingQualification] = useState(null);

  // Protection contre leads undefined ou vide
  const currentLead = leads && leads.length > 0 ? leads[currentIndex] : null;

  // Sauvegarder la progression à chaque changement
  useEffect(() => {
    // Toujours sauvegarder dès qu'on a traité au moins un lead OU qu'on a un total défini
    if (processedLeadIds.length > 0 || totalLeadsForSession > 0) {
      saveProgression(campaign?.id, filterType, processedLeadIds, {
        processed,
        qualified,
        rdvCount
      }, totalLeadsForSession);
    }
  }, [processedLeadIds, processed, qualified, rdvCount, campaign?.id, filterType, totalLeadsForSession]);

  // Démarrer la session au montage
  useEffect(() => {
    startSession();

    // Si une progression a été restaurée, afficher un message
    if (savedProgression.current && savedProgression.current.processedLeadIds?.length > 0) {
      const totalSaved = savedProgression.current.totalLeads || totalLeadsForSession;
      const remaining = totalSaved - savedProgression.current.processedLeadIds.length;
      if (remaining > 0) {
        toast.success(`Session reprise ! ${remaining} leads restants sur ${totalSaved}.`, { duration: 3000 });
      }
    }

    return () => {
      // Ne pas terminer automatiquement - l'utilisateur doit cliquer sur Quitter
    };
  }, []);

  // Timer pour la durée de session et du lead
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isPaused) {
        // Mettre à jour la durée du lead
        setLeadDuration(Math.floor((Date.now() - leadStartTime) / 1000));

        // Mettre à jour la durée de session (sans les pauses)
        const totalElapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
        setSessionDuration(totalElapsed - pauseDuration);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [leadStartTime, sessionStartTime, isPaused, pauseDuration]);

  const startSession = async () => {
    try {
      const response = await api.post('/call-sessions', {
        action: 'start',
        campaign_id: campaign?.id,
        filter_type: filterType || 'all'
      });

      if (response.data.success) {
        setSessionId(response.data.session.id);
      }
    } catch (error) {
      console.error('Erreur démarrage session:', error);
      // Ne pas bloquer si la création échoue (peut être que la table n'existe pas encore)
    }
  };

  const handlePause = async () => {
    if (isPaused) {
      // Reprendre
      try {
        if (sessionId) {
          await api.post('/call-sessions', {
            action: 'resume',
            session_id: sessionId
          });
        }

        // Calculer le temps passé en pause
        if (pauseStartRef.current) {
          const pauseTime = Math.floor((Date.now() - pauseStartRef.current) / 1000);
          setPauseDuration(prev => prev + pauseTime);
          pauseStartRef.current = null;
        }

        setIsPaused(false);
        toast.success('Session reprise !', { icon: '▶️' });
      } catch (error) {
        console.error('Erreur reprise:', error);
        setIsPaused(false);
      }
    } else {
      // Mettre en pause
      try {
        if (sessionId) {
          await api.post('/call-sessions', {
            action: 'pause',
            session_id: sessionId,
            pause_reason: 'pause'
          });
        }

        pauseStartRef.current = Date.now();
        setIsPaused(true);
        toast('Session en pause', { icon: '⏸️', duration: 2000 });
      } catch (error) {
        console.error('Erreur pause:', error);
        setIsPaused(true);
      }
    }
  };

  const handleExit = async () => {
    try {
      if (sessionId) {
        // Calculer la pause en cours si applicable
        let finalPauseDuration = pauseDuration;
        if (isPaused && pauseStartRef.current) {
          finalPauseDuration += Math.floor((Date.now() - pauseStartRef.current) / 1000);
        }

        await api.post('/call-sessions', {
          action: 'end',
          session_id: sessionId
        });

        // Afficher le résumé
        const effectiveTime = sessionDuration;
        const minutes = Math.floor(effectiveTime / 60);
        const seconds = effectiveTime % 60;

        toast.success(
          `Session terminée !\n${minutes}m ${seconds}s d'appels effectifs\n${processed} leads traités\n${qualified} leads qualifiés\n${rdvCount} RDV planifiés`,
          { duration: 5000 }
        );
      }
    } catch (error) {
      console.error('Erreur fin session:', error);
    }

    onExit();
  };

  const handleAction = async (qualification) => {
    if (!currentLead) return;

    // Si c'est "Très Chaud", ouvrir le modal RDV
    if (qualification.needsRDV) {
      setPendingQualification(qualification);
      setShowRDVModal(true);
      return;
    }

    // Si c'est "À Relancer", ouvrir le modal de rappel
    if (qualification.needsRappel) {
      setPendingQualification(qualification);
      setShowRappelModal(true);
      return;
    }

    // Sinon, qualifier directement
    await qualifyLead(qualification);
  };

  const qualifyLead = async (qualification) => {
    try {
      if (!currentLead) return;

      await api.post(`/pipeline-leads/${currentLead.id}/qualify`, {
        qualification: qualification.id,
        notes: notes.trim() || '',
        call_duration: leadDuration,
        next_action: '',
        scheduled_date: null
      });

      // Logger l'appel dans la session
      if (sessionId) {
        try {
          await api.post('/call-sessions', {
            action: 'log-call',
            session_id: sessionId,
            lead_id: currentLead.lead_id,
            pipeline_lead_id: currentLead.id,
            duration: leadDuration,
            qualification: qualification.id,
            notes: notes.trim() || '',
            outcome: qualification.id
          });
        } catch (e) {
          console.error('Erreur log appel:', e);
        }
      }

      // Notifier le parent que le lead a été mis à jour
      if (onLeadUpdated) {
        onLeadUpdated();
      }

      // Ajouter le lead aux leads traités pour la persistance (utilise ref + state)
      addProcessedLead(currentLead.id);

      // Stats
      setProcessed(prev => prev + 1);
      if (qualification.stage === 'qualifie' || qualification.stage === 'tres_qualifie') {
        setQualified(prev => prev + 1);
      }

      toast.success(`Lead qualifié : ${qualification.label}`);
      moveToNextLead();
    } catch (err) {
      console.error('Erreur qualification:', err);
      toast.error('Erreur lors de la qualification');
    }
  };

  const moveToNextLead = () => {
    setNotes('');
    setLeadStartTime(Date.now());
    setLeadDuration(0);

    // IMPORTANT: Utiliser processedLeadIdsRef.current (synchrone) au lieu de processedLeadIds (state async)
    const currentProcessedIds = processedLeadIdsRef.current;

    // Vérifier si on a traité tous les leads de la session initiale
    if (currentProcessedIds.length >= totalLeadsForSession) {
      // Tous les leads sont traités - effacer la progression
      processedLeadIdsRef.current = [];
      setProcessedLeadIds([]);
      clearProgression(campaign?.id, filterType);
      toast.success(`🎉 Tous les ${totalLeadsForSession} leads traités ! Félicitations !`);
      setTimeout(() => handleExit(), 1500);
      return;
    }

    // Trouver le prochain lead non traité parmi les leads restants
    const nextIndex = leads.findIndex((lead, idx) =>
      idx > currentIndex && !currentProcessedIds.includes(lead.id)
    );

    if (nextIndex >= 0) {
      setCurrentIndex(nextIndex);
    } else {
      // Vérifier s'il reste des leads non traités avant l'index actuel
      const remainingBefore = leads.findIndex(lead =>
        !currentProcessedIds.includes(lead.id) && lead.id !== currentLead?.id
      );

      if (remainingBefore >= 0) {
        setCurrentIndex(remainingBefore);
      } else if (leads.length === 0) {
        // Plus de leads disponibles dans la liste actuelle mais session non terminée
        toast.info(`Plus de leads disponibles. ${currentProcessedIds.length}/${totalLeadsForSession} traités.`);
        setTimeout(() => handleExit(), 2000);
      } else {
        // On a parcouru tous les leads disponibles - revenir au premier non traité
        const firstUnprocessed = leads.findIndex(lead => !currentProcessedIds.includes(lead.id));
        if (firstUnprocessed >= 0) {
          setCurrentIndex(firstUnprocessed);
        } else {
          // Vraiment terminé
          processedLeadIdsRef.current = [];
          setProcessedLeadIds([]);
          clearProgression(campaign?.id, filterType);
          toast.success('🎉 Session terminée ! Tous les leads ont été traités.');
          setTimeout(() => handleExit(), 1500);
        }
      }
    }
  };

  const handleRappelSuccess = async (rappelData) => {
    // Qualifier le lead comme "À Relancer"
    try {
      if (!currentLead) return;

      // Utiliser les notes du modal si fournies, sinon celles du composant parent
      const finalNotes = rappelData?.notes?.trim() || notes.trim() || '';

      await api.post(`/pipeline-leads/${currentLead.id}/qualify`, {
        qualification: 'a_relancer',
        notes: finalNotes,
        call_duration: leadDuration,
        next_action: 'Rappel planifié',
        scheduled_date: rappelData?.date ? `${rappelData.date}T${rappelData.time || '10:00'}:00` : null
      });

      // Ajouter le lead aux leads traités pour la persistance (utilise ref + state)
      addProcessedLead(currentLead.id);

      // Logger l'appel dans la session
      if (sessionId) {
        try {
          await api.post('/call-sessions', {
            action: 'log-call',
            session_id: sessionId,
            lead_id: currentLead.lead_id,
            pipeline_lead_id: currentLead.id,
            duration: leadDuration,
            qualification: 'a_relancer',
            notes: finalNotes,
            outcome: 'a_relancer'
          });
        } catch (e) {
          console.error('Erreur log appel:', e);
        }
      }

      // Notifier le parent
      if (onLeadUpdated) {
        onLeadUpdated();
      }

      // Mettre à jour les stats
      setProcessed(prev => prev + 1);

      // Fermer le modal et passer au suivant
      setShowRappelModal(false);
      setPendingQualification(null);
      moveToNextLead();
    } catch (err) {
      console.error('Erreur qualification rappel:', err);
      toast.error('Erreur lors de la qualification');
    }
  };

  const handleRDVSuccess = async (rdvData) => {
    // Ajouter le lead aux leads traités pour la persistance (utilise ref + state)
    if (currentLead) {
      addProcessedLead(currentLead.id);
    }

    // Mettre à jour les stats
    setProcessed(prev => prev + 1);
    setQualified(prev => prev + 1);
    setRdvCount(prev => prev + 1);

    // Logger l'appel avec RDV
    if (sessionId) {
      try {
        await api.post('/call-sessions', {
          action: 'log-call',
          session_id: sessionId,
          lead_id: currentLead?.lead_id,
          pipeline_lead_id: currentLead?.id,
          duration: leadDuration,
          qualification: 'tres_qualifie',
          notes: notes.trim() || '',
          outcome: 'rdv',
          rdv_scheduled_at: rdvData?.date,
          rdv_type: rdvData?.type
        });
      } catch (e) {
        console.error('Erreur log appel RDV:', e);
      }
    }

    // Notifier le parent
    if (onLeadUpdated) {
      onLeadUpdated();
    }

    // Fermer le modal et passer au suivant
    setShowRDVModal(false);
    setPendingQualification(null);
    moveToNextLead();
  };

  const handleCall = () => {
    if (currentLead?.phone) {
      const cleanPhone = currentLead.phone.replace(/[\s\-\(\)]/g, '');
      const telLink = document.createElement('a');
      telLink.href = `tel:${cleanPhone}`;
      telLink.style.display = 'none';
      document.body.appendChild(telLink);
      telLink.click();
      document.body.removeChild(telLink);
    }
  };

  const handleEmail = () => {
    if (!currentLead) return;
    setShowEmailModal(true);
  };

  const skipLead = () => {
    // Ne pas marquer comme traité quand on skip - permet de revenir au lead plus tard
    setNotes('');
    setLeadStartTime(Date.now());
    setLeadDuration(0);

    // Trouver le prochain lead (traité ou non)
    if (currentIndex < leads.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else if (currentIndex > 0) {
      // Revenir au début si on est à la fin
      setCurrentIndex(0);
    } else {
      toast.info('Un seul lead disponible');
    }
  };

  const handleViewDetails = () => {
    if (currentLead) {
      navigate(`/LeadDetails?id=${currentLead.lead_id}`);
    }
  };

  const handleRequestValidation = () => {
    setValidationRequestType('validation');
    setShowValidationModal(true);
  };

  const handleRequestHelp = () => {
    setValidationRequestType('help');
    setShowValidationModal(true);
  };

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  const avgTimePerLead = processed > 0 ? Math.floor(sessionDuration / processed) : 0;
  const qualificationRate = processed > 0 ? Math.round((qualified / processed) * 100) : 0;

  if (!currentLead) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center">
          <Target className="w-16 h-16 text-purple-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">
            {processedLeadIds.length > 0 ? 'Session terminée !' : 'Aucun lead à prospecter'}
          </h2>
          {processedLeadIds.length > 0 && (
            <div className="mb-4 p-4 bg-green-50 rounded-xl">
              <p className="text-green-700 font-semibold">
                🎉 {processedLeadIds.length} / {totalLeadsForSession} leads traités
              </p>
              <p className="text-green-600 text-sm mt-1">
                {qualified} qualifiés • {rdvCount} RDV
              </p>
            </div>
          )}
          <button
            onClick={onExit}
            className="bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-700 transition-all"
          >
            Retour au Pipeline
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 transition-all duration-300 ${isPaused ? 'bg-gradient-to-br from-yellow-50 via-orange-50 to-yellow-100' : 'bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50'}`}>
      {/* Overlay de pause */}
      {isPaused && (
        <div className="fixed inset-0 bg-yellow-900/20 z-40 flex items-center justify-center pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 text-center shadow-2xl">
            <Coffee className="w-16 h-16 text-yellow-500 mx-auto mb-4 animate-bounce" />
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Session en pause</h2>
            <p className="text-gray-600">Cliquez sur "Reprendre" pour continuer</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6 relative z-50">
        <div className="flex items-center gap-4">
          <Target className="w-8 h-8 text-purple-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mode Prospection 🚀</h1>
            <div className="flex items-center gap-2 text-gray-600">
              {campaign && (
                <span className="flex items-center gap-1">
                  <Briefcase className="w-4 h-4" />
                  {campaign.name}
                </span>
              )}
              {filterType && filterType !== 'all' && (
                <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-sm font-medium">
                  {filterType === 'cold_call' && 'Appels à froid'}
                  {filterType === 'relancer' && 'À relancer'}
                  {filterType === 'nrp' && 'NRP'}
                  {filterType === 'qualifie' && 'Qualifiés'}
                  {filterType === 'tres_qualifie' && 'Très chauds'}
                </span>
              )}
              {!campaign && !filterType && <span>Focus sur un lead à la fois</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Bouton Pause/Reprendre */}
          <button
            onClick={handlePause}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg ${
              isPaused
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                : 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:from-yellow-500 hover:to-orange-600'
            }`}
          >
            {isPaused ? (
              <>
                <Play className="w-5 h-5" />
                ▶️ Reprendre
              </>
            ) : (
              <>
                <Pause className="w-5 h-5" />
                ⏸️ Pause
              </>
            )}
          </button>

          <button
            onClick={handleExit}
            className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl font-bold hover:from-red-600 hover:to-red-700 transition-all shadow-lg"
          >
            <X className="w-5 h-5" />
            🚪 Quitter
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">
            Leads traités : {processedLeadIds.length} / {totalLeadsForSession}
          </span>
          <span className="text-sm text-gray-600">
            {totalLeadsForSession > 0 ? Math.round((processedLeadIds.length / totalLeadsForSession) * 100) : 0}% • Restants : {leads.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-purple-600 to-pink-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${totalLeadsForSession > 0 ? (processedLeadIds.length / totalLeadsForSession) * 100 : 0}%` }}
          ></div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Stats Column */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Statistiques Session
            </h3>

            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-gray-600">Leads traités</p>
                <p className="text-2xl font-bold text-blue-700">{processed}</p>
              </div>

              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs text-gray-600">Leads qualifiés</p>
                <p className="text-2xl font-bold text-green-700">{qualified}</p>
              </div>

              <div className="bg-emerald-50 rounded-lg p-3">
                <p className="text-xs text-gray-600">RDV planifiés</p>
                <p className="text-2xl font-bold text-emerald-700">{rdvCount}</p>
              </div>

              <div className="bg-purple-50 rounded-lg p-3">
                <p className="text-xs text-gray-600">Taux de qualification</p>
                <p className="text-2xl font-bold text-purple-700">{qualificationRate}%</p>
              </div>

              <div className="bg-orange-50 rounded-lg p-3">
                <p className="text-xs text-gray-600">Temps moyen / lead</p>
                <p className="text-2xl font-bold text-orange-700">{formatDuration(avgTimePerLead)}</p>
              </div>
            </div>
          </div>

          {/* Timer Session */}
          <div className={`rounded-xl shadow-lg p-6 transition-all ${
            isPaused
              ? 'bg-gradient-to-br from-yellow-500 to-orange-500 text-white'
              : 'bg-gradient-to-br from-purple-600 to-pink-600 text-white'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-6 h-6" />
              <h3 className="font-bold text-lg">Temps effectif</h3>
            </div>
            <p className="text-4xl font-bold">{formatDuration(sessionDuration)}</p>
            {isPaused && (
              <p className="text-yellow-100 mt-2 flex items-center gap-2">
                <Coffee className="w-4 h-4" />
                En pause...
              </p>
            )}
          </div>

          {/* Timer Lead actuel */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-purple-200">
            <div className="flex items-center gap-3 mb-2">
              <Timer className="w-6 h-6 text-purple-600" />
              <h3 className="font-bold text-lg text-gray-900">Lead actuel</h3>
            </div>
            <p className={`text-4xl font-bold ${isPaused ? 'text-gray-400' : 'text-purple-600'}`}>
              {formatDuration(leadDuration)}
            </p>
          </div>
        </div>

        {/* Lead Card Column */}
        <div className={`col-span-2 space-y-4 ${isPaused ? 'opacity-50 pointer-events-none' : ''}`}>
          {/* Main Lead Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 border-4 border-purple-200">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">{currentLead.company_name}</h2>
                {currentLead.contact_name && (
                  <p className="text-xl text-gray-600">{currentLead.contact_name}</p>
                )}
              </div>
              {currentLead.score && (
                <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-xl font-bold text-lg">
                  Score: {currentLead.score}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {currentLead.email && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Email</p>
                  <p className="font-semibold text-gray-900">{currentLead.email}</p>
                </div>
              )}

              {currentLead.phone && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Téléphone</p>
                  <p className="font-semibold text-gray-900">{currentLead.phone}</p>
                </div>
              )}

              {currentLead.city && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Ville</p>
                  <p className="font-semibold text-gray-900">{currentLead.city}</p>
                </div>
              )}

              {currentLead.sector && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Secteur</p>
                  <p className="font-semibold text-gray-900">{currentLead.sector}</p>
                </div>
              )}

              {currentLead.website && (
                <div className="bg-gray-50 rounded-lg p-4 col-span-2">
                  <p className="text-xs text-gray-500 mb-1">Site Web</p>
                  <a
                    href={currentLead.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    {currentLead.website}
                  </a>
                </div>
              )}
            </div>

            {/* Actions rapides */}
            <div className="space-y-3 mb-6">
              {/* Ligne 1 : Appeler et Email */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCall}
                  disabled={!currentLead.phone}
                  className="bg-gradient-to-r from-green-500 to-green-600 text-white py-4 rounded-xl font-bold text-lg hover:from-green-600 hover:to-green-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Phone className="w-6 h-6" />
                  Appeler
                </button>

                <button
                  onClick={handleEmail}
                  disabled={!currentLead.email}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-6 h-6" />
                  Email Asefi
                </button>
              </div>

              {/* Ligne 2 : Demandes et Actions */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handleRequestValidation}
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-3 rounded-xl font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-md flex items-center justify-center gap-2 text-sm"
                >
                  <CheckCircle className="w-5 h-5" />
                  Demande Validation
                </button>

                <button
                  onClick={handleRequestHelp}
                  className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white py-3 rounded-xl font-semibold hover:from-cyan-600 hover:to-cyan-700 transition-all shadow-md flex items-center justify-center gap-2 text-sm"
                >
                  <HelpCircle className="w-5 h-5" />
                  Demande Aide
                </button>

                <button
                  onClick={handleViewDetails}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-purple-600 hover:to-purple-700 transition-all shadow-md flex items-center justify-center gap-2 text-sm"
                >
                  <Eye className="w-5 h-5" />
                  Lead Show
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Notes rapides
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notez vos observations pendant l'appel..."
                className="w-full h-32 border-2 border-gray-200 rounded-xl p-4 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all resize-none"
              />
            </div>

            {/* Qualification rapide */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">Qualification rapide :</p>
              <div className="grid grid-cols-3 gap-2">
                {QUICK_QUALIFICATIONS.map((qual) => (
                  <button
                    key={qual.id}
                    onClick={() => handleAction(qual)}
                    className={`${qual.color} text-white py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-md text-sm`}
                  >
                    {qual.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Skip button */}
            <button
              onClick={skipLead}
              className="w-full mt-4 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
            >
              <ArrowRight className="w-5 h-5" />
              Passer au suivant (sans action)
            </button>
          </div>
        </div>
      </div>

      {/* Validation Request Modal */}
      {showValidationModal && currentLead && (
        <ValidationRequestModal
          isOpen={showValidationModal}
          onClose={() => setShowValidationModal(false)}
          lead={currentLead}
          type={validationRequestType}
        />
      )}

      {/* RDV Scheduler Modal */}
      {showRDVModal && currentLead && (
        <RDVSchedulerModal
          isOpen={showRDVModal}
          onClose={() => {
            setShowRDVModal(false);
            setPendingQualification(null);
          }}
          lead={currentLead}
          onSuccess={handleRDVSuccess}
          qualification={pendingQualification?.id}
        />
      )}

      {/* Rappel Modal */}
      {showRappelModal && currentLead && (
        <RappelModal
          isOpen={showRappelModal}
          onClose={() => {
            setShowRappelModal(false);
            setPendingQualification(null);
          }}
          lead={currentLead}
          onSuccess={handleRappelSuccess}
          initialNotes={notes}
          qualification={pendingQualification?.id}
        />
      )}

      {/* Email Generator Modal */}
      {showEmailModal && currentLead && (
        <EmailGeneratorModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          lead={currentLead}
          callNotes={notes}
          onSuccess={() => {
            setShowEmailModal(false);
            toast.success('Email préparé !');
          }}
        />
      )}
    </div>
  );
}
