import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, ExternalLink, Loader } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ChatbotAsefi() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: " Bonjour ! Je suis Asefi, votre assistant IA LeadSynch. Comment puis-je vous aider aujourd'hui ?",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const quickReplies = [
    { 
      id: 1, 
      text: "Comment fonctionne LeadSynch ?", 
      emoji: ""
    },
    { 
      id: 2, 
      text: "Quels sont les tarifs ?", 
      emoji: ""
    },
    { 
      id: 3, 
      text: "Comment générer mes premiers leads ?", 
      emoji: ""
    },
    { 
      id: 4, 
      text: "Qu'est-ce qu'Asefi IA ?", 
      emoji: ""
    },
    { 
      id: 5, 
      text: "Parler à un humain", 
      emoji: ""
    }
  ];

  const callAsefiAPI = async (userMessage) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL;

      if (!API_URL) {
        throw new Error('❌ VITE_API_URL non configurée');
      }

      // Préparer l'historique pour l'API (sans le message d'accueil)
      const conversationHistory = messages
        .slice(1) // Ignorer le message d'accueil
        .map(msg => ({
          type: msg.type,
          text: msg.text
        }));

      const response = await fetch(`${API_URL}/api/chatbot/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: conversationHistory
        })
      });

      if (!response.ok) {
        throw new Error('Erreur API');
      }

      const data = await response.json();
      return data.response;

    } catch (error) {
      console.error('Erreur Asefi:', error);
      return "Désolé, je rencontre un problème technique. \n\nVous pouvez :\n Réessayer dans quelques instants\n Nous contacter à contact@leadsync.fr\n Créer un compte pour discuter avec notre équipe\n\nNotre équipe vous répondra rapidement ! ";
    }
  };

  const handleQuickReply = async (quickReply) => {
    // Ajouter la question de l'utilisateur
    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      text: quickReply.text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Appeler l'API Asefi
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

    // Ajouter le message de l'utilisateur
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

    // Appeler l'API Asefi
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

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-full shadow-2xl flex items-center justify-center text-white transition-all hover:scale-110 z-50 group"
        >
          <Sparkles className="w-7 h-7 animate-pulse" />
          
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-bounce">
            IA
          </span>

          <span className="absolute right-full mr-3 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
             Besoin d'aide ? Discutez avec Asefi IA !
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Asefi IA</h3>
                <p className="text-xs text-white/80 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Propulsé par Claude
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.type === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-line">{message.text}</p>
                </div>
              </div>
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="text-sm text-gray-600">Asefi réfléchit...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies */}
          {messages.length === 1 && !isLoading && (
            <div className="p-4 bg-white border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-3 font-semibold">Questions fréquentes :</p>
              <div className="space-y-2">
                {quickReplies.map((reply) => (
                  <button
                    key={reply.id}
                    onClick={() => handleQuickReply(reply)}
                    className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-xl text-sm transition-all flex items-center gap-2"
                  >
                    <span>{reply.emoji}</span>
                    <span className="text-gray-700">{reply.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200 rounded-b-2xl">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Posez votre question..."
                disabled={isLoading}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Propulsé par Asefi IA  Claude Sonnet 4
            </p>
          </form>
        </div>
      )}
    </>
  );
}
