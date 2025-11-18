import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, ExternalLink } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">LS</span>
              </div>
              <span className="text-2xl font-bold text-white">LeadSynch</span>
            </Link>
            <p className="text-sm text-gray-400 mb-4">
              La plateforme CRM intelligente pour automatiser votre prospection B2B et générer plus de leads qualifiés.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Produit</h3>
            <ul className="space-y-2">
              <li><Link to="/features" className="text-sm hover:text-white transition-colors">Fonctionnalités</Link></li>
              <li><Link to="/pricing" className="text-sm hover:text-white transition-colors">Tarifs</Link></li>
              <li><Link to="/register" className="text-sm hover:text-white transition-colors">Essai gratuit</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Entreprise</h3>
            <ul className="space-y-2">
              <li><a href="https://www.trinexta.com" target="_blank" rel="noopener noreferrer" className="text-sm hover:text-white transition-colors">À propos de TRINEXTA</a></li>
              <li><Link to="/legal" className="text-sm hover:text-white transition-colors">Mentions légales</Link></li>
              <li><Link to="/terms" className="text-sm hover:text-white transition-colors">CGU</Link></li>
              <li><Link to="/sales" className="text-sm hover:text-white transition-colors">CGV</Link></li>
              <li><Link to="/privacy" className="text-sm hover:text-white transition-colors">Confidentialité RGPD</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <Mail className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <a href="mailto:contact@leadsynch.com" className="text-sm hover:text-white transition-colors">contact@leadsynch.com</a>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <a href="tel:+33978250746" className="text-sm hover:text-white transition-colors">09 78 25 07 46</a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="mb-1"><strong>Siège :</strong><br />74B Bd Henri Dunant<br />91100 Corbeil-Essonnes</p>
                  <p className="text-gray-500 text-xs mt-2"><strong>Service :</strong><br />505 Pl. Champs Élysées<br />91080 Évry-Courcouronnes</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Promo TRINEXTA */}
        <div className="mt-12 mb-8">
          <a href="https://trinexta.com" target="_blank" rel="noopener noreferrer" className="block group">
            <div className="bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-blue-600/10 border-2 border-blue-500/30 rounded-2xl p-8 hover:border-blue-500/60 transition-all">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="bg-white p-5 rounded-xl shadow-lg flex-shrink-0">
                    <img 
                      src="https://trinexta.com/wp-content/uploads/2025/07/Logosignaturetrinexta-e1752825280915.png" 
                      alt="TRINEXTA" 
                      className="h-14 w-auto"
                    />
                  </div>
                  <div className="text-center md:text-left">
                    <h3 className="text-white font-bold text-xl mb-2">
                      Besoin d'un support IT pour votre entreprise ?
                    </h3>
                    <p className="text-gray-300 text-sm mb-3">
                      Découvrez TRINEXTA, notre service d'infogérance dédié aux TPE/PME
                    </p>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-gray-400">
                      <span>✅ Maintenance préventive</span>
                      <span>✅ Support réactif 24/7</span>
                      <span>✅ Solutions sur mesure</span>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <div className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold group-hover:bg-blue-50 transition-all shadow-lg">
                    En savoir plus
                    <ExternalLink className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          </a>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-gray-400">
            © 2025 LeadSynch - Une marque de{' '}
            <a href="https://www.trinexta.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-400">
              TrusTech IT Support (TRINEXTA)
            </a>
          </p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link to="/terms" className="text-sm text-gray-400 hover:text-white transition-colors">CGU</Link>
            <Link to="/sales" className="text-sm text-gray-400 hover:text-white transition-colors">CGV</Link>
            <Link to="/privacy" className="text-sm text-gray-400 hover:text-white transition-colors">RGPD</Link>
            <Link to="/legal" className="text-sm text-gray-400 hover:text-white transition-colors">Mentions légales</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}