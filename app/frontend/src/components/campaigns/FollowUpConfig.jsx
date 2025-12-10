/**
 * Composant de configuration des relances automatiques
 *
 * NOUVELLE ARCHITECTURE - DEUX MODES INDÉPENDANTS:
 * - Mode 1: Relance "Ouvert sans clic" (opened_not_clicked)
 * - Mode 2: Relance "Non ouverts" (not_opened)
 *
 * Chaque mode peut être activé/désactivé indépendamment.
 * Chaque mode a son propre délai et template.
 */

import { useState } from 'react';
import { RefreshCw, Mail, Sparkles, Eye, Edit3, Check, AlertCircle, Clock, Target, Users, PenLine, MailOpen, MailX } from 'lucide-react';
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
  isNewCampaign = true,
  // NEW: Independent mode configuration
  enabledModes = { opened_not_clicked: false, not_opened: false },
  onEnabledModesChange,
  delayByMode = { opened_not_clicked: 3, not_opened: 3 },
  onDelayByModeChange
}) {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingMode, setGeneratingMode] = useState(null); // 'opened_not_clicked' | 'not_opened'
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editedContent, setEditedContent] = useState({ subject: '', html: '' });

  // Mode: 'choice' | 'asefi' | 'manual' - per target audience
  const [templateModeByAudience, setTemplateModeByAudience] = useState({
    opened_not_clicked: 'choice',
    not_opened: 'choice'
  });

  // Manual template inputs per mode
  const [manualTemplates, setManualTemplates] = useState({
    opened_not_clicked: { subject: '', html_content: '' },
    not_opened: { subject: '', html_content: '' }
  });

  // Use external generating state if provided
  const isGenerating = generatingTemplates !== undefined ? generatingTemplates : generating;

  // Helper: Check if a mode is enabled (support both old and new format)
  const isModeEnabled = (mode) => {
    if (onEnabledModesChange && enabledModes) {
      return enabledModes[mode] || false;
    }
    // Fallback to old format
    if (mode === 'opened_not_clicked') return enabled && followUpCount >= 1;
    if (mode === 'not_opened') return enabled && followUpCount >= 2;
    return false;
  };

  // Helper: Toggle mode (support both old and new format)
  const toggleMode = (mode, value) => {
    if (onEnabledModesChange) {
      onEnabledModesChange({ ...enabledModes, [mode]: value });
      // Also update the old props for backward compatibility
      const newModes = { ...enabledModes, [mode]: value };
      const anyEnabled = newModes.opened_not_clicked || newModes.not_opened;
      onEnabledChange(anyEnabled);
      const count = (newModes.opened_not_clicked ? 1 : 0) + (newModes.not_opened ? 1 : 0);
      onFollowUpCountChange(Math.max(1, count));
    } else {
      // Old format fallback
      if (mode === 'opened_not_clicked') {
        onEnabledChange(value);
      } else if (mode === 'not_opened') {
        onFollowUpCountChange(value ? 2 : 1);
      }
    }
  };

  // Helper: Get delay for mode
  const getDelayForMode = (mode) => {
    if (onDelayByModeChange && delayByMode) {
      return delayByMode[mode] || 3;
    }
    // Fallback to old format
    return mode === 'not_opened' ? delayDays : delayDays;
  };

  // Helper: Set delay for mode
  const setDelayForMode = (mode, value) => {
    if (onDelayByModeChange) {
      onDelayByModeChange({ ...delayByMode, [mode]: value });
    } else {
      onDelayDaysChange(value);
    }
  };

  // Get template for a specific mode
  const getTemplateForMode = (mode) => {
    return templates.find(t => t.target_audience === mode);
  };

  // Générer le template pour un mode spécifique
  const handleGenerateTemplateForMode = async (mode) => {
    if (!campaignId || campaignId === '0') {
      // For new campaigns, use external generator
      if (onGenerateTemplates) {
        onGenerateTemplates(mode);
        return;
      }
    }

    setGeneratingMode(mode);
    setGenerating(true);
    try {
      const response = await api.post(`/campaigns/${campaignId}/follow-ups/generate-templates`, {
        target_audience: mode,
        delay_days: getDelayForMode(mode)
      });

      if (response.data.success) {
        const newTemplate = response.data.follow_ups.find(t => t.target_audience === mode);
        if (newTemplate) {
          // Update templates list
          const existingIndex = templates.findIndex(t => t.target_audience === mode);
          let newTemplates;
          if (existingIndex >= 0) {
            newTemplates = [...templates];
            newTemplates[existingIndex] = newTemplate;
          } else {
            newTemplates = [...templates, newTemplate];
          }
          onTemplatesChange(newTemplates);
          toast.success(`Template "${mode === 'opened_not_clicked' ? 'Ouvert sans clic' : 'Non ouverts'}" généré !`);
        }
      }
    } catch (error) {
      console.error('Erreur génération:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la génération');
    } finally {
      setGenerating(false);
      setGeneratingMode(null);
    }
  };

  // Sauvegarder le template manuel pour un mode
  const handleSaveManualTemplate = (mode) => {
    const manual = manualTemplates[mode];
    if (!manual.subject || !manual.html_content) {
      toast.error('Veuillez remplir le sujet et le contenu');
      return;
    }

    const newTemplate = {
      id: `manual-${mode}`,
      follow_up_number: mode === 'opened_not_clicked' ? 1 : 2,
      target_audience: mode,
      subject: manual.subject,
      html_content: manual.html_content,
      delay_days: getDelayForMode(mode),
      status: 'pending'
    };

    // Update templates list
    const existingIndex = templates.findIndex(t => t.target_audience === mode);
    let newTemplates;
    if (existingIndex >= 0) {
      newTemplates = [...templates];
      newTemplates[existingIndex] = newTemplate;
    } else {
      newTemplates = [...templates, newTemplate];
    }
    onTemplatesChange(newTemplates);
    setTemplateModeByAudience({ ...templateModeByAudience, [mode]: 'done' });
    toast.success('Template créé !');
  };

  // Sauvegarder les modifications d'un template existant
  const handleSaveTemplate = async (followUpId) => {
    setLoading(true);
    try {
      if (campaignId && campaignId !== '0' && !followUpId.startsWith('manual-')) {
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
        }
      } else {
        // For new campaigns or manual templates, update locally
        const updatedTemplates = templates.map(t =>
          t.id === followUpId ? { ...t, subject: editedContent.subject, html_content: editedContent.html } : t
        );
        onTemplatesChange(updatedTemplates);
        toast.success('Template sauvegardé !');
      }
      setEditingTemplate(null);
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

  const getModeLabel = (mode) => {
    switch (mode) {
      case 'opened_not_clicked':
        return 'Ouvert sans clic';
      case 'not_opened':
        return 'Non ouverts';
      default:
        return mode;
    }
  };

  const getModeDescription = (mode) => {
    switch (mode) {
      case 'opened_not_clicked':
        return 'Relance les contacts qui ont ouvert votre email mais n\'ont pas cliqué sur le lien';
      case 'not_opened':
        return 'Relance les contacts qui n\'ont pas du tout ouvert votre email';
      default:
        return '';
    }
  };

  const getModeIcon = (mode) => {
    switch (mode) {
      case 'opened_not_clicked':
        return <MailOpen className="w-6 h-6 text-orange-600" />;
      case 'not_opened':
        return <MailX className="w-6 h-6 text-red-600" />;
      default:
        return <Mail className="w-6 h-6 text-gray-600" />;
    }
  };

  const getModeColor = (mode) => {
    switch (mode) {
      case 'opened_not_clicked':
        return { bg: 'from-orange-50 to-amber-50', border: 'border-orange-200', accent: 'orange' };
      case 'not_opened':
        return { bg: 'from-red-50 to-pink-50', border: 'border-red-200', accent: 'red' };
      default:
        return { bg: 'from-gray-50 to-gray-100', border: 'border-gray-200', accent: 'gray' };
    }
  };

  // Render a single mode configuration card
  const renderModeCard = (mode) => {
    const isEnabled = isModeEnabled(mode);
    const template = getTemplateForMode(mode);
    const delay = getDelayForMode(mode);
    const colors = getModeColor(mode);
    const templateMode = templateModeByAudience[mode];

    return (
      <div
        key={mode}
        className={`bg-gradient-to-r ${colors.bg} border-2 ${colors.border} rounded-xl overflow-hidden transition-all ${
          isEnabled ? 'shadow-lg' : 'opacity-70'
        }`}
      >
        {/* Header avec toggle */}
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-sm`}>
                {getModeIcon(mode)}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{getModeLabel(mode)}</h3>
                <p className="text-sm text-gray-600 max-w-md">{getModeDescription(mode)}</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => toggleMode(mode, e.target.checked)}
                className="sr-only peer"
              />
              <div className={`w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-${colors.accent}-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-${colors.accent}-600`}></div>
            </label>
          </div>
        </div>

        {/* Configuration (si activé) */}
        {isEnabled && (
          <div className="border-t border-gray-200 bg-white p-6 space-y-6">
            {/* Délai */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                Délai avant relance
              </h4>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="14"
                  value={delay}
                  onChange={(e) => setDelayForMode(mode, parseInt(e.target.value))}
                  className={`flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-${colors.accent}-600`}
                />
                <div className={`bg-${colors.accent}-100 text-${colors.accent}-700 px-4 py-2 rounded-xl font-bold min-w-[80px] text-center`}>
                  {delay} jour{delay > 1 ? 's' : ''}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                La relance sera envoyée {delay} jour{delay > 1 ? 's' : ''} après l'envoi principal
              </p>
            </div>

            {/* Template */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-500" />
                Template de relance
              </h4>

              {!template && templateMode === 'choice' ? (
                /* Choix du mode de création */
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setTemplateModeByAudience({ ...templateModeByAudience, [mode]: 'manual' })}
                    className="bg-gray-50 border-2 border-gray-200 hover:border-purple-400 rounded-xl p-4 text-left transition-all hover:shadow-md group"
                  >
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <PenLine className="w-5 h-5 text-purple-600" />
                    </div>
                    <h5 className="font-semibold text-gray-900">Écrire moi-même</h5>
                    <p className="text-xs text-gray-500">Rédigez votre propre email</p>
                  </button>

                  <button
                    onClick={() => handleGenerateTemplateForMode(mode)}
                    disabled={isGenerating}
                    className="bg-gray-50 border-2 border-gray-200 hover:border-blue-400 rounded-xl p-4 text-left transition-all hover:shadow-md group"
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      {generatingMode === mode ? (
                        <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                      ) : (
                        <Sparkles className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <h5 className="font-semibold text-gray-900">
                      {generatingMode === mode ? 'Génération...' : 'Générer avec Asefi'}
                    </h5>
                    <p className="text-xs text-gray-500">IA génère automatiquement</p>
                  </button>
                </div>
              ) : !template && templateMode === 'manual' ? (
                /* Mode manuel */
                <div className="space-y-4">
                  <button
                    onClick={() => setTemplateModeByAudience({ ...templateModeByAudience, [mode]: 'choice' })}
                    className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1"
                  >
                    ← Retour
                  </button>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Sujet de l'email
                    </label>
                    <input
                      type="text"
                      value={manualTemplates[mode].subject}
                      onChange={(e) => setManualTemplates({
                        ...manualTemplates,
                        [mode]: { ...manualTemplates[mode], subject: e.target.value }
                      })}
                      placeholder={mode === 'not_opened'
                        ? "Ex: Avez-vous eu le temps de consulter notre proposition ?"
                        : "Ex: Suite à notre précédent email..."
                      }
                      className={`w-full border-2 border-gray-200 rounded-xl p-3 focus:border-${colors.accent}-400 focus:ring-2 focus:ring-${colors.accent}-100`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Contenu de l'email
                    </label>
                    <textarea
                      value={manualTemplates[mode].html_content}
                      onChange={(e) => setManualTemplates({
                        ...manualTemplates,
                        [mode]: { ...manualTemplates[mode], html_content: e.target.value }
                      })}
                      rows={6}
                      placeholder={mode === 'not_opened'
                        ? "Bonjour {{contact_name}},\n\nJe me permets de vous recontacter car mon précédent message est peut-être passé inaperçu..."
                        : "Bonjour {{contact_name}},\n\nSuite à notre précédent échange..."
                      }
                      className={`w-full border-2 border-gray-200 rounded-xl p-3 font-mono text-sm focus:border-${colors.accent}-400 focus:ring-2 focus:ring-${colors.accent}-100`}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Variables: {'{{contact_name}}'}, {'{{company}}'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleSaveManualTemplate(mode)}
                    className={`w-full bg-gradient-to-r from-${colors.accent}-600 to-${colors.accent}-700 text-white py-3 rounded-xl font-semibold hover:opacity-90 flex items-center justify-center gap-2`}
                  >
                    <Check className="w-5 h-5" />
                    Valider ce template
                  </button>
                </div>
              ) : template ? (
                /* Template existant */
                <div className="bg-gray-50 rounded-xl overflow-hidden">
                  {editingTemplate === template.id ? (
                    <div className="p-4 space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Sujet</label>
                        <input
                          type="text"
                          value={editedContent.subject}
                          onChange={(e) => setEditedContent({ ...editedContent, subject: e.target.value })}
                          className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Contenu HTML</label>
                        <textarea
                          value={editedContent.html}
                          onChange={(e) => setEditedContent({ ...editedContent, html: e.target.value })}
                          rows={8}
                          className="w-full border-2 border-gray-200 rounded-xl p-3 font-mono text-sm focus:border-purple-500"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleSaveTemplate(template.id)}
                          disabled={loading}
                          className="flex-1 bg-green-600 text-white py-2 rounded-xl font-semibold hover:bg-green-700 flex items-center justify-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Sauvegarder
                        </button>
                        <button
                          onClick={() => setEditingTemplate(null)}
                          className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-xl font-semibold hover:bg-gray-300"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="p-4">
                        <p className="text-sm text-gray-500 mb-1">Sujet :</p>
                        <p className="font-semibold text-gray-900">{template.subject}</p>
                      </div>
                      <div className="border-t border-gray-200 p-4 max-h-32 overflow-y-auto">
                        <div
                          className="text-sm text-gray-700"
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(template.html_content || '', {
                              ALLOWED_TAGS: ['div', 'p', 'strong', 'em', 'a', 'br', 'span'],
                              ALLOWED_ATTR: ['style', 'href']
                            })
                          }}
                        />
                      </div>
                      <div className="border-t border-gray-200 p-3 flex gap-2">
                        <button
                          onClick={() => setPreviewTemplate(template)}
                          className="flex-1 bg-blue-100 text-blue-700 py-2 rounded-lg font-semibold hover:bg-blue-200 flex items-center justify-center gap-1 text-sm"
                        >
                          <Eye className="w-4 h-4" />
                          Prévisualiser
                        </button>
                        <button
                          onClick={() => startEditing(template)}
                          className="flex-1 bg-purple-100 text-purple-700 py-2 rounded-lg font-semibold hover:bg-purple-200 flex items-center justify-center gap-1 text-sm"
                        >
                          <Edit3 className="w-4 h-4" />
                          Modifier
                        </button>
                        <button
                          onClick={() => handleGenerateTemplateForMode(mode)}
                          disabled={isGenerating}
                          className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-200 flex items-center justify-center gap-1 text-sm"
                        >
                          <RefreshCw className={`w-4 h-4 ${generatingMode === mode ? 'animate-spin' : ''}`} />
                          Régénérer
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    );
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

      {/* Information box */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Deux modes de relance indépendants</h3>
            <p className="text-sm text-gray-600 mt-1">
              Activez un ou les deux modes selon vos besoins. Chaque mode cible un comportement différent de vos prospects.
            </p>
          </div>
        </div>
      </div>

      {/* Mode Cards - Two independent modes */}
      <div className="space-y-4">
        {renderModeCard('opened_not_clicked')}
        {renderModeCard('not_opened')}
      </div>

      {/* Info box */}
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-yellow-800">
          <p className="font-semibold mb-1">Comment fonctionnent les relances ?</p>
          <ul className="list-disc list-inside space-y-1 text-yellow-700">
            <li><strong>Ouvert sans clic</strong> : Cible les contacts qui ont ouvert mais n'ont pas cliqué</li>
            <li><strong>Non ouverts</strong> : Cible les contacts qui n'ont pas du tout ouvert votre email</li>
            <li>Les deux modes peuvent fonctionner <strong>indépendamment</strong> ou ensemble</li>
            <li>Chaque contact ne recevra qu'<strong>une seule relance par mode</strong></li>
            <li>Les personnes désinscrites ou ayant cliqué ne recevront pas de relance</li>
          </ul>
        </div>
      </div>

      {/* Modal de prévisualisation */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-t-2xl flex items-center justify-between sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-bold">Prévisualisation - {getModeLabel(previewTemplate.target_audience)}</h2>
                <p className="text-purple-200 text-sm">{getModeDescription(previewTemplate.target_audience)}</p>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg text-2xl"
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
