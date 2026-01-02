import React from 'react'

/**
 * Badge component for status indicators and labels
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Badge content
 * @param {string} props.className - Additional CSS classes
 * @param {'default'|'success'|'warning'|'danger'|'info'} props.variant - Badge style variant
 * @param {'default'|'outline'} props.style - Badge style (filled or outline)
 * @param {boolean} props.dot - Show a status dot before the text
 */
export function Badge({
  children,
  className = '',
  variant = 'default',
  style = 'default',
  dot = false,
  ...props
}) {
  const filledVariants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800'
  }

  const outlineVariants = {
    default: 'bg-transparent border border-gray-300 text-gray-700',
    success: 'bg-transparent border border-green-500 text-green-700',
    warning: 'bg-transparent border border-yellow-500 text-yellow-700',
    danger: 'bg-transparent border border-red-500 text-red-700',
    info: 'bg-transparent border border-blue-500 text-blue-700'
  }

  const dotColors = {
    default: 'bg-gray-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
    info: 'bg-blue-500'
  }

  const variantStyles = style === 'outline' ? outlineVariants : filledVariants

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant] || variantStyles.default} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotColors[variant] || dotColors.default}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  )
}
