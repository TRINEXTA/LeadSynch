import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import {
  X, Send, Sparkles, Mic, MicOff, Loader, Minimize2, Maximize2,
  User, Building2, Phone, Mail, Target, Zap, MessageSquare,
  Calendar, FileText, TrendingUp, CheckCircle, AlertTriangle,
  ThumbsUp, Clock, RefreshCw, Copy, ExternalLink
} from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

// Configuration des Health Labels
const HEALTH_LABELS = {
  hot: { icon: '🔥', color: 'text-red-500', bg: 'bg-red-100', label: 'Très chaud' },
  warm: { icon: '🟡', color: 'text-yellow-500', bg: 'bg-yellow-100', label: 'Tiède' },
  cold: { icon: '🔵', color: 'text-blue-500', bg: 'bg-blue-100', label: 'Froid' },
  at_risk: { icon: '⚠️', color: 'text-orange-500', bg: 'bg-orange-100', label: 'À risque' },
  lost: { icon: '❌', color: 'text-gray-500', bg: 'bg-gray-100', label: 'Perdu' },
  won: { icon: '✅', color: 'text-green-500', bg: 'bg-green-100', label: 'Gagné' },
  new: { icon: '🆕', color: 'text-indigo-500', bg: 'bg-indigo-100', label: 'Nouveau' }
};

// Actions rapides contextuelles
const QUICK_ACTIONS = {
  lead: [
    { id: 'info', text: 'Dis-moi tout sur ce lead', icon: User, emoji: '👤' },
    { id: 'history', text: 'Historique des interactions', icon: Clock, emoji: '📜' },
    { id: 'email', text: 'Génère un email de relance', icon: Mail, emoji: '✉️' },
    { id: 'whatsapp', text: 'Génère un message WhatsApp', icon: MessageSquare, emoji: '💬' },
    { id: 'next', text: 'Quelle est la prochaine action ?', icon: Target, emoji: '🎯' }
  ],
  default: [
    { id: 'stats', text: 'Mes stats du jour', icon: TrendingUp, emoji: '📊' },
    { id: 'hot', text: 'Leads les plus chauds', icon: Zap, emoji: '🔥' },
    { id: 'todo', text: 'Mes tâches en attente', icon: CheckCircle, emoji: '✅' },
    { id: 'help', text: 'Comment puis-tu m\'aider ?', icon: Sparkles, emoji: '💡' }
  ]
};

export default function ChatbotAsefi({ isOpen, onClose }) {
  const location = useLocation();
  const params = useParams();

  // États
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [currentLeadContext, setCurrentLeadContext] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);

  // Détecter le contexte actuel (page, lead)
  const detectContext = useCallback(() => {
    const path = location.pathname;

    // Détection du lead depuis l'URL ou les params
    const leadIdMatch = path.match(/\/leads?\/([a-f0-9-]+)/i) ||
                        path.match(/\/pipeline\/([a-f0-9-]+)/i) ||
                        path.match(/\/prospection\/([a-f0-9-]+)/i);

    if (leadIdMatch || params.id || params.leadId) {
      return {
        type: 'lead',
        leadId: leadIdMatch?.[1] || params.id || params.leadId,
        page: path
      };
    }

    // Autres pages
    if (path.includes('/pipeline')) return { type: 'pipeline', page: path };
    if (path.includes('/campaigns')) return { type: 'campaigns', page: path };
    if (path.includes('/dashboard')) return { type: 'dashboard', page: path };
    if (path.includes('/prospection')) return { type: 'prospection', page: path };

    return { type: 'default', page: path };
  }, [location.pathname, params]);

  // Charger le contexte du lead si disponible
  const loadLeadContext = useCallback(async (leadId) => {
    if (!leadId) return;

    try {
      const response = await api.get(`/leads/${leadId}`);
      if (response.data) {
        setCurrentLeadContext(response.data);
      }
    } catch (err) {
      console.error('Erreur chargement contexte lead:', err);
    }
  }, []);

  // Scroll automatique
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialiser le contexte quand le chatbot s'ouvre
  useEffect(() => {
    if (isOpen) {
      const context = detectContext();

      if (context.type === 'lead' && context.leadId) {
        loadLeadContext(context.leadId);
      } else {
        setCurrentLeadContext(null);
      }

      // Message d'accueil contextuel
      if (messages.length === 0) {
        const welcomeMessage = getWelcomeMessage(context, currentLeadContext);
        setMessages([{
          id: Date.now(),
          type: 'bot',
          text: welcomeMessage,
          timestamp: new Date()
        }]);
      }

      // Focus sur l'input
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, detectContext, loadLeadContext]);

  // Speech Recognition
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

      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  // Générer message d'accueil contextuel
  const getWelcomeMessage = (context, lead) => {
    if (lead) {
      const healthConfig = HEALTH_LABELS[lead.health_label] || HEALTH_LABELS.new;
      return `👋 Bonjour ! Je suis **ASEFI**, votre assistant IA.

📍 **Contexte détecté** : Vous consultez **${lead.company_name}**
${healthConfig.icon} Statut : ${healthConfig.label} | Score : ${lead.score || 'N/A'}/100

Je peux vous aider à :
• Analyser ce prospect en détail
• Générer des emails/messages personnalisés
• Mettre à jour le statut ou créer des tâches
• Suggérer la prochaine meilleure action

Que souhaitez-vous faire ?`;
    }

    switch (context.type) {
      case 'pipeline':
        return `👋 Bonjour ! Je suis **ASEFI**, votre assistant IA.

📍 Vous êtes sur le **Pipeline**. Je peux vous aider à :
• Identifier vos leads les plus chauds
• Analyser la santé de votre pipeline
• Suggérer des actions prioritaires

Que puis-je faire pour vous ?`;

      case 'campaigns':
        return `👋 Bonjour ! Je suis **ASEFI**, votre assistant IA.

📍 Vous êtes sur les **Campagnes**. Je peux vous aider à :
• Analyser les performances de vos campagnes
• Générer des templates d'email
• Optimiser vos taux d'ouverture

Comment puis-je vous aider ?`;

      default:
        return `👋 Bonjour ! Je suis **ASEFI**, votre assistant IA intelligent.

🧠 Je m'alimente de vos données en temps réel pour vous aider :
• Analyser vos leads et leur potentiel
• Générer des contenus personnalisés
• Exécuter des actions (emails, statuts, tâches)
• Répondre à vos questions

💡 Astuce : Ouvrez-moi sur une fiche lead pour que je vous donne des insights personnalisés !

Que puis-je faire pour vous ?`;
    }
  };

  // Envoyer un message
  const handleSend = async (textToSend = null) => {
    const messageText = textToSend || inputValue.trim();
    if (!messageText || isLoading) return;

    const context = detectContext();

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
      // Appel API ASEFI contextuel
      const response = await api.post('/asefi-chat/chat', {
        message: messageText,
        leadId: context.leadId || currentLeadContext?.id,
        conversationId: conversationId,
        executeActions: false // Ne pas exécuter automatiquement
      });

      const { response: aiResponse, actions_detected, conversation_id, lead_context } = response.data;

      setConversationId(conversation_id);

      // Mettre à jour le contexte du lead si retourné
      if (lead_context) {
        setCurrentLeadContext(prev => ({ ...prev, ...lead_context }));
      }

      // Message de l'IA
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: aiResponse,
        timestamp: new Date(),
        actions: actions_detected
      };

      setMessages(prev => [...prev, botMessage]);

      // Si des actions sont détectées, demander confirmation
      if (actions_detected && actions_detected.length > 0) {
        setPendingAction(actions_detected[0]);

        const actionMessage = {
          id: Date.now() + 2,
          type: 'bot',
          text: `⚡ **Action détectée** : Voulez-vous que j'exécute cette action ?`,
          timestamp: new Date(),
          actionConfirmation: actions_detected[0]
        };

        setMessages(prev => [...prev, actionMessage]);
      }

    } catch (err) {
      console.error('Erreur ASEFI:', err);

      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: `❌ Désolé, une erreur s'est produite : ${err.response?.data?.message || err.message}\n\nRéessayez ou reformulez votre question.`,
        timestamp: new Date(),
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Exécuter une action
  const executeAction = async (action) => {
    setIsLoading(true);

    try {
      const response = await api.post('/asefi-chat/execute-action', {
        action: action.type,
        params: action.params
      });

      if (response.data.success) {
        toast.success(response.data.message);

        const successMessage = {
          id: Date.now(),
          type: 'bot',
          text: `✅ **Action exécutée** : ${response.data.message}`,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, successMessage]);
      } else {
        toast.error(response.data.message);
      }

      setPendingAction(null);

    } catch (err) {
      console.error('Erreur exécution action:', err);
      toast.error('Erreur lors de l\'exécution');
    } finally {
      setIsLoading(false);
    }
  };

  // Générer un email
  const generateEmail = async () => {
    if (!currentLeadContext?.id) {
      toast.error('Sélectionnez d\'abord un lead');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/asefi-chat/generate-email', {
        leadId: currentLeadContext.id,
        type: 'relance',
        tone: 'professionnel'
      });

      if (response.data.success) {
        const { email } = response.data;

        const emailMessage = {
          id: Date.now(),
          type: 'bot',
          text: `📧 **Email généré pour ${currentLeadContext.company_name}**\n\n**Objet:** ${email.subject}\n\n---\n${email.body}`,
          timestamp: new Date(),
          copyable: true,
          emailData: email
        };

        setMessages(prev => [...prev, emailMessage]);
      }

    } catch (err) {
      console.error('Erreur génération email:', err);
      toast.error('Erreur lors de la génération');
    } finally {
      setIsLoading(false);
    }
  };

  // Générer un message WhatsApp
  const generateWhatsApp = async () => {
    if (!currentLeadContext?.id) {
      toast.error('Sélectionnez d\'abord un lead');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/asefi-chat/generate-message', {
        leadId: currentLeadContext.id,
        channel: 'whatsapp',
        objective: 'prise de contact'
      });

      if (response.data.success) {
        const { message } = response.data;

        const waMessage = {
          id: Date.now(),
          type: 'bot',
          text: `💬 **Message WhatsApp généré**\n\n${message.content}\n\n📏 ${message.character_count} caractères`,
          timestamp: new Date(),
          copyable: true,
          messageData: message
        };

        setMessages(prev => [...prev, waMessage]);
      }

    } catch (err) {
      console.error('Erreur génération WhatsApp:', err);
      toast.error('Erreur lors de la génération');
    } finally {
      setIsLoading(false);
    }
  };

  // Copier dans le presse-papier
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copié dans le presse-papier !');
  };

  // Actions rapides
  const handleQuickAction = (action) => {
    switch (action.id) {
      case 'email':
        generateEmail();
        break;
      case 'whatsapp':
        generateWhatsApp();
        break;
      default:
        handleSend(action.text);
    }
  };

  const toggleMicrophone = () => {
    if (!recognitionRef.current) {
      toast.error('Reconnaissance vocale non supportée');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Déterminer les actions rapides à afficher
  const context = detectContext();
  const quickActions = currentLeadContext || context.type === 'lead'
    ? QUICK_ACTIONS.lead
    : QUICK_ACTIONS.default;

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-50 transition-all duration-300 ${
        isMinimized
          ? 'bottom-6 right-6 w-80'
          : 'bottom-6 right-6 w-[480px] h-[700px]'
      }`}
      style={{ maxHeight: 'calc(100vh - 100px)' }}
    >
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl flex flex-col h-full overflow-hidden border border-white/20">
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-white/20">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white animate-pulse" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
            </div>
            <div>
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                ASEFI
                <span className="text-xs font-normal bg-white/20 px-2 py-0.5 rounded-full">IA</span>
              </h3>
              <p className="text-white/80 text-xs">
                {currentLeadContext
                  ? `📍 ${currentLeadContext.company_name}`
                  : 'Assistant intelligent'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentLeadContext && (
              <div className={`px-2 py-1 rounded-lg text-xs font-medium ${HEALTH_LABELS[currentLeadContext.health_label]?.bg || 'bg-gray-100'}`}>
                {HEALTH_LABELS[currentLeadContext.health_label]?.icon} {currentLeadContext.score || '?'}/100
              </div>
            )}
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              {isMinimized ? <Maximize2 className="w-5 h-5 text-white" /> : <Minimize2 className="w-5 h-5 text-white" />}
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
            {/* Lead Context Bar */}
            {currentLeadContext && (
              <div className="px-4 py-2 bg-white/10 border-b border-white/10 flex items-center gap-4 text-xs text-white/90">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {currentLeadContext.company_name}
                </span>
                {currentLeadContext.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {currentLeadContext.phone}
                  </span>
                )}
                {currentLeadContext.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {currentLeadContext.email}
                  </span>
                )}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white/5">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 ${
                      message.type === 'user'
                        ? 'bg-white text-gray-900'
                        : message.isError
                          ? 'bg-red-100 text-red-900 border border-red-200'
                          : 'bg-white/95 text-gray-900 border border-white/60'
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap prose prose-sm max-w-none">
                      {message.text.split('**').map((part, i) =>
                        i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                      )}
                    </div>

                    {/* Boutons de copie pour les contenus générés */}
                    {message.copyable && (
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => copyToClipboard(message.emailData?.body || message.messageData?.content)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-xs font-medium transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                          Copier
                        </button>
                      </div>
                    )}

                    {/* Confirmation d'action */}
                    {message.actionConfirmation && (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => executeAction(message.actionConfirmation)}
                          disabled={isLoading}
                          className="flex items-center gap-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Confirmer
                        </button>
                        <button
                          onClick={() => setPendingAction(null)}
                          className="flex items-center gap-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                        >
                          <X className="w-4 h-4" />
                          Annuler
                        </button>
                      </div>
                    )}

                    <p className="text-xs text-gray-400 mt-1">
                      {message.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/95 rounded-2xl p-3 border border-white/60">
                    <div className="flex items-center gap-2">
                      <Loader className="w-4 h-4 animate-spin text-purple-600" />
                      <span className="text-sm text-gray-600">ASEFI réfléchit...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            {messages.length <= 2 && (
              <div className="p-3 bg-white/10 border-t border-white/10">
                <p className="text-white/80 text-xs mb-2 font-medium">⚡ Actions rapides :</p>
                <div className="flex flex-wrap gap-2">
                  {quickActions.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => handleQuickAction(action)}
                      disabled={isLoading}
                      className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs rounded-full transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <span>{action.emoji}</span>
                      <span>{action.text}</span>
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
                  disabled={isLoading}
                  className={`p-3 rounded-xl transition-all ${
                    isListening
                      ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                      : 'bg-white/20 hover:bg-white/30'
                  } disabled:opacity-50`}
                >
                  {isListening ? (
                    <MicOff className="w-5 h-5 text-white" />
                  ) : (
                    <Mic className="w-5 h-5 text-white" />
                  )}
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={currentLeadContext
                    ? `Posez une question sur ${currentLeadContext.company_name}...`
                    : 'Posez votre question à ASEFI...'}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/95 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!inputValue.trim() || isLoading}
                  className="p-3 bg-white hover:bg-white/90 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5 text-purple-600" />
                </button>
              </div>

              {/* Indicateur de contexte */}
              <div className="mt-2 flex items-center justify-between text-xs text-white/60">
                <span className="flex items-center gap-1">
                  {currentLeadContext ? (
                    <>
                      <Target className="w-3 h-3" />
                      Contexte : {currentLeadContext.company_name}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3" />
                      Mode général
                    </>
                  )}
                </span>
                <button
                  onClick={() => {
                    setMessages([]);
                    setConversationId(null);
                    setCurrentLeadContext(null);
                  }}
                  className="flex items-center gap-1 hover:text-white/90 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Nouvelle conversation
                </button>
              </div>
            </div>
          </>
        )}

        {isMinimized && (
          <div className="p-4 text-center cursor-pointer" onClick={() => setIsMinimized(false)}>
            <p className="text-white text-sm">💬 Cliquez pour ouvrir ASEFI</p>
          </div>
        )}
      </div>
    </div>
  );
}
