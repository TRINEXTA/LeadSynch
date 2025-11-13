import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  CheckCircle, AlertCircle, XCircle, Zap, Mail,
  CreditCard, Users, TrendingUp, ArrowRight, Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function HealthStatusWidget() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    try {
      const [quotasRes, campaignsRes] = await Promise.all([
        api.get('/quotas'),
        api.get('/campaigns').catch(() => ({ data: { campaigns: [] } }))
      ]);

      const quotas = quotasRes.data.quotas || {};
      const campaigns = campaignsRes.data.campaigns || [];

      setHealth({
        emailConfigured: false, // Simplifié pour test
        firstCampaign: campaigns.length > 0,
        quotas: {
          email: quotas.email || { percentage: 0, used: 0, limit: 100 },
          leads: quotas.leads || { percentage: 0, used: 0, limit: 60 },
          campaigns: quotas.campaigns || { percentage: 0, used: 0, limit: 1 }
        },
        plan: quotas.email?.plan || 'FREE'
      });
    } catch (error) {
      console.error('Erreur health check:', error);
      // En cas d'erreur, afficher quand même le widget
      setHealth({
        emailConfigured: false,
        firstCampaign: false,
        quotas: {
          email: { percentage: 0, used: 0, limit: 100 },
          leads: { percentage: 0, used: 0, limit: 60 },
          campaigns: { percentage: 0, used: 0, limit: 1 }
        },
        plan: 'FREE'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            État de santé
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status) => {
    if (status) return <CheckCircle className="w-5 h-5 text-green-500" />;
    return <AlertCircle className="w-5 h-5 text-orange-500" />;
  };

  const getPlanBadge = (plan) => {
    const badges = {
      FREE: { color: 'bg-gray-100 text-gray-700', label: 'Gratuit' },
      BASIC: { color: 'bg-blue-100 text-blue-700', label: 'Basic' },
      PRO: { color: 'bg-purple-100 text-purple-700', label: 'Pro' },
      ENTERPRISE: { color: 'bg-orange-100 text-orange-700', label: 'Enterprise' }
    };
    const badge = badges[plan] || badges.FREE;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const getQuotaColor = (percentage) => {
    if (percentage >= 90) return 'text-red-600 bg-red-50';
    if (percentage >= 70) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  return (
    <Card className="border-2 border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-600" />
            État de santé
          </div>
          {getPlanBadge(health?.plan)}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">

        {/* Configuration Email */}
        <div
          className="flex items-center justify-between p-3 rounded-lg bg-white border border-gray-200 hover:border-indigo-300 transition-colors cursor-pointer"
          onClick={() => !health?.emailConfigured && navigate('/settings/mailing')}
        >
          <div className="flex items-center gap-3">
            {getStatusIcon(health?.emailConfigured)}
            <div>
              <p className="font-medium text-gray-900">Email configuré</p>
              <p className="text-xs text-gray-500">
                {health?.emailConfigured
                  ? 'Prêt à envoyer des campagnes'
                  : 'Configurez votre email'}
              </p>
            </div>
          </div>
          {!health?.emailConfigured && (
            <ArrowRight className="w-4 h-4 text-gray-400" />
          )}
        </div>

        {/* Première campagne */}
        <div
          className="flex items-center justify-between p-3 rounded-lg bg-white border border-gray-200 hover:border-indigo-300 transition-colors cursor-pointer"
          onClick={() => !health?.firstCampaign && navigate('/campaigns')}
        >
          <div className="flex items-center gap-3">
            {getStatusIcon(health?.firstCampaign)}
            <div>
              <p className="font-medium text-gray-900">Première campagne</p>
              <p className="text-xs text-gray-500">
                {health?.firstCampaign
                  ? 'Campagne créée avec succès'
                  : 'Créez votre première campagne'}
              </p>
            </div>
          </div>
          {!health?.firstCampaign && (
            <ArrowRight className="w-4 h-4 text-gray-400" />
          )}
        </div>

        {/* Quotas */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700 mb-2">📊 Vos quotas</p>

          {/* Emails */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">Emails</span>
            </div>
            <div className="text-right">
              <p className={`text-sm font-semibold ${getQuotaColor(health?.quotas?.email?.percentage)}`}>
                {health?.quotas?.email?.used} / {health?.quotas?.email?.limit === -1 ? '∞' : health?.quotas?.email?.limit}
              </p>
              <p className="text-xs text-gray-500">{health?.quotas?.email?.percentage}%</p>
            </div>
          </div>

          {/* Leads */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">Leads</span>
            </div>
            <div className="text-right">
              <p className={`text-sm font-semibold ${getQuotaColor(health?.quotas?.leads?.percentage)}`}>
                {health?.quotas?.leads?.used} / {health?.quotas?.leads?.limit === -1 ? '∞' : health?.quotas?.leads?.limit}
              </p>
              <p className="text-xs text-gray-500">{health?.quotas?.leads?.percentage}%</p>
            </div>
          </div>

          {/* Campagnes */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">Campagnes</span>
            </div>
            <div className="text-right">
              <p className={`text-sm font-semibold ${getQuotaColor(health?.quotas?.campaigns?.percentage)}`}>
                {health?.quotas?.campaigns?.used} / {health?.quotas?.campaigns?.limit === -1 ? '∞' : health?.quotas?.campaigns?.limit}
              </p>
              <p className="text-xs text-gray-500">{health?.quotas?.campaigns?.percentage}%</p>
            </div>
          </div>
        </div>

        {/* Upgrade CTA */}
        {health?.plan === 'FREE' && (
          <button
            onClick={() => navigate('/billing')}
            className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            Upgrader mon plan
          </button>
        )}
      </CardContent>
    </Card>
  );
}
