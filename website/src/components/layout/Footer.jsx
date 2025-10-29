import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Linkedin, Twitter, Facebook, ExternalLink } from 'lucide-react';

export default function Footer() {
  return (
    <footer className='bg-gray-900 text-gray-300'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'>
        <div className='grid grid-cols-1 md:grid-cols-4 gap-8'>
          <div className='col-span-1'>
            <Link to='/' className='flex items-center gap-2 mb-4'>
              <div className='w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center'>
                <span className='text-white font-bold text-xl'>LS</span>
              </div>
              <span className='text-2xl font-bold text-white'>LeadSynch</span>
            </Link>
            <p className='text-sm text-gray-400 mb-4'>
              La plateforme CRM intelligente pour automatiser votre prospection B2B.
            </p>
          </div>
          <div>
            <h3 className='text-white font-semibold mb-4'>Produit</h3>
            <ul className='space-y-2'>
              <li><Link to='/features' className='text-sm hover:text-white transition-colors'>Fonctionnalités</Link></li>
              <li><Link to='/pricing' className='text-sm hover:text-white transition-colors'>Tarifs</Link></li>
              <li><Link to='/register' className='text-sm hover:text-white transition-colors'>Essai gratuit</Link></li>
            </ul>
          </div>
          <div>
            <h3 className='text-white font-semibold mb-4'>Entreprise</h3>
            <ul className='space-y-2'>
              <li><Link to='/legal' className='text-sm hover:text-white transition-colors'>Mentions légales</Link></li>
              <li><Link to='/terms' className='text-sm hover:text-white transition-colors'>CGU</Link></li>
              <li><Link to='/sales' className='text-sm hover:text-white transition-colors'>CGV</Link></li>
              <li><Link to='/privacy' className='text-sm hover:text-white transition-colors'>RGPD</Link></li>
            </ul>
          </div>
          <div>
            <h3 className='text-white font-semibold mb-4'>Contact</h3>
            <p className='text-sm'><a href='mailto:contact@leadsynch.com'>contact@leadsynch.com</a></p>
            <p className='text-sm'>09 78 25 07 46</p>
          </div>
        </div>
        <div className='mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-400'>
          <p>© 2025 LeadSynch - Une marque de TrusTech IT Support</p>
        </div>
      </div>
    </footer>
  );
}
