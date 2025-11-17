import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, FileText, Mail } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function SignContract() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState(null);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState({
    signer_firstname: '',
    signer_lastname: '',
    signer_email: '',
    signer_position: '',
    cgv_accepted: false
  });
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);

  useEffect(() => {
    loadContract();
  }, [token]);

  const loadContract = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/sign/${token}`);
      setContract(response.data.contract);
      setLoading(false);
    } catch (err) {
      console.error('Erreur:', err);
      setError(err.response?.data?.error || 'Lien invalide ou expiré');
      setLoading(false);
    }
  };

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    if (!formData.cgv_accepted) {
      toast.error('Vous devez accepter les CGV');
      return;
    }
    setOtpSending(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/sign/${token}/request-otp`, formData);
      setStep(2);
      toast.success('📧 Code envoyé par email !');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de l\'envoi du code');
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOTP = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      toast.error('Veuillez entrer le code complet');
      return;
    }
    setOtpVerifying(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/sign/${token}/verify-otp`, { otp: otpCode });
      setStep(3);
      toast.success('✅ Code vérifié avec succès !');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Code invalide');
      setOtp(['', '', '', '', '', '']);
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value[0];
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Chargement...</p>
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

  if (step === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Contrat signé !</h1>
          <p className="text-gray-600 mb-6">Votre signature a été enregistrée.</p>
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-700">Contrat {contract?.number}</p>
            <p className="text-2xl font-bold text-blue-600">{contract?.amount} € TTC</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
            <FileText className="w-8 h-8 mb-2" />
            <h1 className="text-2xl font-bold">Signature de contrat</h1>
            <p className="text-blue-100">Contrat {contract?.number}</p>
          </div>
          <div className="p-6">
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Entreprise</p>
                  <p className="font-semibold">{contract?.company}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Montant</p>
                  <p className="text-xl font-bold text-blue-600">{contract?.amount} € TTC</p>
                </div>
              </div>
            </div>
            {step === 1 ? (
              <form onSubmit={handleRequestOTP} className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900">Informations</h3>
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" required placeholder="Prénom" value={formData.signer_firstname} onChange={(e) => setFormData({...formData, signer_firstname: e.target.value})} className="px-4 py-2 border rounded-lg" />
                  <input type="text" required placeholder="Nom" value={formData.signer_lastname} onChange={(e) => setFormData({...formData, signer_lastname: e.target.value})} className="px-4 py-2 border rounded-lg" />
                </div>
                <input type="email" required placeholder="Email" value={formData.signer_email} onChange={(e) => setFormData({...formData, signer_email: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
                <input type="text" placeholder="Fonction" value={formData.signer_position} onChange={(e) => setFormData({...formData, signer_position: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
                <label className="flex items-start gap-3">
                  <input type="checkbox" required checked={formData.cgv_accepted} onChange={(e) => setFormData({...formData, cgv_accepted: e.target.checked})} className="mt-1" />
                  <span className="text-sm">J'accepte les CGV</span>
                </label>
                <button type="submit" disabled={otpSending} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">
                  {otpSending ? 'Envoi...' : 'Signer'}
                </button>
              </form>
            ) : (
              <div>
                <Mail className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-center mb-4">Code de validation</h3>
                <p className="text-center text-gray-600 mb-6">Envoyé à {formData.signer_email}</p>
                <div className="flex justify-center gap-2 mb-6">
                  {otp.map((digit, index) => (
                    <input key={index} id={`otp-${index}`} type="text" maxLength="1" value={digit} onChange={(e) => handleOtpChange(index, e.target.value)} className="w-12 h-14 text-center text-2xl border-2 rounded-lg" />
                  ))}
                </div>
                <button onClick={handleVerifyOTP} disabled={otpVerifying} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold">
                  {otpVerifying ? 'Vérification...' : 'Valider'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}