import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Send, CheckCircle, XCircle, Loader2, AlertCircle, Settings, Zap, Eye, Code } from 'lucide-react';
import api from '../api/axios';

export default function TestMailing() {
  const [formData, setFormData] = useState({
    to_email: '',
    subject: '✉️ Test Email - LeadSynch CRM',
    message: 'Bonjour,\n\nCeci est un email de test envoyé depuis LeadSynch CRM.\n\n✅ Si vous recevez ce message, votre configuration email fonctionne parfaitement !\n\nBonne prospection,\nL\'équipe LeadSynch'
  });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [mailingConfig, setMailingConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    loadMailingConfig();
  }, []);

  const loadMailingConfig = async () => {
    try {
      const response = await api.get('/mailing-settings');
      setMailingConfig(response.data.settings);
    } catch (error) {
      console.error('Erreur chargement config mailing:', error);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setResult(null);

    try {
      const response = await api.post('/mailing-settings/test', {
        to: formData.to_email,
        subject: formData.subject,
        body: formData.message
      });

      setResult({
        success: true,
        message: response.data.message || 'Email de test envoyé avec succès !'
      });

      // Réinitialiser le champ email après 5 secondes
      setTimeout(() => {
        setFormData({
          ...formData,
          to_email: ''
        });
        setResult(null);
      }, 5000);

    } catch (error) {
      console.error('Erreur test email:', error);
      setResult({
        success: false,
        message: error.response?.data?.message || error.response?.data?.error || 'Erreur lors de l\'envoi de l\'email de test'
      });
    } finally {
      setSending(false);
    }
  };

  if (loadingConfig) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-cyan-600 mx-auto mb-4" />
          <p className="text-gray-800 text-lg font-semibold">Chargement de la configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent mb-1">
              📧 Test d'Envoi Email
            </h1>
            <p className="text-gray-700 text-sm font-medium">
              Vérifiez votre configuration email en temps réel
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border-2 border-gray-200 shadow-sm">
            <div className={`w-3 h-3 rounded-full ${mailingConfig?.configured ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-sm font-semibold text-gray-800">
              {mailingConfig?.configured ? 'Configuré' : 'Non configuré'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
          {/* Config Status Card */}
          <Card className="shadow-xl border-0 hover:scale-105 transition-all" style={{background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'}}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between text-white">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Settings className="w-4 h-4 opacity-80" />
                    <p className="text-xs font-bold opacity-90 uppercase tracking-wide">Provider</p>
                  </div>
                  <p className="text-3xl font-black mb-1 capitalize">
                    {mailingConfig?.provider || 'N/A'}
                  </p>
                  <div className="text-xs opacity-90">
                    Système d'envoi
                  </div>
                </div>
                <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm">
                  <Zap className="w-8 h-8" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* From Email Card */}
          <Card className="shadow-xl border-0 hover:scale-105 transition-all" style={{background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)'}}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between text-white">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="w-4 h-4 opacity-80" />
                    <p className="text-xs font-bold opacity-90 uppercase tracking-wide">Expéditeur</p>
                  </div>
                  <p className="text-sm font-black mb-1 truncate">
                    {mailingConfig?.from_email || 'Non défini'}
                  </p>
                  <div className="text-xs opacity-90">
                    {mailingConfig?.from_name || 'Nom non défini'}
                  </div>
                </div>
                <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm">
                  <Mail className="w-8 h-8" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Key Status Card */}
          <Card className="shadow-xl border-0 hover:scale-105 transition-all" style={{background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'}}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between text-white">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Code className="w-4 h-4 opacity-80" />
                    <p className="text-xs font-bold opacity-90 uppercase tracking-wide">Clé API</p>
                  </div>
                  <p className="text-2xl font-black mb-1">
                    {mailingConfig?.api_key ? '✓ Définie' : '✗ Manquante'}
                  </p>
                  <div className="text-xs opacity-90 font-mono truncate">
                    {mailingConfig?.api_key || 'Aucune clé'}
                  </div>
                </div>
                <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm">
                  <Eye className="w-8 h-8" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alert si non configuré */}
        {!mailingConfig?.configured && (
          <Card className="shadow-xl border-0 mb-4" style={{background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)'}}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3 text-white">
                <AlertCircle className="w-6 h-6 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-black text-lg mb-2">⚠️ Configuration Requise</h3>
                  <p className="text-sm font-semibold opacity-90">
                    Vous devez d'abord configurer vos paramètres d'envoi email dans la section "Configuration Email"
                    avant de pouvoir envoyer des emails de test.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Form Card */}
        <Card className="shadow-xl border-2 border-gray-200 bg-white mb-4">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b py-3">
            <CardTitle className="flex items-center gap-2 text-gray-800 text-lg">
              <Send className="w-6 h-6 text-blue-600" />
              Formulaire de Test
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email destinataire */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  📬 Adresse Email Destinataire *
                </label>
                <input
                  type="email"
                  required
                  value={formData.to_email}
                  onChange={(e) => setFormData({ ...formData, to_email: e.target.value })}
                  placeholder="exemple@domaine.com"
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-900 placeholder-gray-400 font-semibold transition-all"
                  disabled={!mailingConfig?.configured}
                />
                <p className="text-xs text-gray-500 mt-1 font-medium">
                  L'email de test sera envoyé à cette adresse
                </p>
              </div>

              {/* Sujet */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  📝 Sujet de l'Email
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Sujet de votre email de test"
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-900 placeholder-gray-400 font-semibold transition-all"
                  disabled={!mailingConfig?.configured}
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  💬 Message
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={8}
                  placeholder="Contenu de votre email de test"
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-900 placeholder-gray-400 font-semibold transition-all resize-none"
                  disabled={!mailingConfig?.configured}
                />
              </div>

              {/* Result Message */}
              {result && (
                <div className={`p-4 rounded-xl border-2 ${
                  result.success
                    ? 'bg-green-50 border-green-400'
                    : 'bg-red-50 border-red-400'
                }`}>
                  <div className="flex items-start gap-3">
                    {result.success ? (
                      <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 animate-bounce" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 animate-pulse" />
                    )}
                    <div>
                      <h4 className={`font-black mb-1 text-lg ${
                        result.success ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {result.success ? '✅ Succès !' : '❌ Erreur'}
                      </h4>
                      <p className={`text-sm font-semibold ${
                        result.success ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {result.message}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={sending || !mailingConfig?.configured}
                className="w-full text-white py-4 px-6 rounded-xl font-black text-lg transition-all shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 hover:scale-105 active:scale-95"
                style={{
                  background: sending
                    ? 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)'
                    : !mailingConfig?.configured
                      ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                      : 'linear-gradient(135deg, #2563eb 0%, #0891b2 100%)'
                }}
              >
                {sending ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Envoi en cours...
                  </>
                ) : !mailingConfig?.configured ? (
                  <>
                    <XCircle className="w-6 h-6" />
                    Configuration Requise
                  </>
                ) : (
                  <>
                    <Send className="w-6 h-6" />
                    Envoyer l'Email de Test
                  </>
                )}
              </button>
            </form>
          </CardContent>
        </Card>

        {/* Help Card */}
        <Card className="shadow-xl border-2 border-gray-200 bg-white">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b py-3">
            <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-purple-600" />
              Guide de Dépannage
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 pb-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-blue-50 p-4 rounded-xl border-2 border-blue-200">
                <h4 className="font-black text-blue-900 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  L'email n'arrive pas ?
                </h4>
                <ul className="list-disc list-inside text-blue-800 space-y-1 font-medium">
                  <li>Vérifiez vos spams et courriers indésirables</li>
                  <li>Assurez-vous que la config email est correcte</li>
                  <li>Vérifiez l'adresse email destinataire</li>
                  <li>Attendez 2-3 minutes (délai de livraison)</li>
                </ul>
              </div>

              <div className="bg-red-50 p-4 rounded-xl border-2 border-red-200">
                <h4 className="font-black text-red-900 mb-2 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  Erreur lors de l'envoi ?
                </h4>
                <ul className="list-disc list-inside text-red-800 space-y-1 font-medium">
                  <li>Vérifiez vos identifiants SMTP/API</li>
                  <li>Assurez-vous que le provider autorise l'envoi</li>
                  <li>Vérifiez votre quota d'emails</li>
                  <li>Contactez le support si ça persiste</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
