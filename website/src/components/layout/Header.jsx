import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Logo from '../ui/Logo';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <Logo className="h-10" />
          </Link>

          {/* Navigation Desktop */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-700 hover:text-primary-600 font-medium transition-colors">
              Accueil
            </Link>
            <Link to="/features" className="text-gray-700 hover:text-primary-600 font-medium transition-colors">
              Fonctionnalités
            </Link>
            <Link to="/pricing" className="text-gray-700 hover:text-primary-600 font-medium transition-colors">
              Tarifs
            </Link>
            <Link to="/contact" className="text-gray-700 hover:text-primary-600 font-medium transition-colors">
              Contact
            </Link>
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Link 
              to="/login" 
              className="text-gray-700 hover:text-primary-600 font-medium transition-colors"
            >
              Connexion
            </Link>
            <Link 
              to="/register" 
              className="px-6 py-2 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
            >
              Démarrer gratuitement
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <nav className="flex flex-col space-y-4">
              <Link to="/" className="text-gray-700 hover:text-primary-600 font-medium">Accueil</Link>
              <Link to="/features" className="text-gray-700 hover:text-primary-600 font-medium">Fonctionnalités</Link>
              <Link to="/pricing" className="text-gray-700 hover:text-primary-600 font-medium">Tarifs</Link>
              <Link to="/contact" className="text-gray-700 hover:text-primary-600 font-medium">Contact</Link>
              <hr />
              <Link to="/login" className="text-gray-700 hover:text-primary-600 font-medium">Connexion</Link>
              <Link to="/register" className="px-6 py-2 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-lg font-medium text-center">
                Démarrer gratuitement
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
