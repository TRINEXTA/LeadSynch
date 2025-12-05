
﻿import { createContext, useContext, useEffect, useState } from 'react';
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
    try {
      const loginResponse = await api.post('/auth/login', { email, password, rememberMe });

      // Sauvegarder le token
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

      const me = await api.get('/auth/me');
      setUser(me.data);

      return { success: true };

    } catch (error) {
      return { success: false, error: 'Identifiants incorrects' };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Erreur ignorée - on déconnecte quand même
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