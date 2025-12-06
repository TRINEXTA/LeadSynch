import { log, error, warn } from "../../lib/logger.js";
import { useState } from 'react';
import { Send, Sparkles, Mail, Users, TrendingUp, Link as LinkIcon } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function AsefiEmailGenerator({ onGenerated, onCancel }) {
  const [campaignType, setCampaignType] = useState('email-campaign');
  const [objective, setObjective] = useState('');
  const [audience, setAudience] = useState('all-clients');
  const [tone, setTone] = useState('professional');
  const [mainLink, setMainLink] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [signature, setSignature] = useState({
    name: '',
    title: '',
    company: '',
    phone: '',
    email: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const campaignTypes = [
    { value: 'email-campaign', label: 'Campagne Email', icon: Mail },
    { value: 'follow-up', label: 'Email de Suivi', icon: TrendingUp },
    { value: 'welcome', label: 'Email de Bienvenue', icon: Users },
    { value: 'promotional', label: 'Offre Promotionnelle', icon: Sparkles }
  ];

  const audiences = [
    { value: 'all-clients', label: 'Tous les clients' },
    { value: 'new-clients', label: 'Nouveaux clients' },
    { value: 'active-clients', label: 'Clients actifs' },
    { value: 'inactive-clients', label: 'Clients inactifs' },
    { value: 'vip-clients', label: 'Clients VIP' },
    { value: 'prospects', label: 'Prospects' }
  ];

  const tones = [
    { value: 'professional', label: 'Professionnel' },
    { value: 'friendly', label: 'Amical' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'enthusiastic', label: 'Enthousiaste' }
  ];

  const generateWithAsefi = async () => {
    if (!objective.trim()) {
      toast.error('Veuillez définir votre objectif');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/asefi/generate', {
        campaignType,
        objective,
        audience,
        tone,
        mainLink,
        meetingLink,
        signature
      });

      if (response.data.success) {
        onGenerated({
          name: 'Template ' + campaignType + ' - ' + new Date().toLocaleDateString(),
          subject: response.data.template.subject,
          preheader: response.data.template.preheader || '',
          body: response.data.template.body,
          cta: response.data.template.cta || '',
          campaignType,
          audience,
          tone,
          mainLink,
          meetingLink,
          signature
        });
      } else {
        throw new Error(response.data.error);
      }
      
    } catch (err) {
      error('Erreur Asefi:', err);
      toast.error('Erreur lors de la génération: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-8 h-8" />
          <h2 className="text-2xl font-bold">Asefi - Générateur IA</h2>
        </div>
        <p className="text-blue-100">Créez un template email professionnel en quelques secondes</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">Type de campagne</label>
        <div className="grid grid-cols-2 gap-3">
          {campaignTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.value}
                onClick={() => setCampaignType(type.value)}
                className={'p-4 rounded-lg border-2 transition-all text-left ' + (campaignType === type.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300')}
              >
                <Icon className={'w-5 h-5 mb-2 ' + (campaignType === type.value ? 'text-blue-600' : 'text-gray-400')} />
                <div className="font-medium text-sm">{type.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Objectif de votre email *</label>
        <textarea
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          placeholder="Ex: Promouvoir notre nouvelle fonctionnalité X, relancer les clients inactifs..."
          className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Audience cible</label>
        <select
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          {audiences.map((aud) => (
            <option key={aud.value} value={aud.value}>{aud.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Ton de l'email</label>
        <div className="grid grid-cols-2 gap-2">
          {tones.map((t) => (
            <button
              key={t.value}
              onClick={() => setTone(t.value)}
              className={'p-3 rounded-lg border-2 transition-all ' + (tone === t.value ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 hover:border-gray-300')}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center gap-2 mb-3">
          <LinkIcon className="w-5 h-5 text-gray-600" />
          <label className="text-sm font-semibold text-gray-700">Liens (optionnel)</label>
        </div>
        <div className="space-y-2">
          <input
            type="url"
            value={mainLink}
            onChange={(e) => setMainLink(e.target.value)}
            placeholder="Lien principal (offre, produit...)"
            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
          />
          <input
            type="url"
            value={meetingLink}
            onChange={(e) => setMeetingLink(e.target.value)}
            placeholder="Lien de prise de RDV (Calendly...)"
            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="border-t pt-4">
        <label className="block text-sm font-semibold text-gray-700 mb-3">Signature email (optionnel)</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={signature.name}
            onChange={(e) => setSignature({...signature, name: e.target.value})}
            placeholder="Nom"
            className="p-2 border border-gray-300 rounded-lg text-sm"
          />
          <input
            type="text"
            value={signature.title}
            onChange={(e) => setSignature({...signature, title: e.target.value})}
            placeholder="Poste"
            className="p-2 border border-gray-300 rounded-lg text-sm"
          />
          <input
            type="text"
            value={signature.company}
            onChange={(e) => setSignature({...signature, company: e.target.value})}
            placeholder="Entreprise"
            className="p-2 border border-gray-300 rounded-lg text-sm"
          />
          <input
            type="email"
            value={signature.email}
            onChange={(e) => setSignature({...signature, email: e.target.value})}
            placeholder="Email"
            className="p-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <button
          onClick={generateWithAsefi}
          disabled={isLoading || !objective.trim()}
          className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Génération en cours...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Générer le template
            </>
          )}
        </button>
        <button
          onClick={onCancel}
          className="px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
