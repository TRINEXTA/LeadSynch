import { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Mic, MicOff, Loader } from 'lucide-react';
import api from '../api/axios';

export default function ChatbotAsefi({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: "👋 Bonjour ! Je suis Asefi, votre assistant IA LeadSynch.\n\nJe peux vous aider avec :\n• Vos campagnes et leads\n• Génération de templates email\n• Questions sur le système\n• Analyse de vos performances\n\nComment puis-je vous aider ?",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
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
    {
      id: 1,
      text: "Comment améliorer mes campagnes ?",
      emoji: "📊"
    },
    {
      id: 2,
      text: "Générer un template email",
      emoji: "✉️"
    },
    {
      id: 3,
      text: "Analyser mes performances",
      emoji: "📈"
    },
    {
      id: 4,
      text: "Aide sur les leads",
      emoji: "🎯"
    }
  ];

  const callAsefiAPI = async (userMessage) => {
    try {
      // Préparer l'historique (sans le message d'accueil)
      const conversationHistory = messages
        .slice(1)
        .map(msg => ({
          type: msg.type,
          text: msg.text
        }));

      const response = await api.post('/chatbot/ask', {
        message: userMessage,
        conversationHistory: conversationHistory
      });

      if (response.data.success) {
        return response.data.response;
      } else {
        throw new Error(response.data.error || 'Erreur API');
      }

    } catch (error) {
      console.error('Erreur Asefi:', error);
      return "Désolé, je rencontre un problème technique. 😔\n\nVous pouvez :\n• Réessayer dans quelques instants\n• Contacter le support si le problème persiste\n\nNotre équipe vous aidera rapidement ! 💪";
    }
  };

  const handleQuickReply = async (quickReply) => {
    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      text: quickReply.text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    const botResponse = await callAsefiAPI(quickReply.text);
    setIsLoading(false);

    const botMessage = {
      id: messages.length + 2,
      type: 'bot',
      text: botResponse,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, botMessage]);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      text: inputValue,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    const savedInput = inputValue;
    setInputValue('');
    setIsLoading(true);

    const botResponse = await callAsefiAPI(savedInput);
    setIsLoading(false);

    const botMessage = {
      id: messages.length + 2,
      type: 'bot',
      text: botResponse,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, botMessage]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-xl">Asefi</h2>
              <p className="text-indigo-100 text-sm">Votre assistant IA LeadSynch</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-all text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.type === 'user'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-900'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                <p className={`text-xs mt-2 ${
                  message.type === 'user' ? 'text-indigo-100' : 'text-gray-400'
                }`}>
                  {message.timestamp.toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader className="w-4 h-4 text-indigo-600 animate-spin" />
                  <span className="text-sm text-gray-600">Asefi réfléchit...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Replies */}
        {messages.length === 1 && (
          <div className="px-6 py-3 border-t border-gray-200 bg-white">
            <p className="text-xs text-gray-500 mb-2 font-medium">Suggestions rapides :</p>
            <div className="grid grid-cols-2 gap-2">
              {quickReplies.map((reply) => (
                <button
                  key={reply.id}
                  onClick={() => handleQuickReply(reply)}
                  className="text-left px-3 py-2 bg-gray-100 hover:bg-indigo-100 rounded-lg text-sm transition-all border border-transparent hover:border-indigo-300"
                  disabled={isLoading}
                >
                  <span className="mr-2">{reply.emoji}</span>
                  {reply.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white rounded-b-2xl">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMicrophone}
              className={`p-3 rounded-xl transition-all ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              disabled={isLoading}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={isListening ? "Parlez maintenant..." : "Posez votre question..."}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={isLoading || isListening}
            />

            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="p-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          {isListening && (
            <p className="text-xs text-red-500 mt-2 animate-pulse">
              🎙️ Micro activé - Parlez maintenant...
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
