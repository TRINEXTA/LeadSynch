import { log, error, warn } from "./../../lib/logger.js";
﻿import { Bell, Search } from 'lucide-react'

export default function Header() {
  return (
    <header className='bg-white border-b border-gray-200 px-6 py-4'>
      <div className='flex items-center justify-between'>
        <div className='flex-1 max-w-lg'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
            <input
              type='text'
              placeholder='Rechercher...'
              className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent'
            />
          </div>
        </div>
        <button className='ml-4 p-2 text-gray-400 hover:text-gray-600 relative'>
          <Bell className='w-6 h-6' />
          <span className='absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full'></span>
        </button>
      </div>
    </header>
  )
}
