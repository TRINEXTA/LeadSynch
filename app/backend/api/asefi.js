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

    const { prompt, isFirstMessage } = req.body;
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const userRole = req.user.role;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt requis' });
    }

    // ===== RÉCUPÉRER LES INFOS COMPLÈTES DE L'UTILISATEUR =====
    const userInfoQuery = await queryOne(
      `SELECT id, email, first_name, last_name, role, created_at
       FROM users
       WHERE id = $1 AND tenant_id = $2`,
      [userId, tenantId]
    );

    const userInfo = userInfoQuery || {};
    const firstName = userInfo.first_name || 'Utilisateur';
    const lastName = userInfo.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();

    // ===== ALIMENTER LE CONTEXTE AVEC VRAIES DONNÉES =====

    // Stats globales du tenant (pour admin) ou personnelles (pour commercial/manager)
    const statsQuery = await query(
      `SELECT
        COUNT(*) FILTER (WHERE l.tenant_id = $1 ${userRole !== 'admin' ? 'AND l.assigned_to = $2' : ''}) as total_leads,
        COUNT(*) FILTER (WHERE l.status = 'qualifie' AND l.tenant_id = $1 ${userRole !== 'admin' ? 'AND l.assigned_to = $2' : ''}) as qualified_leads,
        COUNT(*) FILTER (WHERE l.status = 'gagne' AND l.tenant_id = $1 ${userRole !== 'admin' ? 'AND l.assigned_to = $2' : ''}) as won_leads
      FROM leads l
      WHERE l.tenant_id = $1 ${userRole !== 'admin' ? 'AND l.assigned_to = $2' : ''}`,
      userRole !== 'admin' ? [tenantId, userId] : [tenantId]
    );

    const stats = statsQuery.rows[0] || {};

    // SES campagnes actives (créées par lui ou assigné)
    const userCampaignsQuery = await query(
      `SELECT id, name, type, status, created_at
      FROM campaigns
      WHERE tenant_id = $1
        AND (created_by = $2 OR assigned_users @> $3::jsonb)
        AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 3`,
      [tenantId, userId, JSON.stringify([userId])]
    );

    const userCampaigns = userCampaignsQuery.rows || [];

    // SES leads assignés récents (5 derniers)
    const userLeadsQuery = await query(
      `SELECT company_name, status, sector, created_at
      FROM leads
      WHERE tenant_id = $1 AND assigned_to = $2
      ORDER BY created_at DESC
      LIMIT 5`,
      [tenantId, userId]
    );

    const userLeads = userLeadsQuery.rows || [];

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

👤 UTILISATEUR CONNECTÉ:
- Nom: ${fullName}
- Rôle: ${userRole}
- Email: ${userInfo.email || ''}

🎯 TU ES UN ASSISTANT IA INTELLIGENT ET CONVERSATIONNEL comme ChatGPT, mais spécialisé dans LeadSynch.

💡 COMPORTEMENT:
- Tu DOIS saluer l'utilisateur par son prénom "${firstName}" lors du premier message
- Être proactif : mentionner ses campagnes actives si pertinent
- Avoir une vraie conversation naturelle, pas robotique
- Rester dans l'univers LeadSynch (leads, campagnes, devis, pipeline, etc.)
- Être amical, professionnel et utile

📊 CONTEXTE UTILISATEUR EN TEMPS RÉEL:
${userRole === 'admin' ? '- Leads totaux (toute l\'équipe)' : '- Mes leads assignés'}: ${stats.total_leads || 0}
- Leads qualifiés: ${stats.qualified_lead || 0}
- Deals gagnés: ${stats.won_leads || 0}

${userCampaigns.length > 0 ? `📢 Mes campagnes actives:
${userCampaigns.map((c, i) => `${i + 1}. "${c.name}" (${c.type}) - ${c.status}`).join('\n')}` : ''}

${userLeads.length > 0 ? `📋 Mes leads récents:
${userLeads.map((l, i) => `${i + 1}. ${l.company_name} - ${l.sector || 'Non spécifié'} - ${l.status}`).join('\n')}` : ''}

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

🔒 RÈGLES DE PERMISSIONS ET SÉCURITÉ:

✅ TU PEUX accéder à:
- Informations PUBLIQUES: Tarifs, fonctionnalités, tutoriels (accessible à tous)
- SES PROPRES données: "${firstName}" peut voir/demander SES campagnes, SES leads, SES devis, SON pipeline
- Données de l'équipe si ADMIN: Si ${userRole} = "admin", accès à toutes les données du tenant

❌ TU NE PEUX PAS accéder à:
- Données d'AUTRES utilisateurs: Si ${firstName} demande "les devis de Pierre" et qu'il n'est pas admin → REFUSER poliment
- Données confidentielles inter-tenants: Jamais accès aux données d'autres entreprises

🛡️ COMMENT GÉRER LES DEMANDES:

Exemple 1 - Demande autorisée:
User: "Peux-tu voir mes devis envoyés ?"
Asefi: ✅ "Bien sûr ${firstName} ! Je vais regarder tes devis..." [faire requête DB pour userId]

Exemple 2 - Demande NON autorisée:
User (commercial): "Montre-moi les devis de Sophie"
Asefi: ❌ "Désolé ${firstName}, en tant que ${userRole}, je ne peux pas accéder aux données d'autres utilisateurs. Tu peux uniquement consulter tes propres informations. Si tu as besoin de ces données, contacte un administrateur."

Exemple 3 - Demande publique:
User: "Quels sont vos tarifs ?"
Asefi: ✅ "Nos tarifs sont..." [afficher tarifs ci-dessus]

Exemple 4 - Admin demande données équipe:
User (admin): "Combien de leads a généré Pierre ce mois ?"
Asefi: ✅ "Bien sûr, je regarde ça..." [faire requête car admin]

📧 CONTACT:
- Support technique: support@leadsynch.com
- Questions commerciales: contact@leadsynch.com

💡 COMMENT RÉPONDRE:
- Si c'est le PREMIER message (prompt commence par salutation simple), salue "${firstName}" et sois proactif
- Utilise les données temps réel ci-dessus quand c'est pertinent
- Aie une vraie conversation naturelle, pas des réponses robotiques
- Reste dans l'univers LeadSynch (ne réponds pas à des questions hors sujet type "qui a gagné le mondial 2022")
- Sois professionnel mais amical
- Adapte ton ton au rôle: admin = ton business, commercial = ton coaching/aide
- Si demande hors permission → explique clairement pourquoi tu ne peux pas`;

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

    console.log(`✅ Asefi réponse générée pour ${fullName} (${userRole})`);

    res.json({
      success: true,
      response: response,
      tokens_used: message.usage.input_tokens + message.usage.output_tokens,
      context_fed: {
        user_name: fullName,
        user_role: userRole,
        total_leads: stats.total_leads,
        user_campaigns: userCampaigns.length,
        user_leads: userLeads.length
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
