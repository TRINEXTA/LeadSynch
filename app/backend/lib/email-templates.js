import { log, error, warn } from "../lib/logger.js";
/**
 * Templates d'emails professionnels pré-remplis
 * Utilisables pour les campagnes et l'automatisation
 */

export const EMAIL_TEMPLATES = {
  // ===== PROSPECTION =====
  first_contact: {
    name: 'Premier contact - Présentation',
    subject: 'Bonjour {{company_name}} - Opportunité de collaboration',
    body: `Bonjour {{contact_first_name}},

Je me permets de vous contacter car j'ai remarqué votre activité dans le secteur {{sector}}.

Nous accompagnons des entreprises comme la vôtre à {{main_benefit}}.

Seriez-vous disponible pour un échange de 15 minutes cette semaine ?

Bien cordialement,
{{sender_name}}
{{sender_company}}
{{sender_phone}}`,
    variables: ['company_name', 'contact_first_name', 'sector', 'main_benefit', 'sender_name', 'sender_company', 'sender_phone']
  },

  follow_up_1: {
    name: 'Relance 1 - Rappel doux',
    subject: 'Re: {{company_name}} - Avez-vous eu le temps ?',
    body: `Bonjour {{contact_first_name}},

Je vous ai contacté il y a quelques jours concernant {{topic}}.

Je sais que votre emploi du temps est chargé, mais je reste convaincu que nous pourrions vous apporter de la valeur.

Auriez-vous 10 minutes cette semaine pour en discuter rapidement ?

Cordialement,
{{sender_name}}`,
    variables: ['contact_first_name', 'company_name', 'topic', 'sender_name']
  },

  follow_up_2: {
    name: 'Relance 2 - Valeur ajoutée',
    subject: '{{company_name}} - Dernier message de ma part',
    body: `Bonjour {{contact_first_name}},

C'est mon dernier message concernant {{topic}}.

Voici ce que nous pourrions faire ensemble :
• {{benefit_1}}
• {{benefit_2}}
• {{benefit_3}}

Si cela vous intéresse, répondez simplement "OUI" et je vous envoie plus d'informations.

Sinon, je ne vous dérangerai plus.

Cordialement,
{{sender_name}}`,
    variables: ['contact_first_name', 'company_name', 'topic', 'benefit_1', 'benefit_2', 'benefit_3', 'sender_name']
  },

  // ===== RDV & RÉUNIONS =====
  meeting_request: {
    name: 'Demande de rendez-vous',
    subject: 'Proposition de rendez-vous - {{company_name}}',
    body: `Bonjour {{contact_first_name}},

Suite à nos échanges, je vous propose de nous rencontrer pour discuter de {{topic}}.

Voici quelques créneaux disponibles :
• {{slot_1}}
• {{slot_2}}
• {{slot_3}}

Lequel vous conviendrait le mieux ?

Dans l'attente de votre retour,
{{sender_name}}
📅 Vous pouvez aussi réserver directement : {{booking_link}}`,
    variables: ['contact_first_name', 'company_name', 'topic', 'slot_1', 'slot_2', 'slot_3', 'sender_name', 'booking_link']
  },

  meeting_confirmation: {
    name: 'Confirmation de rendez-vous',
    subject: '✅ RDV confirmé le {{meeting_date}} - {{company_name}}',
    body: `Bonjour {{contact_first_name}},

Je vous confirme notre rendez-vous :

📅 Date : {{meeting_date}}
🕐 Heure : {{meeting_time}}
📍 Lieu : {{meeting_location}}
⏱️ Durée : {{meeting_duration}}

{{meeting_details}}

À très bientôt !

Cordialement,
{{sender_name}}
{{sender_phone}}`,
    variables: ['contact_first_name', 'company_name', 'meeting_date', 'meeting_time', 'meeting_location', 'meeting_duration', 'meeting_details', 'sender_name', 'sender_phone']
  },

  meeting_reminder: {
    name: 'Rappel de rendez-vous',
    subject: '🔔 Rappel RDV demain - {{company_name}}',
    body: `Bonjour {{contact_first_name}},

Je vous rappelle notre rendez-vous prévu demain :

📅 {{meeting_date}} à {{meeting_time}}
📍 {{meeting_location}}

J'ai hâte d'échanger avec vous !

À demain,
{{sender_name}}`,
    variables: ['contact_first_name', 'company_name', 'meeting_date', 'meeting_time', 'meeting_location', 'sender_name']
  },

  // ===== PROPOSITION & DEVIS =====
  quote_sending: {
    name: 'Envoi de devis',
    subject: 'Votre devis personnalisé - {{company_name}}',
    body: `Bonjour {{contact_first_name}},

Comme convenu, vous trouverez ci-joint votre devis personnalisé.

📋 Référence : {{quote_ref}}
💰 Montant : {{quote_amount}}€ HT
⏳ Validité : {{quote_validity}}

Points clés de notre proposition :
{{quote_highlights}}

Je reste à votre disposition pour toute question.

Cordialement,
{{sender_name}}
{{sender_phone}}`,
    variables: ['contact_first_name', 'company_name', 'quote_ref', 'quote_amount', 'quote_validity', 'quote_highlights', 'sender_name', 'sender_phone']
  },

  quote_follow_up: {
    name: 'Relance devis',
    subject: 'Re: Votre devis {{quote_ref}} - {{company_name}}',
    body: `Bonjour {{contact_first_name}},

Avez-vous eu l'occasion d'examiner le devis {{quote_ref}} que je vous ai envoyé le {{quote_sent_date}} ?

Je serais ravi d'en discuter avec vous et de répondre à vos éventuelles questions.

Le devis est valable jusqu'au {{quote_expiry_date}}.

Cordialement,
{{sender_name}}`,
    variables: ['contact_first_name', 'company_name', 'quote_ref', 'quote_sent_date', 'quote_expiry_date', 'sender_name']
  },

  // ===== CONTRATS & SIGNATURES =====
  contract_sending: {
    name: 'Envoi de contrat',
    subject: '📄 Votre contrat à signer - {{company_name}}',
    body: `Bonjour {{contact_first_name}},

Félicitations ! Nous sommes ravis de démarrer cette collaboration.

Vous trouverez ci-joint votre contrat à signer électroniquement :
🔗 {{signature_link}}

Une fois signé, nous pourrons démarrer dès {{start_date}}.

{{payment_details}}

Bienvenue parmi nos clients !

Cordialement,
{{sender_name}}`,
    variables: ['contact_first_name', 'company_name', 'signature_link', 'start_date', 'payment_details', 'sender_name']
  },

  // ===== FIDÉLISATION =====
  welcome: {
    name: 'Bienvenue nouveau client',
    subject: '🎉 Bienvenue {{company_name}} !',
    body: `Bonjour {{contact_first_name}},

Bienvenue parmi nos clients ! 🎊

Voici vos prochaines étapes :
1️⃣ {{step_1}}
2️⃣ {{step_2}}
3️⃣ {{step_3}}

Votre contact dédié : {{account_manager_name}}
📞 {{account_manager_phone}}
📧 {{account_manager_email}}

N'hésitez pas à nous contacter pour toute question.

Excellente journée !
{{sender_name}}`,
    variables: ['contact_first_name', 'company_name', 'step_1', 'step_2', 'step_3', 'account_manager_name', 'account_manager_phone', 'account_manager_email', 'sender_name']
  },

  check_in: {
    name: 'Prise de nouvelles',
    subject: 'Comment allez-vous {{contact_first_name}} ?',
    body: `Bonjour {{contact_first_name}},

Cela fait quelques semaines que nous collaborons ensemble, et je voulais prendre de vos nouvelles.

Êtes-vous satisfait de nos services ?
Y a-t-il quelque chose que nous pourrions améliorer ?

Votre feedback est précieux pour nous.

Bien cordialement,
{{sender_name}}`,
    variables: ['contact_first_name', 'sender_name']
  },

  // ===== ÉVÉNEMENTS =====
  event_invitation: {
    name: 'Invitation événement',
    subject: '🎪 Invitation exclusive - {{event_name}}',
    body: `Bonjour {{contact_first_name}},

Nous avons le plaisir de vous inviter à notre événement :

🎪 {{event_name}}
📅 {{event_date}}
🕐 {{event_time}}
📍 {{event_location}}

{{event_description}}

👉 Inscription : {{event_registration_link}}

Places limitées !

Au plaisir de vous y retrouver,
{{sender_name}}`,
    variables: ['contact_first_name', 'event_name', 'event_date', 'event_time', 'event_location', 'event_description', 'event_registration_link', 'sender_name']
  },

  // ===== INFORMATIF =====
  newsletter: {
    name: 'Newsletter mensuelle',
    subject: '📰 Newsletter {{month}} - {{company_name}}',
    body: `Bonjour {{contact_first_name}},

Voici les actualités du mois :

📌 {{news_1}}
📌 {{news_2}}
📌 {{news_3}}

💡 Astuce du mois :
{{tip_of_month}}

🔗 En savoir plus : {{blog_link}}

À bientôt,
{{sender_name}}

---
Vous ne souhaitez plus recevoir nos emails ? {{unsubscribe_link}}`,
    variables: ['contact_first_name', 'company_name', 'month', 'news_1', 'news_2', 'news_3', 'tip_of_month', 'blog_link', 'unsubscribe_link', 'sender_name']
  },

  // ===== RÉACTIVATION =====
  win_back: {
    name: 'Réactivation client inactif',
    subject: '{{contact_first_name}}, vous nous manquez !',
    body: `Bonjour {{contact_first_name}},

Cela fait un moment que nous n'avons pas eu de vos nouvelles...

Nous avons pensé à vous avec notre nouvelle offre {{special_offer}}.

{{offer_details}}

Valable jusqu'au {{offer_expiry_date}}.

Vous souhaitez en profiter ? Répondez simplement à cet email !

Cordialement,
{{sender_name}}`,
    variables: ['contact_first_name', 'special_offer', 'offer_details', 'offer_expiry_date', 'sender_name']
  },

  // ===== FACTURATION =====
  invoice: {
    name: 'Envoi de facture',
    subject: 'Facture N°{{invoice_number}} - {{company_name}}',
    body: `Bonjour {{contact_first_name}},

Veuillez trouver ci-joint votre facture N°{{invoice_number}}.

📋 Détails :
Montant HT : {{amount_ht}}€
TVA ({{vat_rate}}%) : {{vat_amount}}€
Montant TTC : {{amount_ttc}}€

💳 Échéance : {{payment_due_date}}

Pour tout règlement, merci d'utiliser les coordonnées bancaires indiquées sur la facture.

Nous restons à votre disposition pour toute question.

Cordialement,
{{sender_name}}
{{sender_company}}`,
    variables: ['contact_first_name', 'company_name', 'invoice_number', 'amount_ht', 'vat_rate', 'vat_amount', 'amount_ttc', 'payment_due_date', 'sender_name', 'sender_company']
  },

  payment_reminder: {
    name: 'Rappel de paiement',
    subject: 'Rappel - Facture N°{{invoice_number}} échue',
    body: `Bonjour {{contact_first_name}},

Nous constatons que la facture N°{{invoice_number}} d'un montant de {{amount_ttc}}€ TTC, échue le {{payment_due_date}}, n'a pas encore été réglée.

Il s'agit peut-être d'un oubli de votre part ?

Pourriez-vous procéder au règlement dans les meilleurs délais ou nous tenir informés en cas de problème ?

Merci de votre compréhension.

Cordialement,
{{sender_name}}
{{sender_company}}
{{sender_phone}}`,
    variables: ['contact_first_name', 'invoice_number', 'amount_ttc', 'payment_due_date', 'sender_name', 'sender_company', 'sender_phone']
  },

  // ===== REMERCIEMENT =====
  thank_you: {
    name: 'Remerciement',
    subject: 'Merci {{contact_first_name}} !',
    body: `Bonjour {{contact_first_name}},

Je tenais à vous remercier pour {{reason}}.

{{custom_message}}

C'est toujours un plaisir de travailler avec des partenaires comme vous !

Bien cordialement,
{{sender_name}}`,
    variables: ['contact_first_name', 'reason', 'custom_message', 'sender_name']
  },

  referral_request: {
    name: 'Demande de recommandation',
    subject: 'Pouvez-vous nous recommander ?',
    body: `Bonjour {{contact_first_name}},

Nous sommes ravis de collaborer avec vous depuis {{collaboration_duration}}.

Si vous êtes satisfait de nos services, accepteriez-vous de nous recommander à votre réseau ?

Cela nous aiderait énormément ! En retour, nous vous offrons {{referral_reward}}.

🔗 Lien de parrainage : {{referral_link}}

Merci d'avance pour votre confiance !

Cordialement,
{{sender_name}}`,
    variables: ['contact_first_name', 'collaboration_duration', 'referral_reward', 'referral_link', 'sender_name']
  },

  // ===== MISE À JOUR =====
  product_update: {
    name: 'Mise à jour produit',
    subject: '🚀 Nouvelle fonctionnalité - {{product_name}}',
    body: `Bonjour {{contact_first_name}},

Excellente nouvelle ! Nous venons de lancer {{feature_name}} sur {{product_name}}.

✨ Ce qui change pour vous :
{{feature_benefit_1}}
{{feature_benefit_2}}
{{feature_benefit_3}}

📚 Guide : {{documentation_link}}
🎥 Vidéo démo : {{video_link}}

Cette fonctionnalité est disponible dès maintenant dans votre espace.

Bonne découverte !

L'équipe {{sender_company}}`,
    variables: ['contact_first_name', 'product_name', 'feature_name', 'feature_benefit_1', 'feature_benefit_2', 'feature_benefit_3', 'documentation_link', 'video_link', 'sender_company']
  },

  seasonal_greeting: {
    name: 'Vœux saisonniers',
    subject: '{{greeting_occasion}} - {{company_name}}',
    body: `Bonjour {{contact_first_name}},

À l'occasion de {{greeting_occasion}}, toute l'équipe de {{sender_company}} vous adresse ses meilleurs vœux !

{{custom_greeting_message}}

Nous vous souhaitons {{wishes}}.

Merci pour votre confiance et à très bientôt !

Chaleureusement,
{{sender_name}} et toute l'équipe`,
    variables: ['contact_first_name', 'company_name', 'greeting_occasion', 'sender_company', 'custom_greeting_message', 'wishes', 'sender_name']
  }
};

/**
 * Mapping des synonymes de variables pour les prénoms/noms de contact
 * Permet de supporter {{PRENOM}}, {{prenom}}, {{contact_name}}, {{firstname}}, etc.
 */
const NAME_SYNONYMS = [
  'prenom', 'PRENOM', 'Prenom',
  'firstname', 'first_name', 'firstName',
  'contact_name', 'contact_first_name', 'contactName',
  'name', 'nom', 'NOM'
];

/**
 * Résout la valeur d'une variable en cherchant dans les synonymes si nécessaire
 * @param {string} variable - Nom de la variable dans le template
 * @param {object} data - Données disponibles
 * @returns {string|null} - Valeur trouvée ou null
 */
function resolveVariable(variable, data) {
  // D'abord essayer la variable exacte
  if (data[variable] !== undefined && data[variable] !== null && data[variable] !== '') {
    return data[variable];
  }

  // Essayer en minuscules
  const lowerVar = variable.toLowerCase();
  if (data[lowerVar] !== undefined && data[lowerVar] !== null && data[lowerVar] !== '') {
    return data[lowerVar];
  }

  // Si c'est une variable de type "prénom", chercher dans les synonymes
  if (NAME_SYNONYMS.some(syn => syn.toLowerCase() === lowerVar)) {
    for (const synonym of NAME_SYNONYMS) {
      if (data[synonym] !== undefined && data[synonym] !== null && data[synonym] !== '') {
        return data[synonym];
      }
    }
    // Chercher aussi contact_name qui est le champ standard
    if (data.contact_name) return data.contact_name;
    if (data.contact_first_name) return data.contact_first_name;
  }

  return null;
}

/**
 * Remplace les variables dans un template
 * @param {string} template - Template avec variables {{var}}
 * @param {object} data - Objet contenant les valeurs des variables
 * @returns {string} - Template avec variables remplacées
 */
export function replaceTemplateVariables(template, data) {
  let result = template;

  // D'abord, gérer les patterns de salutation spéciaux
  // "Bonjour {{PRENOM}}," -> "Bonjour," si prenom n'existe pas
  // "Bonjour {{prenom}}" -> "Bonjour" si prenom n'existe pas
  const greetingPatterns = [
    /\b(Bonjour|Bonsoir|Cher|Chère|Hello|Hi|Salut)\s+\{\{(\w+)\}\}\s*([,!]?)/gi,
  ];

  for (const pattern of greetingPatterns) {
    result = result.replace(pattern, (match, greeting, variable, punctuation) => {
      const value = resolveVariable(variable, data);
      if (value && String(value).trim()) {
        return `${greeting} ${value}${punctuation}`;
      }
      // Si pas de valeur, retourner juste la salutation avec la ponctuation
      return `${greeting}${punctuation}`;
    });
  }

  // Ensuite, remplacer les autres variables
  // Si la variable n'existe pas, la supprimer (chaîne vide) au lieu de garder {{variable}}
  result = result.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
    const value = resolveVariable(variable, data);
    return value !== undefined && value !== null ? String(value) : '';
  });

  // Nettoyer les espaces multiples créés par les suppressions
  result = result.replace(/  +/g, ' ');

  return result;
}

/**
 * Récupère un template par son ID
 * @param {string} templateId - ID du template
 * @returns {object|null} - Template ou null si non trouvé
 */
export function getTemplate(templateId) {
  return EMAIL_TEMPLATES[templateId] || null;
}

/**
 * Récupère tous les templates
 * @returns {object} - Tous les templates
 */
export function getAllTemplates() {
  return EMAIL_TEMPLATES;
}

/**
 * Récupère les templates par catégorie
 * @returns {object} - Templates groupés par catégorie
 */
export function getTemplatesByCategory() {
  return {
    prospection: ['first_contact', 'follow_up_1', 'follow_up_2'],
    meetings: ['meeting_request', 'meeting_confirmation', 'meeting_reminder'],
    sales: ['quote_sending', 'quote_follow_up', 'contract_sending'],
    customer_care: ['welcome', 'check_in'],
    events: ['event_invitation'],
    content: ['newsletter'],
    retention: ['win_back'],
    billing: ['invoice', 'payment_reminder'],
    appreciation: ['thank_you', 'referral_request'],
    updates: ['product_update', 'seasonal_greeting']
  };
}
