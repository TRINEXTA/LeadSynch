import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.get('/auth/me')
      .then(r => mounted && setUser(r.data))
      .catch(() => mounted && setUser(null))
      .finally(() => mounted && setBooting(false));
    return () => { mounted = false; };
  }, []);

  const login = async (email, password, rememberMe = false) => {
    console.log('========== FRONTEND LOGIN ==========');
    console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
    console.log('Email:', email);
    console.log('Remember me:', rememberMe);

    try {
      console.log('Sending POST /auth/login...');
      const loginResponse = await api.post('/auth/login', { email, password, rememberMe });

      console.log('Login response status:', loginResponse.status);
      console.log('Login response data:', loginResponse.data);

      // SAUVEGARDER LE TOKEN
      if (loginResponse.data.token) {
        // Si "Se souvenir de moi" est coché, utiliser localStorage (persistant)
        // Sinon, utiliser sessionStorage (effacé à la fermeture du navigateur)
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem('token', loginResponse.data.token);

        // Nettoyer l'autre storage pour éviter les conflits
        const otherStorage = rememberMe ? sessionStorage : localStorage;
        otherStorage.removeItem('token');

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('Fetching user with GET /auth/me...');

      const me = await api.get('/auth/me');

      console.log('Me response:', me.data);
      setUser(me.data);

      console.log('========== LOGIN SUCCESS ==========');
      return { success: true };

    } catch (error) {
      console.error('========== FRONTEND LOGIN ERROR ==========');
      console.error('Error message:', error.message);
      console.error('Error response:', error.response?.data);

      return { success: false, error: 'Identifiants incorrects' };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.log('Logout error (ignoré):', e);
    }
    // Supprimer le token des deux storages
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, booting, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}