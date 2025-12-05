import { log, error, warn } from "../lib/logger.js";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Save, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import api from '../../api/axios';

export default function MailingSettings() {
  const [settings, setSettings] = useState({
    from_email: '',
    from_name: '',
    reply_to: '',
    provider: 'elasticemail',
    api_key: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/mailing-settings');
      setSettings(data.settings);
    } catch (error) {
      error('Erreur chargement settings:', error);
      setMessage({ type: 'error', text: 'Erreur de chargement' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      await api.post('/mailing-settings', settings);
      setMessage({ type: 'success', text: 'Configuration enregistrée avec succès !' });
      fetchSettings(); // Recharger pour obtenir la clé API masquée
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Erreur lors de l\'enregistrement'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      setMessage({ type: 'error', text: 'Veuillez saisir un email de test' });
      return;
    }

    setSendingTest(true);
    setMessage({ type: '', text: '' });

    try {
      await api.post('/mailing-settings/test', { test_email: testEmail });
      setMessage({ type: 'success', text: `Email de test envoyé à ${testEmail}` });
      setTestEmail('');
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Erreur lors de l\'envoi du test'
      });
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Configuration Email
          </h1>
          <p className="text-gray-700 mt-2 font-medium">
            Configurez vos paramètres d'envoi d'emails pour vos campagnes
          </p>
        </div>

        {/* Message de feedback */}
        {message.text && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
            <span
              className={`font-medium ${
                message.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}
            >
              {message.text}
            </span>
          </div>
        )}

        {/* Formulaire de configuration */}
        <Card className="mb-6 shadow-xl border-2 border-gray-200">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-600" />
              Paramètres d'expédition
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email expéditeur */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email expéditeur *
                </label>
                <input
                  type="email"
                  required
                  value={settings.from_email}
                  onChange={(e) => setSettings({ ...settings, from_email: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  placeholder="noreply@votre-domaine.com"
                />
                <p className="text-sm text-gray-500 mt-1">
                  L'adresse email depuis laquelle vos campagnes seront envoyées
                </p>
              </div>

              {/* Nom expéditeur */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nom expéditeur *
                </label>
                <input
                  type="text"
                  required
                  value={settings.from_name}
                  onChange={(e) => setSettings({ ...settings, from_name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  placeholder="Votre Entreprise"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Le nom qui apparaîtra comme expéditeur dans la boîte de réception
                </p>
              </div>

              {/* Email de réponse */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email de réponse (Reply-To)
                </label>
                <input
                  type="email"
                  value={settings.reply_to}
                  onChange={(e) => setSettings({ ...settings, reply_to: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  placeholder="contact@votre-domaine.com"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Si vide, utilisera l'email expéditeur par défaut
                </p>
              </div>

              {/* Provider */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fournisseur d'email
                </label>
                <select
                  value={settings.provider}
                  onChange={(e) => setSettings({ ...settings, provider: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                >
                  <option value="elasticemail">ElasticEmail</option>
                  <option value="sendgrid">SendGrid</option>
                  <option value="mailgun">Mailgun</option>
                </select>
              </div>

              {/* Clé API */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Clé API {settings.provider}
                </label>
                <input
                  type="text"
                  value={settings.api_key}
                  onChange={(e) => setSettings({ ...settings, api_key: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono text-sm"
                  placeholder="Votre clé API"
                />
                <p className="text-sm text-gray-500 mt-1">
                  {settings.api_key && settings.api_key.includes('...')
                    ? '🔐 Clé masquée pour sécurité. Saisissez une nouvelle clé pour la modifier.'
                    : 'Obtenez votre clé API depuis votre compte ' + settings.provider}
                </p>
              </div>

              {/* Bouton Enregistrer */}
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Enregistrer la configuration
                  </>
                )}
              </button>
            </form>
          </CardContent>
        </Card>

        {/* Test d'envoi */}
        <Card className="shadow-xl border-2 border-gray-200">
          <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 border-b">
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-green-600" />
              Tester la configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-gray-700 mb-4">
              Envoyez un email de test pour vérifier que votre configuration fonctionne correctement.
            </p>

            <div className="flex gap-3">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                placeholder="email@test.com"
              />
              <button
                onClick={handleTestEmail}
                disabled={sendingTest || !testEmail}
                className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-700 hover:to-teal-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50"
              >
                {sendingTest ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Envoyer test
                  </>
                )}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
