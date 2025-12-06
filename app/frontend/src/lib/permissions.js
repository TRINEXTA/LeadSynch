/**
 * Système de permissions pour les managers
 *
 * Par défaut, les managers ont des accès restreints.
 * L'admin peut activer des permissions supplémentaires.
 */

// Liste de toutes les permissions disponibles
export const PERMISSIONS = {
  VIEW_ALL_LEADS: 'view_all_leads',
  IMPORT_LEADS: 'import_leads',
  GENERATE_LEADS: 'generate_leads',
  CREATE_CAMPAIGNS: 'create_campaigns',
  VIEW_ALL_CAMPAIGNS: 'view_all_campaigns',
  EMAIL_TEMPLATES_MARKETING: 'email_templates_marketing',
  MAILING_CONFIG: 'mailing_config',
  SPAM_DIAGNOSTIC: 'spam_diagnostic',
  TEST_MAILING: 'test_mailing',
  RECATEGORIZE_AI: 'recategorize_ai',
  DETECT_DUPLICATES: 'detect_duplicates',
  BUSINESS_CONFIG: 'business_config',
  MANAGE_ALL_USERS: 'manage_all_users',
  VIEW_DATABASES: 'view_databases'
};

// Descriptions des permissions (pour l'UI)
export const PERMISSION_LABELS = {
  [PERMISSIONS.VIEW_ALL_LEADS]: 'Voir tous les leads',
  [PERMISSIONS.IMPORT_LEADS]: 'Importer des leads (CSV)',
  [PERMISSIONS.GENERATE_LEADS]: 'Génération de leads IA',
  [PERMISSIONS.CREATE_CAMPAIGNS]: 'Créer des campagnes',
  [PERMISSIONS.VIEW_ALL_CAMPAIGNS]: 'Voir toutes les campagnes',
  [PERMISSIONS.EMAIL_TEMPLATES_MARKETING]: 'Templates email marketing',
  [PERMISSIONS.MAILING_CONFIG]: 'Configuration mailing',
  [PERMISSIONS.SPAM_DIAGNOSTIC]: 'Diagnostic anti-spam',
  [PERMISSIONS.TEST_MAILING]: 'Test d\'envoi email',
  [PERMISSIONS.RECATEGORIZE_AI]: 'Recatégorisation IA',
  [PERMISSIONS.DETECT_DUPLICATES]: 'Détection de doublons',
  [PERMISSIONS.BUSINESS_CONFIG]: 'Configuration business',
  [PERMISSIONS.MANAGE_ALL_USERS]: 'Gestion de tous les utilisateurs',
  [PERMISSIONS.VIEW_DATABASES]: 'Accès aux bases de données'
};

// Catégories de permissions pour l'UI
export const PERMISSION_CATEGORIES = {
  leads: {
    title: 'Gestion des Leads',
    permissions: [
      PERMISSIONS.VIEW_ALL_LEADS,
      PERMISSIONS.VIEW_DATABASES,
      PERMISSIONS.IMPORT_LEADS,
      PERMISSIONS.GENERATE_LEADS,
      PERMISSIONS.RECATEGORIZE_AI,
      PERMISSIONS.DETECT_DUPLICATES
    ]
  },
  campaigns: {
    title: 'Campagnes',
    permissions: [
      PERMISSIONS.VIEW_ALL_CAMPAIGNS,
      PERMISSIONS.CREATE_CAMPAIGNS
    ]
  },
  email: {
    title: 'Email Marketing',
    permissions: [
      PERMISSIONS.EMAIL_TEMPLATES_MARKETING,
      PERMISSIONS.MAILING_CONFIG,
      PERMISSIONS.SPAM_DIAGNOSTIC,
      PERMISSIONS.TEST_MAILING
    ]
  },
  admin: {
    title: 'Administration',
    permissions: [
      PERMISSIONS.BUSINESS_CONFIG,
      PERMISSIONS.MANAGE_ALL_USERS
    ]
  }
};

/**
 * Vérifie si un utilisateur a une permission spécifique
 *
 * @param {Object} user - L'utilisateur (avec role et permissions)
 * @param {string} permission - La permission à vérifier
 * @returns {boolean}
 */
export function hasPermission(user, permission) {
  if (!user) return false;

  // Les admins et super-admins ont toutes les permissions
  if (user.role === 'admin' || user.is_super_admin) {
    return true;
  }

  // Les commerciaux n'ont que les accès de base
  if (user.role === 'commercial') {
    return false;
  }

  // Pour les managers, vérifier les permissions individuelles
  if (user.role === 'manager') {
    const permissions = user.permissions || {};
    return permissions[permission] === true;
  }

  return false;
}

/**
 * Vérifie si un utilisateur a accès à une fonctionnalité
 * (combinaison de rôle et permissions)
 *
 * @param {Object} user - L'utilisateur
 * @param {Object} access - { roles?: string[], permission?: string }
 * @returns {boolean}
 */
export function canAccess(user, access) {
  if (!user) return false;

  const { roles, permission } = access;

  // Vérifier le rôle de base
  if (roles && !roles.includes(user.role)) {
    return false;
  }

  // Si pas de permission spécifique requise, le rôle suffit
  if (!permission) {
    return true;
  }

  // Pour les admins et super-admins, toujours autoriser
  if (user.role === 'admin' || user.is_super_admin) {
    return true;
  }

  // Pour les managers, vérifier la permission
  if (user.role === 'manager') {
    return hasPermission(user, permission);
  }

  return false;
}

/**
 * Permissions par défaut pour un nouveau manager
 */
export const DEFAULT_MANAGER_PERMISSIONS = {
  [PERMISSIONS.VIEW_ALL_LEADS]: false,
  [PERMISSIONS.IMPORT_LEADS]: false,
  [PERMISSIONS.GENERATE_LEADS]: false,
  [PERMISSIONS.CREATE_CAMPAIGNS]: false,
  [PERMISSIONS.VIEW_ALL_CAMPAIGNS]: false,
  [PERMISSIONS.EMAIL_TEMPLATES_MARKETING]: false,
  [PERMISSIONS.MAILING_CONFIG]: false,
  [PERMISSIONS.SPAM_DIAGNOSTIC]: false,
  [PERMISSIONS.TEST_MAILING]: false,
  [PERMISSIONS.RECATEGORIZE_AI]: false,
  [PERMISSIONS.DETECT_DUPLICATES]: false,
  [PERMISSIONS.BUSINESS_CONFIG]: false,
  [PERMISSIONS.MANAGE_ALL_USERS]: false,
  [PERMISSIONS.VIEW_DATABASES]: false
};
