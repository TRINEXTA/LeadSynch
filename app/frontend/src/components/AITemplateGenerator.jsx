import React, { useState } from 'react';
import { Sparkles, Loader } from 'lucide-react';
import api from '../api/axios';

export default function AITemplateGenerator({ onGenerated }) {
  const [generating, setGenerating] = useState(false);
  const [formData, setFormData] = useState({
    email_type: 'newsletter',
    tone: 'professional',
    company_name: '',
    objective: '',
    target_audience: '',
    product_service: '',
    call_to_action: '',
    additional_info: ''
  });

  const handleGenerate = async () => {
    if (!formData.objective) {
      alert('❌ Objectif requis !');
      return;
    }

    setGenerating(true);
    try {
      const response = await api.post('/ai/generate-template', formData);
      const generated = response.data.template;

      // Appeler la fonction de callback avec les données générées
      onGenerated({
        name: `${formData.email_type} - ${formData.company_name || 'Template IA'}`,
        subject: generated.subject,
        content: generated.html,
        description: generated.preview_text || ''
      });

      alert('✅ Template généré ! Passez en mode HTML pour l\'éditer.');
    } catch (error) {
      console.error('Erreur:', error);
      alert('❌ Erreur : ' + (error.response?.data?.message || error.message));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6">
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-8 h-8 text-purple-600" />
          <div>
            <h3 className="text-xl font-bold text-gray-900">Génération IA - Claude Sonnet 4</h3>
            <p className="text-sm text-gray-600">L'IA la plus puissante pour créer des emails marketing professionnels</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Type d'email *</label>
          <select
            value={formData.email_type}
            onChange={(e) => setFormData({...formData, email_type: e.target.value})}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
          >
            <option value="newsletter">Newsletter</option>
            <option value="promotion">Promotion / Offre</option>
            <option value="welcome">Email de bienvenue</option>
            <option value="announcement">Annonce produit</option>
            <option value="invitation">Invitation événement</option>
            <option value="follow-up">Relance</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Ton *</label>
          <select
            value={formData.tone}
            onChange={(e) => setFormData({...formData, tone: e.target.value})}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
          >
            <option value="professional">Professionnel</option>
            <option value="friendly">Amical</option>
            <option value="enthusiastic">Enthousiaste</option>
            <option value="formal">Formel</option>
            <option value="casual">Décontracté</option>
            <option value="luxury">Premium / Luxe</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Nom de l'entreprise</label>
        <input
          type="text"
          value={formData.company_name}
          onChange={(e) => setFormData({...formData, company_name: e.target.value})}
          placeholder="Votre Entreprise"
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Objectif de l'email * <span className="text-red-500">●</span>
        </label>
        <textarea
          value={formData.objective}
          onChange={(e) => setFormData({...formData, objective: e.target.value})}
          rows={3}
          placeholder="Ex: Promouvoir notre nouvelle gamme de produits et générer des ventes..."
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Audience cible</label>
        <input
          type="text"
          value={formData.target_audience}
          onChange={(e) => setFormData({...formData, target_audience: e.target.value})}
          placeholder="Ex: Entrepreneurs, PME, professionnels B2B..."
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Produit/Service</label>
        <input
          type="text"
          value={formData.product_service}
          onChange={(e) => setFormData({...formData, product_service: e.target.value})}
          placeholder="Ex: Logiciel CRM, Formation, Consulting..."
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Call-to-action</label>
        <input
          type="text"
          value={formData.call_to_action}
          onChange={(e) => setFormData({...formData, call_to_action: e.target.value})}
          placeholder="Ex: Découvrir l'offre, S'inscrire..."
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Informations supplémentaires</label>
        <textarea
          value={formData.additional_info}
          onChange={(e) => setFormData({...formData, additional_info: e.target.value})}
          rows={3}
          placeholder="Ex: Promo -30%, durée limitée, témoignages..."
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {generating && (
        <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Loader className="w-8 h-8 text-purple-600 animate-spin" />
            <Sparkles className="w-6 h-6 text-purple-600 animate-pulse" />
          </div>
          <p className="font-bold text-purple-900 mb-2">Génération avec Claude Sonnet 4...</p>
          <p className="text-sm text-purple-700">Création d'un template professionnel optimisé</p>
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={generating}
        className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Sparkles className="w-5 h-5" />
        {generating ? 'Génération en cours...' : 'Générer avec IA'}
      </button>

      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          💡 <strong>Astuce :</strong> Plus vous donnez de détails, meilleur sera le résultat. Après génération, vous pourrez éditer le template dans l'éditeur HTML Pro.
        </p>
      </div>
    </div>
  );
}
