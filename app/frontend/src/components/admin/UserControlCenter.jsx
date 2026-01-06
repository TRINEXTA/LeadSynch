import React, { useState, useMemo } from 'react';
import {
  Users, Search, Filter, Eye, Clock, Activity,
  Wifi, WifiOff, Monitor, Smartphone, Tablet,
  ChevronLeft, ChevronRight, X, LayoutGrid, List,
  TrendingUp, UserCheck, UserX, AlertCircle
} from 'lucide-react';

// User Control Center - Professional Admin Dashboard Component
const ITEMS_PER_PAGE = 10;

export default function UserControlCenter({
  users = [],
  stats = { online: 0, idle: 0, offline: 0, total: 0 },
  onViewHistory,
  formatRelativeTime,
  formatDuration
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'

  // Filtrer les utilisateurs
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = !searchQuery ||
        `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || user.presence_status === statusFilter;
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, searchQuery, statusFilter, roleFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Obtenir les rôles uniques
  const uniqueRoles = [...new Set(users.map(u => u.role).filter(Boolean))];

  // Reset page when filters change
  const handleFilterChange = (setter) => (value) => {
    setter(value);
    setCurrentPage(1);
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'online':
        return {
          color: 'emerald',
          bgColor: 'bg-emerald-500/20',
          borderColor: 'border-emerald-500/40',
          textColor: 'text-emerald-400',
          dotColor: 'bg-emerald-500',
          icon: Wifi,
          label: 'En ligne'
        };
      case 'idle':
        return {
          color: 'amber',
          bgColor: 'bg-amber-500/20',
          borderColor: 'border-amber-500/40',
          textColor: 'text-amber-400',
          dotColor: 'bg-amber-500',
          icon: Clock,
          label: 'Inactif'
        };
      default:
        return {
          color: 'slate',
          bgColor: 'bg-slate-500/20',
          borderColor: 'border-slate-500/40',
          textColor: 'text-slate-400',
          dotColor: 'bg-slate-500',
          icon: WifiOff,
          label: 'Hors ligne'
        };
    }
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin: 'Administrateur',
      manager: 'Manager',
      supervisor: 'Superviseur',
      commercial: 'Commercial',
      user: 'Utilisateur'
    };
    return labels[role] || role;
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      admin: 'bg-red-500/20 text-red-300 border-red-500/30',
      manager: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      supervisor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      commercial: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      user: 'bg-slate-500/20 text-slate-300 border-slate-500/30'
    };
    return colors[role] || 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  };

  return (
    <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600/30 to-violet-600/30 border-b border-white/10 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl shadow-lg shadow-indigo-500/25">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                Centre de Contrôle
                <span className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold rounded-full animate-pulse">
                  LIVE
                </span>
              </h2>
              <p className="text-slate-400 text-sm mt-0.5">
                Surveillance en temps réel de l'activité des utilisateurs
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="flex items-center gap-3">
            <StatCard
              icon={UserCheck}
              value={stats.online}
              label="En ligne"
              color="emerald"
              pulse
            />
            <StatCard
              icon={Clock}
              value={stats.idle}
              label="Inactifs"
              color="amber"
            />
            <StatCard
              icon={UserX}
              value={stats.offline}
              label="Hors ligne"
              color="slate"
            />
            <StatCard
              icon={Users}
              value={stats.total}
              label="Total"
              color="indigo"
            />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 border-b border-white/10 bg-slate-900/50">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Rechercher un utilisateur..."
              value={searchQuery}
              onChange={(e) => handleFilterChange(setSearchQuery)(e.target.value)}
              className="w-full pl-12 pr-10 py-3 bg-slate-800/80 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => handleFilterChange(setSearchQuery)('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <select
                value={statusFilter}
                onChange={(e) => handleFilterChange(setStatusFilter)(e.target.value)}
                className="px-4 py-2.5 bg-slate-800/80 border border-slate-700/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
              >
                <option value="all">Tous les statuts</option>
                <option value="online">En ligne</option>
                <option value="idle">Inactif</option>
                <option value="offline">Hors ligne</option>
              </select>
            </div>

            <select
              value={roleFilter}
              onChange={(e) => handleFilterChange(setRoleFilter)(e.target.value)}
              className="px-4 py-2.5 bg-slate-800/80 border border-slate-700/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
            >
              <option value="all">Tous les rôles</option>
              {uniqueRoles.map(role => (
                <option key={role} value={role}>{getRoleLabel(role)}</option>
              ))}
            </select>

            {/* View Toggle */}
            <div className="flex items-center bg-slate-800/80 border border-slate-700/50 rounded-xl p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filters */}
        {(searchQuery || statusFilter !== 'all' || roleFilter !== 'all') && (
          <div className="flex items-center gap-2 mt-3">
            <span className="text-slate-500 text-sm">Filtres actifs:</span>
            {searchQuery && (
              <FilterTag
                label={`"${searchQuery}"`}
                onRemove={() => handleFilterChange(setSearchQuery)('')}
              />
            )}
            {statusFilter !== 'all' && (
              <FilterTag
                label={getStatusConfig(statusFilter).label}
                onRemove={() => handleFilterChange(setStatusFilter)('all')}
              />
            )}
            {roleFilter !== 'all' && (
              <FilterTag
                label={getRoleLabel(roleFilter)}
                onRemove={() => handleFilterChange(setRoleFilter)('all')}
              />
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 bg-slate-800 rounded-full flex items-center justify-center">
              <Users className="w-10 h-10 text-slate-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Aucun utilisateur trouvé</h3>
            <p className="text-slate-400">
              {searchQuery || statusFilter !== 'all' || roleFilter !== 'all'
                ? 'Essayez de modifier vos filtres de recherche'
                : 'Aucun utilisateur dans votre organisation'}
            </p>
          </div>
        ) : viewMode === 'table' ? (
          <TableView
            users={paginatedUsers}
            getStatusConfig={getStatusConfig}
            getRoleLabel={getRoleLabel}
            getRoleBadgeColor={getRoleBadgeColor}
            formatRelativeTime={formatRelativeTime}
            formatDuration={formatDuration}
            onViewHistory={onViewHistory}
          />
        ) : (
          <CardsView
            users={paginatedUsers}
            getStatusConfig={getStatusConfig}
            getRoleLabel={getRoleLabel}
            getRoleBadgeColor={getRoleBadgeColor}
            formatRelativeTime={formatRelativeTime}
            formatDuration={formatDuration}
            onViewHistory={onViewHistory}
          />
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-white/10 bg-slate-900/50">
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-sm">
              Affichage de <span className="text-white font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> à{' '}
              <span className="text-white font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)}</span> sur{' '}
              <span className="text-white font-medium">{filteredUsers.length}</span> utilisateurs
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 rounded-lg font-medium transition-all ${
                        currentPage === pageNum
                          ? 'bg-indigo-500 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-components
function StatCard({ icon: Icon, value, label, color, pulse }) {
  const colors = {
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400',
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400',
    slate: 'from-slate-500/20 to-slate-600/10 border-slate-500/30 text-slate-400',
    indigo: 'from-indigo-500/20 to-indigo-600/10 border-indigo-500/30 text-indigo-400'
  };

  return (
    <div className={`px-4 py-3 bg-gradient-to-br ${colors[color]} border rounded-xl`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-${color}-500/20`}>
          <Icon className={`w-4 h-4 ${pulse ? 'animate-pulse' : ''}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

function FilterTag({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-indigo-300 text-sm">
      {label}
      <button onClick={onRemove} className="hover:bg-indigo-500/30 rounded-full p-0.5 transition-colors">
        <X className="w-3.5 h-3.5" />
      </button>
    </span>
  );
}

function TableView({ users, getStatusConfig, getRoleLabel, getRoleBadgeColor, formatRelativeTime, formatDuration, onViewHistory }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700/50">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-800/50">
            <th className="text-left py-4 px-5 text-slate-400 font-semibold text-sm uppercase tracking-wider">
              Utilisateur
            </th>
            <th className="text-center py-4 px-5 text-slate-400 font-semibold text-sm uppercase tracking-wider">
              Statut
            </th>
            <th className="text-left py-4 px-5 text-slate-400 font-semibold text-sm uppercase tracking-wider">
              Dernière activité
            </th>
            <th className="text-center py-4 px-5 text-slate-400 font-semibold text-sm uppercase tracking-wider">
              Temps connecté
            </th>
            <th className="text-center py-4 px-5 text-slate-400 font-semibold text-sm uppercase tracking-wider">
              Actions
            </th>
            <th className="text-center py-4 px-5 text-slate-400 font-semibold text-sm uppercase tracking-wider">
              Détails
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/30">
          {users.map((user) => {
            const statusConfig = getStatusConfig(user.presence_status);
            const StatusIcon = statusConfig.icon;

            return (
              <tr
                key={user.id}
                className="hover:bg-slate-800/30 transition-colors group"
              >
                <td className="py-4 px-5">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg ${
                        user.presence_status === 'online'
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                          : user.presence_status === 'idle'
                          ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                          : 'bg-gradient-to-br from-slate-600 to-slate-700'
                      }`}>
                        {user.first_name?.[0]}{user.last_name?.[0]}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${statusConfig.dotColor} ${user.presence_status === 'online' ? 'animate-pulse' : ''}`} />
                    </div>
                    <div>
                      <p className="text-white font-semibold">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-slate-500 text-sm">{user.email}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-md border ${getRoleBadgeColor(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-5 text-center">
                  <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig.bgColor} ${statusConfig.textColor} border ${statusConfig.borderColor}`}>
                    <StatusIcon className={`w-4 h-4 ${user.presence_status === 'online' ? 'animate-pulse' : ''}`} />
                    {statusConfig.label}
                  </span>
                </td>
                <td className="py-4 px-5">
                  <div>
                    <p className={`font-medium ${statusConfig.textColor}`}>
                      {formatRelativeTime(user.last_activity)}
                    </p>
                    {user.current_page && (
                      <p className="text-slate-500 text-sm mt-1 flex items-center gap-1">
                        <Monitor className="w-3.5 h-3.5" />
                        {user.current_page}
                      </p>
                    )}
                  </div>
                </td>
                <td className="py-4 px-5 text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-bold text-white">
                      {formatDuration(user.time_online_today)}
                    </span>
                    <span className="text-slate-500 text-xs">aujourd'hui</span>
                  </div>
                </td>
                <td className="py-4 px-5 text-center">
                  <div className="flex flex-col items-center">
                    <span className={`text-lg font-bold ${
                      (user.actions_today || 0) > 50 ? 'text-emerald-400' :
                      (user.actions_today || 0) > 20 ? 'text-blue-400' :
                      (user.actions_today || 0) > 0 ? 'text-white' : 'text-slate-500'
                    }`}>
                      {user.actions_today || 0}
                    </span>
                    <span className="text-slate-500 text-xs">actions</span>
                  </div>
                </td>
                <td className="py-4 px-5 text-center">
                  <button
                    onClick={() => onViewHistory(user.id, `${user.first_name} ${user.last_name}`)}
                    className="p-2.5 bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/30 rounded-xl text-indigo-400 hover:text-white transition-all group-hover:scale-105"
                    title="Voir l'historique détaillé"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CardsView({ users, getStatusConfig, getRoleLabel, getRoleBadgeColor, formatRelativeTime, formatDuration, onViewHistory }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {users.map((user) => {
        const statusConfig = getStatusConfig(user.presence_status);
        const StatusIcon = statusConfig.icon;

        return (
          <div
            key={user.id}
            className={`relative overflow-hidden rounded-2xl border transition-all hover:scale-[1.02] hover:shadow-xl ${
              user.presence_status === 'online'
                ? 'bg-gradient-to-br from-emerald-900/20 to-slate-900 border-emerald-500/30'
                : user.presence_status === 'idle'
                ? 'bg-gradient-to-br from-amber-900/20 to-slate-900 border-amber-500/30'
                : 'bg-gradient-to-br from-slate-800/50 to-slate-900 border-slate-700/50'
            }`}
          >
            {/* Status indicator line */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${
              user.presence_status === 'online' ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
              user.presence_status === 'idle' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
              'bg-gradient-to-r from-slate-600 to-slate-700'
            }`} />

            <div className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg ${
                      user.presence_status === 'online'
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                        : user.presence_status === 'idle'
                        ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                        : 'bg-gradient-to-br from-slate-600 to-slate-700'
                    }`}>
                      {user.first_name?.[0]}{user.last_name?.[0]}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${statusConfig.dotColor} ${user.presence_status === 'online' ? 'animate-pulse' : ''}`} />
                  </div>
                  <div>
                    <p className="text-white font-semibold">
                      {user.first_name} {user.last_name}
                    </p>
                    <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-md border ${getRoleBadgeColor(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </div>
                </div>

                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor} border ${statusConfig.borderColor}`}>
                  <StatusIcon className={`w-3.5 h-3.5 ${user.presence_status === 'online' ? 'animate-pulse' : ''}`} />
                  {statusConfig.label}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-white">{formatDuration(user.time_online_today)}</p>
                  <p className="text-slate-500 text-xs">Temps connecté</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                  <p className={`text-xl font-bold ${
                    (user.actions_today || 0) > 50 ? 'text-emerald-400' :
                    (user.actions_today || 0) > 20 ? 'text-blue-400' :
                    'text-white'
                  }`}>
                    {user.actions_today || 0}
                  </p>
                  <p className="text-slate-500 text-xs">Actions</p>
                </div>
              </div>

              {/* Last activity */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Dernière activité:</span>
                <span className={statusConfig.textColor}>{formatRelativeTime(user.last_activity)}</span>
              </div>

              {/* Action button */}
              <button
                onClick={() => onViewHistory(user.id, `${user.first_name} ${user.last_name}`)}
                className="w-full mt-4 py-2.5 bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/30 rounded-xl text-indigo-400 hover:text-white transition-all flex items-center justify-center gap-2 font-medium"
              >
                <Eye className="w-4 h-4" />
                Voir l'historique
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
