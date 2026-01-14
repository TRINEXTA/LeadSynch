import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api/axios';

/**
 * Hook pour tracker l'activité utilisateur en temps réel
 * - Envoie un heartbeat toutes les 30 secondes (seulement si onglet visible)
 * - Démarre une session au montage
 * - Termine la session au démontage
 * - Enregistre la page courante
 */
export const useActivityTracking = (isAuthenticated) => {
  const location = useLocation();
  const heartbeatInterval = useRef(null);
  const sessionStarted = useRef(false);

  // Démarrer une session
  const startSession = useCallback(async () => {
    if (sessionStarted.current) return;

    try {
      await api.post('/activity/session/start');
      sessionStarted.current = true;
    } catch (error) {
      // Silently fail - session might already exist
    }
  }, []);

  // Terminer la session
  const endSession = useCallback(async () => {
    if (!sessionStarted.current) return;

    try {
      await api.post('/activity/session/end');
      sessionStarted.current = false;
    } catch (error) {
      // Silently fail
    }
  }, []);

  // Envoyer un heartbeat (✅ avec vérification visibilité)
  const sendHeartbeat = useCallback(async () => {
    // ✅ Ne pas envoyer si l'onglet n'est pas visible ou si non authentifié
    if (!isAuthenticated || document.visibilityState !== 'visible') return;

    try {
      await api.post('/activity/heartbeat', {
        current_page: location.pathname
      });
    } catch (error) {
      // Silently fail - don't spam console
    }
  }, [isAuthenticated, location.pathname]);

  // Logger une action
  const logActivity = useCallback(async (action, data = {}) => {
    if (!isAuthenticated) return;

    try {
      await api.post('/activity/log', {
        action,
        page_url: location.pathname,
        ...data
      });
    } catch (error) {
      // Silently fail
    }
  }, [isAuthenticated, location.pathname]);

  // Effet pour le heartbeat
  useEffect(() => {
    if (!isAuthenticated) {
      // Nettoyer si déconnecté
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
        heartbeatInterval.current = null;
      }
      return;
    }

    // Démarrer la session
    startSession();

    // Premier heartbeat immédiat
    sendHeartbeat();

    // ✅ Heartbeat toutes les 30 secondes (au lieu de 60s)
    heartbeatInterval.current = setInterval(sendHeartbeat, 30000);

    // Cleanup
    return () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
    };
  }, [isAuthenticated, startSession, sendHeartbeat]);

  // ✅ Effet pour détecter le changement de visibilité (onglet actif/inactif)
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // L'utilisateur revient sur l'onglet - envoyer un heartbeat immédiat
        sendHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, sendHeartbeat]);

  // Effet pour la fin de session (fermeture navigateur/onglet)
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleBeforeUnload = () => {
      // ✅ Utiliser fetch avec keepalive pour garantir l'envoi avec cookies
      const apiUrl = import.meta.env.VITE_API_URL || '';
      fetch(`${apiUrl}/api/activity/session/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // ✅ Envoie les cookies HttpOnly
        keepalive: true, // ✅ Garantit l'envoi même si la page se ferme
        body: JSON.stringify({})
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isAuthenticated]);

  return { logActivity, startSession, endSession };
};

export default useActivityTracking;
