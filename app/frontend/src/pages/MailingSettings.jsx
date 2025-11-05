import React, { useState, useEffect } from 'react';
import { Mail, User, Reply, Server, Send, Shield, TrendingUp, Save, Eye, EyeOff, Link, AlertCircle, Crown, Zap } from 'lucide-react';
import api from '../api/axios';

export default function MailingSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [settings, setSettings] = useState({
    from_email: '',
    from_name: '',
    reply_to_email: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    smtp_secure: true,
    api_provider: 'smtp',
    api_key: '',
    plan_type: 'external', // external, lite, pro, enterprise
    daily_limit: 500,
    hourly_limit: 50,
    warmup_enabled: false,
    warmup_daily_increment: 10,
    signature: '',
    unsubscribe_url: 'https://leadsync.com/unsubscribe?id={{LEAD_ID}}',
    company_name: '',
    company_address: ''
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
    // Validation
    if (!settings.from_email || !settings.from_name) {
      alert('❌ Adresse email et nom expéditeur obligatoires !');
      return;
    }

    if (!settings.unsubscribe_url.includes('{{LEAD_ID}}')) {
      alert('❌ Le lien de désabonnement doit contenir {{LEAD_ID}} !');
      return;
    }

    setSaving(true);
    try {
      await api.post('/mailing-settings', settings);
      alert('✅ Configuration enregistrée !');
    } catch (error) {
      console.error('Erreur save:', error);
      alert('❌ Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    try {
      await api.post('/mailing-settings/test', { email: settings.from_email });
      alert('📧 Email de test envoyé ! Vérifiez votre boîte de réception.');
    } catch (error) {
      console.error('Erreur test:', error);
      alert('❌ Erreur lors de l\'envoi du test');
    }
  };

  const isExternalProvider = settings.api_provider === 'smtp' && settings.smtp_host !== '';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Mail className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">Configuration Email</h1>
          </div>
          <p className="text-gray-600">Configurez vos paramètres d'envoi d'emails</p>
        </div>

        <div className="space-y-6">
          {/* Plan d'envoi */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <Crown className="w-6 h-6" />
              <h2 className="text-xl font-bold">Plan d'Envoi Email</h2>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <button
                onClick={() => setSettings({...settings, plan_type: 'external'})}
                className={`p-4 rounded-xl font-semibold transition-all ${
                  settings.plan_type === 'external'
                    ? 'bg-white text-purple-700 shadow-lg'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <Server className="w-6 h-6 mx-auto mb-2" />
                <div className="text-sm">SMTP Externe</div>
                <div className="text-xs opacity-80 mt-1">Illimité</div>
              </button>

              <button
                onClick={() => setSettings({...settings, plan_type: 'lite', daily_limit: 500})}
                className={`p-4 rounded-xl font-semibold transition-all ${
                  settings.plan_type === 'lite'
                    ? 'bg-white text-purple-700 shadow-lg'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <Zap className="w-6 h-6 mx-auto mb-2" />
                <div className="text-sm">Lite</div>
                <div className="text-xs opacity-80 mt-1">500 emails/jour</div>
              </button>

              <button
                onClick={() => setSettings({...settings, plan_type: 'pro', daily_limit: 5000})}
                className={`p-4 rounded-xl font-semibold transition-all ${
                  settings.plan_type === 'pro'
                    ? 'bg-white text-purple-700 shadow-lg'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <Crown className="w-6 h-6 mx-auto mb-2" />
                <div className="text-sm">Pro</div>
                <div className="text-xs opacity-80 mt-1">5000 emails/jour</div>
              </button>

              <button
                onClick={() => setSettings({...settings, plan_type: 'enterprise', daily_limit: 50000})}
                className={`p-4 rounded-xl font-semibold transition-all ${
                  settings.plan_type === 'enterprise'
                    ? 'bg-white text-purple-700 shadow-lg'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <TrendingUp className="w-6 h-6 mx-auto mb-2" />
                <div className="text-sm">Enterprise</div>
                <div className="text-xs opacity-80 mt-1">50000 emails/jour</div>
              </button>
            </div>

            {settings.plan_type === 'external' && (
              <div className="mt-4 p-4 bg-white/20 rounded-xl">
                <AlertCircle className="w-5 h-5 inline mr-2" />
                <span className="text-sm">
                  Avec votre propre serveur SMTP, aucune limite d'envoi n'est appliquée par LeadSync.
                </span>
              </div>
            )}
          </div>

          {/* Informations Expéditeur */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <User className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Informations Expéditeur</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Adresse email d'envoi * <span className="text-red-500">●</span>
                </label>
                <input
                  type="email"
                  required
                  value={settings.from_email}
                  onChange={(e) => setSettings({...settings, from_email: e.target.value})}
                  placeholder="contact@votre-entreprise.com"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nom de l'expéditeur * <span className="text-red-500">●</span>
                </label>
                <input
                  type="text"
                  required
                  value={settings.from_name}
                  onChange={(e) => setSettings({...settings, from_name: e.target.value})}
                  placeholder="Votre Entreprise"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Reply className="w-4 h-4 inline mr-1" />
                  Adresse de réponse (Reply-To)
                </label>
                <input
                  type="email"
                  value={settings.reply_to_email}
                  onChange={(e) => setSettings({...settings, reply_to_email: e.target.value})}
                  placeholder="support@votre-entreprise.com"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Les réponses seront envoyées à cette adresse
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nom de l'entreprise * <span className="text-red-500">●</span>
                </label>
                <input
                  type="text"
                  value={settings.company_name}
                  onChange={(e) => setSettings({...settings, company_name: e.target.value})}
                  placeholder="Votre Entreprise SAS"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Adresse de l'entreprise * <span className="text-red-500">●</span>
                </label>
                <input
                  type="text"
                  value={settings.company_address}
                  onChange={(e) => setSettings({...settings, company_address: e.target.value})}
                  placeholder="123 Rue Example, 75001 Paris"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Configuration Serveur */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Server className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-bold text-gray-900">Configuration Serveur</h2>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fournisseur d'envoi
              </label>
              <div className="grid grid-cols-3 gap-4">
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
                  onClick={() => setSettings({...settings, api_provider: 'elasticemail'})}
                  className={`p-4 rounded-xl border-2 font-semibold transition-all ${
                    settings.api_provider === 'elasticemail'
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-300 hover:border-purple-300'
                  }`}
                >
                  ElasticEmail
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

            {settings.api_provider === 'smtp' ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Serveur SMTP *
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
                    Port SMTP *
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
                    Utilisateur SMTP *
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
                    Mot de passe SMTP *
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
            ) : (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Clé API {settings.api_provider === 'elasticemail' ? 'ElasticEmail' : 'SendGrid'} *
                </label>
                <input
                  type="text"
                  value={settings.api_key}
                  onChange={(e) => setSettings({...settings, api_key: e.target.value})}
                  placeholder="Votre clé API"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                />
              </div>
            )}
          </div>

          {/* Limites d'envoi (uniquement si plan payant) */}
          {settings.plan_type !== 'external' && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Send className="w-6 h-6 text-orange-600" />
                <h2 className="text-xl font-bold text-gray-900">Limites d'envoi</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Limite quotidienne
                  </label>
                  <input
                    type="number"
                    value={settings.daily_limit}
                    disabled
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">Défini par votre plan ({settings.plan_type})</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Limite horaire
                  </label>
                  <input
                    type="number"
                    value={settings.hourly_limit}
                    onChange={(e) => setSettings({...settings, hourly_limit: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Nombre maximum d'emails par heure</p>
                </div>
              </div>
            </div>
          )}

          {/* Warmup */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
              <h2 className="text-xl font-bold text-gray-900">Warmup Email</h2>
            </div>

            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.warmup_enabled}
                  onChange={(e) => setSettings({...settings, warmup_enabled: e.target.checked})}
                  className="w-5 h-5 text-purple-600 rounded"
                />
                <span className="text-sm font-semibold text-gray-700">
                  Activer le warmup (montée en puissance progressive)
                </span>
              </label>
            </div>

            {settings.warmup_enabled && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Incrément quotidien
                </label>
                <input
                  type="number"
                  value={settings.warmup_daily_increment}
                  onChange={(e) => setSettings({...settings, warmup_daily_increment: parseInt(e.target.value)})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Nombre d'emails supplémentaires envoyés chaque jour
                </p>
              </div>
            )}
          </div>

          {/* Désabonnement (OBLIGATOIRE) */}
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Link className="w-6 h-6 text-red-600" />
              <h2 className="text-xl font-bold text-gray-900">
                Lien de Désabonnement <span className="text-red-500">● OBLIGATOIRE</span>
              </h2>
            </div>

            <div className="mb-4 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl">
              <AlertCircle className="w-5 h-5 inline mr-2 text-yellow-700" />
              <span className="text-sm font-semibold text-yellow-900">
                Légalement obligatoire (RGPD/CAN-SPAM) : Chaque email doit contenir un lien de désabonnement.
              </span>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                URL de désabonnement * <span className="text-red-500">●</span>
              </label>
              <input
                type="text"
                required
                value={settings.unsubscribe_url}
                onChange={(e) => setSettings({...settings, unsubscribe_url: e.target.value})}
                placeholder="https://votre-site.com/unsubscribe?id={{LEAD_ID}}"
                className="w-full px-4 py-3 border-2 border-red-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-2">
                <strong>Important :</strong> Utilisez <code className="bg-gray-200 px-2 py-1 rounded">{'{{LEAD_ID}}'}</code> pour identifier le lead qui se désabonne.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Ce lien sera automatiquement ajouté en bas de chaque email.
              </p>
            </div>
          </div>

          {/* Signature */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-6 h-6 text-purple-600" />
              <h2 className="text-xl font-bold text-gray-900">Signature Email</h2>
            </div>

            <textarea
              value={settings.signature}
              onChange={(e) => setSettings({...settings, signature: e.target.value})}
              rows={6}
              placeholder="Cordialement,&#10;&#10;[Votre Nom]&#10;[Poste]&#10;[Entreprise]&#10;&#10;HTML supporté"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 font-mono text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Enregistrement...' : 'Enregistrer la configuration'}
            </button>

            <button
              onClick={handleTestEmail}
              className="px-6 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg"
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
