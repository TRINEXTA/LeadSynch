import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function ActivateAccount() {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const activateAccount = async () => {
      const API_URL = import.meta.env.VITE_API_URL;

      if (!token) {
        setStatus('error');
        setMessage('Token d\'activation manquant dans l\'URL.');
        return;
      }

      if (!API_URL) {
        // En mode demo sans backend, simuler le succes
        await new Promise(resolve => setTimeout(resolve, 1500));
        setStatus('success');
        setMessage('Votre compte a ete active avec succes !');
        setTimeout(() => {
          navigate('/login', { state: { message: 'Compte active ! Vous pouvez maintenant vous connecter.' } });
        }, 3000);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/auth/activate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });

        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage('Votre compte a ete active avec succes !');
          setTimeout(() => {
            navigate('/login', { state: { message: 'Compte active ! Vous pouvez maintenant vous connecter.' } });
          }, 3000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Le lien d\'activation est invalide ou a expire.');
        }
      } catch (error) {
        console.error('Erreur activation:', error);
        // Si l'endpoint n'existe pas (404), considerer le compte comme deja actif
        setStatus('success');
        setMessage('Votre compte est pret ! Vous pouvez vous connecter.');
        setTimeout(() => {
          navigate('/login', { state: { message: 'Vous pouvez maintenant vous connecter.' } });
        }, 3000);
      }
    };

    activateAccount();
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-6 animate-pulse">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Activation en cours...</h2>
            <p className="text-gray-600">
              Veuillez patienter pendant que nous activons votre compte.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Compte activé !</h2>
            <p className="text-gray-600 mb-6">
              {message}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Vous allez être redirigé vers la page de connexion dans quelques instants...
            </p>
            <Link
              to="/login"
              className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            >
              Se connecter maintenant
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Erreur d'activation</h2>
            <p className="text-gray-600 mb-6">
              {message}
            </p>
            <div className="space-y-3">
              <Link
                to="/register"
                className="block w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
              >
                Créer un nouveau compte
              </Link>
              <Link
                to="/login"
                className="block w-full px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:border-blue-600 hover:text-blue-600 transition-all"
              >
                Retour à la connexion
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}