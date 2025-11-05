import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Mail, Users, Eye, MousePointer, Clock, Calendar, TrendingUp } from 'lucide-react';
import api from '../api/axios';

export default function CampaignDetails() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get('id');
  
  const [campaign, setCampaign] = useState(null);
  const [stats, setStats] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (campaignId) {
      loadCampaignDetails();
    }
  }, [campaignId]);

  const loadCampaignDetails = async () => {
    try {
      setLoading(true);
      
      const [campaignRes, statsRes] = await Promise.all([
        api.get(`/campaigns/${campaignId}`),
        api.get(`/tracking/campaign/${campaignId}/stats`)
      ]);
      
      setCampaign(campaignRes.data.campaign);
      setStats(statsRes.data.stats);
      
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur chargement campagne');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-6">
        <button onClick={() => navigate('/Campaigns')} className="flex items-center gap-2 text-gray-700 mb-4">
          <ArrowLeft className="w-5 h-5" />
          Retour
        </button>
        <div className="text-center py-12">
          <p className="text-gray-600">Campagne introuvable</p>
        </div>
      </div>
    );
  }

  const openRate = stats?.sent > 0 ? ((stats.opens / stats.sent) * 100).toFixed(1) : 0;
  const clickRate = stats?.sent > 0 ? ((stats.clicks / stats.sent) * 100).toFixed(1) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => navigate('/Campaigns')}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900 mb-6 font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour aux campagnes
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                {campaign.name}
              </h1>
              <p className="text-gray-600">{campaign.description || 'Aucune description'}</p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-bold ${
              campaign.status === 'active' ? 'bg-green-100 text-green-700' :
              campaign.status === 'draft' ? 'bg-gray-100 text-gray-700' :
              campaign.status === 'completed' ? 'bg-purple-100 text-purple-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {campaign.status === 'active' ? '🟢 Active' :
               campaign.status === 'draft' ? '⚪ Brouillon' :
               campaign.status === 'completed' ? '🟣 Terminée' : '🟡 En pause'}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
              <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-1">Créée le</p>
              <p className="font-bold text-gray-800">
                {new Date(campaign.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>

            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
              <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-1">Leads ciblés</p>
              <p className="text-3xl font-bold text-purple-700">{campaign.total_leads || 0}</p>
            </div>

            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
              <Mail className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-1">Emails envoyés</p>
              <p className="text-3xl font-bold text-green-700">{campaign.emails_sent || stats?.sent || 0}</p>
            </div>

            <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl">
              <Clock className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-1">Statut</p>
              <p className="font-bold text-gray-800">{campaign.status}</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Taux d'ouverture</p>
                <p className="text-4xl font-bold text-green-600">{openRate}%</p>
              </div>
              <Eye className="w-12 h-12 text-green-500 opacity-20" />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Eye className="w-4 h-4 text-green-600" />
              <span className="font-semibold text-gray-700">{stats?.opens || 0} ouvertures</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Taux de clic</p>
                <p className="text-4xl font-bold text-blue-600">{clickRate}%</p>
              </div>
              <MousePointer className="w-12 h-12 text-blue-500 opacity-20" />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MousePointer className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-gray-700">{stats?.clicks || 0} clics</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Performance</p>
                <p className="text-4xl font-bold text-purple-600">
                  {stats?.sent > 0 ? ((stats.clicks / stats.sent) * 100).toFixed(0) : 0}
                </p>
              </div>
              <TrendingUp className="w-12 h-12 text-purple-500 opacity-20" />
            </div>
            <p className="text-sm text-gray-600">Score global</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">📊 Statistiques détaillées</h2>
          <div className="space-y-3">
            {[
              { label: 'Envoyés', value: stats?.sent || 0, color: 'blue', icon: Mail },
              { label: 'Délivrés', value: stats?.delivered || stats?.sent || 0, color: 'green', icon: TrendingUp },
              { label: 'Ouverts', value: stats?.opens || 0, color: 'purple', icon: Eye },
              { label: 'Cliqués', value: stats?.clicks || 0, color: 'pink', icon: MousePointer },
              { label: 'Bounces', value: stats?.bounces || 0, color: 'red', icon: ArrowLeft },
            ].map((stat, idx) => {
              const Icon = stat.icon;
              const percentage = stats?.sent > 0 ? (stat.value / stats.sent * 100) : 0;
              return (
                <div key={idx} className="flex items-center gap-4">
                  <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-700">{stat.label}</span>
                      <span className="text-sm font-bold text-gray-800">{stat.value}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`bg-gradient-to-r from-${stat.color}-400 to-${stat.color}-600 h-2 rounded-full transition-all`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm text-gray-500 min-w-[50px] text-right">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
