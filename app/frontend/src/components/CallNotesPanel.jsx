<<<<<<< HEAD
import { log, error, warn } from "./../lib/logger.js";
=======
import { log, error, warn } from "../lib/logger.js";
>>>>>>> origin/main
import React, { useState, useEffect } from 'react';
import { MessageSquare, Save, X } from 'lucide-react';

export default function CallNotesPanel({ lead, callDuration, notes, onNotesChange, onClose }) {
  const [localNotes, setLocalNotes] = useState(notes || '');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setLocalNotes(notes);
  }, [notes]);

  const handleSave = () => {
    onNotesChange(localNotes);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="fixed bottom-6 left-6 w-96 bg-white rounded-2xl shadow-2xl border-2 border-purple-200 z-40 animate-slide-up">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5" />
          <div>
            <h3 className="font-bold text-sm">Notes d'appel</h3>
            <p className="text-xs text-purple-100">{lead.company_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white bg-opacity-20 px-3 py-1 rounded-lg">
            <span className="font-mono font-bold text-sm">{formatDuration(callDuration)}</span>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white hover:bg-opacity-20 p-1 rounded transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4">
        <textarea
          value={localNotes}
          onChange={(e) => {
            setLocalNotes(e.target.value);
            onNotesChange(e.target.value);
          }}
          placeholder="Tapez vos notes ici pendant l'appel...&#10;&#10;• Points discutés&#10;• Besoins identifiés&#10;• Prochaines étapes&#10;• Budget mentionné"
          className="w-full h-64 border-2 border-gray-200 rounded-xl p-4 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all resize-none text-sm"
          autoFocus
        />

        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-gray-500">
            💡 Ces notes seront utilisées par l'IA pour générer votre email
          </p>
          {isSaved && (
            <div className="flex items-center gap-2 text-green-600 text-sm font-semibold animate-fade-in">
              <Save className="w-4 h-4" />
              Sauvegardé !
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-in;
        }
      `}</style>
    </div>
  );
}