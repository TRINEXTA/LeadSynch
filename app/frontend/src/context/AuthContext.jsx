import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let mounted = true;
    // ✅ Le cookie sera envoyé automatiquement par le navigateur (withCredentials: true)
    api.get('/auth/me')
      .then(r => mounted && setUser(r.data))
      .catch(() => mounted && setUser(null))
      .finally(() => mounted && setBooting(false));
    return () => { mounted = false; };
  }, []);

  const login = async (email, password, rememberMe = false) => {
    try {
      // Le backend définit un cookie HttpOnly + renvoie le token pour fallback
      const loginResponse = await api.post('/auth/login', { email, password, rememberMe });

      // ✅ FALLBACK : Stocker le token en localStorage pour les cas où le cookie cross-domain échoue
      // (frontend Vercel ≠ backend Render = domaines différents)
      if (loginResponse.data.token) {
        if (rememberMe) {
          localStorage.setItem('token', loginResponse.data.token);
        } else {
          sessionStorage.setItem('token', loginResponse.data.token);
        }
      }

      // On récupère immédiatement les infos utilisateur pour mettre à jour le contexte
      const me = await api.get('/auth/me');
      setUser(me.data);

      return { success: true };

    } catch (error) {
      console.error("Login failed", error);
      return { success: false, error: 'Identifiants incorrects' };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout'); // Le backend supprime le cookie
    } catch {
      // Erreur ignorée
    }
    // ✅ Nettoyage sécurité : on s'assure que rien ne traîne (rétrocompatibilité)
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
