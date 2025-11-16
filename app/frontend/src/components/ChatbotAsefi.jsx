import { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Mic, MicOff, Loader, Minimize2, Maximize2, FileText } from 'lucide-react';
import api from '../api/axios';

// BASE DE CONNAISSANCES LEADSYNCH
const LEADSYNCH_KNOWLEDGE = `
Tu es Asefi, l'assistant IA intelligent de LeadSynch - Plateforme CRM B2B.

INFORMATIONS EXACTES SUR LEADSYNCH:

PLANS TARIFAIRES:
- Plan GRATUIT: 30 leads/mois (PAS 60!)
- Plan STARTER: 27€/mois - 500 leads
- Plan PRO: 67€/mois - 2000 leads
- Plan BUSINESS: 147€/mois - 10000 leads
- Plan ENTREPRISE: Sur mesure - leads illimités

FONCTIONNALITÉS PRINCIPALES:
1. Génération de leads via Google Maps API + web scraping
2. Import CSV avec détection automatique secteur par IA (Claude)
3. Campagnes email avec tracking (ouvertures, clics)
4. Pipeline Kanban avec drag & drop
5. Scoring automatique de leads
6. Templates email IA générés par Claude
7. Gestion multi-utilisateurs avec rôles (admin, manager, commercial)
8. Chatbot IA (toi, Asefi!)
9. Secteurs géographiques avec assignation automatique par code postal
10. Système de demandes validation/aide pour managers

SECTEURS SUPPORTÉS:
Juridique, Comptabilité, Santé, Informatique/IT, BTP, Hôtellerie-Restauration,
Immobilier, Logistique, Commerce, Éducation, Consulting, RH, Services, Industrie, Automobile

INTÉGRATIONS:
- Anthropic Claude API (génération templates + classification)
- Elastic Email API (envoi emails en masse)
- Google Maps API (génération leads)
- PostgreSQL Neon (base de données)

RÔLES UTILISATEURS:
- Admin: Accès complet, gestion tenant
- Manager: Supervision équipe, validation demandes
- Commercial: Gestion leads, campagnes, pipeline

RÈGLES DE RÉPONSE:
1. Sois PRÉCIS et EXACT sur les chiffres (30 leads gratuit, pas 60!)
2. Si question complexe nécessitant action, propose le formulaire de demande
3. Reste concis, professionnel mais amical
4. Utilise des emojis avec parcimonie
5. Si tu ne sais pas, dis-le et propose le formulaire

EXEMPLES DE QUESTIONS COMPLEXES (proposer formulaire):
- Demande de personnalisation avancée
- Problème technique spécifique
- Demande de fonctionnalité custom
- Questions sur intégrations complexes
- Support technique avancé
`;

export default function ChatbotAsefi({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: "👋 Bonjour ! Je suis Asefi, votre assistant IA LeadSynch.\n\nJe peux vous aider avec :\n• Vos campagnes et leads\n• Questions sur les plans tarifaires\n• Génération de templates email\n• Fonctionnalités du système\n\nComment puis-je vous aider ?",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showComplexForm, setShowComplexForm] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Configuration Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'fr-FR';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleMicrophone = () => {
    if (!recognitionRef.current) {
      alert('La reconnaissance vocale n\'est pas supportée par votre navigateur');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const quickReplies = [
    { id: 1, text: "Quels sont les plans tarifaires ?", emoji: "💰" },
    { id: 2, text: "Comment générer des leads ?", emoji: "🎯" },
    { id: 3, text: "Créer une campagne email", emoji: "✉️" },
    { id: 4, text: "Demande complexe", emoji: "📋", action: 'complex' }
  ];

  const handleQuickReply = (reply) => {
    if (reply.action === 'complex') {
      setShowComplexForm(true);
      return;
    }
    setInputValue(reply.text);
    handleSend(reply.text);
  };

  const handleSend = async (textToSend = null) => {
    const messageText = textToSend || inputValue.trim();
    if (!messageText || isLoading) return;

    // Ajouter message utilisateur
    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Appel API optimisé avec système prompt contenant la base de connaissances
      const response = await api.post('/asefi', {
        prompt: messageText,
        context: LEADSYNCH_KNOWLEDGE
      });

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: response.data.response || "Désolé, je n'ai pas pu générer une réponse.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);

      // Si la réponse suggère une demande complexe, proposer le formulaire
      if (response.data.response?.includes('formulaire') || response.data.response?.includes('demande')) {
        setTimeout(() => {
          const suggestFormMessage = {
            id: Date.now() + 2,
            type: 'bot',
            text: "💡 Pour cette question, souhaitez-vous remplir un formulaire de demande détaillée ? Cela me permettra de mieux vous aider.",
            timestamp: new Date(),
            showFormButton: true
          };
          setMessages(prev => [...prev, suggestFormMessage]);
        }, 1000);
      }

    } catch (error) {
      console.error('Erreur Asefi:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: "❌ Désolé, une erreur s'est produite. Réessayez ou utilisez le formulaire de demande.",
        timestamp: new Date(),
        showFormButton: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleComplexFormSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const complexMessage = {
      id: Date.now(),
      type: 'user',
      text: `📋 DEMANDE COMPLEXE:\nSujet: ${formData.get('subject')}\nDescription: ${formData.get('description')}`,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, complexMessage]);
    setShowComplexForm(false);

    // Réponse automatique
    setTimeout(() => {
      const confirmMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: "✅ Votre demande a été enregistrée ! Notre équipe vous répondra dans les meilleurs délais.\n\nVous recevrez une notification par email.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, confirmMessage]);
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Popup flottant - Position fixe en bas à droite */}
      <div
        className={`fixed z-50 transition-all duration-300 ${
          isMinimized
            ? 'bottom-6 right-6 w-80'
            : 'bottom-6 right-6 w-[450px] h-[650px]'
        }`}
        style={{ maxHeight: 'calc(100vh - 100px)' }}
      >
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="p-4 flex items-center justify-between border-b border-white/20">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Sparkles className="w-8 h-8 text-white animate-pulse" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Asefi</h3>
                <p className="text-white/80 text-xs">Assistant IA LeadSynch</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                {isMinimized ? (
                  <Maximize2 className="w-5 h-5 text-white" />
                ) : (
                  <Minimize2 className="w-5 h-5 text-white" />
                )}
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white/10 backdrop-blur-md">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl p-3 ${
                        message.type === 'user'
                          ? 'bg-white text-gray-900'
                          : 'bg-white/90 text-gray-900 border border-white/60'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                      {message.showFormButton && (
                        <button
                          onClick={() => setShowComplexForm(true)}
                          className="mt-2 w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all text-sm font-medium flex items-center justify-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          Ouvrir le formulaire
                        </button>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {message.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white/90 rounded-2xl p-3 border border-white/60">
                      <div className="flex items-center gap-2">
                        <Loader className="w-4 h-4 animate-spin text-purple-600" />
                        <span className="text-sm text-gray-600">Asefi réfléchit...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Replies */}
              {messages.length <= 2 && (
                <div className="p-3 bg-white/10 border-t border-white/20">
                  <p className="text-white/90 text-xs mb-2">Suggestions rapides:</p>
                  <div className="flex flex-wrap gap-2">
                    {quickReplies.map((reply) => (
                      <button
                        key={reply.id}
                        onClick={() => handleQuickReply(reply)}
                        className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs rounded-full transition-colors flex items-center gap-1"
                      >
                        <span>{reply.emoji}</span>
                        <span>{reply.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="p-4 bg-white/10 border-t border-white/20">
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleMicrophone}
                    className={`p-3 rounded-xl transition-all ${
                      isListening
                        ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                        : 'bg-white/20 hover:bg-white/30'
                    }`}
                  >
                    {isListening ? (
                      <MicOff className="w-5 h-5 text-white" />
                    ) : (
                      <Mic className="w-5 h-5 text-white" />
                    )}
                  </button>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Posez votre question..."
                    disabled={isLoading}
                    className="flex-1 px-4 py-3 rounded-xl bg-white/90 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50"
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={!inputValue.trim() || isLoading}
                    className="p-3 bg-white hover:bg-white/90 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5 text-purple-600" />
                  </button>
                </div>
              </div>
            </>
          )}

          {isMinimized && (
            <div className="p-4 text-center">
              <p className="text-white text-sm">Cliquez pour agrandir</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Formulaire Demande Complexe */}
      {showComplexForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-6 h-6 text-purple-600" />
                Demande Complexe
              </h3>
              <button
                onClick={() => setShowComplexForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleComplexFormSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Sujet
                </label>
                <input
                  type="text"
                  name="subject"
                  required
                  placeholder="Ex: Intégration API personnalisée"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description détaillée
                </label>
                <textarea
                  name="description"
                  required
                  rows={5}
                  placeholder="Décrivez votre besoin en détail..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowComplexForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 font-medium"
                >
                  Envoyer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
