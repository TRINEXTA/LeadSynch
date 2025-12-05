import { log, error, warn } from "./../lib/logger.js";
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Send, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import api from '../api/axios';

export default function TestMailing() {
  const [formData, setFormData] = useState({
    to_email: '',
    subject: 'Test Email - LeadSynch',
    message: 'Ceci est un email de test envoyé depuis LeadSynch CRM.\n\nSi vous recevez ce message, votre configuration email fonctionne correctement.'
  });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

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

      // Réinitialiser le formulaire après 3 secondes
      setTimeout(() => {
        setFormData({
          ...formData,
          to_email: ''
        });
      }, 3000);

    } catch (error) {
      error('Erreur test email:', error);
      setResult({
        success: false,
        message: error.response?.data?.message || error.response?.data?.error || 'Erreur lors de l\'envoi de l\'email de test'
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Test d'envoi d'email
          </h1>
          <p className="text-gray-700 text-lg font-medium">
            Testez votre configuration email en envoyant un message de test
          </p>
        </div>

        {/* Info Card */}
        <Card className="shadow-xl border-2 border-blue-200 bg-blue-50 mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-blue-900 mb-2">Comment ça fonctionne ?</h3>
                <p className="text-sm text-blue-800">
                  Cet outil utilise votre configuration email actuelle pour envoyer un message de test.
                  Assurez-vous d'avoir configuré vos paramètres d'envoi dans la section "Configuration Email" avant de continuer.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Card */}
        <Card className="shadow-xl border-2 border-gray-200">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-6 h-6 text-indigo-600" />
              Formulaire de test
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email destinataire */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Adresse email destinataire *
                </label>
                <input
                  type="email"
                  required
                  value={formData.to_email}
                  onChange={(e) => setFormData({ ...formData, to_email: e.target.value })}
                  placeholder="exemple@domaine.com"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  L'email sera envoyé à cette adresse
                </p>
              </div>

              {/* Sujet */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Sujet de l'email
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Sujet de votre email de test"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={6}
                  placeholder="Contenu de votre email de test"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Result Message */}
              {result && (
                <div className={`p-4 rounded-lg border-2 ${
                  result.success
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-start gap-3">
                    {result.success ? (
                      <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                    )}
                    <div>
                      <h4 className={`font-bold mb-1 ${
                        result.success ? 'text-green-900' : 'text-red-900'
                      }`}>
                        {result.success ? 'Succès !' : 'Erreur'}
                      </h4>
                      <p className={`text-sm ${
                        result.success ? 'text-green-800' : 'text-red-800'
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
                disabled={sending}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 px-6 rounded-lg font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="w-6 h-6" />
                    Envoyer l'email de test
                  </>
                )}
              </button>
            </form>
          </CardContent>
        </Card>

        {/* Help Card */}
        <Card className="shadow-xl border-2 border-gray-200 mt-6">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
            <CardTitle className="text-lg">Dépannage</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-bold text-gray-900 mb-1">
                  L'email n'arrive pas ?
                </h4>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>Vérifiez vos spams et courriers indésirables</li>
                  <li>Assurez-vous que votre configuration email est correcte</li>
                  <li>Vérifiez que l'adresse email destinataire est valide</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 mb-1">
                  Erreur lors de l'envoi ?
                </h4>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>Vérifiez vos identifiants SMTP dans la configuration</li>
                  <li>Assurez-vous que votre fournisseur email autorise l'envoi</li>
                  <li>Contactez le support si le problème persiste</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
