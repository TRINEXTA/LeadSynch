<<<<<<< HEAD
import { log, error, warn } from "./../lib/logger.js";
=======
import { log, error, warn } from "../lib/logger.js";
>>>>>>> origin/main
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, FileText, Mail, Shield, Clock, Building, User, Euro, Calendar, Lock, Send } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'https://leadsynch-api.onrender.com';

export default function SignContract() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState(null);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1); // 1: View & Accept Terms, 2: Enter Code, 3: Success

  const [signerEmail, setSignerEmail] = useState('');
  const [signerName, setSignerName] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [codeExpiry, setCodeExpiry] = useState(null);

  useEffect(() => {
    loadContract();
  }, [token]);

  const loadContract = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/contract-sign/${token}`);

      if (response.data.already_signed) {
        setContract(response.data.contract);
        setStep(3);
      } else {
        setContract(response.data.contract);
      }
      setLoading(false);
    } catch (err) {
      error('Erreur:', err);
      setError(err.response?.data?.error || 'Lien invalide ou expiré');
      setLoading(false);
    }
  };

  const handleAcceptTerms = async (e) => {
    e.preventDefault();

    if (!termsAccepted) {
      toast.error('Vous devez accepter les conditions générales');
      return;
    }

    if (!signerEmail) {
      toast.error('Veuillez entrer votre email');
      return;
    }

    setProcessing(true);
    try {
      // First accept terms
      await axios.post(`${API_URL}/api/contract-sign/${token}`, {
        action: 'accept-terms',
        signer_email: signerEmail,
        signer_name: signerName
      });

      // Then send verification code
      const response = await axios.post(`${API_URL}/api/contract-sign/${token}`, {
        action: 'send-code',
        signer_email: signerEmail
      });

      setCodeExpiry(new Date(response.data.expires_at));
      setStep(2);
      toast.success('📧 Code de vérification envoyé !');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de l\'envoi du code');
    } finally {
      setProcessing(false);
    }
  };

  const handleResendCode = async () => {
    setProcessing(true);
    try {
      const response = await axios.post(`${API_URL}/api/contract-sign/${token}`, {
        action: 'send-code',
        signer_email: signerEmail
      });
      setCodeExpiry(new Date(response.data.expires_at));
      setVerificationCode(['', '', '', '', '', '']);
      toast.success('📧 Nouveau code envoyé !');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de l\'envoi du code');
    } finally {
      setProcessing(false);
    }
  };

  const handleVerifyCode = async () => {
    const code = verificationCode.join('');
    if (code.length !== 6) {
      toast.error('Veuillez entrer le code complet à 6 chiffres');
      return;
    }

    setProcessing(true);
    try {
      await axios.post(`${API_URL}/api/contract-sign/${token}`, {
        action: 'verify',
        verification_code: code,
        signer_email: signerEmail,
        signer_name: signerName
      });

      setStep(3);
      toast.success('✅ Contrat signé avec succès !');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Code invalide ou expiré');
      setVerificationCode(['', '', '', '', '', '']);
    } finally {
      setProcessing(false);
    }
  };

  const handleCodeChange = (index, value) => {
    if (value.length > 1) value = value[0];
    if (!/^\d*$/.test(value)) return; // Only digits

    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      document.getElementById(`code-${index + 1}`)?.focus();
    }

    // Auto-verify when complete
    if (value && index === 5) {
      const fullCode = [...newCode.slice(0, 5), value].join('');
      if (fullCode.length === 6) {
        setTimeout(() => handleVerifyCode(), 100);
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      document.getElementById(`code-${index - 1}`)?.focus();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Chargement du contrat...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Lien invalide</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Success state
  if (step === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Contrat signé !</h1>
          <p className="text-gray-600 mb-8">
            Votre signature électronique a été enregistrée avec succès.
            Un email de confirmation vous a été envoyé.
          </p>

          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-600">Référence</span>
              <span className="font-bold text-gray-900">{contract?.reference}</span>
            </div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-600">Offre</span>
              <span className="font-semibold text-gray-900">{contract?.offer_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Montant TTC</span>
              <span className="text-2xl font-bold text-emerald-600">{parseFloat(contract?.total_amount || 0).toFixed(2)} €</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-green-600">
            <Shield className="w-5 h-5" />
            <span className="text-sm font-medium">Signature électronique sécurisée</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Signature de contrat</h1>
                <p className="text-emerald-100">Référence : {contract?.reference}</p>
              </div>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="p-4 bg-gray-50 border-b">
            <div className="flex items-center justify-center gap-4">
              <div className={`flex items-center gap-2 ${step >= 1 ? 'text-emerald-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-emerald-600 text-white' : 'bg-gray-200'}`}>1</div>
                <span className="font-medium hidden sm:inline">Vérification</span>
              </div>
              <div className={`w-12 h-1 rounded ${step >= 2 ? 'bg-emerald-600' : 'bg-gray-200'}`}></div>
              <div className={`flex items-center gap-2 ${step >= 2 ? 'text-emerald-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-emerald-600 text-white' : 'bg-gray-200'}`}>2</div>
                <span className="font-medium hidden sm:inline">Code email</span>
              </div>
              <div className={`w-12 h-1 rounded ${step >= 3 ? 'bg-emerald-600' : 'bg-gray-200'}`}></div>
              <div className={`flex items-center gap-2 ${step >= 3 ? 'text-emerald-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-emerald-600 text-white' : 'bg-gray-200'}`}>✓</div>
                <span className="font-medium hidden sm:inline">Signé</span>
              </div>
            </div>
          </div>
        </div>

        {/* Contract details */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            Détails du contrat
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Provider info */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Building className="w-4 h-4" />
                Prestataire
              </h3>
              <p className="font-medium text-gray-900">{contract?.provider?.name || 'N/A'}</p>
              {contract?.provider?.address && (
                <p className="text-sm text-gray-600 mt-1">
                  {contract.provider.address}<br />
                  {contract.provider.postal_code} {contract.provider.city}
                </p>
              )}
              {contract?.provider?.siret && (
                <p className="text-xs text-gray-500 mt-2">SIRET: {contract.provider.siret}</p>
              )}
            </div>

            {/* Client info */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Client
              </h3>
              <p className="font-medium text-gray-900">{contract?.client?.company_name || 'N/A'}</p>
              {contract?.client?.contact_name && (
                <p className="text-sm text-gray-600">{contract.client.contact_name}</p>
              )}
              {contract?.client?.address && (
                <p className="text-sm text-gray-600 mt-1">
                  {contract.client.address}<br />
                  {contract.client.postal_code} {contract.client.city}
                </p>
              )}
            </div>
          </div>

          {/* Contract details */}
          <div className="mt-6 border-t pt-6">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-emerald-50 rounded-xl p-4 text-center">
                <Euro className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Montant TTC</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {parseFloat(contract?.total_amount || 0).toFixed(2)} €
                </p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <Calendar className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Date de début</p>
                <p className="font-semibold text-gray-900">
                  {contract?.start_date ? new Date(contract.start_date).toLocaleDateString('fr-FR') : 'N/A'}
                </p>
              </div>
              <div className="bg-purple-50 rounded-xl p-4 text-center">
                <FileText className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Offre</p>
                <p className="font-semibold text-gray-900">{contract?.offer_name || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Services */}
          {contract?.services && contract.services.length > 0 && (
            <div className="mt-6 border-t pt-6">
              <h3 className="font-semibold text-gray-700 mb-3">Services inclus</h3>
              <ul className="space-y-2">
                {contract.services.map((service, index) => (
                  <li key={index} className="flex items-center gap-2 text-gray-600">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    {service}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Signature form */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          {step === 1 ? (
            <form onSubmit={handleAcceptTerms}>
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-emerald-600" />
                Signature électronique sécurisée
              </h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Votre nom complet *
                  </label>
                  <input
                    type="text"
                    required
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    placeholder="Jean Dupont"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Votre email *
                  </label>
                  <input
                    type="email"
                    required
                    value={signerEmail}
                    onChange={(e) => setSignerEmail(e.target.value)}
                    placeholder="jean.dupont@entreprise.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Un code de vérification sera envoyé à cette adresse
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-1 w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-700">
                    J'ai lu et j'accepte les <a href="#" className="text-emerald-600 underline hover:text-emerald-700">conditions générales de vente</a> et les <a href="#" className="text-emerald-600 underline hover:text-emerald-700">conditions particulières</a> du contrat. Je confirme mon accord pour la signature électronique de ce document.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={processing || !termsAccepted}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold text-lg hover:from-emerald-700 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Recevoir le code de signature
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Code de vérification envoyé
              </h2>
              <p className="text-gray-600 mb-6">
                Nous avons envoyé un code à 6 chiffres à<br />
                <strong className="text-gray-900">{signerEmail}</strong>
              </p>

              {codeExpiry && (
                <p className="text-sm text-gray-500 mb-4 flex items-center justify-center gap-1">
                  <Clock className="w-4 h-4" />
                  Code valide 10 minutes
                </p>
              )}

              <div className="flex justify-center gap-2 mb-6">
                {verificationCode.map((digit, index) => (
                  <input
                    key={index}
                    id={`code-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  />
                ))}
              </div>

              <button
                onClick={handleVerifyCode}
                disabled={processing || verificationCode.join('').length !== 6}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold text-lg hover:from-emerald-700 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Vérification...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Valider et signer
                  </>
                )}
              </button>

              <button
                onClick={handleResendCode}
                disabled={processing}
                className="mt-4 text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Renvoyer le code
              </button>
            </div>
          )}
        </div>

        {/* Security notice */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 text-gray-500 text-sm">
            <Shield className="w-4 h-4" />
            <span>Signature électronique sécurisée conforme eIDAS</span>
          </div>
        </div>
      </div>
    </div>
  );
}
