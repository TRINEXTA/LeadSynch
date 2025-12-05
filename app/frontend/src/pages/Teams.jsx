import { log, error, warn } from "./../lib/logger.js";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Crown, Mail, Phone, Loader2, TrendingUp, Award } from 'lucide-react';
import api from '../api/axios';

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTeams: 0,
    totalMembers: 0,
    averageMembersPerTeam: 0
  });

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      const { data } = await api.get('/teams');
      const teamsList = data.teams || [];
      setTeams(teamsList);

      // Calculer les statistiques
      const totalMembers = teamsList.reduce((sum, team) => sum + (team.members_count || 0), 0);
      setStats({
        totalTeams: teamsList.length,
        totalMembers: totalMembers,
        averageMembersPerTeam: teamsList.length > 0 ? (totalMembers / teamsList.length).toFixed(1) : 0
      });
    } catch (error) {
      error('Erreur chargement teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const colors = [
    { gradient: 'from-blue-500 to-cyan-500', bg: 'from-blue-50 to-cyan-50', text: 'text-blue-600' },
    { gradient: 'from-purple-500 to-pink-500', bg: 'from-purple-50 to-pink-50', text: 'text-purple-600' },
    { gradient: 'from-green-500 to-teal-500', bg: 'from-green-50 to-teal-50', text: 'text-green-600' },
    { gradient: 'from-orange-500 to-red-500', bg: 'from-orange-50 to-red-50', text: 'text-orange-600' },
    { gradient: 'from-indigo-500 to-purple-500', bg: 'from-indigo-50 to-purple-50', text: 'text-indigo-600' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3 flex items-center justify-center gap-3">
            <Users className="w-12 h-12 text-indigo-600" />
            Nos Équipes
          </h1>
          <p className="text-gray-700 text-lg font-medium">
            Découvrez les équipes commerciales de votre organisation
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-xl border-0" style={{background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'}}>
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between text-white">
                <div className="flex-1">
                  <p className="text-indigo-100 text-sm font-semibold mb-1">Total Équipes</p>
                  <p className="text-4xl font-black">{stats.totalTeams}</p>
                </div>
                <Users className="w-16 h-16 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-0" style={{background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'}}>
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between text-white">
                <div className="flex-1">
                  <p className="text-green-100 text-sm font-semibold mb-1">Total Membres</p>
                  <p className="text-4xl font-black">{stats.totalMembers}</p>
                </div>
                <TrendingUp className="w-16 h-16 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-0" style={{background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'}}>
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between text-white">
                <div className="flex-1">
                  <p className="text-orange-100 text-sm font-semibold mb-1">Moyenne/Équipe</p>
                  <p className="text-4xl font-black">{stats.averageMembersPerTeam}</p>
                </div>
                <Award className="w-16 h-16 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Teams Grid */}
        {teams.length === 0 ? (
          <Card className="shadow-xl">
            <CardContent className="py-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg font-medium mb-2">
                Aucune équipe pour le moment
              </p>
              <p className="text-gray-500 text-sm">
                Les équipes seront créées par un administrateur
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team, index) => {
              const colorScheme = colors[index % colors.length];
              return (
                <Card
                  key={team.id}
                  className="shadow-xl border-2 border-gray-200 hover:shadow-2xl hover:scale-105 transition-all duration-300"
                >
                  {/* Header coloré */}
                  <div className={`bg-gradient-to-r ${colorScheme.gradient} p-6 text-white`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`bg-white/20 p-3 rounded-xl backdrop-blur-sm`}>
                        <Users className="w-8 h-8" />
                      </div>
                      <div className="bg-white/30 px-4 py-2 rounded-full backdrop-blur-sm">
                        <p className="text-sm font-black">
                          {team.members_count || 0} {team.members_count > 1 ? 'membres' : 'membre'}
                        </p>
                      </div>
                    </div>
                    <h3 className="text-2xl font-black mb-2">{team.name}</h3>
                    {team.description && (
                      <p className="text-sm opacity-90 line-clamp-2">{team.description}</p>
                    )}
                  </div>

                  {/* Contenu */}
                  <CardContent className="pt-6 space-y-4">
                    {/* Manager */}
                    {team.manager_name && (
                      <div className={`bg-gradient-to-r ${colorScheme.bg} p-4 rounded-xl border-2 border-gray-200`}>
                        <div className="flex items-center gap-3">
                          <div className={`bg-gradient-to-br ${colorScheme.gradient} w-12 h-12 rounded-full flex items-center justify-center text-white flex-shrink-0`}>
                            <Crown className="w-6 h-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-600 font-bold mb-1">Manager</p>
                            <p className="font-bold text-gray-900 truncate">{team.manager_name}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Informations */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Users className="w-4 h-4" />
                        <span className="font-medium">
                          {team.members_count || 0} personne(s) dans cette équipe
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <TrendingUp className="w-4 h-4" />
                        <span className="font-medium">
                          Créée le {new Date(team.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>

                    {/* Badge de statut */}
                    <div className="pt-4 border-t border-gray-200">
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                        team.members_count > 0
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          team.members_count > 0 ? 'bg-green-600' : 'bg-gray-400'
                        } animate-pulse`} />
                        <span className="text-xs font-bold">
                          {team.members_count > 0 ? 'Équipe Active' : 'En formation'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Info Footer */}
        <Card className="mt-8 shadow-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-blue-900 mb-2">ℹ️ À propos des équipes</h3>
                <p className="text-sm text-blue-800 mb-3">
                  Les équipes permettent d'organiser vos commerciaux et de suivre leurs performances collectivement.
                  Chaque équipe peut avoir un manager dédié qui supervise les activités et accompagne les membres.
                </p>
                <p className="text-xs text-blue-700 font-semibold">
                  💡 Pour gérer les équipes (créer, modifier, ajouter des membres), contactez un administrateur.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
