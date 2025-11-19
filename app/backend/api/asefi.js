import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { authMiddleware } from '../middleware/auth.js';
import { query, queryOne } from '../lib/db.js';

const router = express.Router();

// Vérifier que la clé API est configurée
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('⚠️ ANTHROPIC_API_KEY non configurée dans les variables d\'environnement');
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'dummy-key-for-error-handling',
});

// POST / - Chatbot Asefi intelligent (s'alimente des vraies données)
router.post('/', authMiddleware, async (req, res) => {
  console.log('💬 Asefi chatbot - Question utilisateur');

  try {
    // Vérifier la clé API
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'dummy-key-for-error-handling') {
      console.error('❌ ANTHROPIC_API_KEY manquante');
      return res.status(500).json({
        error: 'Configuration IA manquante. Contactez le support.',
        details: 'ANTHROPIC_API_KEY non configurée'
      });
    }

    const { prompt } = req.body;
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const userRole = req.user.role;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt requis' });
    }

    // ===== ALIMENTER LE CONTEXTE AVEC VRAIES DONNÉES =====

    // Stats de l'utilisateur
    const statsQuery = await query(
      `SELECT
        COUNT(*) FILTER (WHERE l.tenant_id = $1) as total_leads,
        COUNT(*) FILTER (WHERE l.status = 'qualifie' AND l.tenant_id = $1) as qualified_leads,
        COUNT(*) FILTER (WHERE l.status = 'gagne' AND l.tenant_id = $1) as won_leads
      FROM leads l
      WHERE l.tenant_id = $1`,
      [tenantId]
    );

    const stats = statsQuery.rows[0] || {};

    // Campagnes actives
    const campaignsQuery = await query(
      `SELECT COUNT(*) as active_campaigns
      FROM campaigns
      WHERE tenant_id = $1 AND status = 'active'`,
      [tenantId]
    );

    const campaigns = campaignsQuery.rows[0] || {};

    // Leads récents (5 derniers)
    const recentLeadsQuery = await query(
      `SELECT company_name, status, sector, created_at
      FROM leads
      WHERE tenant_id = $1
      ORDER BY created_at DESC
      LIMIT 5`,
      [tenantId]
    );

    const recentLeads = recentLeadsQuery.rows || [];

    // ===== RÉCUPÉRER LES VRAIS SERVICES/TARIFS DEPUIS LA DB (AUTONOME) =====
    const servicesQuery = await query(
      `SELECT name, description, category, base_price, currency, billing_cycle, features
       FROM services
       WHERE tenant_id = $1 AND is_active = true AND category = 'subscription'
       ORDER BY base_price ASC`,
      [tenantId]
    );

    const services = servicesQuery.rows || [];

    console.log(`📊 ${services.length} services/tarifs récupérés depuis la DB`);

    // ===== CONSTRUIRE LE CONTEXTE DYNAMIQUE =====

    const dynamicContext = `Tu es Asefi, l'assistant IA intelligent et autonome de LeadSynch - Plateforme CRM B2B.

TU ES UN ASSISTANT IA COMPLET ET UTILE. Tu peux :
- Répondre aux questions générales sur LeadSynch avec tes connaissances
- Aider l'utilisateur à comprendre les fonctionnalités
- Donner des conseils sur l'utilisation de la plateforme
- Être conversationnel, amical et professionnel

📊 DONNÉES TEMPS RÉEL DE L'UTILISATEUR (à utiliser quand pertinent):
- Rôle: ${userRole}
- Total leads: ${stats.total_leads || 0}
- Leads qualifiés: ${stats.qualified_leads || 0}
- Deals gagnés: ${stats.won_leads || 0}
- Campagnes actives: ${campaigns.active_campaigns || 0}

${recentLeads.length > 0 ? `Leads récents:
${recentLeads.map((l, i) => `${i + 1}. ${l.company_name} - ${l.sector || 'Non spécifié'} - ${l.status}`).join('\n')}` : ''}

💰 PLANS TARIFAIRES LEADSYNCH (VRAIS TARIFS OFFICIELS):

📦 **GRATUIT** - 0€/mois
• 30 leads/emails • 2 recherches Google Maps
• 1 devis/mois • 1 utilisateur • 1 campagne
• Pipeline basique + Import CSV

🚀 **STARTER** - 49€/mois
• 5000 leads/emails • Max 1000 prospects Google Maps
• 50 devis/mois, 30 contrats/mois
• 3 utilisateurs • 5 campagnes actives
• Pipeline avancé + Mode Prospection
• Asefi IA Basic (500 caractères)
• Support email + chat

⭐ **PRO** - 99€/mois (POPULAIRE)
• 20000 leads/emails • 2500 générations Google Maps
• 500 devis/mois, 200 contrats/mois
• 10 utilisateurs • Campagnes illimitées
• Asefi IA Pro (2000 caractères)
• Scoring automatique + Analytics avancés
• Support prioritaire 24/7 + API complète
• Intégrations (Zapier, Make) + Webhooks

🏢 **ENTERPRISE** - Sur mesure
• Quotas personnalisés selon besoins
• Asefi IA Enterprise (10k caractères)
• Infrastructure dédiée + Account manager
• SSO + SLA 99.9% + Développements sur-mesure

🔧 FONCTIONNALITÉS LEADSYNCH:
• Génération de leads (Google Maps + scraping web)
• Import CSV avec détection IA des secteurs
• Campagnes email/SMS avec tracking complet
• Pipeline Kanban drag & drop
• Scoring automatique des leads
• Templates email générés par IA
• Gestion multi-utilisateurs (admin/manager/commercial)
• Attribution géographique automatique

📧 CONTACT:
- Support technique: support@leadsynch.com
- Questions commerciales: contact@leadsynch.com

💡 COMMENT RÉPONDRE:
- Sois utile, conversationnel et précis
- Utilise les données temps réel ci-dessus quand c'est pertinent
- Pour le plan/quotas de l'utilisateur: si tu n'as pas l'info, suggère de contacter contact@leadsynch.com
- Réponds aux questions générales avec tes connaissances de l'IA
- Sois professionnel mais amical
- Adapte ton ton au rôle de l'utilisateur (${userRole})`;

    // ===== APPEL CLAUDE API =====

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514', // Claude Sonnet 4 (latest)
      max_tokens: 1500,
      temperature: 0.7,
      system: dynamicContext,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const response = message.content[0].text.trim();

    console.log('✅ Asefi réponse générée');

    res.json({
      success: true,
      response: response,
      tokens_used: message.usage.input_tokens + message.usage.output_tokens,
      context_fed: {
        total_leads: stats.total_leads,
        active_campaigns: campaigns.active_campaigns,
        user_role: userRole
      }
    });

  } catch (error) {
    console.error('❌ Erreur Asefi chatbot:', error);
    res.status(500).json({
      error: 'Erreur lors de la génération de la réponse',
      details: error.message
    });
  }
});

// POST /categorize - Catégoriser un lead avec l'IA
router.post('/categorize', authMiddleware, async (req, res) => {
  console.log('🏷️ Asefi categorization - Lead category detection');

  try {
    const { company_name, description, website, address } = req.body;

    if (!company_name || !company_name.trim()) {
      return res.status(400).json({ error: 'Nom de l\'entreprise requis' });
    }

    // Construire le contexte pour l'IA
    const contextParts = [
      `Nom de l'entreprise: ${company_name}`,
      description ? `Description: ${description}` : '',
      website ? `Site web: ${website}` : '',
      address ? `Adresse: ${address}` : ''
    ].filter(Boolean).join('\n');

    const prompt = `Analyse cette entreprise et détermine son secteur d'activité principal.

${contextParts}

Choisis UNE SEULE catégorie parmi :
- informatique
- comptabilite
- juridique
- sante
- btp
- hotellerie
- immobilier
- commerce
- logistique
- education
- consulting
- rh
- services
- industrie
- automobile
- autre

Réponds UNIQUEMENT avec le nom exact de la catégorie, sans explication.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 50,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const category = message.content[0].text.trim().toLowerCase();

    // Validation de la catégorie
    const validCategories = [
      'informatique', 'comptabilite', 'juridique', 'sante', 'btp',
      'hotellerie', 'immobilier', 'commerce', 'logistique', 'education',
      'consulting', 'rh', 'services', 'industrie', 'automobile', 'autre'
    ];

    const finalCategory = validCategories.includes(category) ? category : 'autre';

    console.log(`✅ Catégorie détectée: ${finalCategory}`);

    res.json({
      success: true,
      category: finalCategory,
      tokens_used: message.usage.input_tokens + message.usage.output_tokens
    });

  } catch (error) {
    console.error('❌ Erreur Asefi categorization:', error);
    res.status(500).json({
      error: 'Erreur lors de la catégorisation',
      details: error.message
    });
  }
});

export default router;
