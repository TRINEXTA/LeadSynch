/**
 * Composant de configuration des relances automatiques
 *
 * Permet de :
 * - Activer/désactiver les relances
 * - Choisir le nombre de relances (1 ou 2)
 * - Configurer le délai entre relances
 * - Générer les templates avec Asefi
 * - Prévisualiser et modifier les templates générés
 */

import { useState } from 'react';
import { RefreshCw, Mail, Sparkles, Eye, Edit3, Check, AlertCircle, Clock, Target, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import DOMPurify from 'dompurify';

export default function FollowUpConfig({
  campaignId,
  enabled,
  onEnabledChange,
  followUpCount,
  onFollowUpCountChange,
  delayDays,
  onDelayDaysChange,
  templates,
  onTemplatesChange,
  // Props for external template generation (new campaigns)
  onGenerateTemplates,
  generatingTemplates,
  hasTemplate = true,
  isNewCampaign = true
}) {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editedContent, setEditedContent] = useState({ subject: '', html: '' });

  // Use external generating state if provided
  const isGenerating = generatingTemplates !== undefined ? generatingTemplates : generating;

  // Générer les templates avec Asefi
  const handleGenerateTemplates = async () => {
    // If external generator is provided, use it
    if (onGenerateTemplates) {
      onGenerateTemplates();
      return;
    }

    // Otherwise use internal logic for existing campaigns
    if (!campaignId) {
      toast.error('Campagne introuvable');
      return;
    }

    setGenerating(true);
    try {
      const response = await api.post(`/campaigns/${campaignId}/follow-ups/generate-templates`);

      if (response.data.success) {
        onTemplatesChange(response.data.follow_ups);
        toast.success(`${response.data.follow_ups.length} template(s) généré(s) par Asefi !`);
      }
    } catch (error) {
      console.error('Erreur génération:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la génération');
    } finally {
      setGenerating(false);
    }
  };

  // Régénérer un template spécifique
  const handleRegenerateTemplate = async (followUpId, feedback = '') => {
    setLoading(true);
    try {
      const response = await api.post(
        `/campaigns/${campaignId}/follow-ups/${followUpId}/regenerate`,
        { feedback }
      );

      if (response.data.success) {
        // Mettre à jour le template dans la liste
        const updatedTemplates = templates.map(t =>
          t.id === followUpId ? response.data.follow_up : t
        );
        onTemplatesChange(updatedTemplates);
        toast.success('Template régénéré !');
        setEditingTemplate(null);
      }
    } catch (error) {
      toast.error('Erreur lors de la régénération');
    } finally {
      setLoading(false);
    }
  };

  // Sauvegarder les modifications d'un template
  const handleSaveTemplate = async (followUpId) => {
    setLoading(true);
    try {
      const response = await api.put(
        `/campaigns/${campaignId}/follow-ups/${followUpId}`,
        {
          subject: editedContent.subject,
          html_content: editedContent.html
        }
      );

      if (response.data.success) {
        const updatedTemplates = templates.map(t =>
          t.id === followUpId ? response.data.follow_up : t
        );
        onTemplatesChange(updatedTemplates);
        toast.success('Template sauvegardé !');
        setEditingTemplate(null);
      }
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (template) => {
    setEditingTemplate(template.id);
    setEditedContent({
      subject: template.subject || '',
      html: template.html_content || ''
    });
  };

  const getTargetAudienceLabel = (audience) => {
    switch (audience) {
      case 'opened_not_clicked':
        return 'Ont ouvert mais pas cliqué';
      case 'not_opened':
        return 'N\'ont pas ouvert';
      default:
        return audience;
    }
  };

  const getTargetAudienceIcon = (audience) => {
    switch (audience) {
      case 'opened_not_clicked':
        return <Eye className="w-4 h-4 text-orange-500" />;
      case 'not_opened':
        return <Mail className="w-4 h-4 text-red-500" />;
      default:
        return <Users className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <RefreshCw className="w-6 h-6 text-purple-600" />
            Relances automatiques
          </h2>
          <p className="text-gray-600 mt-1">
            Configurez des emails de relance pour maximiser vos conversions
          </p>
        </div>
      </div>

      {/* Toggle activation */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Activer les relances intelligentes</h3>
              <p className="text-sm text-gray-600">
                Asefi générera des emails personnalisés pour relancer vos prospects
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onEnabledChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>
      </div>

      {enabled && (
        <>
          {/* Configuration */}
          <div className="grid grid-cols-2 gap-6">
            {/* Nombre de relances */}
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
              <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                Nombre de relances
              </h4>
              <div className="flex gap-4">
                {[1, 2].map(num => (
                  <button
                    key={num}
                    onClick={() => onFollowUpCountChange(num)}
                    className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${
                      followUpCount === num
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {num} relance{num > 1 ? 's' : ''}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                {followUpCount === 1
                  ? 'Une relance pour ceux qui ont ouvert sans cliquer'
                  : 'Deux relances : ouvert sans clic + non ouverts'}
              </p>
            </div>

            {/* Délai entre relances */}
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
              <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-600" />
                Délai entre relances
              </h4>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="14"
                  value={delayDays}
                  onChange={(e) => onDelayDaysChange(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                />
                <div className="bg-green-100 text-green-700 px-4 py-2 rounded-xl font-bold min-w-[80px] text-center">
                  {delayDays} jour{delayDays > 1 ? 's' : ''}
                </div>
              </div>
              <div className="mt-4 bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Relance 1 :</span> {delayDays} jours après l'envoi initial
                </p>
                {followUpCount === 2 && (
                  <p className="text-sm text-gray-600 mt-1">
                    <span className="font-semibold">Relance 2 :</span> {delayDays * 2} jours après l'envoi initial
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Bouton génération */}
          {templates.length === 0 ? (
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-6 text-center">
              <Sparkles className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Prêt à générer vos templates de relance ?
              </h3>
              <p className="text-gray-600 mb-4">
                Asefi va analyser votre campagne et créer des emails de relance personnalisés
              </p>
              {!hasTemplate ? (
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-4">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mx-auto mb-2" />
                  <p className="text-yellow-700 text-sm">
                    Veuillez d'abord sélectionner un template principal à l'étape précédente
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleGenerateTemplates}
                  disabled={isGenerating}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 flex items-center gap-2 mx-auto"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Génération en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Générer avec Asefi
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            /* Templates générés */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-gray-900 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-purple-600" />
                  Templates de relance générés
                </h4>
                <button
                  onClick={handleGenerateTemplates}
                  disabled={isGenerating}
                  className="text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-1"
                >
                  <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  Régénérer tout
                </button>
              </div>

              {templates.map((template, index) => (
                <div
                  key={template.id}
                  className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden"
                >
                  {/* Header du template */}
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        template.target_audience === 'opened_not_clicked'
                          ? 'bg-orange-100'
                          : 'bg-red-100'
                      }`}>
                        {getTargetAudienceIcon(template.target_audience)}
                      </div>
                      <div>
                        <h5 className="font-bold text-gray-900">
                          Relance #{template.follow_up_number}
                        </h5>
                        <p className="text-sm text-gray-600">
                          {getTargetAudienceLabel(template.target_audience)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-lg">
                        Après {template.delay_days} jours
                      </span>
                      {template.status === 'pending' && (
                        <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-lg text-sm font-semibold">
                          En attente
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Contenu du template */}
                  {editingTemplate === template.id ? (
                    <div className="p-6 space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Sujet de l'email
                        </label>
                        <input
                          type="text"
                          value={editedContent.subject}
                          onChange={(e) => setEditedContent({ ...editedContent, subject: e.target.value })}
                          className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Contenu HTML
                        </label>
                        <textarea
                          value={editedContent.html}
                          onChange={(e) => setEditedContent({ ...editedContent, html: e.target.value })}
                          rows={10}
                          className="w-full border-2 border-gray-200 rounded-xl p-3 font-mono text-sm focus:border-purple-500"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleSaveTemplate(template.id)}
                          disabled={loading}
                          className="flex-1 bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 flex items-center justify-center gap-2"
                        >
                          <Check className="w-5 h-5" />
                          Sauvegarder
                        </button>
                        <button
                          onClick={() => setEditingTemplate(null)}
                          className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6">
                      <div className="mb-4">
                        <p className="text-sm text-gray-500 mb-1">Sujet :</p>
                        <p className="font-semibold text-gray-900">{template.subject}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 max-h-48 overflow-y-auto">
                        <div
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(template.html_content || '', {
                              ALLOWED_TAGS: ['div', 'p', 'h1', 'h2', 'h3', 'strong', 'em', 'a', 'br', 'span'],
                              ALLOWED_ATTR: ['style', 'href']
                            })
                          }}
                        />
                      </div>
                      <div className="flex gap-3 mt-4">
                        <button
                          onClick={() => setPreviewTemplate(template)}
                          className="flex-1 bg-blue-100 text-blue-700 py-2 rounded-xl font-semibold hover:bg-blue-200 flex items-center justify-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Prévisualiser
                        </button>
                        <button
                          onClick={() => startEditing(template)}
                          className="flex-1 bg-purple-100 text-purple-700 py-2 rounded-xl font-semibold hover:bg-purple-200 flex items-center justify-center gap-2"
                        >
                          <Edit3 className="w-4 h-4" />
                          Modifier
                        </button>
                        <button
                          onClick={() => handleRegenerateTemplate(template.id)}
                          disabled={loading}
                          className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl font-semibold hover:bg-gray-200 flex items-center justify-center gap-2"
                        >
                          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                          Régénérer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Info box */}
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold mb-1">Comment fonctionnent les relances ?</p>
              <ul className="list-disc list-inside space-y-1 text-yellow-700">
                <li><strong>Relance 1 (ouvert sans clic)</strong> : Pour ceux qui ont ouvert votre email mais n'ont pas cliqué sur le lien</li>
                {followUpCount === 2 && (
                  <li><strong>Relance 2 (non ouverts)</strong> : Pour ceux qui n'ont pas du tout ouvert votre email</li>
                )}
                <li>Les personnes désinscrites ou ayant déjà converti ne recevront pas de relance</li>
              </ul>
            </div>
          </div>
        </>
      )}

      {/* Modal de prévisualisation */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-t-2xl flex items-center justify-between sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-bold">Prévisualisation - Relance #{previewTemplate.follow_up_number}</h2>
                <p className="text-purple-200 text-sm">{getTargetAudienceLabel(previewTemplate.target_audience)}</p>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg"
              >
                &times;
              </button>
            </div>
            <div className="p-6">
              <div className="bg-gray-100 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-500">Sujet :</p>
                <p className="font-bold text-gray-900 text-lg">{previewTemplate.subject}</p>
              </div>
              <div className="border-2 border-gray-200 rounded-xl p-6">
                <div
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(previewTemplate.html_content || '', {
                      ALLOWED_TAGS: ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'u', 'a', 'img', 'br', 'ul', 'ol', 'li', 'span', 'table', 'tr', 'td', 'th', 'tbody', 'thead'],
                      ALLOWED_ATTR: ['style', 'href', 'src', 'alt', 'width', 'height', 'class', 'id']
                    })
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
