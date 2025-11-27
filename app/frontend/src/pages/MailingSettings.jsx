import React, { useState, useEffect } from 'react';
import { Mail, User, Reply, Server, Send, Shield, Save, Eye, EyeOff, ChevronDown, ChevronUp, AlertCircle, CheckCircle, Building } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function MailingSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [settings, setSettings] = useState({
    // 5 CHAMPS ESSENTIELS
    from_email: '',
    from_name: '',
    reply_to_email: '',
    company_name: '',
    company_address: '',

    // Configuration serveur (optionnelle - cachée par défaut)
    api_provider: 'elasticemail', // Par défaut ElasticEmail
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    smtp_secure: true,
    api_key: ''
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get('/mailing-settings');
      if (response.data.settings) {
        setSettings(response.data.settings);
      }
      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement settings:', error);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validation des 5 champs essentiels
    if (!settings.from_email || !settings.from_name || !settings.reply_to_email || !settings.company_name || !settings.company_address) {
      toast.error('Tous les champs sont obligatoires');
      return;
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(settings.from_email) || !emailRegex.test(settings.reply_to_email)) {
      toast.error('Format d\'email invalide');
      return;
    }

    setSaving(true);
    try {
      await api.post('/mailing-settings', settings);
      // Recharger les settings pour obtenir le statut 'configured'
      await loadSettings();
      toast.success('Configuration enregistree ! Vous pouvez maintenant envoyer un email de test.');
    } catch (error) {
      console.error('Erreur save:', error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Erreur lors de la sauvegarde';
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    try {
      await api.post('/mailing-settings/test', { test_email: settings.from_email });
      toast.success('Email de test envoye ! Verifiez votre boite de reception.');
    } catch (error) {
      console.error('Erreur test:', error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Erreur lors de l\'envoi du test';
      toast.error(errorMsg);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Mail className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">Configuration Email</h1>
          </div>
          <p className="text-gray-600">Configuration simplifiée - LeadSynch gère automatiquement l'envoi et le désabonnement</p>
        </div>

        {/* Bandeau info */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-blue-900 mb-1">LeadSynch gère tout pour vous :</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✅ Lien de désabonnement intégré automatiquement</li>
              <li>✅ Serveur d'envoi Elastic Email par défaut (fiable et rapide)</li>
              <li>✅ Gestion des désabonnements avec blocage permanent</li>
              <li>✅ Protection anti-spam automatique</li>
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          {/* Configuration Essentielle - 4 CHAMPS */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-4 border-purple-200">
            <div className="flex items-center gap-3 mb-6">
              <User className="w-6 h-6 text-purple-600" />
              <h2 className="text-xl font-bold text-gray-900">Configuration Essentielle</h2>
            </div>

            <div className="space-y-4">
              {/* Email expéditeur */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email expéditeur <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={settings.from_email}
                  onChange={(e) => setSettings({...settings, from_email: e.target.value})}
                  placeholder="contact@votre-entreprise.com"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  L'email qui apparaîtra comme expéditeur de vos campagnes
                </p>
              </div>

              {/* Nom expéditeur */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Nom de l'expéditeur <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={settings.from_name}
                  onChange={(e) => setSettings({...settings, from_name: e.target.value})}
                  placeholder="Équipe Commerciale"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Le nom qui apparaîtra comme expéditeur (ex: "Jean Dupont", "Service Commercial")
                </p>
              </div>

              {/* Email de réponse */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Reply className="w-4 h-4 inline mr-1" />
                  Email de réponse <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={settings.reply_to_email}
                  onChange={(e) => setSettings({...settings, reply_to_email: e.target.value})}
                  placeholder="support@votre-entreprise.com"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Les réponses de vos prospects seront envoyées à cette adresse
                </p>
              </div>

              {/* Nom entreprise */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Building className="w-4 h-4 inline mr-1" />
                  Nom de l'entreprise <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={settings.company_name}
                  onChange={(e) => setSettings({...settings, company_name: e.target.value})}
                  placeholder="Votre Entreprise SAS"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Apparaîtra dans le footer des emails (obligation légale RGPD)
                </p>
              </div>

              {/* Adresse entreprise */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Building className="w-4 h-4 inline mr-1" />
                  Adresse de l'entreprise <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={settings.company_address}
                  onChange={(e) => setSettings({...settings, company_address: e.target.value})}
                  placeholder="123 Rue Example, 75001 Paris, France"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Apparaîtra dans le footer des emails (obligation légale RGPD)
                </p>
              </div>
            </div>
          </div>

          {/* Configuration Avancée (Optionnelle - Cachée par défaut) */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-all"
            >
              <div className="flex items-center gap-3">
                <Server className="w-6 h-6 text-gray-600" />
                <h2 className="text-xl font-bold text-gray-900">Configuration Serveur (Optionnel)</h2>
              </div>
              {showAdvanced ? (
                <ChevronUp className="w-6 h-6 text-gray-600" />
              ) : (
                <ChevronDown className="w-6 h-6 text-gray-600" />
              )}
            </button>

            {showAdvanced && (
              <div className="px-6 pb-6 border-t border-gray-200">
                <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl mb-4">
                  <AlertCircle className="w-5 h-5 inline mr-2 text-yellow-700" />
                  <span className="text-sm font-semibold text-yellow-900">
                    Par défaut, LeadSynch utilise Elastic Email (fiable et rapide). Modifiez uniquement si vous souhaitez utiliser votre propre serveur SMTP.
                  </span>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Fournisseur d'envoi
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    <button
                      onClick={() => setSettings({...settings, api_provider: 'elasticemail'})}
                      className={`p-4 rounded-xl border-2 font-semibold transition-all ${
                        settings.api_provider === 'elasticemail'
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-300 hover:border-purple-300'
                      }`}
                    >
                      ElasticEmail
                      <div className="text-xs mt-1 opacity-70">(Par défaut)</div>
                    </button>
                    <button
                      onClick={() => setSettings({...settings, api_provider: 'smtp'})}
                      className={`p-4 rounded-xl border-2 font-semibold transition-all ${
                        settings.api_provider === 'smtp'
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-300 hover:border-purple-300'
                      }`}
                    >
                      SMTP Custom
                    </button>
                    <button
                      onClick={() => setSettings({...settings, api_provider: 'sendgrid'})}
                      className={`p-4 rounded-xl border-2 font-semibold transition-all ${
                        settings.api_provider === 'sendgrid'
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-300 hover:border-purple-300'
                      }`}
                    >
                      SendGrid
                    </button>
                  </div>
                </div>

                {settings.api_provider === 'smtp' && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Serveur SMTP
                      </label>
                      <input
                        type="text"
                        value={settings.smtp_host}
                        onChange={(e) => setSettings({...settings, smtp_host: e.target.value})}
                        placeholder="smtp.gmail.com"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Port SMTP
                      </label>
                      <input
                        type="number"
                        value={settings.smtp_port}
                        onChange={(e) => setSettings({...settings, smtp_port: parseInt(e.target.value)})}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Utilisateur SMTP
                      </label>
                      <input
                        type="text"
                        value={settings.smtp_user}
                        onChange={(e) => setSettings({...settings, smtp_user: e.target.value})}
                        placeholder="votre@email.com"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Mot de passe SMTP
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={settings.smtp_password}
                          onChange={(e) => setSettings({...settings, smtp_password: e.target.value})}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="col-span-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.smtp_secure}
                          onChange={(e) => setSettings({...settings, smtp_secure: e.target.checked})}
                          className="w-5 h-5 text-purple-600 rounded"
                        />
                        <span className="text-sm font-semibold text-gray-700">
                          <Shield className="w-4 h-4 inline mr-1" />
                          Utiliser SSL/TLS (recommandé)
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {(settings.api_provider === 'elasticemail' || settings.api_provider === 'sendgrid') && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Clé API {settings.api_provider === 'elasticemail' ? 'ElasticEmail' : 'SendGrid'}
                    </label>
                    <input
                      type="text"
                      value={settings.api_key}
                      onChange={(e) => setSettings({...settings, api_key: e.target.value})}
                      placeholder="Votre clé API"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Laissez vide pour utiliser la configuration par défaut de LeadSynch
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Info Désabonnement */}
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-green-900 mb-1">Désabonnement géré automatiquement</h3>
              <p className="text-sm text-green-800">
                LeadSynch ajoute automatiquement un lien de désabonnement en bas de chaque email (obligation légale RGPD).
                <br />
                <strong>Règles de protection :</strong>
              </p>
              <ul className="text-sm text-green-800 mt-2 space-y-1">
                <li>• Si un prospect se désabonne, il est bloqué <strong>définitivement</strong> pour votre compte</li>
                <li>• Vous pouvez le réintégrer manuellement si nécessaire</li>
                <li>• Si vous le réintégrez 3 fois après désabonnement, votre compte sera <strong>automatiquement banni</strong> (protection anti-spam)</li>
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg disabled:opacity-50 text-lg"
            >
              <Save className="w-6 h-6" />
              {saving ? 'Enregistrement...' : 'Enregistrer la configuration'}
            </button>

            <button
              onClick={handleTestEmail}
              disabled={!settings.configured}
              className="px-6 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              title={!settings.configured ? 'Veuillez d\'abord enregistrer votre configuration' : 'Envoyer un email de test'}
            >
              <Send className="w-5 h-5 inline mr-2" />
              Envoyer un test
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
