import { log, error, warn } from "./../../lib/logger.js";
﻿import React from 'react'

export function Select({ children, className = '', ...props }) {
  return (
    <select
      className={`flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 `}
      {...props}
    >
      {children}
    </select>
  )
}
