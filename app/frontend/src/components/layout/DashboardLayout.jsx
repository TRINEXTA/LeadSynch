import { log, error, warn } from "../../lib/logger.js";
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import Sidebar from './Sidebar'
import Header from './Header'
import RappelNotification from '../notifications/RappelNotification'
import ChatbotAsefi from '../ChatbotAsefi'

export default function DashboardLayout() {
  const [isChatbotOpen, setIsChatbotOpen] = useState(false)

  return (
    <div className='flex h-screen bg-gray-50'>
      <Sidebar />
      <div className='flex-1 flex flex-col overflow-hidden'>
        <Header />
        <main className='flex-1 overflow-y-auto p-6'>
          <Outlet />
        </main>
      </div>

      {/* Notification flottante des rappels */}
      <RappelNotification />

      {/* Bouton flottant ASEFI - visible sur toutes les pages */}
      {!isChatbotOpen && (
        <button
          onClick={() => setIsChatbotOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 flex items-center justify-center group"
          title="Ouvrir Asefi - Assistant IA"
        >
          <Sparkles className="w-6 h-6 text-white group-hover:animate-pulse" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></span>
        </button>
      )}

      {/* Chatbot ASEFI */}
      <ChatbotAsefi isOpen={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} />
    </div>
  )
}
