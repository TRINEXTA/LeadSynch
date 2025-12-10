/**
 * Générateur de Templates de Relance par Asefi
 * Analyse le contenu original de la campagne et génère des emails
 * de relance personnalisés selon le comportement du destinataire.
 *
 * @module followUpTemplateGenerator
 */

import { log, error, warn } from "./logger.js";
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Extrait les informations clés d'un template HTML
 * @param {string} htmlContent - Contenu HTML du template original
 * @returns {object} - Informations extraites
 */
function analyzeOriginalTemplate(htmlContent) {
  const analysis = {
    hasLinks: false,
    links: [],
    mainCTA: null,
    tone: 'professional', // default
    hasImages: false,
    approximateLength: 'medium'
  };

  // Extraire les liens
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
  let match;
  while ((match = linkRegex.exec(htmlContent)) !== null) {
    if (!match[1].includes('unsubscribe') && !match[1].includes('track')) {
      analysis.links.push({
        url: match[1],
        text: match[2].trim()
      });
      analysis.hasLinks = true;
    }
  }

  // Identifier le CTA principal (généralement le premier bouton ou lien avec des mots-clés)
  const ctaKeywords = ['découvrir', 'voir', 'commencer', 'essayer', 'profiter', 'réserver', 'contacter', 'télécharger', 'demander', 'obtenir'];
  for (const link of analysis.links) {
    const linkTextLower = link.text.toLowerCase();
    if (ctaKeywords.some(kw => linkTextLower.includes(kw))) {
      analysis.mainCTA = link;
      break;
    }
  }
  if (!analysis.mainCTA && analysis.links.length > 0) {
    analysis.mainCTA = analysis.links[0];
  }

  // Vérifier les images
  analysis.hasImages = /<img[^>]+>/i.test(htmlContent);

  // Analyser le ton (simplifié)
  const formalIndicators = ['nous vous', 'cordialement', 'sincères salutations', 'veuillez'];
  const casualIndicators = ['salut', 'hey', 'super', 'cool', 'top'];

  const contentLower = htmlContent.toLowerCase();
  const formalScore = formalIndicators.filter(w => contentLower.includes(w)).length;
  const casualScore = casualIndicators.filter(w => contentLower.includes(w)).length;

  if (casualScore > formalScore) {
    analysis.tone = 'casual';
  } else if (formalScore > 2) {
    analysis.tone = 'formal';
  }

  // Longueur approximative
  const textOnly = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (textOnly.length < 500) {
    analysis.approximateLength = 'short';
  } else if (textOnly.length > 1500) {
    analysis.approximateLength = 'long';
  }

  return analysis;
}

/**
 * Génère les templates de relance avec Asefi
 *
 * @param {object} params - Paramètres de génération
 * @param {string} params.originalSubject - Sujet de l'email original
 * @param {string} params.originalHtml - Contenu HTML de l'email original
 * @param {string} params.campaignObjective - Objectif de la campagne
 * @param {string} params.companyName - Nom de l'entreprise
 * @param {number} params.followUpCount - Nombre de relances (1 ou 2)
 * @param {number} params.delayDays - Délai entre les relances
 * @returns {object} - Templates générés pour chaque type de relance
 */
export async function generateFollowUpTemplates(params) {
  const {
    originalSubject,
    originalHtml,
    campaignObjective = '',
    companyName = 'Notre entreprise',
    followUpCount = 2,
    delayDays = 3
  } = params;

  // Analyser le template original
  const templateAnalysis = analyzeOriginalTemplate(originalHtml);

  log('🔍 Analyse du template original:', JSON.stringify(templateAnalysis, null, 2));

  const prompt = `Tu es Asefi, l'assistant IA expert en email marketing de LeadSynch. Tu dois générer des emails de RELANCE personnalisés et intelligents.

## CONTEXTE DE LA CAMPAGNE ORIGINALE

**Sujet original:** ${originalSubject}

**Objectif de la campagne:** ${campaignObjective || 'Non spécifié'}

**Entreprise:** ${companyName}

**Analyse du template original:**
- Ton utilisé: ${templateAnalysis.tone}
- Contient des liens: ${templateAnalysis.hasLinks ? 'Oui' : 'Non'}
- CTA principal: ${templateAnalysis.mainCTA ? templateAnalysis.mainCTA.text : 'Aucun'}
- URL du CTA: ${templateAnalysis.mainCTA ? templateAnalysis.mainCTA.url : 'Aucune'}
- Longueur: ${templateAnalysis.approximateLength}

**Contenu original (HTML):**
\`\`\`html
${originalHtml.substring(0, 3000)}${originalHtml.length > 3000 ? '...[tronqué]' : ''}
\`\`\`

## TA MISSION

Génère ${followUpCount === 2 ? 'DEUX' : 'UN'} template(s) de relance :

${followUpCount >= 1 ? `### RELANCE 1 - "OUVERT MAIS PAS CLIQUÉ"
Pour les personnes qui ont OUVERT l'email mais n'ont PAS cliqué sur le lien.
- Ils ont montré de l'intérêt (ouverture)
- Mais quelque chose les a empêchés d'agir
- Rappelle-leur le bénéfice principal
- Reformule l'offre de manière différente
- Le délai depuis l'envoi: ${delayDays} jours
- Ton: Bienveillant, rappel amical "Suite à notre précédent message..."` : ''}

${followUpCount === 2 ? `### RELANCE 2 - "PAS OUVERT DU TOUT" (MESSAGE DE RAPPEL CLAIR)
Pour les personnes qui N'ONT PAS ouvert l'email du tout.
OBJECTIF: Capter leur attention avec un sujet complètement différent

STRUCTURE OBLIGATOIRE DU MESSAGE:
1. Sujet: Nouveau, intrigant, ne doit PAS ressembler au premier (ex: question, curiosité)
2. Accroche: Mentionner clairement que c'est un rappel car le premier message n'a pas été ouvert
   - Exemple: "Je me permets de vous recontacter car mon précédent message est peut-être passé inaperçu..."
   - Exemple: "Votre boîte mail étant sûrement très sollicitée, je souhaitais m'assurer que vous aviez bien reçu notre proposition..."
3. Rappel concis: Résumer en 2-3 lignes la proposition principale
4. CTA clair: Bouton/lien d'action avec bénéfice explicite
5. Ton: Compréhensif et non intrusif, pas de pression

INTERDICTIONS:
- Ne PAS copier le premier email
- Ne PAS utiliser le même sujet ou une variante proche
- Ne PAS utiliser de tons culpabilisants ("Vous n'avez pas ouvert...")
- Ne PAS être trop insistant ou agressif

Le délai depuis l'envoi: ${delayDays} jours (les deux relances peuvent démarrer en parallèle)` : ''}

## EXIGENCES TECHNIQUES

1. **HTML responsive** (max 600px width, table-based)
2. **Inline CSS** pour compatibilité email
3. **Variables dynamiques**: Utiliser {{contact_name}} qui sera remplacé par le nom du contact OU le nom de l'entreprise automatiquement
4. **Même style visuel** que l'original (couleurs, police)
5. **Inclure le même CTA/lien** que l'original si pertinent

## EXIGENCES ANTI-SPAM CRITIQUES (TRÈS IMPORTANT)

1. **PAS de MAJUSCULES excessives** (éviter "URGENT", "GRATUIT", "OFFRE")
2. **PAS de mots spam** : gratuit, urgent, offre exclusive, dernière chance, limité, gagnez, promotion
3. **PAS de ponctuation excessive** (éviter "!!!", "???", "...")
4. **PAS de couleurs agressives** (éviter rouge vif, orange fluo pour le texte)
5. **Ratio texte/image équilibré** - privilégier le texte
6. **Sujet naturel et conversationnel** - comme un email humain
7. **Éviter les liens suspects** - garder le même domaine que l'original
8. **Signature professionnelle** sobre

## GESTION DES NOMS (CRITIQUE)

- Certains contacts n'ont PAS de nom, seulement une entreprise
- Utiliser {{contact_name}} qui affichera automatiquement:
  - Le nom du contact s'il existe
  - OU le nom de l'entreprise sinon
  - OU rien si aucun des deux
- EXEMPLE CORRECT: "Bonjour {{contact_name}}," qui devient "Bonjour Jean," ou "Bonjour Acme Corp," ou "Bonjour,"
- NE JAMAIS écrire "Bonjour {{contact_name}} de {{company}}" car ce serait redondant

## EXIGENCES MARKETING

1. **Ne jamais copier** l'email original - Reformuler complètement
2. **Référencer subtilement** l'email précédent ("Suite à notre message...", "Il y a quelques jours...")
3. **Créer un sentiment d'opportunité** pas de pression agressive
4. **Garder le même ton** (${templateAnalysis.tone})
5. **Email plus court** que l'original (on relance, pas on répète)
6. **Ton humain et naturel** - éviter le marketing agressif

## FORMAT DE RÉPONSE

Réponds UNIQUEMENT avec un JSON valide (pas de markdown autour):
{
  "opened_not_clicked": {
    "subject": "Sujet accrocheur pour ceux qui ont ouvert (max 60 caractères)",
    "preview_text": "Texte de prévisualisation (max 100 caractères)",
    "html": "Code HTML complet du template de relance"
  }${followUpCount === 2 ? `,
  "not_opened": {
    "subject": "Sujet intrigant pour ceux qui n'ont pas ouvert (max 60 caractères)",
    "preview_text": "Texte de prévisualisation (max 100 caractères)",
    "html": "Code HTML complet du template de relance"
  }` : ''}
}`;

  try {
    log('🤖 [ASEFI] Génération des templates de relance...');

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const responseText = message.content[0].text;

    // Parser la réponse JSON
    let result;
    try {
      // Extraire le JSON si entouré de markdown
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = JSON.parse(responseText);
      }
    } catch (parseError) {
      error('❌ [ASEFI] Erreur parsing JSON:', parseError);
      error('Réponse brute:', responseText.substring(0, 500));
      throw new Error('Format de réponse invalide de Asefi');
    }

    log('✅ [ASEFI] Templates de relance générés avec succès !');

    // Valider la structure de la réponse
    if (!result.opened_not_clicked) {
      throw new Error('Template "opened_not_clicked" manquant dans la réponse');
    }

    if (followUpCount === 2 && !result.not_opened) {
      throw new Error('Template "not_opened" manquant dans la réponse');
    }

    return {
      templates: result,
      analysis: templateAnalysis,
      generated_at: new Date().toISOString()
    };

  } catch (err) {
    error('❌ [ASEFI] Erreur génération relances:', err);
    throw err;
  }
}

/**
 * Régénère un seul template de relance
 *
 * @param {object} params - Paramètres
 * @param {string} params.targetAudience - 'opened_not_clicked' ou 'not_opened'
 * @param {string} params.originalSubject - Sujet original
 * @param {string} params.originalHtml - HTML original
 * @param {string} params.previousTemplate - Template précédemment généré à améliorer
 * @param {string} params.feedback - Feedback utilisateur pour amélioration
 * @returns {object} - Nouveau template
 */
export async function regenerateFollowUpTemplate(params) {
  const {
    targetAudience,
    originalSubject,
    originalHtml,
    previousTemplate,
    feedback = '',
    companyName = 'Notre entreprise'
  } = params;

  const audienceDescription = targetAudience === 'opened_not_clicked'
    ? 'personnes qui ont OUVERT mais PAS CLIQUÉ'
    : 'personnes qui N\'ONT PAS OUVERT du tout';

  const prompt = `Tu es Asefi, l'assistant IA expert en email marketing. Régénère ce template de relance selon le feedback.

## AUDIENCE CIBLE
${audienceDescription}

## EMAIL ORIGINAL
Sujet: ${originalSubject}
Entreprise: ${companyName}

## TEMPLATE PRÉCÉDEMMENT GÉNÉRÉ
Sujet: ${previousTemplate.subject}
HTML:
\`\`\`html
${previousTemplate.html}
\`\`\`

## FEEDBACK UTILISATEUR
${feedback || 'Améliore le template selon les bonnes pratiques marketing'}

## EXIGENCES
- Garde la structure HTML responsive (table-based, 600px max)
- Inline CSS
- Variables: {{contact_name}} (sera remplacé par nom contact OU nom entreprise automatiquement)
- Anti-spam optimisé: PAS de majuscules excessives, mots spam, ponctuation excessive
- Ton naturel et humain
- Prends en compte le feedback

Réponds UNIQUEMENT avec un JSON:
{
  "subject": "Nouveau sujet (max 60 caractères)",
  "preview_text": "Nouveau preview (max 100 caractères)",
  "html": "Nouveau code HTML"
}`;

  try {
    log(`🤖 [ASEFI] Régénération template "${targetAudience}"...`);

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    });

    const responseText = message.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const result = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);

    log('✅ [ASEFI] Template régénéré avec succès !');

    return {
      template: result,
      regenerated_at: new Date().toISOString()
    };

  } catch (err) {
    error('❌ [ASEFI] Erreur régénération:', err);
    throw err;
  }
}

/**
 * Analyse pourquoi les emails ne sont pas ouverts
 * et génère des recommandations
 *
 * @param {object} params - Paramètres d'analyse
 * @param {string} params.subject - Sujet de l'email
 * @param {number} params.sentCount - Nombre envoyé
 * @param {number} params.openedCount - Nombre ouvert
 * @param {string} params.senderName - Nom de l'expéditeur
 * @param {string} params.sendTime - Heure d'envoi habituelle
 * @returns {object} - Analyse et recommandations
 */
export async function analyzeDeliverabilityIssues(params) {
  const {
    subject,
    sentCount,
    openedCount,
    senderName = 'LeadSync',
    sendTime = '09:00'
  } = params;

  const openRate = sentCount > 0 ? ((openedCount / sentCount) * 100).toFixed(1) : 0;

  const prompt = `Tu es Asefi, expert en délivrabilité email. Analyse cette campagne et donne des recommandations.

## DONNÉES DE LA CAMPAGNE
- Sujet: "${subject}"
- Envoyés: ${sentCount}
- Ouverts: ${openedCount}
- Taux d'ouverture: ${openRate}%
- Expéditeur: ${senderName}
- Heure d'envoi: ${sendTime}

## ANALYSE DEMANDÉE
1. Pourquoi le taux d'ouverture est-il ${openRate < 15 ? 'faible' : openRate < 25 ? 'moyen' : 'correct'} ?
2. Le sujet est-il optimisé ?
3. Risques potentiels de spam ?
4. Recommandations concrètes

Réponds avec un JSON:
{
  "open_rate_assessment": "faible|moyen|bon|excellent",
  "subject_analysis": {
    "score": 1-10,
    "issues": ["problème 1", "problème 2"],
    "suggestions": ["suggestion 1", "suggestion 2"]
  },
  "spam_risk": {
    "level": "low|medium|high",
    "reasons": ["raison 1", "raison 2"]
  },
  "recommendations": [
    "Recommandation 1 actionnable",
    "Recommandation 2 actionnable"
  ],
  "improved_subject_suggestions": [
    "Nouveau sujet suggéré 1",
    "Nouveau sujet suggéré 2"
  ]
}`;

  try {
    log('🤖 [ASEFI] Analyse de délivrabilité...');

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    const responseText = message.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const result = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);

    log('✅ [ASEFI] Analyse terminée !');

    return {
      analysis: result,
      analyzed_at: new Date().toISOString()
    };

  } catch (err) {
    error('❌ [ASEFI] Erreur analyse:', err);
    throw err;
  }
}

export default {
  generateFollowUpTemplates,
  regenerateFollowUpTemplate,
  analyzeDeliverabilityIssues
};
