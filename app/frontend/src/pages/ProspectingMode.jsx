import React, { useState, useEffect } from 'react';
import { X, Phone, Mail, ThumbsUp, ThumbsDown, ArrowRight, Timer, TrendingUp, Target, Sparkles, MessageSquare } from 'lucide-react';
import api from '../api/axios';

const QUICK_QUALIFICATIONS = [
  { id: 'tres_qualifie', label: '🔥 Très Chaud', color: 'bg-green-500', stage: 'tres_qualifie' },
  { id: 'qualifie', label: '👍 Qualifié', color: 'bg-blue-500', stage: 'qualifie' },
  { id: 'a_relancer', label: '⏰ À Relancer', color: 'bg-yellow-500', stage: 'relancer' },
  { id: 'nrp', label: '📵 NRP', color: 'bg-gray-500', stage: 'nrp' },
  { id: 'pas_interesse', label: '👎 Pas Intéressé', color: 'bg-red-500', stage: 'hors_scope' },
];

export default function ProspectionMode({ leads = [], onExit, onLeadUpdated }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [notes, setNotes] = useState('');
  const [processed, setProcessed] = useState(0);
  const [qualified, setQualified] = useState(0);
  const [sessionStartTime] = useState(Date.now());
  const [leadStartTime, setLeadStartTime] = useState(Date.now());
  const [leadDuration, setLeadDuration] = useState(0);
  const [generating, setGenerating] = useState(false);

  // Protection contre leads undefined ou vide
  const currentLead = leads && leads.length > 0 ? leads[currentIndex] : null;

  useEffect(() => {
    const interval = setInterval(() => {
      setLeadDuration(Math.floor((Date.now() - leadStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [leadStartTime]);

  const handleAction = async (qualification) => {
    try {
      if (!currentLead) return;

      // ✅ CORRECTION : Utiliser la route /qualify qui déplace automatiquement le lead
      await api.post(`/pipeline-leads/${currentLead.id}/qualify`, {
        qualification: qualification.id,
        notes: notes.trim() || '',
        call_duration: leadDuration,
        next_action: '',
        scheduled_date: null
      });

      // Notifier le parent que le lead a été mis à jour
      if (onLeadUpdated) {
        onLeadUpdated();
      }

      // Stats
      setProcessed(prev => prev + 1);
      if (qualification.stage === 'qualifie' || qualification.stage === 'tres_qualifie') {
        setQualified(prev => prev + 1);
      }

      // Reset et passer au suivant
      setNotes('');
      setLeadStartTime(Date.now());
      
      if (currentIndex < leads.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        alert('✅ Tous les leads traités !');
        onExit();
      }
    } catch (error) {
      console.error('Erreur qualification:', error);
      alert('Erreur lors de la qualification');
    }
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

  const handleEmail = async () => {
    if (!currentLead) return;

    setGenerating(true);

    try {
      const response = await api.post('/asefi/generate-quick-email', {
        template_type: 'first_contact',
        lead_info: {
          company_name: currentLead.company_name,
          industry: currentLead.sector || 'B2B',
          status: 'nouveau'
        },
        tone: 'friendly',
        user_signature: {
          name: 'Votre nom',
          title: 'Votre titre',
          company: 'Votre entreprise'
        }
      });

      if (response.data.success) {
        const email = response.data.email;
        const subject = encodeURIComponent(email.subject);
        const body = encodeURIComponent(`${email.body}\n\n${email.cta || ''}`);
        const to = encodeURIComponent(currentLead.email);

        window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
      }
    } catch (error) {
      console.error('❌ Erreur génération email:', error);
      alert('Erreur lors de la génération de l\'email');
    } finally {
      setGenerating(false);
    }
  };

  const nextLead = () => {
    if (currentIndex < leads.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setNotes('');
      setLeadStartTime(Date.now());
      setLeadDuration(0);
    } else {
      // Fin de la session
      alert(`🎉 Session terminée !\n\n${processed} leads traités\n${qualified} leads qualifiés`);
      onExit();
    }
  };

  const skipLead = () => {
    nextLead();
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const sessionDuration = Math.floor((Date.now() - sessionStartTime) / 1000);
  const avgTimePerLead = processed > 0 ? Math.floor(sessionDuration / processed) : 0;
  const qualificationRate = processed > 0 ? Math.round((qualified / processed) * 100) : 0;

  if (!currentLead) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center">
          <Target className="w-16 h-16 text-purple-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Aucun lead à prospecter</h2>
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Target className="w-8 h-8 text-purple-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mode Prospection 🚀</h1>
            <p className="text-gray-600">Focus sur un lead à la fois</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => alert('⏸️ Pause ! Prenez un café ☕\n\nCliquez OK pour reprendre.')}
            className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:from-yellow-500 hover:to-orange-600 transition-all shadow-lg"
          >
            <Timer className="w-5 h-5" />
            ⏸️ Pause
          </button>

          <button
            onClick={onExit}
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
            Progression : {currentIndex + 1} / {leads.length}
          </span>
          <span className="text-sm text-gray-600">
            {Math.round(((currentIndex + 1) / leads.length) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-purple-600 to-pink-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${((currentIndex + 1) / leads.length) * 100}%` }}
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

              <div className="bg-purple-50 rounded-lg p-3">
                <p className="text-xs text-gray-600">Taux de qualification</p>
                <p className="text-2xl font-bold text-purple-700">{qualificationRate}%</p>
              </div>

              <div className="bg-orange-50 rounded-lg p-3">
                <p className="text-xs text-gray-600">Temps moyen / lead</p>
                <p className="text-2xl font-bold text-orange-700">{formatDuration(avgTimePerLead)}</p>
              </div>

              <div className="bg-pink-50 rounded-lg p-3">
                <p className="text-xs text-gray-600">Durée session</p>
                <p className="text-2xl font-bold text-pink-700">{formatDuration(sessionDuration)}</p>
              </div>
            </div>
          </div>

          {/* Timer Lead actuel */}
          <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <Timer className="w-6 h-6" />
              <h3 className="font-bold text-lg">Lead actuel</h3>
            </div>
            <p className="text-4xl font-bold">{formatDuration(leadDuration)}</p>
          </div>
        </div>

        {/* Lead Card Column */}
        <div className="col-span-2 space-y-4">
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
            <div className="grid grid-cols-2 gap-3 mb-6">
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
                disabled={!currentLead.email || generating}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <Sparkles className="w-6 h-6 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Mail className="w-6 h-6" />
                    Email IA
                  </>
                )}
              </button>
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
              <div className="grid grid-cols-5 gap-2">
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
    </div>
  );
}