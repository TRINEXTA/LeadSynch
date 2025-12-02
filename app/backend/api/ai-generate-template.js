import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// POST /ai/generate-template - Génération de template email complet avec IA
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      email_type,
      tone,
      company_name,
      objective,
      target_audience,
      product_service,
      call_to_action,
      additional_info
    } = req.body;

    if (!objective || !objective.trim()) {
      return res.status(400).json({ error: 'Objectif requis' });
    }

    // Mapper les types d'email
    const emailTypeDescriptions = {
      newsletter: 'newsletter informative',
      promotion: 'email promotionnel avec offre spéciale',
      welcome: 'email de bienvenue chaleureux',
      announcement: 'annonce de nouveau produit/service',
      invitation: 'invitation à un événement',
      'follow-up': 'email de relance/suivi'
    };

    // Mapper les tons
    const toneDescriptions = {
      professional: 'professionnel et sérieux',
      friendly: 'amical et accessible',
      enthusiastic: 'enthousiaste et dynamique',
      formal: 'formel et corporate',
      casual: 'décontracté et conversationnel',
      luxury: 'premium et haut de gamme'
    };

    const emailTypeDesc = emailTypeDescriptions[email_type] || 'email marketing';
    const toneDesc = toneDescriptions[tone] || 'professionnel';

    const prompt = `Tu es Asefi, assistant IA expert en email marketing pour LeadSynch CRM.

Crée un template email HTML professionnel et moderne.

📋 BRIEF:
- Type: ${emailTypeDesc}
- Ton: ${toneDesc}
- Entreprise: ${company_name || 'Notre entreprise'}
- Objectif: ${objective}
${target_audience ? `- Audience cible: ${target_audience}` : ''}
${product_service ? `- Produit/Service: ${product_service}` : ''}
${call_to_action ? `- CTA souhaité: ${call_to_action}` : ''}
${additional_info ? `- Informations supplémentaires: ${additional_info}` : ''}

🎯 CONSIGNES DE GÉNÉRATION:

1. **Objet**: Accrocheur, 50-70 caractères, incite à l'ouverture
2. **Pré-header**: Complète l'objet, 100-120 caractères
3. **HTML**: Template responsive, design moderne avec:
   - Header avec logo/nom entreprise
   - Corps structuré avec titres et paragraphes
   - Bouton CTA bien visible (couleur contrastée)
   - Footer avec coordonnées et lien désabonnement
   - Styles inline pour compatibilité email
   - Couleurs professionnelles (bleu #2563eb, violet #7c3aed)

IMPORTANT:
- Le HTML doit être COMPLET et fonctionnel
- Utilise des couleurs en fonction du ton (luxe = doré, formel = bleu foncé, etc.)
- Le CTA doit être centré et visible
- Adapte le vocabulaire au ton demandé
- Maximum 600px de largeur

Réponds en JSON strict sans markdown ni backticks:
{
  "subject": "Objet de l'email",
  "preview_text": "Texte de pré-visualisation",
  "html": "HTML complet du template email"
}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }]
    });

    let content = message.content[0].text.trim();

    // Nettoyage du JSON
    content = content.replace(/```json/gi, '');
    content = content.replace(/```/g, '');
    content = content.trim();

    const parsed = JSON.parse(content);

    res.json({
      success: true,
      template: parsed,
      tokens_used: message.usage.input_tokens + message.usage.output_tokens
    });

  } catch (error) {
    console.error('Erreur AI Generate Template:', error);
    res.status(500).json({
      error: 'Erreur lors de la génération du template',
      message: error.message
    });
  }
});

export default router;
