import React, { useState, useEffect } from 'react';
import { Target, Phone, Mail, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function CommercialDashboard() {
  const [campaigns, setCampaigns] = useState([]);
  const [todayLeads, setTodayLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [campaignsRes, leadsRes, statsRes] = await Promise.all([
        api.get('/campaigns/my-campaigns'),
        api.get('/leads/today'),
        api.get('/stats/commercial')
      ]);

      setCampaigns(campaignsRes.data.campaigns || []);
      setTodayLeads(leadsRes.data.leads || []);
      setStats(statsRes.data.stats || {});
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Mon Dashboard Commercial</h1>
        <p className="text-gray-600 mt-1">Vue d'ensemble de mon activité</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Leads du jour</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{todayLeads.length}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Appels réalisés</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{stats?.calls_today || 0}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <Phone className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Emails envoyés</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{stats?.emails_today || 0}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <Mail className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Taux conversion</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{stats?.conversion_rate || 0}%</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mes Campagnes */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">🎯 Mes Campagnes Actives</h2>

          {campaigns.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucune campagne assignée</p>
          ) : (
            <div className="space-y-3">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/CampaignDetails?id=${campaign.id}`)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-800">{campaign.name}</h3>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      {campaign.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>{campaign.my_leads_count || 0} leads</span>
                    <span>•</span>
                    <span>{campaign.emails_sent || 0} envoyés</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Leads du jour */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📅 Leads à contacter aujourd'hui</h2>

          {todayLeads.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <p className="text-gray-500">Tous les leads du jour ont été contactés ! 👍</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayLeads.slice(0, 5).map((lead) => (
                <div
                  key={lead.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/LeadDetails?id=${lead.id}`)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-800">{lead.company_name}</h3>
                      <p className="text-sm text-gray-600">{lead.contact_name}</p>
                    </div>
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
              ))}

              {todayLeads.length > 5 && (
                <button
                  onClick={() => navigate('/MyLeads')}
                  className="w-full py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium"
                >
                  Voir tous les leads ({todayLeads.length})
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
