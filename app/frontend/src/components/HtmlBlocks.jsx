import React, { useState } from 'react';
import { Code, Mail, MousePointer, Type, Image as ImageIcon, Layout } from 'lucide-react';

const HTML_BLOCKS = [
  {
    category: 'Headers',
    icon: Type,
    blocks: [
      {
        name: 'Header Simple',
        preview: '📋 Header basique',
        code: `<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 10px;">
  <h1 style="color: white; margin: 0; font-size: 32px;">{{company}}</h1>
  <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Votre partenaire de confiance</p>
</div>`
      },
      {
        name: 'Header avec Logo',
        preview: '🏢 Header + Logo',
        code: `<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 20px;">
  <tr>
    <td style="text-align: center;">
      <img src="VOTRE_LOGO_URL" alt="Logo" style="max-width: 150px; height: auto;" />
      <h2 style="color: #333; margin: 20px 0 10px 0;">Newsletter {{company}}</h2>
    </td>
  </tr>
</table>`
      }
    ]
  },
  {
    category: 'Boutons',
    icon: MousePointer,
    blocks: [
      {
        name: 'Bouton CTA Principal',
        preview: '🔵 Bouton bleu',
        code: `<div style="text-align: center; margin: 30px 0;">
  <a href="VOTRE_LIEN" style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
    Cliquez ici
  </a>
</div>`
      },
      {
        name: 'Bouton Simple',
        preview: '⚪ Bouton outline',
        code: `<div style="text-align: center; margin: 20px 0;">
  <a href="VOTRE_LIEN" style="display: inline-block; padding: 12px 30px; border: 2px solid #667eea; color: #667eea; text-decoration: none; border-radius: 8px; font-weight: 600;">
    En savoir plus
  </a>
</div>`
      }
    ]
  },
  {
    category: 'Sections',
    icon: Layout,
    blocks: [
      {
        name: 'Section 2 Colonnes',
        preview: '📰 2 colonnes',
        code: `<table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
  <tr>
    <td width="50%" style="padding: 20px; vertical-align: top;">
      <h3 style="color: #333; margin: 0 0 10px 0;">Colonne 1</h3>
      <p style="color: #666; line-height: 1.6;">Votre contenu ici...</p>
    </td>
    <td width="50%" style="padding: 20px; vertical-align: top;">
      <h3 style="color: #333; margin: 0 0 10px 0;">Colonne 2</h3>
      <p style="color: #666; line-height: 1.6;">Votre contenu ici...</p>
    </td>
  </tr>
</table>`
      },
      {
        name: 'Section Image + Texte',
        preview: '🖼️ Image + texte',
        code: `<table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
  <tr>
    <td width="40%" style="padding: 10px;">
      <img src="VOTRE_IMAGE_URL" alt="Image" style="width: 100%; height: auto; border-radius: 10px;" />
    </td>
    <td width="60%" style="padding: 20px; vertical-align: middle;">
      <h3 style="color: #333; margin: 0 0 15px 0;">Titre accrocheur</h3>
      <p style="color: #666; line-height: 1.6; margin: 0 0 20px 0;">Votre texte descriptif ici...</p>
      <a href="VOTRE_LIEN" style="color: #667eea; text-decoration: none; font-weight: 600;">En savoir plus →</a>
    </td>
  </tr>
</table>`
      }
    ]
  },
  {
    category: 'Texte',
    icon: Type,
    blocks: [
      {
        name: 'Paragraphe Stylisé',
        preview: '📝 Texte',
        code: `<div style="padding: 20px; background-color: #f8f9fa; border-left: 4px solid #667eea; border-radius: 8px; margin: 20px 0;">
  <p style="color: #333; line-height: 1.8; margin: 0;">
    Bonjour <strong>{{name}}</strong>,<br><br>
    Votre contenu personnalisé ici...
  </p>
</div>`
      },
      {
        name: 'Citation',
        preview: '💬 Quote',
        code: `<blockquote style="border-left: 4px solid #667eea; padding-left: 20px; margin: 30px 0; font-style: italic; color: #555;">
  "Une citation inspirante qui capte l'attention de vos lecteurs."
  <footer style="margin-top: 10px; font-size: 14px; color: #999;">— Auteur</footer>
</blockquote>`
      }
    ]
  },
  {
    category: 'Footer',
    icon: Mail,
    blocks: [
      {
        name: 'Footer Complet',
        preview: '📧 Footer pro',
        code: `<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #2d3748; color: white; margin-top: 40px;">
  <tr>
    <td style="padding: 40px 20px; text-align: center;">
      <p style="margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">{{company}}</p>
      <p style="margin: 0 0 20px 0; color: rgba(255,255,255,0.7); font-size: 14px;">
        Votre adresse • contact@email.com • +33 1 23 45 67 89
      </p>
      <div style="margin: 20px 0;">
        <a href="#" style="display: inline-block; margin: 0 10px; color: white; text-decoration: none;">Facebook</a>
        <a href="#" style="display: inline-block; margin: 0 10px; color: white; text-decoration: none;">Twitter</a>
        <a href="#" style="display: inline-block; margin: 0 10px; color: white; text-decoration: none;">LinkedIn</a>
      </div>
      <p style="margin: 20px 0 0 0; color: rgba(255,255,255,0.5); font-size: 12px;">
        © 2025 {{company}}. Tous droits réservés.
      </p>
    </td>
  </tr>
</table>`
      }
    ]
  }
];

export default function HtmlBlocks({ onInsert }) {
  const [expandedCategory, setExpandedCategory] = useState(null);

  return (
    <div className="space-y-2">
      {HTML_BLOCKS.map((category, idx) => {
        const Icon = category.icon;
        const isExpanded = expandedCategory === idx;
        
        return (
          <div key={idx} className="border-2 border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedCategory(isExpanded ? null : idx)}
              className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-purple-600" />
                <span className="font-semibold text-gray-800 text-sm">{category.category}</span>
              </div>
              <span className={`text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
            </button>
            
            {isExpanded && (
              <div className="p-2 bg-white space-y-2">
                {category.blocks.map((block, blockIdx) => (
                  <button
                    key={blockIdx}
                    onClick={() => onInsert(block.code)}
                    className="w-full text-left p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{block.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{block.preview}</p>
                      </div>
                      <Code className="w-4 h-4 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

