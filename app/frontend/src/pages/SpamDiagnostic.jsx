import { log, error, warn } from "../lib/logger.js";
﻿import React, { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, TrendingUp, Mail, Zap, AlertCircle } from 'lucide-react';
import api from '../api/axios';

export default function SpamDiagnostic() {
  const [analyzing, setAnalyzing] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    content: '',
    from_email: '',
    from_name: ''
  });
  const [analysis, setAnalysis] = useState(null);

  const handleAnalyze = async () => {
    if (!formData.subject || !formData.content) {
      alert('❌ Sujet et contenu requis !');
      return;
    }

    setAnalyzing(true);
    try {
      const response = await api.post('/analyze-spam', formData);
      setAnalysis(response.data);
    } catch (error) {
      error('Erreur:', error);
      alert('❌ Erreur lors de l\'analyse');
    } finally {
      setAnalyzing(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'from-green-500 to-emerald-500';
    if (score >= 70) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };

  const getScoreTextColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-700 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">Diagnostic Anti-Spam</h1>
          </div>
          <p className="text-gray-600">Analysez votre email pour garantir 90% de délivrabilité</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulaire d'analyse */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-purple-600" />
              Contenu à analyser
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nom de l'expéditeur
                </label>
                <input
                  type="text"
                  value={formData.from_name}
                  onChange={(e) => setFormData({...formData, from_name: e.target.value})}
                  placeholder="Votre Entreprise"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email expéditeur
                </label>
                <input
                  type="email"
                  value={formData.from_email}
                  onChange={(e) => setFormData({...formData, from_email: e.target.value})}
                  placeholder="contact@votre-entreprise.com"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Sujet de l'email * <span className="text-red-500">●</span>
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  placeholder="Votre sujet d'email"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Contenu de l'email * <span className="text-red-500">●</span>
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  rows={12}
                  placeholder="Collez le contenu HTML ou texte de votre email..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                />
              </div>

              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg disabled:opacity-50"
              >
                <Zap className="w-5 h-5" />
                {analyzing ? 'Analyse en cours...' : 'Analyser l\'email'}
              </button>
            </div>
          </div>

          {/* Résultats */}
          <div className="space-y-6">
            {!analysis ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <Shield className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Aucune analyse</h3>
                <p className="text-gray-600">Remplissez le formulaire et cliquez sur "Analyser"</p>
              </div>
            ) : (
              <>
                {/* Score principal */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    Score de délivrabilité
                  </h2>

                  <div className="text-center mb-6">
                    <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br ${getScoreColor(analysis.score)} text-white mb-4`}>
                      <span className="text-4xl font-bold">{analysis.score}</span>
                    </div>
                    <h3 className={`text-2xl font-bold ${getScoreTextColor(analysis.score)} mb-2`}>
                      {analysis.deliverability}
                    </h3>
                    
                    {analysis.score >= 90 ? (
                      <div className="flex items-center justify-center gap-2 text-green-700">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-semibold">Excellent ! Haute délivrabilité</span>
                      </div>
                    ) : analysis.score >= 70 ? (
                      <div className="flex items-center justify-center gap-2 text-yellow-700">
                        <AlertCircle className="w-5 h-5" />
                        <span className="font-semibold">Bon, mais améliorable</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 text-red-700">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="font-semibold">Risque de spam élevé</span>
                      </div>
                    )}
                  </div>

                  {/* Barre de progression */}
                  <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                    <div
                      className={`h-4 rounded-full bg-gradient-to-r ${getScoreColor(analysis.score)} transition-all duration-1000`}
                      style={{ width: `${analysis.score}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    Objectif : 90% pour une délivrabilité optimale
                  </p>
                </div>

                {/* Problèmes détectés */}
                {analysis.issues && analysis.issues.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      Problèmes détectés ({analysis.issues.length})
                    </h2>

                    <div className="space-y-3">
                      {analysis.issues.map((issue, index) => (
                        <div
                          key={index}
                          className={`p-4 rounded-xl border-2 ${getSeverityColor(issue.severity)}`}
                        >
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="font-semibold">{issue.message}</p>
                              <p className="text-xs mt-1 opacity-75">
                                Pénalité : -{issue.weight} points
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommandations */}
                {analysis.recommendations && (
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-lg p-6 border-2 border-blue-200">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                      Recommandations
                    </h2>

                    <div className="space-y-2">
                      {analysis.recommendations.map((rec, index) => (
                        <p key={index} className="text-sm text-gray-700 leading-relaxed">
                          {rec}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
