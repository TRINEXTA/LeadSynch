import { log, error, warn } from "../../lib/logger.js";
﻿import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Database,
  UserCircle,
  Phone,
  Mail,
  BarChart3,
  Settings,
  LogOut,
  Sparkles,
  FileSpreadsheet,
  Target,
  TrendingUp,
  Shield,
  Search,
  FolderOpen,
  Calendar,
  Zap,
  TestTube,
  Megaphone,
  CreditCard,
  DollarSign,
  Copy,
  GraduationCap,
  MapPin,
  CheckCircle,
  Package,
  Crown,
  Activity,
  FileText,
  FileCheck
} from 'lucide-react'
import { LogoDark } from '../branding/LeadSynchLogo'
import { useAuth } from '../../context/AuthContext'
import { useState } from 'react'

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [expandedSections, setExpandedSections] = useState({
    leads: true,
    campaigns: false,
    email: false,
    generation: false,
    billing: false,
    admin: false
  })

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const isAdmin = user?.role === 'admin'
  const isManager = user?.role === 'manager'
  const isCommercial = user?.role === 'commercial'
  const isSuperAdmin = user?.is_super_admin === true

  const navigation = {
    main: [
      { name: 'Centre de Contrôle Admin', href: '/dashboard-admin', icon: Shield, roles: ['admin'], badge: 'ADMIN' },
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin'] },
      { name: 'Dashboard Manager', href: '/dashboard-manager', icon: BarChart3, roles: ['manager', 'admin'] },
      { name: 'Mon Dashboard', href: '/CommercialDashboard', icon: Target, roles: ['commercial'] }
    ],

    leads: {
      title: 'Leads & Prospects',
      icon: Database,
      items: [
        { name: 'Mes Prospects', href: '/MyLeads', icon: UserCircle, roles: ['commercial', 'manager'] },
        { name: 'Tous les Leads', href: '/leads', icon: Database, roles: ['admin', 'manager'] },
        { name: 'Bases de Données', href: '/LeadDatabases', icon: FolderOpen, roles: ['admin', 'manager'] },
        { name: 'Importer des Leads', href: '/ImportLeads', icon: FileSpreadsheet, roles: ['admin', 'manager'] },
        { name: 'Scoring & Qualification', href: '/LeadScoring', icon: TrendingUp, roles: ['admin', 'manager'] }
      ]
    },

    campaigns: {
      title: 'Campagnes',
      icon: Megaphone,
      items: [
        { name: 'Mes Tâches', href: '/my-tasks', icon: CheckCircle, roles: ['commercial', 'admin', 'manager'] },
        { name: 'Mes Rappels', href: '/FollowUps', icon: Calendar, roles: ['commercial', 'admin', 'manager'] },
        { name: 'Mode Prospection', href: '/ProspectingMode', icon: Phone, roles: ['commercial', 'admin', 'manager'] },
        { name: 'Pipeline Commercial', href: '/pipeline', icon: TrendingUp, roles: ['commercial', 'admin', 'manager'] },
        { name: 'Mes Propositions', href: '/proposals', icon: FileText, roles: ['commercial', 'admin', 'manager'] },
        { name: 'Contrats', href: '/contracts', icon: FileCheck, roles: ['commercial', 'admin', 'manager'] },
        { name: 'Gestion Campagnes', href: '/CampaignsManager', icon: Target, roles: ['admin', 'manager'] },
        { name: 'Campagnes', href: '/Campaigns', icon: Mail, roles: ['admin', 'manager'] },
        { name: 'Statistiques', href: '/Statistics', icon: BarChart3, roles: ['admin'] }
      ]
    },

    email: {
      title: 'Email Marketing',
      icon: Mail,
      roles: ['admin', 'manager'],
      items: [
        { name: 'Templates Email', href: '/EmailTemplates', icon: Mail },
        { name: 'Config Mailing', href: '/MailingSettings', icon: Settings },
        { name: 'Test Envoi', href: '/TestMailing', icon: TestTube },
        { name: 'Diagnostic Spam', href: '/SpamDiagnostic', icon: Shield }
      ]
    },

    generation: {
      title: 'Génération IA',
      icon: Sparkles,
      roles: ['admin', 'manager'],
      items: [
        { name: 'Génération de Leads', href: '/LeadGeneration', icon: Search },
        { name: 'Recatégoriser (IA)', href: '/RecategorizeLeads', icon: Sparkles },
        { name: 'Détection de Doublons', href: '/duplicates', icon: Copy }
      ]
    },

    billing: {
      title: 'Facturation & Crédits',
      icon: CreditCard,
      roles: ['admin'], // ❌ Managers n'ont PAS accès à la facturation
      items: [
        { name: 'Crédits Leads', href: '/lead-credits', icon: Zap },
        { name: 'Services & Abonnements', href: '/services', icon: CreditCard },
        { name: 'Plans & Tarifs', href: '/billing', icon: DollarSign }
      ]
    },

    admin: {
      title: 'Administration',
      icon: Settings,
      roles: ['admin', 'manager'],
      items: [
        { name: 'Équipes', href: '/teams', icon: Users, roles: ['admin', 'manager'] },
        { name: 'Utilisateurs', href: '/users', icon: UserCircle, roles: ['admin'] }, // ❌ Seul admin peut gérer TOUS les users
        { name: 'Gestion Équipe', href: '/ManageTeam', icon: Users, roles: ['admin', 'manager'] },
        { name: 'Config Business', href: '/BusinessSettings', icon: Package, roles: ['admin', 'manager'] },
        { name: 'Secteurs Géographiques', href: '/geographic-sectors', icon: MapPin, roles: ['admin', 'manager'] },
        { name: 'Taxonomie Secteurs', href: '/ManageSectorTaxonomy', icon: FolderOpen, roles: ['admin', 'manager'] },
        { name: 'Migration Leads', href: '/MigrateLeads', icon: Database, roles: ['admin'] },
        { name: 'Zone de Test', href: '/TestZone', icon: TestTube, roles: ['admin'] },
        { name: 'Formation', href: '/Formation', icon: GraduationCap, roles: ['admin', 'manager'] }
      ]
    },

    super_admin: {
      title: '👑 SUPER-ADMIN TRINEXTA',
      icon: Crown,
      requireSuperAdmin: true,
      items: [
        { name: 'Dashboard Super-Admin', href: '/super-admin', icon: Activity },
        { name: 'Gestion Clients', href: '/super-admin/tenants', icon: Users },
        { name: 'Abonnements', href: '/super-admin/subscriptions', icon: CreditCard },
        { name: 'Factures & Paiements', href: '/super-admin/invoices', icon: FileText }
      ]
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const hasAccess = (roles) => {
    if (!roles) return true
    return roles.includes(user?.role)
  }

  const renderNavItem = (item) => {
    const Icon = item.icon
    const isActive = location.pathname === item.href
    const linkClass = isActive
      ? 'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors bg-indigo-600 text-white'
      : 'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors text-gray-300 hover:bg-gray-800 hover:text-white'

    return (
      <Link key={item.name} to={item.href} className={linkClass}>
        <Icon className='w-4 h-4 mr-2' />
        {item.name}
      </Link>
    )
  }

  const renderSection = (sectionKey, section) => {
    if (section.roles && !hasAccess(section.roles)) return null
    if (section.requireSuperAdmin && !isSuperAdmin) return null

    const Icon = section.icon
    const isExpanded = expandedSections[sectionKey]

    return (
      <div key={sectionKey} className='mb-2'>
        <button
          onClick={() => toggleSection(sectionKey)}
          className='w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors'
        >
          <div className='flex items-center'>
            <Icon className='w-4 h-4 mr-2' />
            {section.title}
          </div>
          <span className='text-xs'>{isExpanded ? '▼' : '▶'}</span>
        </button>
        {isExpanded && (
          <div className='ml-2 mt-1 space-y-1'>
            {section.items
              .filter(item => hasAccess(item.roles))
              .map(item => renderNavItem(item))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className='flex flex-col h-full bg-gray-900 text-white w-64 overflow-y-auto'>
      <div className='p-6 flex items-center justify-center'>
        <LogoDark size="medium" animated={true} />
      </div>

      <nav className='flex-1 px-3 space-y-2'>
        {/* Navigation principale */}
        <div className='space-y-1 mb-4'>
          {navigation.main
            .filter(item => hasAccess(item.roles))
            .map(item => renderNavItem(item))}
        </div>

        {/* Super-Admin TRINEXTA (visible seulement pour super-admins) */}
        {renderSection('super_admin', navigation.super_admin)}

        {/* Sections normales */}
        {renderSection('leads', navigation.leads)}
        {renderSection('campaigns', navigation.campaigns)}
        {renderSection('email', navigation.email)}
        {renderSection('generation', navigation.generation)}
        {renderSection('billing', navigation.billing)}
        {renderSection('admin', navigation.admin)}
      </nav>

      <div className='p-4 border-t border-gray-800'>
        <div className='flex items-center mb-3'>
          <div className='w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-semibold text-sm'>
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div className='ml-3'>
            <p className='text-sm font-medium'>{user?.first_name} {user?.last_name}</p>
            <p className='text-xs text-gray-400'>{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className='w-full flex items-center justify-center px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-sm font-medium'
        >
          <LogOut className='w-4 h-4 mr-2' />
          Déconnexion
        </button>
      </div>
    </div>
  )
}