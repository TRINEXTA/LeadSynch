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
  FileCheck,
  Clock
} from 'lucide-react'
import { LogoDark } from '../branding/LeadSynchLogo'
import { useAuth } from '../../context/AuthContext'
import { useState, useCallback, useMemo, memo } from 'react'
import { PERMISSIONS, hasPermission } from '../../lib/permissions'

function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [expandedSections, setExpandedSections] = useState({
    leads: true,
    campaigns: false,
    email: false,
    generation: false,
    billing: false,
    admin: false,
    personal: false
  })

  const toggleSection = useCallback((section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }, [])

  const isAdmin = user?.role === 'admin'
  const isManager = user?.role === 'manager'
  const isSupervisor = user?.role === 'supervisor'
  const isCommercial = user?.role === 'commercial'
  const isSuperAdmin = user?.is_super_admin === true

  // Fonction pour vérifier l'accès (rôle + permission) - mémoïsée
  const checkAccess = useCallback((item) => {
    // Pour les admins et super-admins, toujours autoriser
    if (isAdmin || isSuperAdmin) return true

    // Si roles défini, vérifier le rôle de base
    // Note: supervisor est traité comme manager pour l'accès aux menus
    if (item.roles) {
      const userRole = user?.role;
      const effectiveRoles = [...item.roles];
      // Si manager est dans la liste, ajouter aussi supervisor
      if (effectiveRoles.includes('manager') && !effectiveRoles.includes('supervisor')) {
        effectiveRoles.push('supervisor');
      }
      if (!effectiveRoles.includes(userRole)) return false;
    }

    // Pour les managers et supervisors, TOUJOURS vérifier les permissions si spécifiées
    if ((isManager || isSupervisor) && item.permission) {
      return hasPermission(user, item.permission)
    }

    // Pour les commerciaux avec permission requise, refuser
    if (isCommercial && item.permission) {
      return false
    }

    // Si pas de roles définis et pas de permission, tout le monde peut voir
    if (!item.roles) return true

    return true
  }, [user, isAdmin, isSuperAdmin, isManager, isSupervisor, isCommercial])

  const navigation = {
    main: [
      { name: 'Centre de Contrôle Admin', href: '/dashboard-admin', icon: Shield, roles: ['admin'], badge: 'ADMIN' },
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin'] },
      { name: 'Dashboard Manager', href: '/dashboard-manager', icon: BarChart3, roles: ['manager', 'supervisor', 'admin'] },
      { name: 'Mon Dashboard', href: '/CommercialDashboard', icon: Target, roles: ['commercial'] }
    ],

    leads: {
      title: 'Leads & Prospects',
      icon: Database,
      items: [
        { name: 'Mes Prospects', href: '/MyLeads', icon: UserCircle, roles: ['commercial', 'manager', 'supervisor'] },
        { name: 'Tous les Leads', href: '/leads', icon: Database, roles: ['admin', 'manager'], permission: PERMISSIONS.VIEW_ALL_LEADS },
        { name: 'Bases de Données', href: '/LeadDatabases', icon: FolderOpen, roles: ['admin', 'manager'], permission: PERMISSIONS.VIEW_DATABASES },
        { name: 'Bases Admin', href: '/LeadDatabasesAdmin', icon: Database, roles: ['admin'] },
        { name: 'Importer des Leads', href: '/ImportLeads', icon: FileSpreadsheet, roles: ['admin', 'manager'], permission: PERMISSIONS.IMPORT_LEADS },
        { name: 'Scoring & Qualification', href: '/LeadScoring', icon: TrendingUp, roles: ['admin'] }
      ]
    },

    campaigns: {
      title: 'Campagnes',
      icon: Megaphone,
      items: [
        { name: 'Mes Tâches', href: '/my-tasks', icon: CheckCircle, roles: ['commercial', 'admin', 'manager'] },
        { name: 'Mes Rappels', href: '/FollowUps', icon: Calendar, roles: ['commercial', 'admin', 'manager'] },
        { name: 'Mode Prospection', href: '/ProspectingMode', icon: Phone, roles: ['commercial', 'admin', 'manager'] },
        { name: 'Rapports Appels', href: '/call-reports', icon: Clock, roles: ['commercial', 'admin', 'manager'] },
        { name: 'Pipeline Commercial', href: '/pipeline', icon: TrendingUp, roles: ['commercial', 'admin', 'manager'] },
        { name: 'Mes Propositions', href: '/proposals', icon: FileText, roles: ['commercial', 'admin', 'manager'] },
        { name: 'Contrats', href: '/contracts', icon: FileCheck, roles: ['commercial', 'admin', 'manager'] },
        { name: 'Gestion Campagnes', href: '/CampaignsManager', icon: Target, roles: ['admin', 'manager'], permission: PERMISSIONS.CREATE_CAMPAIGNS },
        { name: 'Campagnes', href: '/Campaigns', icon: Mail, roles: ['admin', 'manager'], permission: PERMISSIONS.VIEW_ALL_CAMPAIGNS },
        { name: 'Statistiques', href: '/Statistics', icon: BarChart3, roles: ['admin'] }
      ]
    },

    email: {
      title: 'Email Marketing',
      icon: Mail,
      roles: ['admin', 'manager'],
      managerNeedsPermission: true, // Section entière nécessite permission pour managers
      items: [
        { name: 'Templates Email', href: '/EmailTemplates', icon: Mail, permission: PERMISSIONS.EMAIL_TEMPLATES_MARKETING },
        { name: 'Config Mailing', href: '/MailingSettings', icon: Settings, permission: PERMISSIONS.MAILING_CONFIG },
        { name: 'Test Envoi', href: '/TestMailing', icon: TestTube, permission: PERMISSIONS.TEST_MAILING },
        { name: 'Diagnostic Spam', href: '/SpamDiagnostic', icon: Shield, permission: PERMISSIONS.SPAM_DIAGNOSTIC }
      ]
    },

    generation: {
      title: 'Génération IA',
      icon: Sparkles,
      roles: ['admin', 'manager'],
      managerNeedsPermission: true,
      items: [
        { name: 'Génération de Leads', href: '/LeadGeneration', icon: Search, permission: PERMISSIONS.GENERATE_LEADS },
        { name: 'Recatégoriser (IA)', href: '/RecategorizeLeads', icon: Sparkles, permission: PERMISSIONS.RECATEGORIZE_AI },
        { name: 'Détection de Doublons', href: '/duplicates', icon: Copy, permission: PERMISSIONS.DETECT_DUPLICATES }
      ]
    },

    billing: {
      title: 'Facturation & Crédits',
      icon: CreditCard,
      roles: ['admin'],
      items: [
        { name: 'Crédits Prospects', href: '/lead-credits', icon: Zap },
        { name: 'Services & Abonnements', href: '/services', icon: CreditCard },
        { name: 'Plans & Tarifs', href: '/billing', icon: DollarSign }
      ]
    },

    admin: {
      title: 'Administration',
      icon: Settings,
      roles: ['admin', 'manager'],
      items: [
        { name: 'Rapports Utilisateurs', href: '/user-reports', icon: FileText, roles: ['admin', 'manager'] },
        { name: 'Équipes', href: '/teams', icon: Users, roles: ['admin', 'manager'] },
        { name: 'Utilisateurs', href: '/users', icon: UserCircle, roles: ['admin', 'manager', 'supervisor'], permission: PERMISSIONS.MANAGE_ALL_USERS },
        { name: 'Gestion Équipe', href: '/ManageTeam', icon: Users, roles: ['admin', 'manager'] },
        { name: 'Config Business', href: '/BusinessSettings', icon: Package, roles: ['admin', 'manager'], permission: PERMISSIONS.BUSINESS_CONFIG },
        { name: 'Secteurs Géographiques', href: '/geographic-sectors', icon: MapPin, roles: ['admin', 'manager'] },
        { name: 'Taxonomie Secteurs', href: '/ManageSectorTaxonomy', icon: FolderOpen, roles: ['admin', 'manager'] },
        { name: 'Migration Leads', href: '/MigrateLeads', icon: Database, roles: ['admin'] },
        { name: 'Zone de Test', href: '/TestZone', icon: TestTube, roles: ['admin'] },
        { name: 'Formation', href: '/Formation', icon: GraduationCap, roles: ['admin', 'manager'] }
      ]
    },

    personal: {
      title: 'Mon Espace',
      icon: UserCircle,
      items: [
        { name: 'Mon Profil', href: '/profile', icon: UserCircle },
        { name: 'Mes Commissions', href: '/my-commissions', icon: DollarSign, roles: ['admin', 'manager', 'commercial'] },
        { name: 'Planning', href: '/planning', icon: Calendar }
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

  const handleLogout = useCallback(() => {
    logout()
    navigate('/login')
  }, [logout, navigate])

  const hasAccess = useCallback((roles) => {
    if (!roles) return true
    // supervisor est traité comme manager pour l'accès aux sections
    const effectiveRoles = [...roles];
    if (effectiveRoles.includes('manager') && !effectiveRoles.includes('supervisor')) {
      effectiveRoles.push('supervisor');
    }
    return effectiveRoles.includes(user?.role)
  }, [user?.role])

  const renderNavItem = (item) => {
    // Vérifier l'accès complet (rôle + permission)
    if (!checkAccess(item)) return null

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

    // Pour les managers et supervisors, vérifier s'il y a au moins un item accessible
    const accessibleItems = section.items.filter(item => checkAccess(item))
    if (accessibleItems.length === 0 && (isManager || isSupervisor)) return null

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
            {section.items.map(item => renderNavItem(item)).filter(Boolean)}
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
        {renderSection('personal', navigation.personal)}
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

// Mémoïse le Sidebar pour éviter les re-renders inutiles
export default memo(Sidebar)