import React from 'react'

/**
 * Card component - Container for grouped content
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Card content
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.interactive - If true, adds hover/focus styles for clickable cards
 */
export function Card({ children, className = '', interactive = false, ...props }) {
  const baseStyles = 'bg-white rounded-lg border border-gray-200 shadow-sm'
  const interactiveStyles = interactive
    ? 'hover:shadow-md hover:border-gray-300 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 transition-shadow cursor-pointer'
    : ''

  return (
    <div
      className={`${baseStyles} ${interactiveStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Card header component
 */
export function CardHeader({ children, className = '', ...props }) {
  return (
    <div className={`p-6 pb-4 ${className}`} {...props}>
      {children}
    </div>
  )
}

/**
 * Card title component
 * @param {Object} props - Component props
 * @param {'h2'|'h3'|'h4'} props.as - Heading level (defaults to h3)
 */
export function CardTitle({ children, className = '', as: Component = 'h3', ...props }) {
  return (
    <Component className={`text-lg font-semibold ${className}`} {...props}>
      {children}
    </Component>
  )
}

/**
 * Card description component
 */
export function CardDescription({ children, className = '', ...props }) {
  return (
    <p className={`text-sm text-gray-500 mt-1 ${className}`} {...props}>
      {children}
    </p>
  )
}

/**
 * Card content component
 */
export function CardContent({ children, className = '', ...props }) {
  return (
    <div className={`p-6 pt-0 ${className}`} {...props}>
      {children}
    </div>
  )
}

/**
 * Card footer component
 */
export function CardFooter({ children, className = '', ...props }) {
  return (
    <div className={`p-6 pt-0 flex items-center gap-2 ${className}`} {...props}>
      {children}
    </div>
  )
}
