import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useActivityTracking } from '../hooks/useActivityTracking';

/**
 * Composant invisible qui gère le tracking d'activité utilisateur
 * Doit être placé à l'intérieur du BrowserRouter et AuthProvider
 */
export default function ActivityTracker() {
  const { user, isAuthenticated } = useAuth();

  // Initialiser le tracking
  const { logActivity, startSession, endSession } = useActivityTracking(isAuthenticated);

  // Exposer logActivity globalement pour pouvoir l'utiliser partout
  useEffect(() => {
    if (isAuthenticated) {
      window.logUserActivity = logActivity;
    } else {
      window.logUserActivity = null;
    }

    return () => {
      window.logUserActivity = null;
    };
  }, [isAuthenticated, logActivity]);

  // Ce composant ne rend rien visuellement
  return null;
}
