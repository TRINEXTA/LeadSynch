import React from 'react'
import { AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react'

/**
 * Alert component with accessibility support
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Alert content
 * @param {string} props.className - Additional CSS classes
 * @param {'default'|'success'|'warning'|'error'|'info'} props.variant - Alert style variant
 * @param {boolean} props.dismissible - Whether alert can be dismissed
 * @param {Function} props.onDismiss - Callback when dismissed
 */
export function Alert({
  children,
  className = '',
  variant = 'default',
  dismissible = false,
  onDismiss,
  ...props
}) {
  const variants = {
    default: 'bg-gray-50 border-gray-200 text-gray-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  }

  const icons = {
    default: Info,
    success: CheckCircle,
    warning: AlertCircle,
    error: XCircle,
    info: Info
  }

  // Map variants to ARIA roles
  const roles = {
    default: 'status',
    success: 'status',
    warning: 'alert',
    error: 'alert',
    info: 'status'
  }

  // Aria-live for dynamic content
  const ariaLive = {
    default: 'polite',
    success: 'polite',
    warning: 'assertive',
    error: 'assertive',
    info: 'polite'
  }

  const Icon = icons[variant]

  return (
    <div
      role={roles[variant]}
      aria-live={ariaLive[variant]}
      className={`relative rounded-lg border p-4 ${variants[variant]} ${className}`}
      {...props}
    >
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1">{children}</div>
        {dismissible && onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="flex-shrink-0 p-1 rounded-md hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors"
            aria-label="Fermer l'alerte"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Alert title component
 */
export function AlertTitle({ children, className = '', ...props }) {
  return (
    <h5 className={`font-semibold mb-1 ${className}`} {...props}>
      {children}
    </h5>
  )
}

/**
 * Alert description component
 */
export function AlertDescription({ children, className = '', ...props }) {
  return (
    <div className={`text-sm ${className}`} {...props}>
      {children}
    </div>
  )
}
