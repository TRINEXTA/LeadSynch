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

// ============================================
// SYSTÈME DE HIÉRARCHIE (Extension v2.0)
// ============================================

/**
 * Niveaux hiérarchiques disponibles
 * Ordre croissant: plus le nombre est petit, plus le niveau est élevé
 */
export const HIERARCHICAL_LEVELS = {
  DIRECTOR_GENERAL: 'director_general',
  DIRECTOR: 'director',
  SUPERVISOR: 'supervisor',
  DEPARTMENT_HEAD: 'department_head',
  MANAGER: 'manager'  // Manager standard (pas de niveau spécial)
};

/**
 * Configuration des niveaux hiérarchiques
 */
export const HIERARCHY_CONFIG = {
  [HIERARCHICAL_LEVELS.DIRECTOR_GENERAL]: {
    label: 'Directeur Général',
    shortLabel: 'DG',
    order: 1,
    color: 'bg-amber-100 text-amber-800',
    icon: 'Crown',
    description: 'Accès complet à toutes les fonctionnalités'
  },
  [HIERARCHICAL_LEVELS.DIRECTOR]: {
    label: 'Directeur',
    shortLabel: 'Dir',
    order: 2,
    color: 'bg-purple-100 text-purple-800',
    icon: 'Building',
    description: 'Accès étendu avec statistiques globales'
  },
  [HIERARCHICAL_LEVELS.SUPERVISOR]: {
    label: 'Superviseur',
    shortLabel: 'Sup',
    order: 3,
    color: 'bg-blue-100 text-blue-800',
    icon: 'Eye',
    description: 'Supervision de plusieurs équipes'
  },
  [HIERARCHICAL_LEVELS.DEPARTMENT_HEAD]: {
    label: 'Responsable de Pôle',
    shortLabel: 'Resp',
    order: 4,
    color: 'bg-green-100 text-green-800',
    icon: 'Users',
    description: 'Gestion de son département'
  },
  [HIERARCHICAL_LEVELS.MANAGER]: {
    label: 'Manager',
    shortLabel: 'Mgr',
    order: 5,
    color: 'bg-gray-100 text-gray-800',
    icon: 'User',
    description: 'Manager commercial standard'
  }
};

/**
 * Permissions supplémentaires pour la hiérarchie
 */
export const HIERARCHY_PERMISSIONS = {
  VIEW_COMMISSIONS: 'view_commissions',
  MANAGE_COMMISSIONS: 'manage_commissions',
  VIEW_ALL_PLANNING: 'view_all_planning',
  VIEW_TEAM_PLANNING: 'view_team_planning'
};

/**
 * Labels des permissions de hiérarchie
 */
export const HIERARCHY_PERMISSION_LABELS = {
  [HIERARCHY_PERMISSIONS.VIEW_COMMISSIONS]: 'Voir les commissions',
  [HIERARCHY_PERMISSIONS.MANAGE_COMMISSIONS]: 'Gérer les commissions',
  [HIERARCHY_PERMISSIONS.VIEW_ALL_PLANNING]: 'Voir tout le planning',
  [HIERARCHY_PERMISSIONS.VIEW_TEAM_PLANNING]: 'Voir le planning de l\'équipe'
};

/**
 * Permissions par défaut selon le niveau hiérarchique
 */
export const HIERARCHY_DEFAULT_PERMISSIONS = {
  [HIERARCHICAL_LEVELS.DIRECTOR_GENERAL]: {
    ...Object.keys(PERMISSIONS).reduce((acc, key) => ({ ...acc, [PERMISSIONS[key]]: true }), {}),
    [HIERARCHY_PERMISSIONS.VIEW_COMMISSIONS]: true,
    [HIERARCHY_PERMISSIONS.MANAGE_COMMISSIONS]: true,
    [HIERARCHY_PERMISSIONS.VIEW_ALL_PLANNING]: true,
    [HIERARCHY_PERMISSIONS.VIEW_TEAM_PLANNING]: true
  },
  [HIERARCHICAL_LEVELS.DIRECTOR]: {
    [PERMISSIONS.VIEW_ALL_LEADS]: true,
    [PERMISSIONS.IMPORT_LEADS]: true,
    [PERMISSIONS.GENERATE_LEADS]: true,
    [PERMISSIONS.CREATE_CAMPAIGNS]: true,
    [PERMISSIONS.VIEW_ALL_CAMPAIGNS]: true,
    [PERMISSIONS.EMAIL_TEMPLATES_MARKETING]: true,
    [PERMISSIONS.MAILING_CONFIG]: false,
    [PERMISSIONS.SPAM_DIAGNOSTIC]: true,
    [PERMISSIONS.TEST_MAILING]: true,
    [PERMISSIONS.RECATEGORIZE_AI]: true,
    [PERMISSIONS.DETECT_DUPLICATES]: true,
    [PERMISSIONS.BUSINESS_CONFIG]: false,
    [PERMISSIONS.MANAGE_ALL_USERS]: false,
    [PERMISSIONS.VIEW_DATABASES]: true,
    [HIERARCHY_PERMISSIONS.VIEW_COMMISSIONS]: true,
    [HIERARCHY_PERMISSIONS.MANAGE_COMMISSIONS]: false,
    [HIERARCHY_PERMISSIONS.VIEW_ALL_PLANNING]: true,
    [HIERARCHY_PERMISSIONS.VIEW_TEAM_PLANNING]: true
  },
  [HIERARCHICAL_LEVELS.SUPERVISOR]: {
    [PERMISSIONS.VIEW_ALL_LEADS]: true,
    [PERMISSIONS.IMPORT_LEADS]: false,
    [PERMISSIONS.GENERATE_LEADS]: false,
    [PERMISSIONS.CREATE_CAMPAIGNS]: true,
    [PERMISSIONS.VIEW_ALL_CAMPAIGNS]: true,
    [PERMISSIONS.EMAIL_TEMPLATES_MARKETING]: false,
    [PERMISSIONS.MAILING_CONFIG]: false,
    [PERMISSIONS.SPAM_DIAGNOSTIC]: false,
    [PERMISSIONS.TEST_MAILING]: false,
    [PERMISSIONS.RECATEGORIZE_AI]: false,
    [PERMISSIONS.DETECT_DUPLICATES]: false,
    [PERMISSIONS.BUSINESS_CONFIG]: false,
    [PERMISSIONS.MANAGE_ALL_USERS]: false,
    [PERMISSIONS.VIEW_DATABASES]: true,
    [HIERARCHY_PERMISSIONS.VIEW_COMMISSIONS]: true,
    [HIERARCHY_PERMISSIONS.MANAGE_COMMISSIONS]: false,
    [HIERARCHY_PERMISSIONS.VIEW_ALL_PLANNING]: false,
    [HIERARCHY_PERMISSIONS.VIEW_TEAM_PLANNING]: true
  },
  [HIERARCHICAL_LEVELS.DEPARTMENT_HEAD]: {
    [PERMISSIONS.VIEW_ALL_LEADS]: false,
    [PERMISSIONS.IMPORT_LEADS]: false,
    [PERMISSIONS.GENERATE_LEADS]: false,
    [PERMISSIONS.CREATE_CAMPAIGNS]: true,
    [PERMISSIONS.VIEW_ALL_CAMPAIGNS]: false,
    [PERMISSIONS.EMAIL_TEMPLATES_MARKETING]: false,
    [PERMISSIONS.MAILING_CONFIG]: false,
    [PERMISSIONS.SPAM_DIAGNOSTIC]: false,
    [PERMISSIONS.TEST_MAILING]: false,
    [PERMISSIONS.RECATEGORIZE_AI]: false,
    [PERMISSIONS.DETECT_DUPLICATES]: false,
    [PERMISSIONS.BUSINESS_CONFIG]: false,
    [PERMISSIONS.MANAGE_ALL_USERS]: false,
    [PERMISSIONS.VIEW_DATABASES]: false,
    [HIERARCHY_PERMISSIONS.VIEW_COMMISSIONS]: true,
    [HIERARCHY_PERMISSIONS.MANAGE_COMMISSIONS]: false,
    [HIERARCHY_PERMISSIONS.VIEW_ALL_PLANNING]: false,
    [HIERARCHY_PERMISSIONS.VIEW_TEAM_PLANNING]: true
  },
  [HIERARCHICAL_LEVELS.MANAGER]: {
    // Manager standard = permissions minimales (comme DEFAULT_MANAGER_PERMISSIONS)
    ...DEFAULT_MANAGER_PERMISSIONS,
    [HIERARCHY_PERMISSIONS.VIEW_COMMISSIONS]: true,
    [HIERARCHY_PERMISSIONS.MANAGE_COMMISSIONS]: false,
    [HIERARCHY_PERMISSIONS.VIEW_ALL_PLANNING]: false,
    [HIERARCHY_PERMISSIONS.VIEW_TEAM_PLANNING]: true
  }
};

/**
 * Vérifie si un utilisateur a un niveau hiérarchique supérieur ou égal
 * @param {Object} user - L'utilisateur
 * @param {string} requiredLevel - Le niveau requis
 * @returns {boolean}
 */
export function hasHierarchyLevel(user, requiredLevel) {
  if (!user) return false;

  // Admin et super-admin ont tous les accès
  if (user.role === 'admin' || user.is_super_admin) {
    return true;
  }

  // Si l'utilisateur n'a pas de niveau hiérarchique, il n'a pas accès
  if (!user.hierarchical_level) {
    return false;
  }

  const userConfig = HIERARCHY_CONFIG[user.hierarchical_level];
  const requiredConfig = HIERARCHY_CONFIG[requiredLevel];

  if (!userConfig || !requiredConfig) {
    return false;
  }

  // Plus le order est petit, plus le niveau est élevé
  return userConfig.order <= requiredConfig.order;
}

/**
 * Vérifie si un utilisateur peut gérer un autre utilisateur (selon la hiérarchie)
 * @param {Object} manager - L'utilisateur qui veut gérer
 * @param {Object} target - L'utilisateur cible
 * @returns {boolean}
 */
export function canManageUser(manager, target) {
  if (!manager || !target) return false;

  // Admin peut tout gérer
  if (manager.role === 'admin' || manager.is_super_admin) {
    return true;
  }

  // Un utilisateur ne peut pas se gérer lui-même
  if (manager.id === target.id) {
    return false;
  }

  // Personne ne peut gérer un admin
  if (target.role === 'admin' || target.is_super_admin) {
    return false;
  }

  // Sans niveau hiérarchique, on ne peut pas gérer
  if (!manager.hierarchical_level) {
    return false;
  }

  const managerConfig = HIERARCHY_CONFIG[manager.hierarchical_level];

  // Si la cible n'a pas de niveau, elle est considérée comme niveau le plus bas
  if (!target.hierarchical_level) {
    return true;
  }

  const targetConfig = HIERARCHY_CONFIG[target.hierarchical_level];

  // Le manager doit avoir un niveau supérieur (order plus petit)
  return managerConfig.order < targetConfig.order;
}

/**
 * Retourne le label d'affichage pour un niveau hiérarchique
 * @param {string} level - Le niveau hiérarchique
 * @returns {string}
 */
export function getHierarchyLabel(level) {
  if (!level) return null;
  return HIERARCHY_CONFIG[level]?.label || level;
}

/**
 * Retourne la configuration complète d'un niveau hiérarchique
 * @param {string} level - Le niveau hiérarchique
 * @returns {Object|null}
 */
export function getHierarchyConfig(level) {
  if (!level) return null;
  return HIERARCHY_CONFIG[level] || null;
}

/**
 * Vérifie si un utilisateur a une permission (avec support hiérarchie)
 * Extension de hasPermission pour supporter les niveaux hiérarchiques
 * @param {Object} user - L'utilisateur
 * @param {string} permission - La permission à vérifier
 * @returns {boolean}
 */
export function hasPermissionWithHierarchy(user, permission) {
  if (!user) return false;

  // Les admins et super-admins ont toutes les permissions
  if (user.role === 'admin' || user.is_super_admin) {
    return true;
  }

  // Vérifier d'abord les permissions individuelles
  const userPermissions = user.permissions || {};
  if (userPermissions[permission] === true) {
    return true;
  }

  // Vérifier les permissions par défaut du niveau hiérarchique
  if (user.hierarchical_level) {
    const defaultPerms = HIERARCHY_DEFAULT_PERMISSIONS[user.hierarchical_level];
    if (defaultPerms && defaultPerms[permission] === true) {
      return true;
    }
  }

  return false;
}

/**
 * Types de commission
 */
export const COMMISSION_TYPES = {
  PERCENTAGE: 'percentage',
  FIXED: 'fixed',
  MIXED: 'mixed'
};

export const COMMISSION_TYPE_LABELS = {
  [COMMISSION_TYPES.PERCENTAGE]: 'Pourcentage',
  [COMMISSION_TYPES.FIXED]: 'Fixe',
  [COMMISSION_TYPES.MIXED]: 'Mixte (fixe + %)'
};

/**
 * Catégories de permissions incluant la hiérarchie
 */
export const PERMISSION_CATEGORIES_EXTENDED = {
  ...PERMISSION_CATEGORIES,
  commissions: {
    title: 'Commissions & Rémunération',
    permissions: [
      HIERARCHY_PERMISSIONS.VIEW_COMMISSIONS,
      HIERARCHY_PERMISSIONS.MANAGE_COMMISSIONS
    ]
  },
  planning: {
    title: 'Planning',
    permissions: [
      HIERARCHY_PERMISSIONS.VIEW_ALL_PLANNING,
      HIERARCHY_PERMISSIONS.VIEW_TEAM_PLANNING
    ]
  }
};
