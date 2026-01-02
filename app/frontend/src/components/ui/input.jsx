import React, { forwardRef, useId } from 'react'

/**
 * Input component with accessibility support
 * @param {Object} props - Component props
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.type - Input type
 * @param {string} props.label - Label text (creates accessible label)
 * @param {string} props.error - Error message (adds aria-invalid and aria-describedby)
 * @param {string} props.hint - Hint text displayed below input
 * @param {boolean} props.required - Whether field is required
 */
export const Input = forwardRef(function Input({
  className = '',
  type = 'text',
  label,
  error,
  hint,
  required,
  id: propId,
  ...props
}, ref) {
  const generatedId = useId()
  const id = propId || generatedId
  const errorId = `${id}-error`
  const hintId = `${id}-hint`

  const hasError = Boolean(error)
  const hasHint = Boolean(hint)

  const describedBy = [
    hasError && errorId,
    hasHint && hintId
  ].filter(Boolean).join(' ') || undefined

  const baseStyles = 'flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50'
  const errorStyles = hasError
    ? 'border-red-500 focus:ring-red-500'
    : 'border-gray-300 focus:ring-indigo-500'

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        type={type}
        className={`${baseStyles} ${errorStyles} ${className}`}
        aria-invalid={hasError}
        aria-describedby={describedBy}
        aria-required={required}
        required={required}
        {...props}
      />
      {hint && !error && (
        <p id={hintId} className="mt-1 text-sm text-gray-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
})
