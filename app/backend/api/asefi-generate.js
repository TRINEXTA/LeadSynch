import { log, error, warn } from "../lib/logger.js";
﻿import express from 'express';
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
  log(' Requête reçue sur /asefi/generate');
  
  try {
    const { campaignType, objective, audience, tone, mainLink, meetingLink, signature } = req.body;

    if (!objective || !objective.trim()) {
      log(' Objectif manquant');
      return res.status(400).json({ error: 'Objectif requis' });
    }

    log(' Objectif valide, appel à Claude API...');

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

    log(' Envoi du prompt à Claude...');

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }]
    });

    log(' Réponse de Claude reçue');

    let content = message.content[0].text.trim();
    
    // Nettoyage du JSON
    content = content.replace(/```json/gi, '');
    content = content.replace(/```/g, '');
    content = content.trim();
    
    const parsed = JSON.parse(content);

    log(' Template généré avec succès');

    res.json({
      success: true,
      template: parsed
    });

  } catch (error) {
    error(' Erreur Asefi Generate:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la génération',
      details: error.message 
    });
  }
});

// POST /asefi/improve-text - Amélioration de texte (pour Mode Prospection)
router.post('/improve-text', authMiddleware, async (req, res) => {
  log(' Amélioration de texte avec Asefi');
  
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

    log(` Amélioration niveau ${userLevel}...`);

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: levelConfig.maxTokens,
      messages: [{ role: 'user', content: prompt }]
    });

    const improvedText = message.content[0].text.trim();

    log(' Texte amélioré avec succès');

    res.json({
      success: true,
      improved_text: improvedText,
      original_length: text.length,
      improved_length: improvedText.length,
      improvement_level: userLevel,
      tokens_used: message.usage.input_tokens + message.usage.output_tokens
    });

  } catch (error) {
    error(' Erreur amélioration texte:', error);
    res.status(500).json({ 
      error: 'Erreur lors de l\'amélioration',
      details: error.message 
    });
  }
});

// POST /asefi/generate-quick-email - Génération rapide email pour prospection
router.post('/generate-quick-email', authMiddleware, async (req, res) => {
  log(' Génération rapide email pour prospection');
  
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

    log(' Email rapide généré');

    res.json({
      success: true,
      email: parsed,
      template_type
    });

  } catch (error) {
    error(' Erreur génération email rapide:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la génération',
      details: error.message 
    });
  }
});

// POST /asefi/suggest-next-action - Suggérer prochaine action (bonus!)
router.post('/suggest-next-action', authMiddleware, async (req, res) => {
  log(' Suggestion prochaine action');
  
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
    error(' Erreur suggestion action:', error);
    res.status(500).json({ 
      error: 'Erreur lors de l\'analyse',
      details: error.message 
    });
  }
});

// POST /asefi/generate-email-from-notes - Génération email depuis notes d'appel
router.post('/generate-email-from-notes', authMiddleware, async (req, res) => {
  log('📧 Génération email depuis notes d\'appel avec Asefi');
  
  try {
    const { lead_info, call_notes, qualification, user_signature } = req.body;

    if (!lead_info || !call_notes) {
      return res.status(400).json({ error: 'lead_info et call_notes requis' });
    }

    // Définir le type d'email selon la qualification
    const emailTypes = {
      'qualifie': 'suivi commercial positif',
      'tres_qualifie': 'confirmation de RDV et préparation',
      'a_relancer': 'relance douce avec rappel des points évoqués',
      'proposition': 'envoi de proposition commerciale',
      'nrp': 'email de reprise de contact',
      'mauvais_contact': 'clarification des besoins',
    };

    const emailType = emailTypes[qualification] || 'suivi général';

    const prompt = `Tu es Asefi, assistant IA expert en communication commerciale pour LeadSynch CRM.

Je viens de terminer un appel téléphonique avec un prospect. Génère un email de suivi professionnel et personnalisé basé sur cet appel.

📞 CONTEXTE DE L'APPEL:

PROSPECT:
- Entreprise: ${lead_info.company_name}
- Contact: ${lead_info.contact_name || 'Contact principal'}
- Secteur: ${lead_info.industry || lead_info.sector || 'B2B'}
- Email: ${lead_info.email}
${lead_info.phone ? `- Téléphone: ${lead_info.phone}` : ''}
${lead_info.city ? `- Ville: ${lead_info.city}` : ''}

QUALIFICATION: ${qualification}
TYPE D'EMAIL À GÉNÉRER: ${emailType}

📝 NOTES DE L'APPEL:
${call_notes}

${user_signature ? `
👤 MA SIGNATURE:
${user_signature.name}${user_signature.title ? '\n' + user_signature.title : ''}
${user_signature.company}
${user_signature.email}${user_signature.phone ? '\n' + user_signature.phone : ''}
` : ''}

🎯 CONSIGNES DE GÉNÉRATION:

1. **Objet percutant**: Référence l'appel de manière naturelle et engageante
2. **Introduction chaleureuse**: Remercie pour l'échange et rappelle le contexte
3. **Corps personnalisé**: 
   - Synthétise les points clés discutés
   - Reprends les besoins/problématiques évoqués
   - Propose une valeur ajoutée concrète
   - Adapte le ton selon la qualification
4. **Appel à l'action clair**: Selon le type d'email
5. **Signature professionnelle**: Intègre mes coordonnées

TON: Professionnel mais humain, personnalisé, orienté solution

IMPORTANT:
- Utilise des détails PRÉCIS des notes d'appel
- Ne mentionne JAMAIS explicitement "suite à notre appel" si les notes sont vides
- Adapte la longueur selon l'importance (200-400 mots)
- Si RDV pris, propose une date/horaire
- Sois naturel et authentique

Réponds en JSON strict sans markdown:
{
  "subject": "Objet de l'email",
  "body": "Corps complet de l'email avec paragraphes bien structurés",
  "cta": "Appel à l'action principal",
  "tone_used": "Description du ton utilisé",
  "suggestions": ["Suggestion 1", "Suggestion 2"]
}`;

    log('🤖 Appel à Claude API pour génération email...');

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }]
    });

    let content = message.content[0].text.trim();
    content = content.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    const parsed = JSON.parse(content);

    log('✅ Email généré avec succès depuis notes d\'appel');

    res.json({
      success: true,
      email: parsed,
      tokens_used: message.usage.input_tokens + message.usage.output_tokens,
      call_notes_length: call_notes.length
    });

  } catch (error) {
    error('❌ Erreur génération email depuis notes:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la génération de l\'email',
      details: error.message 
    });
  }
});
// POST /asefi/regenerate-email-with-tone - Régénérer email avec nouveau ton
router.post('/regenerate-email-with-tone', authMiddleware, async (req, res) => {
  log('🎨 Régénération email avec nouveau ton');
  
  try {
    const { lead_info, call_notes, qualification, tone, user_signature } = req.body;

    if (!lead_info || !call_notes || !tone) {
      return res.status(400).json({ error: 'lead_info, call_notes et tone requis' });
    }

    const toneDescriptions = {
      formal: 'très formel, professionnel et distant, style corporate strict',
      friendly: 'amical, chaleureux et proche, tout en restant professionnel',
      direct: 'direct, concis et efficace, va droit au but sans fioritures',
      enthusiastic: 'enthousiaste, énergique et motivant, montre beaucoup d\'entrain'
    };

    const toneDesc = toneDescriptions[tone] || toneDescriptions.friendly;

    const emailTypes = {
      'qualifie': 'suivi commercial positif',
      'tres_qualifie': 'confirmation de RDV et préparation',
      'a_relancer': 'relance douce avec rappel des points évoqués',
      'proposition': 'envoi de proposition commerciale',
      'nrp': 'email de reprise de contact',
      'mauvais_contact': 'clarification des besoins',
    };

    const emailType = emailTypes[qualification] || 'suivi général';

    const prompt = `Tu es Asefi, assistant IA expert en communication commerciale pour LeadSynch CRM.

Je viens de terminer un appel téléphonique avec un prospect. Génère un email de suivi professionnel et personnalisé.

📞 CONTEXTE DE L'APPEL:

PROSPECT:
- Entreprise: ${lead_info.company_name}
- Contact: ${lead_info.contact_name || 'Contact principal'}
- Secteur: ${lead_info.industry || lead_info.sector || 'B2B'}
- Email: ${lead_info.email}

QUALIFICATION: ${qualification}
TYPE D'EMAIL: ${emailType}

📝 NOTES DE L'APPEL:
${call_notes}

🎨 TON DEMANDÉ: ${toneDesc}

${user_signature ? `
👤 MA SIGNATURE:
${user_signature.name}${user_signature.title ? '\n' + user_signature.title : ''}
${user_signature.company}
${user_signature.email}${user_signature.phone ? '\n' + user_signature.phone : ''}
` : ''}

🎯 CONSIGNES CRITIQUES:

1. **Ton ${tone}**: Adapte COMPLÈTEMENT le style et la tonalité selon: ${toneDesc}
2. **Objet**: Change l'objet pour refléter le nouveau ton
3. **Structure**: Adapte la structure selon le ton (formel = structure classique, direct = paragraphes courts, etc.)
4. **Vocabulaire**: Choisis des mots qui correspondent au ton demandé
5. **Personnalisation**: Utilise les détails précis des notes d'appel

IMPORTANT:
- Le ton doit être VRAIMENT différent de la version précédente
- Reste professionnel même avec un ton amical ou enthousiaste
- Garde les informations factuelles des notes
- Adapte la longueur selon le ton (direct = court, formel = plus développé)

Réponds en JSON strict sans markdown:
{
  "subject": "Objet adapté au ton ${tone}",
  "body": "Corps de l'email avec le ton ${tone}",
  "cta": "Appel à l'action adapté au ton",
  "tone_used": "${tone}",
  "suggestions": ["Suggestion 1", "Suggestion 2"]
}`;

    log(`🤖 Régénération avec ton: ${tone}`);

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.8,
      messages: [{ role: 'user', content: prompt }]
    });

    let content = message.content[0].text.trim();
    content = content.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    const parsed = JSON.parse(content);

    log(`✅ Email régénéré avec ton ${tone}`);

    res.json({
      success: true,
      email: parsed,
      tone_applied: tone,
      tokens_used: message.usage.input_tokens + message.usage.output_tokens
    });

  } catch (error) {
    error('❌ Erreur régénération avec ton:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la régénération',
      details: error.message 
    });
  }
});

// POST /asefi/generate-email-template - Génération template email HTML complet
router.post('/generate-email-template', authMiddleware, async (req, res) => {
  log('📧 Génération template email HTML avec Asefi');

  try {
    const { prompt, tone, target, subject } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Description (prompt) requise' });
    }

    if (!subject || !subject.trim()) {
      return res.status(400).json({ error: 'Sujet requis' });
    }

    const toneDescriptions = {
      professional: 'professionnel et formel',
      friendly: 'amical et chaleureux',
      persuasive: 'persuasif et convaincant',
      informative: 'informatif et éducatif',
      urgent: 'urgent et pressant'
    };

    const toneDesc = toneDescriptions[tone] || 'professionnel';

    const emailPrompt = `Tu es Asefi, assistant IA expert en email marketing pour LeadSynch CRM.

Génère un template email HTML professionnel et moderne basé sur ces informations:

SUJET DE L'EMAIL: ${subject}

DESCRIPTION/OBJECTIF:
${prompt}

AUDIENCE CIBLE: ${target || 'Professionnels B2B'}

TON DEMANDÉ: ${toneDesc}

CONSIGNES DE GÉNÉRATION:

1. **Structure HTML complète** avec:
   - Doctype HTML5
   - Meta charset UTF-8
   - Meta viewport pour mobile
   - Styles inline (compatibilité email clients)

2. **Design moderne**:
   - Largeur max 600px centrée
   - Couleurs professionnelles (bleu #2563eb comme accent)
   - Police Arial/sans-serif
   - Espacement aéré
   - Bouton CTA visible et cliquable

3. **Contenu structuré**:
   - En-tête avec logo placeholder {{LOGO_URL}}
   - Corps avec paragraphes bien espacés
   - Variables de personnalisation: {{COMPANY_NAME}}, {{CONTACT_NAME}}, {{SENDER_NAME}}, {{SENDER_COMPANY}}
   - Bouton CTA avec lien placeholder {{CTA_URL}}
   - Pied de page avec signature et lien de désinscription {{UNSUBSCRIBE_URL}}

4. **Compatibilité**:
   - Tables pour la mise en page (compatibilité Outlook)
   - Styles inline uniquement
   - Images avec alt text

5. **Ton ${toneDesc}**: Adapte le style d'écriture au ton demandé

IMPORTANT:
- Génère UNIQUEMENT le code HTML complet
- Pas d'explications, pas de markdown, pas de backticks
- Le HTML doit être prêt à l'emploi
- Inclus les variables de personnalisation avec la syntaxe {{VARIABLE}}`;

    log('🤖 Appel à Claude API pour génération template HTML...');

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      temperature: 0.7,
      messages: [{ role: 'user', content: emailPrompt }]
    });

    let htmlContent = message.content[0].text.trim();

    // Nettoyage si Claude a ajouté des backticks
    htmlContent = htmlContent.replace(/```html/gi, '');
    htmlContent = htmlContent.replace(/```/g, '');
    htmlContent = htmlContent.trim();

    // Vérifier que c'est bien du HTML
    if (!htmlContent.toLowerCase().includes('<!doctype') && !htmlContent.toLowerCase().includes('<html')) {
      // Envelopper dans une structure HTML basique si nécessaire
      htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  ${htmlContent}
</body>
</html>`;
    }

    log('✅ Template HTML généré avec succès');

    res.json({
      success: true,
      html: htmlContent,
      tokens_used: message.usage.input_tokens + message.usage.output_tokens
    });

  } catch (err) {
    error('❌ Erreur génération template email:', err);
    res.status(500).json({
      error: 'Erreur lors de la génération du template',
      details: err.message
    });
  }
});

export default router;
