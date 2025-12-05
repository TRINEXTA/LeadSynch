import { log, error, warn } from "../lib/logger.js";
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TestTube, Database, Mail, Phone, Target, CheckCircle, XCircle,
  Activity, Zap, AlertCircle, Play, Loader2, BarChart3, Settings
} from 'lucide-react';
import api from '../api/axios';

export default function TestZone() {
  const [activeTest, setActiveTest] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState({});

  const tests = [
    {
      id: 'db',
      name: 'Connexion Base de Données',
      icon: Database,
      color: 'blue',
      endpoint: '/health/db',
      description: 'Vérifier la connexion à PostgreSQL et les performances'
    },
    {
      id: 'email',
      name: 'Configuration Email',
      icon: Mail,
      color: 'purple',
      endpoint: '/health/email',
      description: 'Tester la configuration SMTP et Elastic Email'
    },
    {
      id: 'api',
      name: 'APIs Externes',
      icon: Zap,
      color: 'yellow',
      endpoint: '/health/apis',
      description: 'Vérifier Google Maps API, Anthropic Claude, etc.'
    },
    {
      id: 'campaigns',
      name: 'Système Campagnes',
      icon: Target,
      color: 'green',
      endpoint: '/health/campaigns',
      description: 'Tester le système de campagnes et pipeline'
    },
    {
      id: 'tracking',
      name: 'Tracking Email',
      icon: Activity,
      color: 'pink',
      endpoint: '/health/tracking',
      description: 'Vérifier le système de tracking (opens, clicks)'
    },
    {
      id: 'workers',
      name: 'Workers Background',
      icon: Settings,
      color: 'orange',
      endpoint: '/health/workers',
      description: 'Statut des workers email et campagnes'
    }
  ];

  const runTest = async (test) => {
    setActiveTest(test.id);
    setLoading({ ...loading, [test.id]: true });

    try {
      const response = await api.get(test.endpoint);
      setTestResults({
        ...testResults,
        [test.id]: {
          success: true,
          data: response.data,
          timestamp: new Date()
        }
      });
    } catch (error) {
      setTestResults({
        ...testResults,
        [test.id]: {
          success: false,
          error: error.response?.data?.message || error.message,
          timestamp: new Date()
        }
      });
    } finally {
      setLoading({ ...loading, [test.id]: false });
    }
  };

  const runAllTests = async () => {
    for (const test of tests) {
      await runTest(test);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    setActiveTest(null);
  };

  const getColorClasses = (color, type = 'bg') => {
    const colors = {
      blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-500', gradient: 'from-blue-500 to-blue-600' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-500', gradient: 'from-purple-500 to-purple-600' },
      yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', border: 'border-yellow-500', gradient: 'from-yellow-500 to-yellow-600' },
      green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-500', gradient: 'from-green-500 to-green-600' },
      pink: { bg: 'bg-pink-100', text: 'text-pink-600', border: 'border-pink-500', gradient: 'from-pink-500 to-pink-600' },
      orange: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-500', gradient: 'from-orange-500 to-orange-600' }
    };
    return colors[color][type];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
              <TestTube className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Zone de Test & Diagnostic
              </h1>
              <p className="text-gray-600 font-medium">
                Testez tous les composants critiques de LeadSynch
              </p>
            </div>
          </div>
        </div>

        {/* Actions globales */}
        <div className="mb-6 flex gap-4">
          <button
            onClick={runAllTests}
            disabled={Object.values(loading).some(l => l)}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold flex items-center gap-2 hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {Object.values(loading).some(l => l) ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Tests en cours...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Lancer tous les tests
              </>
            )}
          </button>

          {Object.keys(testResults).length > 0 && (
            <button
              onClick={() => setTestResults({})}
              className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
            >
              Effacer les résultats
            </button>
          )}
        </div>

        {/* Résumé des résultats */}
        {Object.keys(testResults).length > 0 && (
          <Card className="mb-6 border-2 border-gray-200 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-gray-700" />
                Résumé des Tests
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-gray-900">
                    {Object.keys(testResults).length}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Tests exécutés</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600">
                    {Object.values(testResults).filter(r => r.success).length}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Réussis</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-red-600">
                    {Object.values(testResults).filter(r => !r.success).length}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Échoués</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Grid des tests */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests.map((test) => {
            const Icon = test.icon;
            const result = testResults[test.id];
            const isLoading = loading[test.id];
            const isActive = activeTest === test.id;

            return (
              <Card
                key={test.id}
                className={`border-2 transition-all duration-300 ${
                  isActive ? `border-${test.color}-500 shadow-2xl scale-105` :
                  result?.success ? 'border-green-500 shadow-xl' :
                  result?.success === false ? 'border-red-500 shadow-xl' :
                  'border-gray-200 hover:shadow-xl hover:scale-105'
                }`}
              >
                <CardHeader className={`bg-gradient-to-r from-${test.color}-50 to-${test.color}-100 border-b`}>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 ${getColorClasses(test.color, 'bg')} rounded-lg`}>
                        <Icon className={`w-5 h-5 ${getColorClasses(test.color, 'text')}`} />
                      </div>
                      <span className="text-base">{test.name}</span>
                    </div>
                    {result && (
                      result.success ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-600" />
                      )
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-600 mb-4">
                    {test.description}
                  </p>

                  {result && (
                    <div className={`p-3 rounded-lg mb-4 ${
                      result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}>
                      <div className="flex items-start gap-2">
                        {result.success ? (
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-semibold ${
                            result.success ? 'text-green-900' : 'text-red-900'
                          }`}>
                            {result.success ? 'Test réussi' : 'Test échoué'}
                          </div>
                          <div className={`text-xs mt-1 ${
                            result.success ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {result.success
                              ? result.data?.message || 'Tous les systèmes fonctionnent correctement'
                              : result.error || 'Erreur inconnue'
                            }
                          </div>
                          {result.data && Object.keys(result.data).length > 1 && (
                            <div className="mt-2 text-xs text-gray-600">
                              <pre className="bg-white p-2 rounded border text-xs overflow-x-auto">
                                {JSON.stringify(result.data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => runTest(test)}
                    disabled={isLoading}
                    className={`w-full py-2.5 bg-gradient-to-r ${getColorClasses(test.color, 'gradient')} text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Test en cours...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Lancer le test
                      </>
                    )}
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Aide */}
        <Card className="mt-6 border-2 border-blue-200 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              Aide & Diagnostic
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-bold text-gray-900 mb-2">
                  Comment utiliser cette zone de test ?
                </h4>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>Cliquez sur "Lancer tous les tests" pour tester tous les composants en une fois</li>
                  <li>Ou lancez les tests individuellement pour diagnostiquer un problème spécifique</li>
                  <li>Les résultats s'affichent en temps réel avec des détails techniques</li>
                  <li>Les tests échoués sont marqués en rouge avec un message d'erreur</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 mb-2">
                  Que faire si un test échoue ?
                </h4>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li><strong>Base de données :</strong> Vérifiez POSTGRES_URL dans les variables d'environnement</li>
                  <li><strong>Email :</strong> Vérifiez ELASTIC_EMAIL_API_KEY et la configuration SMTP</li>
                  <li><strong>APIs :</strong> Vérifiez les clés API (GOOGLE_API_KEY, ANTHROPIC_API_KEY)</li>
                  <li><strong>Campagnes :</strong> Vérifiez que la base de données contient des campagnes actives</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
