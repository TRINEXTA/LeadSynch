import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api/axios';

/**
 * Hook pour tracker l'activité utilisateur en temps réel
 * - Envoie un heartbeat toutes les 30 secondes
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
      console.log('🟢 Session démarrée');
    } catch (error) {
      console.error('Erreur démarrage session:', error);
    }
  }, []);

  // Terminer la session
  const endSession = useCallback(async () => {
    if (!sessionStarted.current) return;

    try {
      await api.post('/activity/session/end');
      sessionStarted.current = false;
      console.log('🔴 Session terminée');
    } catch (error) {
      console.error('Erreur fin session:', error);
    }
  }, []);

  // Envoyer un heartbeat
  const sendHeartbeat = useCallback(async () => {
    if (!isAuthenticated) return;

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
      console.error('Erreur log activité:', error);
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

    // Heartbeat toutes les 60 secondes (réduit pour éviter rate limiting)
    heartbeatInterval.current = setInterval(sendHeartbeat, 60000);

    // Cleanup
    return () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
    };
  }, [isAuthenticated, startSession, sendHeartbeat]);

  // Effet pour la fin de session (fermeture navigateur/onglet)
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleBeforeUnload = () => {
      // Utiliser sendBeacon pour garantir l'envoi même si la page se ferme
      const token = localStorage.getItem('token');
      if (token) {
        navigator.sendBeacon(
          `${import.meta.env.VITE_API_URL || ''}/api/activity/session/end`,
          JSON.stringify({})
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isAuthenticated]);

  return { logActivity, startSession, endSession };
};

export default useActivityTracking;
