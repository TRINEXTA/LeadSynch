import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Briefcase, Phone, Mail } from "lucide-react";
import QuotasWidget from "../components/QuotasWidget";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/stats', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    .then(res => res.json())
    .then(data => {
      setStats(data.stats);
      setLoading(false);
    })
    .catch(error => {
      console.error('Erreur stats:', error);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Chargement...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-2">Tableau de bord</h1>
      <p className="text-gray-600 mb-6">Vue d'ensemble de votre activité</p>

      {/* Grid principal avec Widget Quotas sur la droite */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Colonne principale (3/4) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Leads</p>
                    <p className="text-3xl font-bold mt-2">{stats?.total || 0}</p>
                    <p className="text-sm text-green-600 mt-1">↑ +12%</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Briefcase className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Utilisateurs</p>
                    <p className="text-3xl font-bold mt-2">0</p>
                    <p className="text-sm text-green-600 mt-1">↑ +3%</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Appels</p>
                    <p className="text-3xl font-bold mt-2">0</p>
                    <p className="text-sm text-green-600 mt-1">↑ +24%</p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Phone className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Campagnes</p>
                    <p className="text-3xl font-bold mt-2">3</p>
                    <p className="text-sm text-green-600 mt-1">↑ +8%</p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <Mail className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Répartition par statut */}
          {stats && stats.byStatus && stats.byStatus.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Répartition par Statut</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.byStatus.map(item => (
                    <div key={item.status} className="flex items-center">
                      <div className="w-32 capitalize font-medium">{item.status}</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-8 relative">
                        <div 
                          className="bg-blue-500 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                          style={{width: `${(item.count / stats.total * 100)}%`}}
                        >
                          {item.count}
                        </div>
                      </div>
                      <div className="w-20 text-right text-sm text-gray-600">
                        {Math.round((item.count / stats.total * 100))}%
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Colonne droite (1/4) - Widget Quotas */}
        <div className="lg:col-span-1">
          <QuotasWidget />
        </div>
      </div>
    </div>
  );
}
