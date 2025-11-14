import React, { useState, useEffect } from 'react';
import { Mail, Save, Send, CheckCircle, AlertCircle, Loader2, Building2, Reply, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '../api/axios';

export default function MailingSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [settings, setSettings] = useState({
    from_email: '',
    from_name: '',
    reply_to: '',
    company_name: '',
    signature: ''
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get('/mailing-settings');
      if (response.data.settings) {
        setSettings({
          from_email: response.data.settings.from_email || '',
          from_name: response.data.settings.from_name || '',
          reply_to: response.data.settings.reply_to || response.data.settings.reply_to_email || '',
          company_name: response.data.settings.company_name || '',
          signature: response.data.settings.signature || ''
        });
      }
    } catch (error) {
      console.error('Erreur chargement settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    // Validation
    if (!settings.from_email || !settings.from_name || !settings.company_name) {
      setMessage({
        type: 'error',
        text: '⚠️ Veuillez remplir tous les champs obligatoires (marqués *)'
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      await api.post('/mailing-settings', {
        ...settings,
        provider: 'elasticemail', // Provider par défaut
        configured: true
      });

      setMessage({
        type: 'success',
        text: '✅ Configuration enregistrée avec succès !'
      });

      // Recharger pour voir le statut à jour
      setTimeout(() => {
        loadSettings();
      }, 1000);
    } catch (error) {
      console.error('Erreur save:', error);
      setMessage({
        type: 'error',
        text: '❌ Erreur lors de la sauvegarde : ' + (error.response?.data?.message || error.message)
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-800 text-lg font-semibold">Chargement de la configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-2">
            <Mail className="w-8 h-8 text-indigo-600" />
            <h1 className="text-4xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              ⚙️ Configuration Email
            </h1>
          </div>
          <p className="text-gray-700 text-sm font-medium">
            Configurez vos paramètres d'envoi en quelques clics
          </p>
        </div>

        {/* Alert Info */}
        <Card className="shadow-xl border-0 mb-4" style={{background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'}}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3 text-white">
              <AlertCircle className="w-6 h-6 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-black text-lg mb-2">📋 Information</h3>
                <p className="text-sm font-semibold opacity-90">
                  Le lien de désabonnement est automatiquement géré et ajouté à tous vos emails pour respecter le RGPD.
                  Vous n'avez rien à faire !
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formulaire */}
        <Card className="shadow-xl border-2 border-gray-200 bg-white mb-4">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b py-3">
            <CardTitle className="flex items-center gap-2 text-gray-800 text-lg">
              <User className="w-6 h-6 text-indigo-600" />
              Informations d'Envoi
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 pb-6">
            <form onSubmit={handleSave} className="space-y-5">
              {/* Email d'envoi */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  📧 Email d'Envoi * <span className="text-red-500">●</span>
                </label>
                <input
                  type="email"
                  required
                  value={settings.from_email}
                  onChange={(e) => setSettings({...settings, from_email: e.target.value})}
                  placeholder="contact@votre-entreprise.com"
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-400 font-semibold transition-all"
                />
                <p className="text-xs text-gray-500 mt-1 font-medium">
                  L'adresse email qui apparaîtra comme expéditeur
                </p>
              </div>

              {/* Nom de l'expéditeur */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  👤 Nom de l'Expéditeur * <span className="text-red-500">●</span>
                </label>
                <input
                  type="text"
                  required
                  value={settings.from_name}
                  onChange={(e) => setSettings({...settings, from_name: e.target.value})}
                  placeholder="Jean Dupont"
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-400 font-semibold transition-all"
                />
                <p className="text-xs text-gray-500 mt-1 font-medium">
                  Le nom qui apparaîtra comme expéditeur
                </p>
              </div>

              {/* Email de réponse */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  💬 Email de Réponse (Reply-To)
                </label>
                <input
                  type="email"
                  value={settings.reply_to}
                  onChange={(e) => setSettings({...settings, reply_to: e.target.value})}
                  placeholder="support@votre-entreprise.com (optionnel)"
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-400 font-semibold transition-all"
                />
                <p className="text-xs text-gray-500 mt-1 font-medium">
                  Les réponses seront envoyées à cette adresse (si vide, utilise l'email d'envoi)
                </p>
              </div>

              {/* Nom de la société */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  🏢 Nom de la Société * <span className="text-red-500">●</span>
                </label>
                <input
                  type="text"
                  required
                  value={settings.company_name}
                  onChange={(e) => setSettings({...settings, company_name: e.target.value})}
                  placeholder="Votre Entreprise SAS"
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-400 font-semibold transition-all"
                />
                <p className="text-xs text-gray-500 mt-1 font-medium">
                  Le nom de votre entreprise (apparaîtra dans le pied de page)
                </p>
              </div>

              {/* Signature */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  ✍️ Signature Email (Optionnel)
                </label>
                <textarea
                  value={settings.signature}
                  onChange={(e) => setSettings({...settings, signature: e.target.value})}
                  rows={6}
                  placeholder="Cordialement,&#10;&#10;Jean Dupont&#10;Responsable Commercial&#10;Votre Entreprise"
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-400 font-semibold transition-all resize-none"
                />
                <p className="text-xs text-gray-500 mt-1 font-medium">
                  Signature ajoutée automatiquement à la fin de chaque email
                </p>
              </div>

              {/* Message de résultat */}
              {message && (
                <div className={`p-4 rounded-xl border-2 ${
                  message.type === 'success'
                    ? 'bg-green-50 border-green-400'
                    : 'bg-red-50 border-red-400'
                }`}>
                  <div className="flex items-start gap-3">
                    {message.type === 'success' ? (
                      <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 animate-bounce" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 animate-pulse" />
                    )}
                    <p className={`text-sm font-semibold ${
                      message.type === 'success' ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {message.text}
                    </p>
                  </div>
                </div>
              )}

              {/* Bouton Enregistrer */}
              <button
                type="submit"
                disabled={saving}
                className="w-full text-white py-4 px-6 rounded-xl font-black text-lg transition-all shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 hover:scale-105 active:scale-95"
                style={{
                  background: saving
                    ? 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'
                    : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
                }}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Enregistrement en cours...
                  </>
                ) : (
                  <>
                    <Save className="w-6 h-6" />
                    Enregistrer la Configuration
                  </>
                )}
              </button>
            </form>
          </CardContent>
        </Card>

        {/* Aide */}
        <Card className="shadow-xl border-2 border-gray-200 bg-white">
          <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 border-b py-3">
            <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Après la Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 pb-5">
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center text-white font-black flex-shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-black text-gray-800 mb-1">Enregistrez votre configuration</h4>
                  <p className="text-gray-600 font-medium">
                    Cliquez sur "Enregistrer la Configuration" ci-dessus
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-black flex-shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-black text-gray-800 mb-1">Testez l'envoi d'email</h4>
                  <p className="text-gray-600 font-medium">
                    Allez dans "Test Email" pour envoyer un email de test et vérifier que tout fonctionne
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-teal-500 rounded-lg flex items-center justify-center text-white font-black flex-shrink-0">
                  3
                </div>
                <div>
                  <h4 className="font-black text-gray-800 mb-1">Lancez vos campagnes !</h4>
                  <p className="text-gray-600 font-medium">
                    Votre configuration est prête, vous pouvez maintenant envoyer des emails à vos leads
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
