import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Mail, 
  TrendingUp, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  Target,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';

export default function Dashboard() {
  // Données simulées
  const stats = [
    {
      label: 'Total Leads',
      value: '1,247',
      change: '+12.5%',
      trend: 'up',
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      label: 'Emails envoyés',
      value: '12,458',
      change: '+8.2%',
      trend: 'up',
      icon: Mail,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      label: 'Taux de conversion',
      value: '28.4%',
      change: '+4.1%',
      trend: 'up',
      icon: TrendingUp,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-100'
    },
    {
      label: 'CA généré',
      value: '48,352€',
      change: '+18.7%',
      trend: 'up',
      icon: DollarSign,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

  const recentCampaigns = [
    { id: 1, name: 'Campagne Q1 - Prospection IT', sent: 1250, opened: 540, clicked: 180, status: 'completed' },
    { id: 2, name: 'Relance clients inactifs', sent: 850, opened: 320, clicked: 95, status: 'completed' },
    { id: 3, name: 'Webinar - Demo produit', sent: 2100, opened: 890, clicked: 420, status: 'active' },
    { id: 4, name: 'Offre spéciale printemps', sent: 450, opened: 0, clicked: 0, status: 'scheduled' }
  ];

  const recentLeads = [
    { id: 1, name: 'Sophie Martin', company: 'Tech Solutions', email: 'sophie@techsolutions.fr', status: 'hot', score: 95 },
    { id: 2, name: 'Thomas Dubois', company: 'Digital Agency', email: 'thomas@digital.fr', status: 'warm', score: 78 },
    { id: 3, name: 'Marie Lefebvre', company: 'SaaS Startup', email: 'marie@startup.fr', status: 'hot', score: 92 },
    { id: 4, name: 'Pierre Durant', company: 'E-commerce Pro', email: 'pierre@ecom.fr', status: 'cold', score: 45 },
  ];

  const getStatusBadge = (status) => {
    const badges = {
      completed: 'bg-green-100 text-green-700',
      active: 'bg-blue-100 text-blue-700',
      scheduled: 'bg-orange-100 text-orange-700'
    };
    return badges[status] || 'bg-gray-100 text-gray-700';
  };

  const getLeadStatusBadge = (status) => {
    const badges = {
      hot: 'bg-red-100 text-red-700',
      warm: 'bg-orange-100 text-orange-700',
      cold: 'bg-blue-100 text-blue-700'
    };
    return badges[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Vue d'ensemble de votre activité</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option>7 derniers jours</option>
            <option>30 derniers jours</option>
            <option>3 derniers mois</option>
            <option>Cette année</option>
          </select>
          <Link
            to="/dashboard/leads"
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
          >
            + Nouveau Lead
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 bg-gradient-to-br ${stat.color} bg-clip-text text-transparent`} style={{ WebkitTextFillColor: 'transparent' }} />
              </div>
              <div className={`flex items-center gap-1 text-sm font-semibold ${
                stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {stat.trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {stat.change}
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
            <div className="text-sm text-gray-600">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Chart */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Performance hebdomadaire</h2>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
              +12.5%
            </span>
          </div>
          <div className="grid grid-cols-7 gap-2 h-48 items-end">
            {[65, 78, 82, 90, 85, 95, 88].map((height, index) => (
              <div
                key={index}
                className="bg-gradient-to-t from-blue-600 to-purple-600 rounded-t-lg hover:scale-110 transition-transform cursor-pointer relative group"
                style={{ height: `${height}%` }}
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  {height}%
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2 mt-3 text-xs text-gray-500 text-center">
            <span>Lun</span>
            <span>Mar</span>
            <span>Mer</span>
            <span>Jeu</span>
            <span>Ven</span>
            <span>Sam</span>
            <span>Dim</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Actions rapides</h2>
          <div className="space-y-3">
            <Link to="/dashboard/leads" className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg hover:shadow-md transition-all group">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Ajouter des leads</p>
                <p className="text-sm text-gray-600">Import CSV ou manuel</p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
            </Link>

            <Link to="/dashboard/campaigns" className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg hover:shadow-md transition-all group">
              <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-teal-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Créer une campagne</p>
                <p className="text-sm text-gray-600">Email automatisé</p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-green-600" />
            </Link>

            <Link to="/dashboard/asefi" className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg hover:shadow-md transition-all group">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-600 to-red-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Générer du contenu IA</p>
                <p className="text-sm text-gray-600">Avec Asefi</p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-orange-600" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Campaigns */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Campagnes récentes</h2>
          <Link to="/dashboard/campaigns" className="text-blue-600 hover:text-blue-700 font-semibold text-sm">
            Voir tout →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Campagne</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Envoyés</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Ouverts</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Clics</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Statut</th>
              </tr>
            </thead>
            <tbody>
              {recentCampaigns.map((campaign) => (
                <tr key={campaign.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-4">
                    <p className="font-medium text-gray-900">{campaign.name}</p>
                  </td>
                  <td className="py-4 px-4 text-gray-600">{campaign.sent.toLocaleString()}</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900 font-medium">{campaign.opened.toLocaleString()}</span>
                      {campaign.sent > 0 && (
                        <span className="text-xs text-gray-500">
                          ({Math.round((campaign.opened / campaign.sent) * 100)}%)
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900 font-medium">{campaign.clicked.toLocaleString()}</span>
                      {campaign.opened > 0 && (
                        <span className="text-xs text-gray-500">
                          ({Math.round((campaign.clicked / campaign.opened) * 100)}%)
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(campaign.status)}`}>
                      {campaign.status === 'completed' && 'Terminée'}
                      {campaign.status === 'active' && 'En cours'}
                      {campaign.status === 'scheduled' && 'Planifiée'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Leads */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Leads récents</h2>
          <Link to="/dashboard/leads" className="text-blue-600 hover:text-blue-700 font-semibold text-sm">
            Voir tout →
          </Link>
        </div>
        <div className="space-y-3">
          {recentLeads.map((lead) => (
            <div key={lead.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">{lead.name.charAt(0)}</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{lead.name}</p>
                <p className="text-sm text-gray-600">{lead.company} • {lead.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">Score: {lead.score}</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getLeadStatusBadge(lead.status)}`}>
                    {lead.status === 'hot' && '🔥 Chaud'}
                    {lead.status === 'warm' && '🟡 Tiède'}
                    {lead.status === 'cold' && '❄️ Froid'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}