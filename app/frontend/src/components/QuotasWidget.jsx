import React, { useState, useEffect } from 'react';
import { Zap, Mail, Target, TrendingUp, AlertCircle } from 'lucide-react';

export default function QuotasWidget() {
  const [quotas, setQuotas] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuotas();
  }, []);

  const fetchQuotas = async () => {
    try {
      const response = await fetch('/quotas', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setQuotas(data);
      }
    } catch (error) {
      console.error('Erreur chargement quotas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (!quotas) return null;

  const getProgressColor = (percentage) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-orange-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg shadow-lg p-4 border border-blue-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          Mes Quotas
        </h3>
        <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded-full uppercase">
          {quotas.plan}
        </span>
      </div>

      {/* Alertes */}
      {quotas.alerts && quotas.alerts.length > 0 && (
        <div className="mb-3 p-2 bg-orange-100 border border-orange-300 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-orange-800">
              {quotas.alerts.map((alert, i) => (
                <div key={i}>{alert.message}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quotas Grid */}
      <div className="space-y-3">
        {/* Google Leads */}
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="text-xs font-medium text-gray-700">Leads Google</span>
            </div>
            <span className="text-xs font-bold text-gray-900">
              {quotas.quotas.google_leads.available}/{quotas.quotas.google_leads.quota}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${getProgressColor(quotas.quotas.google_leads.percentage)}`}
              style={{ width: `${quotas.quotas.google_leads.percentage}%` }}
            ></div>
          </div>
        </div>

        {/* Emails */}
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium text-gray-700">Emails</span>
            </div>
            <span className="text-xs font-bold text-gray-900">
              {quotas.quotas.emails.available}/{quotas.quotas.emails.quota}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${getProgressColor(quotas.quotas.emails.percentage)}`}
              style={{ width: `${quotas.quotas.emails.percentage}%` }}
            ></div>
          </div>
        </div>

        {/* Campagnes */}
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-medium text-gray-700">Campagnes actives</span>
            </div>
            <span className="text-xs font-bold text-gray-900">
              {quotas.quotas.campaigns.active}/{quotas.quotas.campaigns.quota}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>Période jusqu'au</span>
          <span className="font-medium">{new Date(quotas.period_end).toLocaleDateString('fr-FR')}</span>
        </div>
      </div>

      {/* Upgrade button si plan gratuit */}
      {quotas.plan === 'free' && (
        <button className="mt-3 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-medium py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all">
          🚀 Upgrade vers Starter
        </button>
      )}
    </div>
  );
}
