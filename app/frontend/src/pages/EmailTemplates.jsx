<<<<<<< HEAD
import { log, error, warn } from "./../lib/logger.js";
=======
import { log, error, warn } from "../lib/logger.js";
>>>>>>> origin/main
﻿import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Mail, Sparkles, Code, Edit, Trash2, X, Wand2, Crown, Lock } from 'lucide-react';
import api from '../api/axios';
import EmailTemplateEditor from '../components/EmailTemplateEditor';

export default function EmailTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showAsefiModal, setShowAsefiModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [manualForm, setManualForm] = useState({ name: '', subject: '', content: '' });
  const [asefiForm, setAsefiForm] = useState({ 
    name: '', 
    subject: '', 
    prompt: '', 
    tone: 'professional',
    target: 'B2B'
  });
  const [generatingAsefi, setGeneratingAsefi] = useState(false);
  
  // TODO: Récupérer depuis AuthContext
  const userRole = 'super_admin'; // 'super_admin', 'admin', 'commercial'
  const userPlan = 'pro'; // 'free', 'basic', 'pro', 'enterprise'
  
  // SUPER ADMIN = AUCUNE LIMITE !
  const isSuperAdmin = userRole === 'super_admin';
  
  const PLANS_CONFIG = {
    super_admin: {
      name: 'SUPER ADMIN',
      color: 'from-red-500 to-pink-600',
      asefi: true,
      characterLimit: 999999
    },
    free: {
      name: 'FREE',
      color: 'from-gray-400 to-gray-500',
      asefi: false,
      characterLimit: 0
    },
    basic: {
      name: 'BASIC',
      color: 'from-blue-500 to-cyan-500',
      asefi: true,
      characterLimit: 500
    },
    pro: {
      name: 'PRO',
      color: 'from-purple-500 to-pink-500',
      asefi: true,
      characterLimit: 2000
    },
    enterprise: {
      name: 'ENTERPRISE',
      color: 'from-yellow-500 to-orange-500',
      asefi: true,
      characterLimit: 10000
    }
  };

  const currentPlan = isSuperAdmin ? PLANS_CONFIG.super_admin : (PLANS_CONFIG[userPlan] || PLANS_CONFIG.free);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await api.get('/email-templates');
      setTemplates(response.data.templates || []);
      setLoading(false);
    } catch (error) {
      error('Erreur:', error);
      setLoading(false);
    }
  };

  const handleCreateClick = (mode) => {
    if (mode === 'ai') {
      if (!currentPlan.asefi) {
        toast.error('Asefi IA n\'est pas disponible sur le plan FREE.\n\nPassez au plan BASIC (49EUR/mois) pour débloquer cette fonctionnalité !', {
          duration: 6000
        });
        return;
      }
      setAsefiForm({ name: '', subject: '', prompt: '', tone: 'professional', target: 'B2B' });
      setShowAsefiModal(true);
    } else if (mode === 'manual') {
      setManualForm({ name: '', subject: '', content: '' });
      setShowManualModal(true);
    } else if (mode === 'html') {
      setEditingTemplate(null);
      setShowEditor(true);
    }
  };

  const handleGenerateWithAsefi = async () => {
    if (!asefiForm.name || !asefiForm.subject || !asefiForm.prompt) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    if (asefiForm.prompt.length > currentPlan.characterLimit) {
      toast.error(`Votre description dépasse la limite de ${currentPlan.characterLimit} caractères pour le plan ${currentPlan.name}`);
      return;
    }

    setGeneratingAsefi(true);

    const promise = api.post('/asefi/generate-email-template', {
      prompt: asefiForm.prompt,
      tone: asefiForm.tone,
      target: asefiForm.target,
      subject: asefiForm.subject
    }).then(async (response) => {
      if (response.data.success) {
        await api.post('/email-templates', {
          name: asefiForm.name,
          subject: asefiForm.subject,
          html_body: response.data.html,
          template_type: 'email',
          is_active: true,
          metadata: { generated_by: 'asefi', tone: asefiForm.tone }
        });

        setShowAsefiModal(false);
        loadTemplates();
      }
    }).finally(() => setGeneratingAsefi(false));

    toast.promise(promise, {
      loading: 'Génération par Asefi en cours...',
      success: 'Template généré par Asefi avec succès !',
      error: 'Erreur lors de la génération'
    });
  };

  const handleSaveManual = async () => {
    if (!manualForm.name || !manualForm.subject || !manualForm.content) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    try {
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  ${manualForm.content.split('\n').map(line => `<p>${line}</p>`).join('\n  ')}
</body>
</html>`;

      if (editingTemplate) {
        // Mode édition
        await api.put(`/email-templates/${editingTemplate.id}`, {
          name: manualForm.name,
          subject: manualForm.subject,
          html_body: htmlContent,
          template_type: 'email',
          is_active: true
        });
        toast.success('Template mis à jour avec succès !');
      } else {
        // Mode création
        await api.post('/email-templates', {
          name: manualForm.name,
          subject: manualForm.subject,
          html_body: htmlContent,
          template_type: 'email',
          is_active: true
        });
        toast.success('Template créé avec succès !');
      }

      setShowManualModal(false);
      setEditingTemplate(null);
      loadTemplates();
    } catch (error) {
      error('Erreur:', error);
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const handleEdit = (template) => {
    const content = template.html_body || '';
    const isHTML = content.includes('<div') || content.includes('<table') || content.includes('<style') || content.includes('<!DOCTYPE') || content.includes('background:');
    
    if (isHTML) {
      setEditingTemplate(template);
      setShowEditor(true);
    } else {
      const textContent = content.replace(/<[^>]*>/g, '\n').replace(/\n+/g, '\n').trim();
      setManualForm({ name: template.name, subject: template.subject, content: textContent });
      setEditingTemplate(template);
      setShowManualModal(true);
    }
  };

  const handleSaveTemplate = async (templateData) => {
    try {
      if (editingTemplate) {
        await api.put(`/email-templates/${editingTemplate.id}`, templateData);
        toast.success('Template mis à jour avec succès !');
      } else {
        await api.post('/email-templates', templateData);
        toast.success('Template créé avec succès !');
      }

      setShowEditor(false);
      setEditingTemplate(null);
      loadTemplates();
    } catch (error) {
      error('Erreur:', error);
      toast.error('Erreur lors de l\'enregistrement');
      throw error;
    }
  };

  const handleDelete = async (id) => {
    const promise = api.delete(`/email-templates/${id}`).then(() => loadTemplates());

    toast.promise(promise, {
      loading: 'Suppression en cours...',
      success: 'Template supprimé avec succès !',
      error: 'Erreur lors de la suppression'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Mail className="w-8 h-8 text-purple-600" />
              <h1 className="text-3xl font-bold text-gray-900">Templates Email</h1>
            </div>
            <div className={`flex items-center gap-2 bg-gradient-to-r ${currentPlan.color} text-white px-4 py-2 rounded-xl font-bold shadow-lg`}>
              <Crown className="w-5 h-5" />
              {currentPlan.name}
            </div>
          </div>
          <p className="text-gray-600">Creez et gerez vos templates d'emails</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => handleCreateClick('ai')}
            disabled={!currentPlan.asefi}
            className={`group relative overflow-hidden bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-2xl p-6 shadow-lg transition-all transform ${
              currentPlan.asefi ? 'hover:shadow-2xl hover:scale-105' : 'opacity-50 cursor-not-allowed'
            }`}
          >
            <div className="relative z-10">
              <Sparkles className="w-12 h-12 mx-auto mb-3" />
              <h3 className="text-xl font-bold mb-2">
                {currentPlan.asefi ? 'Creer avec IA' : 'Creer avec IA (Bloque)'}
              </h3>
              <p className="text-sm opacity-90">
                {currentPlan.asefi 
                  ? `Generation Asefi (${currentPlan.characterLimit} car.)` 
                  : 'Plan BASIC requis (49EUR/mois)'}
              </p>
            </div>
            {!currentPlan.asefi && (
              <div className="absolute top-4 right-4">
                <Lock className="w-6 h-6" />
              </div>
            )}
          </button>

          <button
            onClick={() => handleCreateClick('manual')}
            className="group relative overflow-hidden bg-gradient-to-br from-blue-600 to-cyan-600 text-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all transform hover:scale-105"
          >
            <div className="relative z-10">
              <Edit className="w-12 h-12 mx-auto mb-3" />
              <h3 className="text-xl font-bold mb-2">Creer manuellement</h3>
              <p className="text-sm opacity-90">Texte simple</p>
            </div>
          </button>

          <button
            onClick={() => handleCreateClick('html')}
            className="group relative overflow-hidden bg-gradient-to-br from-green-600 to-emerald-600 text-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all transform hover:scale-105"
          >
            <div className="relative z-10">
              <Code className="w-12 h-12 mx-auto mb-3" />
              <h3 className="text-xl font-bold mb-2">Creer en HTML</h3>
              <p className="text-sm opacity-90">Editeur Expert</p>
            </div>
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Mes Templates ({templates.length})</h2>

          {templates.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Aucun template</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(template => (
                <div key={template.id} className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all">
                  <h3 className="font-bold text-gray-900 mb-1">{template.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{template.subject}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(template)}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 text-sm font-semibold"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="bg-red-100 text-red-600 py-2 px-3 rounded-lg hover:bg-red-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAsefiModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6" />
                <div>
                  <h2 className="text-2xl font-bold">Generer avec Asefi</h2>
                  <p className="text-sm opacity-90">Limite: {currentPlan.characterLimit} caracteres</p>
                </div>
              </div>
              <button onClick={() => setShowAsefiModal(false)} className="text-white p-2 rounded-lg hover:bg-white hover:bg-opacity-20">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <input
                type="text"
                value={asefiForm.name}
                onChange={(e) => setAsefiForm({...asefiForm, name: e.target.value})}
                placeholder="Nom du template"
                className="w-full border-2 border-gray-200 rounded-lg p-3"
              />

              <input
                type="text"
                value={asefiForm.subject}
                onChange={(e) => setAsefiForm({...asefiForm, subject: e.target.value})}
                placeholder="Sujet de l'email"
                className="w-full border-2 border-gray-200 rounded-lg p-3"
              />

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">Que voulez-vous dire ?</label>
                  <span className={`text-xs ${asefiForm.prompt.length > currentPlan.characterLimit ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                    {asefiForm.prompt.length} / {currentPlan.characterLimit}
                  </span>
                </div>
                <textarea
                  value={asefiForm.prompt}
                  onChange={(e) => {
                    if (e.target.value.length <= currentPlan.characterLimit) {
                      setAsefiForm({...asefiForm, prompt: e.target.value});
                    }
                  }}
                  placeholder="Exemple: Email pour presenter notre service..."
                  rows={5}
                  maxLength={currentPlan.characterLimit}
                  className="w-full border-2 border-gray-200 rounded-lg p-3"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <select
                  value={asefiForm.tone}
                  onChange={(e) => setAsefiForm({...asefiForm, tone: e.target.value})}
                  className="w-full border-2 border-gray-200 rounded-lg p-3"
                >
                  <option value="professional">Professionnel</option>
                  <option value="friendly">Amical</option>
                  <option value="formal">Formel</option>
                </select>

                <select
                  value={asefiForm.target}
                  onChange={(e) => setAsefiForm({...asefiForm, target: e.target.value})}
                  className="w-full border-2 border-gray-200 rounded-lg p-3"
                >
                  <option value="B2B">B2B</option>
                  <option value="B2C">B2C</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAsefiModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold"
                >
                  Annuler
                </button>
                <button
                  onClick={handleGenerateWithAsefi}
                  disabled={generatingAsefi}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {generatingAsefi ? 'Generation...' : <><Wand2 className="w-5 h-5" />Generer</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showManualModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
              <h2 className="text-2xl font-bold">Creation manuelle</h2>
              <button onClick={() => setShowManualModal(false)} className="text-white p-2 rounded-lg hover:bg-white hover:bg-opacity-20">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <input
                type="text"
                value={manualForm.name}
                onChange={(e) => setManualForm({...manualForm, name: e.target.value})}
                placeholder="Nom"
                className="w-full border-2 border-gray-200 rounded-lg p-3"
              />

              <input
                type="text"
                value={manualForm.subject}
                onChange={(e) => setManualForm({...manualForm, subject: e.target.value})}
                placeholder="Sujet"
                className="w-full border-2 border-gray-200 rounded-lg p-3"
              />

              <textarea
                value={manualForm.content}
                onChange={(e) => setManualForm({...manualForm, content: e.target.value})}
                placeholder="Votre texte..."
                rows={15}
                className="w-full border-2 border-gray-200 rounded-lg p-3 resize-none"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setShowManualModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveManual}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-lg font-semibold"
                >
                  Creer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditor && (
        <EmailTemplateEditor
          template={editingTemplate}
          onSave={handleSaveTemplate}
          onClose={() => {
            setShowEditor(false);
            setEditingTemplate(null);
          }}
        />
      )}
    </div>
  );
}