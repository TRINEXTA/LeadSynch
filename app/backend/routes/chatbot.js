import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const router = express.Router();

// Vérifier que la clé API est configurée
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('⚠️ ========================================');
  console.error('⚠️ ANTHROPIC_API_KEY non configurée !');
  console.error('⚠️ Le chatbot website ne fonctionnera pas');
  console.error('⚠️ Configurez ANTHROPIC_API_KEY dans vos variables d\'environnement');
  console.error('⚠️ ========================================');
}

// Initialiser le client Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'sk-ant-dummy-key',
});

// Route pour poser une question au chatbot
router.post('/ask', async (req, res) => {
  try {
    // Vérifier la clé API
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'sk-ant-dummy-key') {
      console.error('❌ ANTHROPIC_API_KEY manquante - Le chatbot ne peut pas fonctionner');
      return res.status(503).json({
        error: 'Service IA temporairement indisponible',
        message: 'Le chatbot Asefi n\'est pas configuré. Veuillez contacter le support technique.',
        support_email: 'support@leadsynch.com',
        details: 'ANTHROPIC_API_KEY manquante en production'
      });
    }

    const { message, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message requis' });
    }

    // Contexte système pour Asefi
    const systemPrompt = `Tu es Asefi, l'assistant IA intelligent de LeadSynch (LIT5), une plateforme CRM de prospection B2B.

Ton rôle :
- Répondre aux questions sur LeadSynch de manière claire, concise et PRÉCISE
- Être amical, professionnel et serviable
- Guider les utilisateurs vers les bonnes pages du site
- Donner des infos EXACTES sur les fonctionnalités et tarifs

INFORMATIONS EXACTES SUR LEADSYNCH :

PLANS TARIFAIRES (CHIFFRES PRÉCIS - NE PAS SE TROMPER):
- GRATUIT: 30 leads/mois (PAS 60!)
- STARTER: 27€/mois - 500 leads
- PRO: 67€/mois - 2000 leads
- BUSINESS: 147€/mois - 10000 leads
- ENTREPRISE: Sur mesure - leads illimités

FONCTIONNALITÉS PRINCIPALES:
- Génération de leads via Google Maps + web scraping
- Import CSV avec détection automatique secteur par IA
- Campagnes email avec tracking (ouvertures, clics)
- Pipeline Kanban avec drag & drop
- Scoring automatique de leads
- Templates email générés par IA
- Gestion multi-utilisateurs (admin, manager, commercial)
- Secteurs géographiques avec assignation automatique
- Système demandes validation/aide pour managers

SUPPORT (ADRESSES EMAIL EXACTES):
- Problème technique avec l'application: support@leadsynch.com
- Demande d'information générale: contact@leadsynch.com
- Email envoi de campagnes: noreply@leadsynch.com
- Utilise TOUJOURS ces emails, pas d'autres

URLs IMPORTANTES :
- Inscription : /register
- Tarifs : /pricing
- Connexion : /login
- Fonctionnalités : /features

RÈGLES CRITIQUES :
1. Sois PRÉCIS sur les chiffres (30 leads gratuit, PAS 60)
2. Utilise UNIQUEMENT les emails @leadsynch.com
3. Différencie support@leadsynch.com (problèmes) vs contact@leadsynch.com (infos)
4. Reste concis (max 150 mots)
5. Si question complexe nécessitant intervention humaine, propose de remplir un formulaire de contact
6. Si tu ne sais pas, DIS-LE et propose de contacter le support
7. Sois enthousiaste mais professionnel`;

    // Construire l'historique de conversation
    const messages = [
      ...conversationHistory.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.text
      })),
      {
        role: 'user',
        content: message
      }
    ];

    // Appeler l'API Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: messages
    });

    const botResponse = response.content[0].text;

    res.json({ 
      success: true, 
      response: botResponse,
      usage: response.usage
    });

  } catch (error) {
    console.error('Erreur chatbot:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la communication avec Asefi',
      details: error.message 
    });
  }
});

export default router;
