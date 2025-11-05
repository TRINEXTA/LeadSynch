import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Générer un template email HTML professionnel avec Claude
 * @param {object} params - Paramètres de génération
 * @returns {object} - {html, subject, preview_text}
 */
export async function generateEmailTemplate(params) {
  const {
    email_type = 'newsletter',
    tone = 'professional',
    objective = '',
    target_audience = '',
    company_name = '',
    product_service = '',
    call_to_action = '',
    additional_info = ''
  } = params;

  const prompt = `Tu es un expert en email marketing et copywriting commercial. Génère un template d'email HTML professionnel et performant.

CONTEXTE:
- Type d'email: ${email_type}
- Ton: ${tone}
- Objectif: ${objective}
- Audience cible: ${target_audience}
- Entreprise: ${company_name}
- Produit/Service: ${product_service}
- Call-to-action: ${call_to_action}
${additional_info ? `- Informations supplémentaires: ${additional_info}` : ''}

EXIGENCES TECHNIQUES:
1. HTML responsive (max 600px width)
2. Inline CSS (compatibilité email clients)
3. Structure table-based pour compatibilité
4. Images optimisées avec alt text
5. Boutons CTA bien visibles
6. Variables dynamiques: {{name}}, {{company}}, {{email}}
7. Design moderne et professionnel
8. Optimisé pour un score anti-spam de 90%+

EXIGENCES MARKETING:
1. Accroche percutante
2. Storytelling si approprié
3. Bénéfices clairs pour le lecteur
4. Call-to-action visible et incitatif
5. Personnalisation avec les variables
6. Ton adapté à l'audience

IMPORTANT:
- Évite les mots spam (FREE, URGENT, WINNER, etc.)
- Pas de majuscules excessives
- Ratio texte/liens équilibré
- Footer professionnel

Réponds UNIQUEMENT avec un JSON valide (pas de markdown):
{
  "subject": "Sujet de l'email (max 60 caractères, accrocheur)",
  "preview_text": "Texte de prévisualisation (max 100 caractères)",
  "html": "Code HTML complet du template"
}`;

  try {
    console.log('🤖 Génération du template avec Claude...');
    
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
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
      console.error('Erreur parsing JSON:', parseError);
      throw new Error('Format de réponse invalide de l\'IA');
    }

    console.log('✅ Template généré avec succès !');
    
    return {
      subject: result.subject,
      preview_text: result.preview_text,
      html: result.html,
      generated_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Erreur génération IA:', error);
    throw error;
  }
}

/**
 * Améliorer un template existant
 */
export async function improveEmailTemplate(currentHtml, improvementRequest) {
  const prompt = `Tu es un expert en email marketing. Améliore ce template HTML selon la demande.

TEMPLATE ACTUEL:
${currentHtml}

DEMANDE D'AMÉLIORATION:
${improvementRequest}

CONTRAINTES:
- Garde la structure générale
- Améliore uniquement ce qui est demandé
- Maintiens la compatibilité email
- Optimise pour anti-spam

Réponds avec un JSON:
{
  "html": "Code HTML amélioré",
  "changes": "Liste des changements effectués"
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    });

    const responseText = message.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const result = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);

    return result;
  } catch (error) {
    console.error('❌ Erreur amélioration:', error);
    throw error;
  }
}

export default {
  generateEmailTemplate,
  improveEmailTemplate
};
