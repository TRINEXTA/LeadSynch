import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Niveaux d'amélioration selon abonnement
const IMPROVEMENT_LEVELS = {
  free: { maxChars: 0, maxTokens: 0 },
  basic: { maxChars: 500, maxTokens: 500 },
  pro: { maxChars: 2000, maxTokens: 2000 },
  enterprise: { maxChars: 10000, maxTokens: 4000 }
};

// POST /asefi/generate - Génération template email complet
router.post('/generate', authMiddleware, async (req, res) => {
  console.log(' Requête reçue sur /asefi/generate');
  
  try {
    const { campaignType, objective, audience, tone, mainLink, meetingLink, signature } = req.body;

    if (!objective || !objective.trim()) {
      console.log(' Objectif manquant');
      return res.status(400).json({ error: 'Objectif requis' });
    }

    console.log(' Objectif valide, appel à Claude API...');

    const linksPart = (mainLink || meetingLink)
      ? '\n\nLiens à intégrer:\n' + (mainLink ? '- Lien principal: ' + mainLink + '\n' : '') + (meetingLink ? '- Lien RDV: ' + meetingLink : '')
      : '';

    const signaturePart = (signature?.name || signature?.company)
      ? '\n\nSignature:\n' + (signature.name || '') + (signature.title ? ' - ' + signature.title : '') + '\n' + (signature.company || '') + '\n' + (signature.phone || '') + ' ' + (signature.email || '')
      : '';

    const prompt = `Tu es Asefi, assistant IA pour LeadSynch CRM. Crée un template email professionnel.

Type: ${campaignType}
Objectif: ${objective}
Audience: ${audience}
Ton: ${tone}${linksPart}${signaturePart}

Génère un email avec:
1. Objet accrocheur (50-70 caractères)
2. Pré-en-tête engageant
3. Corps structuré (3-5 paragraphes) avec liens intégrés
4. CTA clair
5. Signature professionnelle

Réponds UNIQUEMENT en JSON strict sans aucun markdown ni backticks:
{
  "subject": "...",
  "preheader": "...",
  "body": "...",
  "cta": "..."
}`;

    console.log(' Envoi du prompt à Claude...');

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }]
    });

    console.log(' Réponse de Claude reçue');

    let content = message.content[0].text.trim();
    
    // Nettoyage du JSON
    content = content.replace(/```json/gi, '');
    content = content.replace(/```/g, '');
    content = content.trim();
    
    const parsed = JSON.parse(content);

    console.log(' Template généré avec succès');

    res.json({
      success: true,
      template: parsed
    });

  } catch (error) {
    console.error(' Erreur Asefi Generate:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la génération',
      details: error.message 
    });
  }
});

// POST /asefi/improve-text - Amélioration de texte (pour Mode Prospection)
router.post('/improve-text', authMiddleware, async (req, res) => {
  console.log(' Amélioration de texte avec Asefi');
  
  try {
    const { text, type, lead_context, improvement_level } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Texte requis' });
    }

    // Vérifier le niveau d'abonnement (à adapter selon votre système)
    const userLevel = improvement_level || 'basic';
    const levelConfig = IMPROVEMENT_LEVELS[userLevel];

    if (levelConfig.maxChars === 0) {
      return res.status(403).json({ 
        error: 'Amélioration IA non disponible sur votre plan',
        upgrade_required: true 
      });
    }

    if (text.length > levelConfig.maxChars) {
      return res.status(400).json({ 
        error: `Texte trop long. Maximum ${levelConfig.maxChars} caractères pour votre plan ${userLevel}`,
        current_length: text.length,
        max_length: levelConfig.maxChars
      });
    }

    // Construire le contexte du lead
    let contextInfo = '';
    if (lead_context) {
      contextInfo = `\n\nContexte du prospect:
- Entreprise: ${lead_context.company_name || 'N/A'}
- Secteur: ${lead_context.industry || 'N/A'}
- Statut: ${lead_context.status || 'N/A'}`;
    }

    // Prompts selon le niveau
    const prompts = {
      basic: `Tu es Asefi, assistant IA. Améliore ce texte professionnel en corrigeant l'orthographe et en améliorant légèrement le style. Garde le même ton et la longueur similaire.${contextInfo}

Texte à améliorer:
"${text}"

Réponds UNIQUEMENT avec le texte amélioré, sans explications ni commentaires.`,

      pro: `Tu es Asefi, assistant IA expert en communication B2B. Améliore ce texte professionnel:

1. Corrige toutes les fautes
2. Améliore la clarté et le style
3. Adapte le ton pour une communication B2B efficace
4. Garde le message principal intact
5. Rends-le plus engageant${contextInfo}

Type de contenu: ${type || 'email'}

Texte original:
"${text}"

Réponds UNIQUEMENT avec le texte amélioré, sans explications.`,

      enterprise: `Tu es Asefi, assistant IA de niveau expert pour LeadSynch CRM. Transforme ce texte en communication professionnelle de haute qualité:

OBJECTIFS:
1. Correction parfaite (orthographe, grammaire, ponctuation)
2. Style corporate adapté au secteur ${lead_context?.industry || 'B2B'}
3. Tonalité persuasive et engageante
4. Structure optimisée avec paragraphes clairs
5. Appel à l'action naturel et convaincant
6. Personnalisation basée sur le contexte du prospect${contextInfo}

Type: ${type || 'email'}

Texte original:
"${text}"

IMPORTANT: Réponds UNIQUEMENT avec le texte final amélioré, prêt à être envoyé. Aucune explication, aucun commentaire.`
    };

    const prompt = prompts[userLevel] || prompts.basic;

    console.log(` Amélioration niveau ${userLevel}...`);

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: levelConfig.maxTokens,
      messages: [{ role: 'user', content: prompt }]
    });

    const improvedText = message.content[0].text.trim();

    console.log(' Texte amélioré avec succès');

    res.json({
      success: true,
      improved_text: improvedText,
      original_length: text.length,
      improved_length: improvedText.length,
      improvement_level: userLevel,
      tokens_used: message.usage.input_tokens + message.usage.output_tokens
    });

  } catch (error) {
    console.error(' Erreur amélioration texte:', error);
    res.status(500).json({ 
      error: 'Erreur lors de l\'amélioration',
      details: error.message 
    });
  }
});

// POST /asefi/generate-quick-email - Génération rapide email pour prospection
router.post('/generate-quick-email', authMiddleware, async (req, res) => {
  console.log(' Génération rapide email pour prospection');
  
  try {
    const { template_type, lead_info, tone, user_signature } = req.body;

    if (!template_type || !lead_info) {
      return res.status(400).json({ error: 'template_type et lead_info requis' });
    }

    const templates = {
      first_contact: 'premier contact / introduction',
      follow_up: 'relance après un contact précédent',
      proposal: 'présentation d\'une offre commerciale',
      meeting_request: 'demande de rendez-vous',
      thank_you: 'remerciement après un échange',
      reconnection: 'reprise de contact après une pause'
    };

    const prompt = `Tu es Asefi, assistant IA pour prospection commerciale. Génère un email de ${templates[template_type]} pour ce prospect:

PROSPECT:
- Entreprise: ${lead_info.company_name}
- Secteur: ${lead_info.industry || 'Non spécifié'}
- Statut actuel: ${lead_info.status || 'Nouveau'}
${lead_info.last_interaction ? `- Dernière interaction: ${lead_info.last_interaction}` : ''}

TON: ${tone || 'professionnel et amical'}
${user_signature ? `\nSIGNATURE:\n${user_signature.name}\n${user_signature.title}\n${user_signature.company}` : ''}

CONSIGNES:
- Email personnalisé et adapté au secteur
- Ton ${tone || 'professionnel et amical'}
- Message concis (200-300 mots)
- Appel à l'action clair
- Valeur ajoutée évidente

Réponds en JSON strict:
{
  "subject": "Objet percutant",
  "body": "Corps de l'email avec paragraphes",
  "cta": "Appel à l'action"
}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    });

    let content = message.content[0].text.trim();
    content = content.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    const parsed = JSON.parse(content);

    console.log(' Email rapide généré');

    res.json({
      success: true,
      email: parsed,
      template_type
    });

  } catch (error) {
    console.error(' Erreur génération email rapide:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la génération',
      details: error.message 
    });
  }
});

// POST /asefi/suggest-next-action - Suggérer prochaine action (bonus!)
router.post('/suggest-next-action', authMiddleware, async (req, res) => {
  console.log(' Suggestion prochaine action');
  
  try {
    const { lead_info, interaction_history } = req.body;

    const prompt = `Tu es Asefi, assistant IA stratégique pour LeadSynch CRM. Analyse ce lead et suggère la meilleure prochaine action.

LEAD:
- Entreprise: ${lead_info.company_name}
- Secteur: ${lead_info.industry}
- Statut: ${lead_info.status}
- Score: ${lead_info.score || 'N/A'}/100

HISTORIQUE D'INTERACTIONS:
${interaction_history || 'Aucune interaction précédente'}

Analyse et réponds en JSON:
{
  "recommended_action": "call|email|meeting|wait",
  "reason": "Explication courte",
  "suggested_message": "Suggestion de message si applicable",
  "best_time": "Meilleur moment pour contacter",
  "priority": "high|medium|low"
}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    });

    let content = message.content[0].text.trim();
    content = content.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    const parsed = JSON.parse(content);

    res.json({
      success: true,
      suggestion: parsed
    });

  } catch (error) {
    console.error(' Erreur suggestion action:', error);
    res.status(500).json({ 
      error: 'Erreur lors de l\'analyse',
      details: error.message 
    });
  }
});

export default router;
