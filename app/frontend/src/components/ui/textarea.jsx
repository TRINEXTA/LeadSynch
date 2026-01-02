import React, { forwardRef, useId } from 'react'

/**
 * Textarea component with accessibility support
 * @param {Object} props - Component props
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.label - Label text
 * @param {string} props.error - Error message
 * @param {string} props.hint - Hint text
 * @param {boolean} props.required - Whether field is required
 * @param {number} props.maxLength - Max character count (shows counter)
 */
export const Textarea = forwardRef(function Textarea({
  className = '',
  label,
  error,
  hint,
  required,
  maxLength,
  value,
  id: propId,
  ...props
}, ref) {
  const generatedId = useId()
  const id = propId || generatedId
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const counterId = `${id}-counter`

  const hasError = Boolean(error)
  const hasHint = Boolean(hint)
  const hasCounter = Boolean(maxLength)

  const describedBy = [
    hasError && errorId,
    hasHint && hintId,
    hasCounter && counterId
  ].filter(Boolean).join(' ') || undefined

  const baseStyles = 'flex min-h-[80px] w-full rounded-lg border bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 resize-y'
  const errorStyles = hasError
    ? 'border-red-500 focus:ring-red-500'
    : 'border-gray-300 focus:ring-indigo-500'

  const currentLength = typeof value === 'string' ? value.length : 0
  const isNearLimit = hasCounter && currentLength >= maxLength * 0.9
  const isOverLimit = hasCounter && currentLength > maxLength

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        value={value}
        maxLength={maxLength}
        className={`${baseStyles} ${errorStyles} ${className}`}
        aria-invalid={hasError || isOverLimit}
        aria-describedby={describedBy}
        aria-required={required}
        required={required}
        {...props}
      />
      <div className="flex justify-between items-start mt-1">
        <div className="flex-1">
          {hint && !error && (
            <p id={hintId} className="text-sm text-gray-500">
              {hint}
            </p>
          )}
          {error && (
            <p id={errorId} className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
        {hasCounter && (
          <p
            id={counterId}
            className={`text-sm ml-2 ${isOverLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-gray-500'}`}
            aria-live="polite"
          >
            {currentLength}/{maxLength}
          </p>
        )}
      </div>
    </div>
  )
})
