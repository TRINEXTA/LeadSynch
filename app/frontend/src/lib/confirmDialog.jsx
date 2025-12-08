import toast from 'react-hot-toast';

/**
 * Custom confirmation dialog using react-hot-toast
 * Replaces native confirm() with a styled toast notification
 *
 * @param {string} message - The confirmation message to display
 * @param {Object} options - Configuration options
 * @param {string} options.confirmText - Text for confirm button (default: 'Confirmer')
 * @param {string} options.cancelText - Text for cancel button (default: 'Annuler')
 * @param {string} options.type - Type of confirmation: 'danger', 'warning', 'info' (default: 'warning')
 * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
 */
export function confirmDialog(message, options = {}) {
  const {
    confirmText = 'Confirmer',
    cancelText = 'Annuler',
    type = 'warning'
  } = options;

  return new Promise((resolve) => {
    toast((t) => (
      <div className="flex flex-col gap-3 max-w-sm">
        <p className="text-gray-800 font-medium">{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => {
              toast.dismiss(t.id);
              resolve(false);
            }}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              resolve(true);
            }}
            className={`px-3 py-1.5 text-sm text-white rounded-lg transition-colors ${
              type === 'danger'
                ? 'bg-red-600 hover:bg-red-700'
                : type === 'warning'
                ? 'bg-orange-500 hover:bg-orange-600'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    ), {
      duration: Infinity,
      position: 'top-center',
      style: {
        background: 'white',
        padding: '16px',
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
      }
    });
  });
}

/**
 * Shorthand for delete confirmation
 */
export function confirmDelete(itemName = 'cet élément') {
  return confirmDialog(
    `Êtes-vous sûr de vouloir supprimer ${itemName} ? Cette action est irréversible.`,
    {
      confirmText: 'Supprimer',
      type: 'danger'
    }
  );
}

/**
 * Shorthand for action confirmation
 */
export function confirmAction(message) {
  return confirmDialog(message, {
    confirmText: 'Continuer',
    type: 'warning'
  });
}

export default confirmDialog;
