import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, Briefcase, Phone, Mail, TrendingUp, Calendar, 
  Target, DollarSign, Activity, PieChart, UserCheck, Clock,
  Eye, MousePointer, Send, CheckCircle, Award, Zap
} from "lucide-react";
import QuotasWidget from "../components/QuotasWidget";
// import HealthStatusWidget from "../components/HealthStatusWidget";
import HealthStatusWidget from "../components/HealthStatusWidget-TEST"; // VERSION TEST ULTRA-VISIBLE
import api from "../api/axios";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const fetchDashboard = async () => {
    try {
      setRefreshing(true);

      const [statsRes, dashRes] = await Promise.all([
        api.get("/stats"),
        api.get("/stats/dashboard")
      ]);

      console.log("Dashboard data:", dashRes.data);
      setStats(statsRes.data.stats);
      setDashboardData(dashRes.data);
      
    } catch (error) {
      console.error("Erreur dashboard:", error?.response?.data || error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toLocaleString('fr-FR');
  };

  const formatCurrency = (num) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num || 0);
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-gray-600 mt-1">Vue d'ensemble de votre activité commerciale</p>
        </div>
        <div className="flex items-center gap-2">
          {refreshing && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-indigo-600"></div>
              Actualisation...
            </div>
          )}
          <button
            onClick={fetchDashboard}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Rafraîchir"
          >
            <Activity className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Prospection & Campagnes
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <Card 
                className="cursor-pointer hover:shadow-xl transition-all duration-300 border-t-4 border-t-blue-500 group"
                onClick={() => navigate('/lead-databases')}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 font-medium">Prospects Actifs</p>
                      <p className="text-3xl font-bold mt-2 text-gray-900">
                        {formatNumber(dashboardData?.prospects?.count || 0)}
                      </p>
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Envoyés</span>
                          <span className="font-medium">{formatNumber(dashboardData?.prospects?.sent)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Ouverts</span>
                          <span className="font-medium text-green-600">
                            {formatNumber(dashboardData?.prospects?.opened)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Cliqués</span>
                          <span className="font-medium text-blue-600">
                            {formatNumber(dashboardData?.prospects?.clicked)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-100 to-blue-200 p-3 rounded-lg group-hover:scale-110 transition-transform">
                      <Send className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-xl transition-all duration-300 border-t-4 border-t-green-500 group"
                onClick={() => navigate('/pipeline')}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 font-medium">Leads en Pipeline</p>
                      <p className="text-3xl font-bold mt-2 text-gray-900">
                        {formatNumber(dashboardData?.leads?.count || 0)}
                      </p>
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Qualifiés</span>
                          <span className="font-medium">{dashboardData?.leads?.qualified}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">RDV</span>
                          <span className="font-medium text-purple-600">{dashboardData?.leads?.rdv}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Gagnés</span>
                          <span className="font-medium text-green-600">{dashboardData?.leads?.won}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-100 to-green-200 p-3 rounded-lg group-hover:scale-110 transition-transform">
                      <UserCheck className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-xl transition-all duration-300 border-t-4 border-t-purple-500 group"
                onClick={() => navigate('/campaigns')}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 font-medium">Campagnes</p>
                      <p className="text-3xl font-bold mt-2 text-gray-900">
                        {formatNumber(dashboardData?.campaigns?.active || 0)}
                        <span className="text-lg font-normal text-gray-500">/{dashboardData?.campaigns?.count}</span>
                      </p>
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Taux ouverture</span>
                          <span className="font-medium">{dashboardData?.campaigns?.avgOpenRate}%</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Taux clic</span>
                          <span className="font-medium">{dashboardData?.campaigns?.avgClickRate}%</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">En pause</span>
                          <span className="font-medium">{dashboardData?.campaigns?.paused}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-100 to-purple-200 p-3 rounded-lg group-hover:scale-110 transition-transform">
                      <Mail className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Activité & Performance
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              <Card className="hover:shadow-xl transition-all duration-300">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Activités Jour</p>
                      <p className="text-3xl font-bold mt-2">
                        {dashboardData?.activities?.total || 0}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {dashboardData?.activities?.calls}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {dashboardData?.activities?.emails}
                        </span>
                      </div>
                    </div>
                    <div className="bg-orange-100 p-3 rounded-lg">
                      <Activity className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-xl transition-all duration-300">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">RDV à venir</p>
                      <p className="text-3xl font-bold mt-2">
                        {dashboardData?.appointments?.upcoming || 0}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Aujourd'hui: {dashboardData?.appointments?.today || 0}
                      </p>
                    </div>
                    <div className="bg-pink-100 p-3 rounded-lg">
                      <Calendar className="w-6 h-6 text-pink-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-xl transition-all duration-300">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="w-full">
                      <p className="text-sm text-gray-600 font-medium">Taux Conversion</p>
                      <p className="text-3xl font-bold mt-2">
                        {dashboardData?.conversionRate?.winRate || 0}%
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                        <div 
                          className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-1000"
                          style={{width: `${dashboardData?.conversionRate?.winRate || 0}%`}}
                        />
                      </div>
                    </div>
                    <div className="bg-green-100 p-3 rounded-lg ml-3">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-xl transition-all duration-300">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 font-medium">Revenue Mois</p>
                      <p className="text-2xl font-bold mt-2">
                        {formatCurrency(dashboardData?.revenue?.actual)}
                      </p>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Objectif</span>
                          <span>{Math.round((dashboardData?.revenue?.actual || 0) / (dashboardData?.revenue?.target || 1) * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-1.5 rounded-full"
                            style={{
                              width: `${Math.min(100, (dashboardData?.revenue?.actual || 0) / (dashboardData?.revenue?.target || 1) * 100)}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="bg-yellow-100 p-3 rounded-lg ml-3">
                      <DollarSign className="w-6 h-6 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-indigo-600" />
                    Pipeline Commercial
                  </span>
                  <span className="text-sm font-normal text-gray-500">
                    Valeur: {formatCurrency(dashboardData?.pipeline?.value)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardData?.pipelineStages?.length > 0 ? (
                    dashboardData.pipelineStages.map((stage, idx) => {
                      const percentage = dashboardData?.pipeline?.total > 0 
                        ? Math.round((stage.count / dashboardData.pipeline.total) * 100)
                        : 0;
                      
                      return (
                        <div key={idx} className="group">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{backgroundColor: stage.color || '#6B7280'}}
                              />
                              <span className="text-sm font-medium text-gray-700">{stage.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold">{stage.count}</span>
                              {stage.total_value > 0 && (
                                <span className="text-xs text-gray-500">
                                  {formatCurrency(stage.total_value)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full transition-all duration-500 group-hover:opacity-80"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: stage.color || '#6B7280'
                              }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-gray-500">Aucun stage défini</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Activités Récentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardData?.recentActivities?.length > 0 ? (
                    dashboardData.recentActivities.slice(0, 6).map((activity, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                        <div className={`p-2 rounded-full flex-shrink-0 ${
                          activity.type === 'new_lead' ? 'bg-blue-100' :
                          activity.type === 'campaign' ? 'bg-purple-100' :
                          activity.type === 'activity' ? 'bg-green-100' :
                          'bg-gray-100'
                        }`}>
                          {activity.type === 'new_lead' && <Users className="w-3 h-3 text-blue-600" />}
                          {activity.type === 'campaign' && <Mail className="w-3 h-3 text-purple-600" />}
                          {activity.type === 'activity' && <Activity className="w-3 h-3 text-green-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 truncate">{activity.description}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{activity.time}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">Aucune activité récente</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {dashboardData?.users?.count > 0 && (
            <Card 
              className="cursor-pointer hover:shadow-xl transition-all duration-300 border-l-4 border-l-indigo-500"
              onClick={() => navigate('/users')}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Équipe</p>
                    <div className="flex items-baseline gap-3 mt-2">
                      <p className="text-3xl font-bold">{dashboardData.users.count}</p>
                      <span className="text-sm text-gray-500">utilisateurs</span>
                    </div>
                    <div className="flex gap-4 mt-3 text-xs">
                      <span>Actifs: <strong>{dashboardData.users.active || 0}</strong></span>
                      <span>Commerciaux: <strong>{dashboardData.users.commercials || 0}</strong></span>
                      <span>Managers: <strong>{dashboardData.users.managers || 0}</strong></span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-indigo-100 to-indigo-200 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-indigo-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-1 space-y-6">
          <HealthStatusWidget />
          <QuotasWidget />
          
          <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
            <CardContent className="pt-6">
              <h3 className="text-sm font-medium text-indigo-100 mb-4">Performance Globale</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-indigo-100">Pipeline Total</span>
                  <span className="font-bold">{formatCurrency(dashboardData?.pipeline?.value)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-indigo-100">Deals Gagnés</span>
                  <span className="font-bold">{dashboardData?.pipeline?.won || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-indigo-100">Taux de Win</span>
                  <span className="font-bold">{dashboardData?.conversionRate?.winRate || 0}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer TRINEXTA */}
      <div className="mt-12 pb-6 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500 text-sm">
          <span>Propulsé par</span>
          <a
            href="https://trinexta.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity"
          >
            <img
              src="https://trinexta.com/wp-content/uploads/2025/07/Logosignaturetrinexta-e1752825280915.png"
              alt="TRINEXTA - TrusTech IT Support"
              className="h-8"
            />
          </a>
        </div>
      </div>
    </div>
  );
}