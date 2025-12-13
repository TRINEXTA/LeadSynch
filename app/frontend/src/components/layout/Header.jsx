import { log, error, warn } from "../../lib/logger.js";
import { Bell } from 'lucide-react'

export default function Header() {
  return (
    <header className='bg-white border-b border-gray-200 px-6 py-3'>
      <div className='flex items-center justify-end'>
        <button className='p-2 text-gray-400 hover:text-gray-600 relative'>
          <Bell className='w-6 h-6' />
          <span className='absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full'></span>
        </button>
      </div>
    </header>
  )
}
