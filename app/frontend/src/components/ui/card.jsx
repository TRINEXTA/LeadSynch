import { log, error, warn } from "../../lib/logger.js";
﻿import React from 'react'

export function Card({ children, className = '', ...props }) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm `} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '', ...props }) {
  return (
    <div className={`p-6 pb-4 `} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className = '', ...props }) {
  return (
    <h3 className={`text-lg font-semibold `} {...props}>
      {children}
    </h3>
  )
}

export function CardContent({ children, className = '', ...props }) {
  return (
    <div className={`p-6 pt-0 `} {...props}>
      {children}
    </div>
  )
}
