import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Mail, 
  Database, 
  BarChart3, 
  Settings, 
  FileText,
  UserPlus,
  Sparkles,
  CreditCard,
  LogOut
} from 'lucide-react';

export default function Sidebar() {
  const location = useLocation();
  
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Users, label: 'Leads', path: '/dashboard/leads' },
    { icon: Mail, label: 'Campagnes', path: '/dashboard/campaigns' },
    { icon: Database, label: 'Base de données', path: '/dashboard/database' },
    { icon: FileText, label: 'Templates', path: '/dashboard/templates' },
    { icon: BarChart3, label: 'Analytics', path: '/dashboard/analytics' },
    { icon: Sparkles, label: 'Asefi IA', path: '/dashboard/asefi' },
  ];

  const secondaryItems = [
    { icon: UserPlus, label: 'Équipe', path: '/dashboard/team' },
    { icon: CreditCard, label: 'Abonnement', path: '/dashboard/subscription' },
    { icon: Settings, label: 'Paramètres', path: '/dashboard/settings' },
  ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <aside className="w-64 bg-gradient-to-b from-gray-900 to-gray-800 text-white flex flex-col h-screen fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
            <span className="text-white font-bold text-xl">LS</span>
          </div>
          <div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              LeadSynch
            </span>
            <p className="text-xs text-gray-400">CRM Dashboard</p>
          </div>
        </Link>
      </div>

      {/* Navigation principale */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
          Principal
        </p>
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
              isActive(item.path)
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
            }`}
          >
            <item.icon className={`w-5 h-5 ${isActive(item.path) ? '' : 'group-hover:scale-110 transition-transform'}`} />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}

        <div className="pt-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
            Gestion
          </p>
          {secondaryItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
                isActive(item.path)
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive(item.path) ? '' : 'group-hover:scale-110 transition-transform'}`} />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* User Profile + Logout */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center gap-3 mb-3 px-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold">VR</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Valoux Prince</p>
            <p className="text-xs text-gray-400">Admin</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:bg-red-600/20 hover:text-red-400 transition-all group"
        >
          <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="font-medium">Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}