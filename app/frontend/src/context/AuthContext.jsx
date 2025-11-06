import { createContext, useContext, useState, useEffect } from 'react'
import api from '../axios' // <-- IMPORTANT: axios.js mis à jour avec withCredentials:true

const AuthContext = createContext(null)

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [booting, setBooting] = useState(true)

  // Vérifie l'auth automatiquement via le cookie
  useEffect(() => {
    let mounted = true
    api.get('/me')
      .then(res => mounted && setUser(res.data))
      .catch(() => mounted && setUser(null))
      .finally(() => mounted && setBooting(false))

    return () => { mounted = false }
  }, [])

  const login = async (email, password) => {
    try {
      await api.post('/auth/login', { email, password }) // Cookie posé ici
      const res = await api.get('/me')                   // On récupère l'utilisateur
      setUser(res.data)
      return { success: true }
    } catch (error) {
      return { success: false, error: "Email ou mot de passe incorrect" }
    }
  }

  const logout = async () => {
    try { await api.post('/auth/logout') } catch {}
    setUser(null)
  }

  const value = {
    user,
    booting,
    login,
    logout,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
