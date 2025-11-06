import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/axios';  // ✅ CORRIGÉ

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

  const login = async (email, password) => {
    try {
      await api.post('/auth/login', { email, password }); // cookie posé
      const me = await api.get('/auth/me');
      setUser(me.data);
      return { success: true };
    } catch {
      return { success: false, error: 'Identifiants incorrects' };
    }
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, booting, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}