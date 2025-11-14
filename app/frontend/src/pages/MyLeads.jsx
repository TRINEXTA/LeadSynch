import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import {
  User, Mail, Phone, MapPin, Building2, Globe,
  Calendar, TrendingUp, Target, CheckCircle,
  Clock, AlertCircle, XCircle, Star,
  Filter, Search, BarChart3
} from "lucide-react";
import api from "../api/axios";

export default function MyLeads() {
  const { user } = useContext(AuthContext);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);

  useEffect(() => {
    loadMyLeads();
  }, []);

  const loadMyLeads = async () => {
    try {
      setLoading(true);
      const response = await api.get('/leads');
      // Filtrer uniquement les leads assignés à l'utilisateur connecté
      const myLeads = (response.data.leads || []).filter(
        lead => lead.assigned_to === user?.id
      );
      setLeads(myLeads);
    } catch (error) {
      console.error('Erreur chargement leads:', error);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      'new': {
        label: 'Nouveau',
        color: 'from-blue-500 to-cyan-500',
        icon: Star,
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700'
      },
      'assigned': {
        label: 'Assigné',
        color: 'from-purple-500 to-pink-500',
        icon: User,
        bgColor: 'bg-purple-50',
        textColor: 'text-purple-700'
      },
      'contacted': {
        label: 'Contacté',
        color: 'from-yellow-500 to-orange-500',
        icon: Phone,
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-700'
      },
      'qualified': {
        label: 'Qualifié',
        color: 'from-green-500 to-emerald-500',
        icon: CheckCircle,
        bgColor: 'bg-green-50',
        textColor: 'text-green-700'
      },
      'lost': {
        label: 'Perdu',
        color: 'from-red-500 to-pink-500',
        icon: XCircle,
        bgColor: 'bg-red-50',
        textColor: 'text-red-700'
      }
    };
    return configs[status] || configs['new'];
  };

  // Filtrage et recherche
  const filteredLeads = leads.filter(lead => {
    const matchesStatus = filter === 'all' || lead.status === filter;
    const matchesSearch = !searchTerm ||
      lead.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone?.includes(searchTerm);
    return matchesStatus && matchesSearch;
  });

  // Statistiques
  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    qualified: leads.filter(l => l.status === 'qualified').length,
    lost: leads.filter(l => l.status === 'lost').length
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
        <p className="text-gray-600 font-medium">Chargement de vos leads...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 p-6">
      {/* Header avec gradient */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              Mes Leads
            </h1>
            <p className="text-blue-100 text-lg">
              {leads.length} lead{leads.length > 1 ? 's' : ''} assigné{leads.length > 1 ? 's' : ''} • {user?.first_name} {user?.last_name}
            </p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <Target className="w-12 h-12" />
          </div>
        </div>
      </div>

      {/* Statistiques Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Total', value: stats.total, color: 'from-gray-500 to-gray-600', icon: BarChart3, status: 'all' },
          { label: 'Nouveaux', value: stats.new, color: 'from-blue-500 to-cyan-500', icon: Star, status: 'new' },
          { label: 'Contactés', value: stats.contacted, color: 'from-yellow-500 to-orange-500', icon: Phone, status: 'contacted' },
          { label: 'Qualifiés', value: stats.qualified, color: 'from-green-500 to-emerald-500', icon: CheckCircle, status: 'qualified' },
          { label: 'Perdus', value: stats.lost, color: 'from-red-500 to-pink-500', icon: XCircle, status: 'lost' }
        ].map((stat, idx) => {
          const Icon = stat.icon;
          const isActive = filter === stat.status;
          return (
            <div
              key={idx}
              onClick={() => setFilter(stat.status)}
              className={`
                bg-white rounded-xl shadow-lg p-6 cursor-pointer
                transform transition-all duration-300
                hover:scale-105 hover:shadow-2xl
                ${isActive ? 'ring-4 ring-blue-500 scale-105' : ''}
              `}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-3 rounded-lg bg-gradient-to-br ${stat.color}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                {isActive && <CheckCircle className="w-5 h-5 text-blue-600" />}
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-gray-600 font-medium">
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Barre de recherche et filtres */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher par nom, email, téléphone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>
          <button
            onClick={loadMyLeads}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all"
          >
            Actualiser
          </button>
        </div>
      </div>

      {/* Liste des leads */}
      {filteredLeads.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-12 h-12 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {searchTerm ? 'Aucun résultat' : 'Aucun lead assigné'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm
              ? 'Essayez de modifier vos critères de recherche'
              : 'Vous n\'avez pas encore de leads assignés'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLeads.map((lead) => {
            const statusConfig = getStatusConfig(lead.status);
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer transform hover:scale-105 border-2 border-transparent hover:border-blue-500"
              >
                {/* Header avec gradient */}
                <div className={`bg-gradient-to-r ${statusConfig.color} p-4 text-white`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <StatusIcon className="w-5 h-5" />
                      <span className="text-sm font-semibold uppercase tracking-wider">
                        {statusConfig.label}
                      </span>
                    </div>
                    {lead.score && (
                      <div className="bg-white/30 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-bold">
                        Score: {lead.score}
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-bold truncate">
                    {lead.company_name || 'Entreprise sans nom'}
                  </h3>
                </div>

                {/* Contenu */}
                <div className="p-4 space-y-3">
                  {lead.contact_name && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <User className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span className="truncate">{lead.contact_name}</span>
                    </div>
                  )}

                  {lead.email && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Mail className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span className="truncate text-sm">{lead.email}</span>
                    </div>
                  )}

                  {lead.phone && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Phone className="w-4 h-4 text-purple-600 flex-shrink-0" />
                      <span className="truncate">{lead.phone}</span>
                    </div>
                  )}

                  {lead.city && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <MapPin className="w-4 h-4 text-red-600 flex-shrink-0" />
                      <span className="truncate">{lead.city}</span>
                    </div>
                  )}

                  {lead.website && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Globe className="w-4 h-4 text-cyan-600 flex-shrink-0" />
                      <a
                        href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-sm text-blue-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {lead.website}
                      </a>
                    </div>
                  )}

                  {lead.sector && (
                    <div className="mt-3">
                      <span className="inline-block px-3 py-1 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 rounded-lg text-xs font-semibold">
                        {lead.sector}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className={`${statusConfig.bgColor} px-4 py-3 flex items-center justify-between text-sm`}>
                  <span className={`${statusConfig.textColor} font-medium`}>
                    <Calendar className="w-4 h-4 inline mr-1" />
                    {lead.created_at ? new Date(lead.created_at).toLocaleDateString('fr-FR') : 'N/A'}
                  </span>
                  {lead.deal_value && (
                    <span className="font-bold text-green-700">
                      {lead.deal_value}€
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal détails lead */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className={`bg-gradient-to-r ${getStatusConfig(selectedLead.status).color} p-6 text-white`}>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                  {selectedLead.company_name}
                </h2>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 font-semibold">Contact</label>
                  <p className="text-gray-900">{selectedLead.contact_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 font-semibold">Statut</label>
                  <p className="text-gray-900 capitalize">{getStatusConfig(selectedLead.status).label}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 font-semibold">Email</label>
                  <p className="text-gray-900 text-sm">{selectedLead.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 font-semibold">Téléphone</label>
                  <p className="text-gray-900">{selectedLead.phone || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 font-semibold">Ville</label>
                  <p className="text-gray-900">{selectedLead.city || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 font-semibold">Secteur</label>
                  <p className="text-gray-900">{selectedLead.sector || 'N/A'}</p>
                </div>
              </div>

              {selectedLead.notes && (
                <div>
                  <label className="text-sm text-gray-600 font-semibold">Notes</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg mt-1">
                    {selectedLead.notes}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <a
                  href={`tel:${selectedLead.phone}`}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold text-center hover:shadow-lg transform hover:scale-105 transition-all"
                >
                  <Phone className="w-5 h-5 inline mr-2" />
                  Appeler
                </a>
                <a
                  href={`mailto:${selectedLead.email}`}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-center hover:shadow-lg transform hover:scale-105 transition-all"
                >
                  <Mail className="w-5 h-5 inline mr-2" />
                  Email
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}