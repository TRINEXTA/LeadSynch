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

  const login = async (email, password) => {
    console.log('========== FRONTEND LOGIN ==========');
    console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
    console.log('Email:', email);
    console.log('Password length:', password?.length);
    console.log('api.defaults.baseURL:', api.defaults.baseURL);
    
    try {
      console.log('Sending POST /auth/login...');
      const loginResponse = await api.post('/auth/login', { email, password });
      
      console.log('Login response status:', loginResponse.status);
      console.log('Login response data:', loginResponse.data);
      
      // SAUVEGARDER LE TOKEN DANS LOCALSTORAGE
      if (loginResponse.data.token) {
        localStorage.setItem('token', loginResponse.data.token);

        // Attendre un petit délai pour être sûr
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
      console.error('Error response status:', error.response?.status);
      console.error('Error response data:', error.response?.data);
      console.error('Error config URL:', error.config?.url);
      console.error('Error config baseURL:', error.config?.baseURL);
      console.error('Error config headers:', error.config?.headers);
      console.error('Full error:', error);
      
      return { success: false, error: 'Identifiants incorrects' };
    }
  };

  const logout = async () => {
    try { 
      await api.post('/auth/logout'); 
    } catch (e) {
      console.log('Logout error (ignoré):', e);
    }
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, booting, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}