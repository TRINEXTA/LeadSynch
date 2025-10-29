import React, { useState, useEffect } from 'react';
import { Plus, Sparkles, Edit, Trash2, Eye, X } from 'lucide-react';
import AsefiEmailGenerator from '../components/email/AsefiEmailGenerator';
import api from '../api/axios';

export default function EmailTemplates() {
  const [templates, setTemplates] = useState([]);
  const [showTemplateChoice, setShowTemplateChoice] = useState(false);
  const [showAsefi, setShowAsefi] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await api.get('/email-templates');
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Erreur chargement templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAsefiGenerated = async (templateData) => {
    try {
      const response = await api.post('/email-templates', {
        name: templateData.name,
        subject: templateData.subject,
        html_body: (templateData.preheader ? `<p style="font-size:12px;color:#666;">${templateData.preheader}</p>` : '') + '\n' + templateData.body + '\n' + (templateData.cta ? `<p style="text-align:center;margin:20px 0;"><a href="${templateData.mainLink || '#'}" style="background:#0066cc;color:white;padding:12px 24px;text-decoration:none;border-radius:5px;">${templateData.cta}</a></p>` : ''),
        template_type: 'email',
        is_active: true,
        metadata: {
          generated_by: 'asefi',
          campaign_type: templateData.campaignType,
          audience: templateData.audience,
          tone: templateData.tone,
          main_link: templateData.mainLink,
          meeting_link: templateData.meetingLink,
          signature: templateData.signature
        }
      });

      if (response.status === 201) {
        alert('✅ Template créé avec succès !');
        setShowAsefi(false);
        loadTemplates();
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('❌ Erreur lors de la création du template');
    }
  };

  const handlePreview = (template) => {
    setSelectedTemplate(template);
    setShowPreview(true);
  };

  const handleUse = (template) => {
    alert('📧 Fonctionnalité "Utiliser" en cours de développement.\n\nCe template sera bientôt utilisable pour créer une campagne email !');
    console.log('Template à utiliser:', template);
  };

  const handleEdit = (template) => {
    alert('✏️ Fonctionnalité "Modifier" en cours de développement.\n\nVous pourrez bientôt éditer ce template !');
    console.log('Template à éditer:', template);
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce template ?')) return;
    
    try {
      await api.delete('/email-templates/' + id);
      alert('✅ Template supprimé');
      loadTemplates();
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('❌ Erreur lors de la suppression');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Templates Email</h1>
        <button
          onClick={() => setShowTemplateChoice(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl transition-all"
        >
          <Plus className="w-5 h-5" />
          Nouveau Template
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 mt-4">Chargement...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
          <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg mb-4">Aucun template pour le moment</p>
          <button
            onClick={() => setShowTemplateChoice(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Créer votre premier template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="bg-white border rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-lg text-gray-800">{template.name}</h3>
                {template.metadata?.generated_by === 'asefi' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                    <Sparkles className="w-3 h-3" />
                    Asefi
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{template.subject}</p>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleUse(template)}
                  className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors text-sm font-medium"
                >
                  Utiliser
                </button>
                <button 
                  onClick={() => handlePreview(template)}
                  className="px-4 py-2 border border-green-300 bg-green-50 rounded hover:bg-green-100 transition-colors"
                  title="Visualiser"
                >
                  <Eye className="w-4 h-4 text-green-600" />
                </button>
                <button 
                  onClick={() => handleEdit(template)}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  title="Modifier"
                >
                  <Edit className="w-4 h-4 text-gray-600" />
                </button>
                <button 
                  onClick={() => handleDelete(template.id)}
                  className="px-4 py-2 border border-red-300 rounded hover:bg-red-50 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showPreview && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{selectedTemplate.name}</h2>
                <p className="text-sm text-gray-600 mt-1">Objet: {selectedTemplate.subject}</p>
              </div>
              <button 
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div 
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedTemplate.html_body }}
              />
            </div>
            <div className="p-6 border-t bg-gray-50 flex gap-3">
              <button 
                onClick={() => handleUse(selectedTemplate)}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold"
              >
                Utiliser ce template
              </button>
              <button 
                onClick={() => setShowPreview(false)}
                className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {showTemplateChoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-8">
            <h2 className="text-2xl font-bold mb-6 text-center">Créer un nouveau template</h2>
            
            <div className="grid grid-cols-2 gap-6">
              <button
                onClick={() => {
                  setShowTemplateChoice(false);
                  setShowAsefi(true);
                }}
                className="p-6 border-2 border-purple-500 rounded-xl hover:bg-purple-50 transition-all group"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Créer avec Asefi ✨</h3>
                  <p className="text-sm text-gray-600">
                    Générez un template professionnel en quelques clics grâce à l'IA
                  </p>
                  <span className="mt-4 text-xs text-purple-600 font-medium">Recommandé</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowTemplateChoice(false);
                  setShowManualForm(true);
                }}
                className="p-6 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all group"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Edit className="w-8 h-8 text-gray-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Créer manuellement</h3>
                  <p className="text-sm text-gray-600">
                    Rédigez votre template vous-même avec un éditeur complet
                  </p>
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowTemplateChoice(false)}
              className="mt-6 w-full py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {showAsefi && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-3xl w-full my-8">
            <div className="max-h-[90vh] overflow-y-auto p-6">
              <AsefiEmailGenerator
                onGenerated={handleAsefiGenerated}
                onCancel={() => setShowAsefi(false)}
              />
            </div>
          </div>
        </div>
      )}

      {showManualForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Créer un template manuellement</h2>
            <p className="text-gray-600 mb-4">Fonctionnalité en cours de développement...</p>
            <button
              onClick={() => setShowManualForm(false)}
              className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}