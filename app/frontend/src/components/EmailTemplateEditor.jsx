<<<<<<< HEAD
import { log, error, warn } from "./../lib/logger.js";
=======
import { log, error, warn } from "../lib/logger.js";
>>>>>>> origin/main
import React, { useState, useEffect } from 'react';
import { X, Eye, Code, Image as ImageIcon, Save, Sparkles, Type, Mail, ChevronDown } from 'lucide-react';
import DOMPurify from 'dompurify';

const TEMPLATE_BLOCKS = {
  header: `<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
  <h1 style="color: white; margin: 0; font-size: 32px;">{{company}}</h1>
  <p style="color: rgba(255,255,255,0.9); margin-top: 10px;">Votre partenaire de confiance</p>
</div>`,
  
  hero: `<div style="padding: 60px 20px; text-align: center; background: #f7fafc;">
  <h2 style="font-size: 28px; color: #2d3748; margin-bottom: 20px;">Bonjour {{name}} !</h2>
  <p style="font-size: 18px; color: #4a5568; line-height: 1.6;">Découvrez notre nouvelle offre exclusive</p>
</div>`,

  cta: `<div style="text-align: center; padding: 40px;">
  <a href="{{link}}" style="display: inline-block; background: #667eea; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
    Découvrir l'offre
  </a>
</div>`,

  content: `<div style="padding: 40px 20px; max-width: 600px; margin: 0 auto;">
  <p style="font-size: 16px; color: #4a5568; line-height: 1.8; margin-bottom: 20px;">
    Chez {{company}}, nous sommes ravis de vous présenter nos dernières innovations.
  </p>
  <p style="font-size: 16px; color: #4a5568; line-height: 1.8;">
    Notre équipe est à votre disposition pour répondre à toutes vos questions.
  </p>
</div>`,

  features: `<div style="padding: 40px 20px; background: #f7fafc;">
  <div style="max-width: 600px; margin: 0 auto; display: grid; gap: 20px;">
    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h3 style="color: #667eea; margin: 0 0 10px 0;">🚀 Rapide</h3>
      <p style="color: #4a5568; margin: 0;">Mise en place en quelques minutes</p>
    </div>
    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h3 style="color: #667eea; margin: 0 0 10px 0;">💎 Qualité</h3>
      <p style="color: #4a5568; margin: 0;">Excellence garantie</p>
    </div>
  </div>
</div>`,

  footer: `<div style="background: #2d3748; padding: 40px 20px; text-align: center; color: white;">
  <p style="margin: 0 0 10px 0; font-size: 14px;">© 2025 {{company}}. Tous droits réservés.</p>
  <p style="margin: 0; font-size: 12px; color: #a0aec0;">
    <a href="{{unsubscribe_link}}" style="color: #a0aec0; text-decoration: underline;">Se désabonner</a>
  </p>
</div>`
};

const VARIABLES = [
  { key: '{{name}}', label: 'Prénom', description: 'Prénom du contact' },
  { key: '{{company}}', label: 'Entreprise', description: 'Nom de l\'entreprise' },
  { key: '{{email}}', label: 'Email', description: 'Email du contact' },
  { key: '{{phone}}', label: 'Téléphone', description: 'Numéro de téléphone' },
  { key: '{{link}}', label: 'Lien', description: 'URL personnalisée' },
  { key: '{{unsubscribe_link}}', label: 'Lien désabonnement', description: 'Lien de désinscription' }
];

export default function EmailTemplateEditor({ template, onSave, onClose }) {
  const [name, setName] = useState(template?.name || '');
  const [subject, setSubject] = useState(template?.subject || '');
  const [htmlBody, setHtmlBody] = useState(template?.html_body || '');
  const [showPreview, setShowPreview] = useState(true);
  const [showBlocks, setShowBlocks] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [spamScore, setSpamScore] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    calculateSpamScore();
  }, [htmlBody, subject]);

  const calculateSpamScore = () => {
    let score = 100;
    
    // Pénalités
    if (subject.includes('GRATUIT') || subject.includes('PROMO')) score -= 20;
    if (subject.includes('!!!')) score -= 15;
    if (subject.toUpperCase() === subject) score -= 25;
    if (htmlBody.includes('viagra') || htmlBody.includes('casino')) score -= 50;
    if (!htmlBody.includes('{{unsubscribe_link}}')) score -= 30;
    if (htmlBody.length < 200) score -= 10;
    
    // Bonus
    if (htmlBody.includes('{{name}}')) score += 5;
    if (htmlBody.includes('{{company}}')) score += 5;
    
    setSpamScore(Math.max(0, Math.min(100, score)));
  };

  const insertBlock = (blockKey) => {
    const block = TEMPLATE_BLOCKS[blockKey];
    setHtmlBody(prev => prev + '\n\n' + block);
    setShowBlocks(false);
  };

  const insertVariable = (variable) => {
    setHtmlBody(prev => prev + variable);
    setShowVariables(false);
  };

  const insertImage = () => {
    const url = prompt('URL de l\'image :');
    if (url) {
      const imgTag = `<img src="${url}" alt="Image" style="max-width: 100%; height: auto; border-radius: 8px;" />`;
      setHtmlBody(prev => prev + '\n' + imgTag);
    }
  };

  const handleSave = async () => {
    if (!name || !subject || !htmlBody) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name,
        subject,
        html_body: htmlBody,
        template_type: 'email',
        is_active: true
      });
    } finally {
      setSaving(false);
    }
  };

  const getSpamColor = () => {
    if (spamScore >= 80) return 'text-green-600';
    if (spamScore >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSpamLabel = () => {
    if (spamScore >= 80) return 'Excellent';
    if (spamScore >= 60) return 'Bon';
    if (spamScore >= 40) return 'Moyen';
    return 'Risqué';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6" />
            <div>
              <h2 className="text-2xl font-bold">
                {template ? 'Modifier le template' : 'Nouveau template'}
              </h2>
              <p className="text-purple-100 text-sm">Créez un email professionnel et optimisé</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="bg-gray-50 border-b border-gray-200 p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 bg-white border-2 border-gray-200 px-4 py-2 rounded-lg hover:border-purple-500 transition-all"
            >
              {showPreview ? <Code className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showPreview ? 'Mode Code' : 'Prévisualisation'}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowBlocks(!showBlocks)}
                className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-all"
              >
                <Type className="w-4 h-4" />
                Blocs prédéfinis
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {showBlocks && (
                <div className="absolute top-full left-0 mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl z-10 w-64">
                  {Object.keys(TEMPLATE_BLOCKS).map(key => (
                    <button
                      key={key}
                      onClick={() => insertBlock(key)}
                      className="w-full text-left px-4 py-3 hover:bg-purple-50 transition-all border-b border-gray-100 last:border-0"
                    >
                      <div className="font-semibold text-gray-900 capitalize">{key}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {key === 'header' && 'En-tête avec logo'}
                        {key === 'hero' && 'Section hero avec titre'}
                        {key === 'cta' && 'Bouton d\'action'}
                        {key === 'content' && 'Bloc de contenu'}
                        {key === 'features' && 'Liste d\'avantages'}
                        {key === 'footer' && 'Pied de page'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setShowVariables(!showVariables)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Variables
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {showVariables && (
                <div className="absolute top-full left-0 mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl z-10 w-72">
                  {VARIABLES.map(v => (
                    <button
                      key={v.key}
                      onClick={() => insertVariable(v.key)}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-all border-b border-gray-100 last:border-0"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm text-purple-600">{v.key}</span>
                        <span className="text-xs text-gray-500">{v.label}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{v.description}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={insertImage}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all"
            >
              <ImageIcon className="w-4 h-4" />
              Insérer image
            </button>

            <div className="flex-1"></div>

            <div className="flex items-center gap-2 bg-white border-2 border-gray-200 px-4 py-2 rounded-lg">
              <div className="text-sm">
                Score Anti-Spam: <span className={`font-bold ${getSpamColor()}`}>{spamScore}/100</span>
                <span className="text-xs text-gray-500 ml-2">({getSpamLabel()})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Form */}
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nom du template *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Newsletter Janvier 2025"
                  className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Sujet de l'email *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ex: Découvrez nos nouveautés !"
                  className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Editor + Preview */}
          <div className="flex-1 flex overflow-hidden">
            {/* Code Editor */}
            <div className={`${showPreview ? 'w-1/2' : 'w-full'} border-r border-gray-200 flex flex-col`}>
              <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                <span className="text-sm font-semibold text-gray-700">Code HTML</span>
              </div>
              <textarea
                value={htmlBody}
                onChange={(e) => setHtmlBody(e.target.value)}
                placeholder="Écrivez votre HTML ici ou utilisez les blocs prédéfinis..."
                className="flex-1 p-4 font-mono text-sm resize-none focus:outline-none"
                style={{ minHeight: '400px' }}
              />
            </div>

            {/* Preview */}
            {showPreview && (
              <div className="w-1/2 flex flex-col bg-gray-50">
                <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                  <span className="text-sm font-semibold text-gray-700">Prévisualisation</span>
                </div>
                <div className="flex-1 overflow-auto p-4">
                  <div className="bg-white rounded-lg shadow-lg max-w-2xl mx-auto">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(
                          htmlBody
                            .replace(/{{name}}/g, 'Jean Dupont')
                            .replace(/{{company}}/g, 'Votre Entreprise')
                            .replace(/{{email}}/g, 'jean.dupont@example.com')
                            .replace(/{{phone}}/g, '01 23 45 67 89')
                            .replace(/{{link}}/g, '#')
                            .replace(/{{unsubscribe_link}}/g, '#'),
                          {
                            ALLOWED_TAGS: ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'u', 'a', 'img', 'br', 'ul', 'ol', 'li', 'span', 'table', 'tr', 'td', 'th', 'tbody', 'thead'],
                            ALLOWED_ATTR: ['style', 'href', 'src', 'alt', 'width', 'height', 'class', 'id']
                          }
                        )
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 p-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            💡 <strong>Astuce:</strong> Utilisez les variables pour personnaliser vos emails
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Enregistrement...' : 'Enregistrer le template'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}