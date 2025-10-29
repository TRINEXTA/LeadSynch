const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');

// Initialiser le client Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Route pour poser une question au chatbot
router.post('/ask', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message requis' });
    }

    // Contexte système pour Asefi
    const systemPrompt = `Tu es Asefi, l'assistant IA intelligent de LeadSynch, une plateforme CRM de prospection B2B.

Ton rôle :
- Répondre aux questions sur LeadSynch de manière claire et concise
- Être amical, professionnel et serviable
- Guider les utilisateurs vers les bonnes pages du site
- Donner des infos précises sur les fonctionnalités et tarifs

Informations clés sur LeadSynch :

PLANS TARIFAIRES :
- FREE : 0€/mois - 60 leads (10 générés + 50 importés), 100 emails/mois, 1 utilisateur
- BASIC : 49€/mois (39€/mois en annuel) - 1000 leads, 5000 emails/mois, 3 utilisateurs, Asefi IA Basic (500 caractères)
- PRO : 99€/mois (79€/mois en annuel) - 10k leads, 50k emails/mois, 10 utilisateurs, Asefi IA Pro (2000 caractères) - LE PLUS POPULAIRE
- ENTERPRISE : Sur mesure - Tout illimité, Asefi IA Enterprise (10k caractères)

FONCTIONNALITÉS :
- Génération de leads via Google Maps
- Enrichissement automatique des données (email, téléphone, secteur)
- Assistant IA pour rédiger des emails personnalisés
- Pipeline de prospection interactif
- Campagnes email automatisées
- Analytics et rapports en temps réel
- API REST (plans Pro+)
- Intégrations Zapier, Make.com

CONTACT :
- Email : contact@leadsync.fr
- Téléphone : +33 1 23 45 67 89
- Horaires : Lun-Ven 9h-18h

URLs IMPORTANTES :
- Inscription : /register
- Tarifs : /pricing
- Connexion : /login
- Accueil : /

RÈGLES :
- Reste toujours concis (max 150 mots par réponse)
- Utilise des emojis pour rendre tes réponses plus vivantes
- Si la question est trop complexe ou hors sujet, propose de contacter l'équipe
- Encourage toujours l'utilisateur à essayer le plan FREE gratuit
- Sois enthousiaste mais professionnel`;

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

module.exports = router;
