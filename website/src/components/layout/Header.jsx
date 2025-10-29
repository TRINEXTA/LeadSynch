import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Logo from '../ui/Logo';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center hover:scale-105 transition-transform">
            <Logo className="h-10" />
          </Link>

          {/* Navigation Desktop */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-700 hover:text-blue-600 font-semibold transition-colors relative group">
              Accueil
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all"></span>
            </Link>
            <Link to="/features" className="text-gray-700 hover:text-blue-600 font-semibold transition-colors relative group">
              Fonctionnalités
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all"></span>
            </Link>
            <Link to="/pricing" className="text-gray-700 hover:text-blue-600 font-semibold transition-colors relative group">
              Tarifs
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all"></span>
            </Link>
            <a href="mailto:contact@leadsynch.com" className="text-gray-700 hover:text-blue-600 font-semibold transition-colors relative group">
              Contact
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all"></span>
            </a>
          </nav>

          {/* CTA Buttons - AMÉLIORÉS */}
          <div className="hidden md:flex items-center space-x-4">
            <Link 
              to="/login" 
              className="px-5 py-2 text-gray-700 font-semibold hover:text-blue-600 transition-colors"
            >
              Connexion
            </Link>
            <Link 
              to="/register" 
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105"
            >
              Démarrer gratuitement
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200 animate-slideDown">
            <nav className="flex flex-col space-y-4">
              <Link to="/" className="text-gray-700 hover:text-blue-600 font-semibold transition-colors">
                Accueil
              </Link>
              <Link to="/features" className="text-gray-700 hover:text-blue-600 font-semibold transition-colors">
                Fonctionnalités
              </Link>
              <Link to="/pricing" className="text-gray-700 hover:text-blue-600 font-semibold transition-colors">
                Tarifs
              </Link>
              <a href="mailto:contact@leadsynch.com" className="text-gray-700 hover:text-blue-600 font-semibold transition-colors">
                Contact
              </a>
              <hr className="border-gray-300" />
              <Link to="/login" className="text-gray-700 hover:text-blue-600 font-semibold transition-colors">
                Connexion
              </Link>
              <Link 
                to="/register" 
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-bold text-center shadow-lg hover:shadow-xl transition-all"
              >
                Démarrer gratuitement
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}