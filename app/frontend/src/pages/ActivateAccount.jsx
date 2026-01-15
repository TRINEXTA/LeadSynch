import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import api from '../api/axios';
import { toast } from '../lib/toast';

export default function ActivateAccount() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('Activation de votre compte en cours...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Lien d\'activation invalide (token manquant).');
      return;
    }

    const activate = async () => {
      try {
        // Simulation de délai pour UX
        await new Promise(r => setTimeout(r, 1000));

        const response = await api.post('/auth/activate', { token });

        setStatus('success');
        setMessage(response.data.message || 'Votre compte a été activé avec succès !');
        toast.success('Compte activé !');

        // Redirection auto
        setTimeout(() => navigate('/login'), 4000);

      } catch (err) {
        setStatus('error');
        const errorMsg = err.response?.data?.error || 'Erreur lors de l\'activation.';
        setMessage(errorMsg);
        toast.error(errorMsg);
      }
    };

    activate();
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <h1 className="text-3xl font-bold text-indigo-600">LeadSynch</h1>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-2xl sm:px-10 text-center">

          {status === 'loading' && (
            <div className="flex flex-col items-center">
              <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Activation en cours</h2>
              <p className="text-gray-500">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Compte Activé !</h2>
              <p className="text-gray-500 mb-6">{message}</p>
              <p className="text-sm text-gray-400 mb-6">Redirection vers la connexion dans quelques secondes...</p>

              <Link
                to="/login"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
              >
                Se connecter maintenant
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Échec de l'activation</h2>
              <p className="text-red-600 mb-6">{message}</p>

              <div className="space-y-3 w-full">
                <Link
                  to="/login"
                  className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 font-medium transition-colors"
                >
                  Retour à la connexion
                </Link>
                <p className="text-sm text-gray-500">
                  Besoin d'aide ? <a href="mailto:support@leadsynch.com" className="text-indigo-600 hover:underline">Contacter le support</a>
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
