<<<<<<< HEAD
import { log, error, warn } from "./../../lib/logger.js";
=======
import { log, error, warn } from "../lib/logger.js";
>>>>>>> origin/main
﻿import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className='flex h-screen bg-gray-50'>
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      <div className='flex-1 flex flex-col overflow-hidden'>
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className='flex-1 overflow-y-auto p-6'>
          {children}
        </main>
      </div>
    </div>
  )
}
