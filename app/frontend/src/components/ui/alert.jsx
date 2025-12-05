import { log, error, warn } from "./../../lib/logger.js";
﻿import React from 'react'
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react'

export function Alert({ children, className = '', variant = 'default', ...props }) {
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

  const Icon = icons[variant]
  
  return (
    <div
      className={`relative rounded-lg border p-4 ${variants[variant]} ${className}`}
      {...props}
    >
      <div className='flex items-start gap-3'>
        <Icon className='w-5 h-5 flex-shrink-0 mt-0.5' />
        <div className='flex-1'>{children}</div>
      </div>
    </div>
  )
}

export function AlertTitle({ children, className = '', ...props }) {
  return (
    <h5 className={`font-semibold mb-1 ${className}`} {...props}>
      {children}
    </h5>
  )
}

export function AlertDescription({ children, className = '', ...props }) {
  return (
    <div className={`text-sm ${className}`} {...props}>
      {children}
    </div>
  )
}
