/**
 * Toast Notification System
 *
 * Centralized toast notifications using react-hot-toast.
 * Replaces alert() calls throughout the application.
 *
 * Usage:
 * import { toast } from '@/lib/toast'
 *
 * toast.success('Lead créé avec succès')
 * toast.error('Erreur lors de la création')
 * toast.loading('Chargement...')
 * toast.promise(asyncFn, { loading, success, error })
 */

import hotToast from 'react-hot-toast'

// Default toast options
const defaultOptions = {
  duration: 4000,
  position: 'top-right',
}

// Custom styles for consistency
const styles = {
  success: {
    style: {
      background: '#10B981',
      color: '#fff',
      padding: '12px 16px',
      borderRadius: '8px',
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#10B981',
    },
  },
  error: {
    style: {
      background: '#EF4444',
      color: '#fff',
      padding: '12px 16px',
      borderRadius: '8px',
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#EF4444',
    },
  },
  warning: {
    style: {
      background: '#F59E0B',
      color: '#fff',
      padding: '12px 16px',
      borderRadius: '8px',
    },
    icon: '⚠️',
  },
  info: {
    style: {
      background: '#3B82F6',
      color: '#fff',
      padding: '12px 16px',
      borderRadius: '8px',
    },
    icon: 'ℹ️',
  },
  loading: {
    style: {
      background: '#6366F1',
      color: '#fff',
      padding: '12px 16px',
      borderRadius: '8px',
    },
  },
}

/**
 * Toast notification utilities
 */
export const toast = {
  /**
   * Show success toast
   * @param {string} message - Success message
   * @param {Object} options - Additional options
   */
  success: (message, options = {}) => {
    return hotToast.success(message, {
      ...defaultOptions,
      ...styles.success,
      ...options,
    })
  },

  /**
   * Show error toast
   * @param {string} message - Error message
   * @param {Object} options - Additional options
   */
  error: (message, options = {}) => {
    return hotToast.error(message, {
      ...defaultOptions,
      duration: 5000, // Errors stay longer
      ...styles.error,
      ...options,
    })
  },

  /**
   * Show warning toast
   * @param {string} message - Warning message
   * @param {Object} options - Additional options
   */
  warning: (message, options = {}) => {
    return hotToast(message, {
      ...defaultOptions,
      ...styles.warning,
      ...options,
    })
  },

  /**
   * Show info toast
   * @param {string} message - Info message
   * @param {Object} options - Additional options
   */
  info: (message, options = {}) => {
    return hotToast(message, {
      ...defaultOptions,
      ...styles.info,
      ...options,
    })
  },

  /**
   * Show loading toast
   * @param {string} message - Loading message
   * @returns {string} Toast ID for dismissing
   */
  loading: (message = 'Chargement...') => {
    return hotToast.loading(message, {
      ...defaultOptions,
      ...styles.loading,
      duration: Infinity, // Loading toasts don't auto-dismiss
    })
  },

  /**
   * Dismiss a specific toast or all toasts
   * @param {string} toastId - Optional toast ID
   */
  dismiss: (toastId) => {
    if (toastId) {
      hotToast.dismiss(toastId)
    } else {
      hotToast.dismiss()
    }
  },

  /**
   * Promise-based toast for async operations
   * @param {Promise} promise - The promise to track
   * @param {Object} messages - Loading, success, error messages
   * @param {Object} options - Additional options
   *
   * @example
   * toast.promise(
   *   api.post('/leads', data),
   *   {
   *     loading: 'Création du lead...',
   *     success: 'Lead créé avec succès!',
   *     error: (err) => err.message || 'Erreur lors de la création'
   *   }
   * )
   */
  promise: (promise, messages, options = {}) => {
    return hotToast.promise(
      promise,
      {
        loading: messages.loading || 'Chargement...',
        success: messages.success || 'Opération réussie!',
        error: messages.error || 'Une erreur est survenue',
      },
      {
        ...defaultOptions,
        ...options,
        success: styles.success,
        error: styles.error,
        loading: styles.loading,
      }
    )
  },

  /**
   * Custom toast with full control
   * @param {string|Function} content - Toast content
   * @param {Object} options - Toast options
   */
  custom: (content, options = {}) => {
    return hotToast(content, {
      ...defaultOptions,
      ...options,
    })
  },
}

/**
 * Common toast messages for reuse
 */
export const toastMessages = {
  // CRUD operations
  created: (item = 'Élément') => `${item} créé avec succès`,
  updated: (item = 'Élément') => `${item} mis à jour avec succès`,
  deleted: (item = 'Élément') => `${item} supprimé avec succès`,

  // Errors
  networkError: 'Erreur de connexion. Vérifiez votre connexion internet.',
  serverError: 'Erreur serveur. Veuillez réessayer plus tard.',
  validationError: 'Veuillez vérifier les champs du formulaire.',
  unauthorized: 'Session expirée. Veuillez vous reconnecter.',
  forbidden: 'Vous n\'avez pas les permissions nécessaires.',
  notFound: 'Ressource introuvable.',

  // Actions
  copied: 'Copié dans le presse-papiers',
  saved: 'Modifications enregistrées',
  sent: 'Envoyé avec succès',
  imported: (count) => `${count} éléments importés avec succès`,
  exported: 'Export terminé',
}

export default toast
