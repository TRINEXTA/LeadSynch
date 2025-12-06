import { log, error, warn } from "../../lib/logger.js";
import React, { useState, useEffect } from 'react';
import { X, Send, Sparkles, Loader, Mail, Save } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function QuickEmailModal({ lead, onClose, onSuccess }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    setSubject(`Suivi - ${lead.company_name}`);
    setBody(`Bonjour ${lead.contact_name || ''},\n\nJe me permets de revenir vers vous concernant notre échange.\n\nRestant à votre disposition pour toute question.\n\nCordialement,`);
  }, [lead]);

  const handleGenerateWithAI = async () => {
    setGenerating(true);
    try {
      const response = await api.post('/asefi/generate-email-from-notes', {
        lead_info: {
          company_name: lead.company_name,
          contact_name: lead.contact_name,
          email: lead.email,
          phone: lead.phone,
          city: lead.city,
          sector: lead.sector || 'B2B'
        },
        call_notes: lead.notes || 'Email de suivi commercial',
        qualification: lead.stage || 'qualifie',
        user_signature: {
          name: 'Votre nom',
          company: 'Trinexta',
          email: 'contact@trinexta.com'
        }
      });

      if (response.data.success) {
        setSubject(response.data.email.subject);
        setBody(response.data.email.body);
      }
    } catch (err) {
      error('❌ Erreur génération:', err);
      toast.error('Erreur lors de la génération IA');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error('Sujet et corps requis');
      return;
    }

    setSaving(true);
    try {
      // Enregistrer via l'action existante
      await api.post(`/pipeline-leads/${lead.id}/action`, {
        action_type: 'email',
        notes: `📧 Email sauvegardé\n\nObjet: ${subject}\n\n${body}`
      });

      toast.success('Email sauvegardé !');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      error('❌ Erreur sauvegarde:', err);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleSendViaMailApp = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error('Sujet et corps requis');
      return;
    }

    setSending(true);
    try {
      // Enregistrer dans l'historique
      await api.post(`/pipeline-leads/${lead.id}/action`, {
        action_type: 'email',
        notes: `📧 Email envoyé via client mail\n\nObjet: ${subject}\n\n${body}`
      });

      // Ouvrir la boite mail
      const mailtoLink = `mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoLink;

      setTimeout(() => {
        toast.success('Email enregistré ! Envoyez-le depuis votre boite mail.');
        if (onSuccess) onSuccess();
        onClose();
      }, 500);
    } catch (err) {
      error('❌ Erreur:', err);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 rounded-t-2xl flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6" />
            <div>
              <h2 className="text-2xl font-bold">Envoyer un email</h2>
              <p className="text-blue-100 text-sm mt-1">{lead.company_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          
          <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-semibold">À :</p>
                <p className="text-sm font-bold text-gray-900">{lead.email}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 font-semibold">Contact :</p>
                <p className="text-sm font-bold text-gray-900">{lead.contact_name || 'Contact'}</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerateWithAI}
            disabled={generating}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-6 rounded-xl font-bold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Asefi génère l'email...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                🤖 Générer avec Asefi
              </>
            )}
          </button>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Objet *</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Objet de l'email"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Message *</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              placeholder="Écrivez votre message..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3 flex items-start gap-2">
            <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold">📧 Envoi via votre boite mail</p>
              <p className="text-xs mt-1">L'email sera enregistré dans LeadSynch et s'ouvrira dans votre client email par défaut (Outlook, Gmail, etc.)</p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-bold hover:bg-gray-200 transition-all"
            >
              Annuler
            </button>
            
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600 text-white py-3 px-6 rounded-xl font-bold hover:from-orange-600 hover:to-amber-700 disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Sauvegarder
                </>
              )}
            </button>

            <button
              onClick={handleSendViaMailApp}
              disabled={sending}
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 px-6 rounded-xl font-bold hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Envoyer
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}