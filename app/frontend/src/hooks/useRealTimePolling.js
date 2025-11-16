import { useEffect, useRef, useState } from 'react';

/**
 * Hook pour polling automatique temps réel (30s)
 * Rafraîchit automatiquement les données toutes les 30 secondes
 *
 * @param {Function} fetchFunction - Fonction async à exécuter pour fetch les données
 * @param {number} intervalMs - Intervalle en ms (défaut: 30000 = 30s)
 * @param {boolean} enabled - Activer/désactiver le polling (défaut: true)
 * @param {Array} dependencies - Dépendances pour re-déclencher le fetch
 * @returns {Object} { data, loading, error, refresh, lastUpdate }
 *
 * @example
 * const { data, loading, refresh, lastUpdate } = useRealTimePolling(
 *   async () => {
 *     const response = await api.get('/stats');
 *     return response.data;
 *   },
 *   30000, // 30 secondes
 *   true,  // enabled
 *   []     // dependencies
 * );
 */
export default function useRealTimePolling(
  fetchFunction,
  intervalMs = 30000,
  enabled = true,
  dependencies = []
) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const intervalRef = useRef(null);
  const isMountedRef = useRef(true);

  const fetchData = async () => {
    if (!enabled) return;

    try {
      setLoading(true);
      setError(null);

      const result = await fetchFunction();

      if (isMountedRef.current) {
        setData(result);
        setLastUpdate(new Date());
        setError(null);
      }
    } catch (err) {
      console.error('❌ Erreur polling:', err);
      if (isMountedRef.current) {
        setError(err.message || 'Erreur de chargement');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const refresh = () => {
    fetchData();
  };

  useEffect(() => {
    isMountedRef.current = true;

    // Premier fetch immédiat
    fetchData();

    // Setup polling si activé
    if (enabled && intervalMs > 0) {
      intervalRef.current = setInterval(fetchData, intervalMs);
      console.log(`🔄 [POLLING] Activé - Refresh toutes les ${intervalMs/1000}s`);
    }

    // Cleanup
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        console.log('⏹️ [POLLING] Désactivé');
      }
    };
  }, [enabled, intervalMs, ...dependencies]);

  return {
    data,
    loading,
    error,
    refresh,
    lastUpdate
  };
}

/**
 * Hook pour polling avec pause automatique quand l'onglet est inactif
 * Plus performant car arrête le polling quand l'utilisateur ne regarde pas
 */
export function useRealTimePollingWithVisibility(
  fetchFunction,
  intervalMs = 30000,
  dependencies = []
) {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsVisible(visible);

      if (visible) {
        console.log('👁️ [POLLING] Onglet visible - Reprise du polling');
      } else {
        console.log('🙈 [POLLING] Onglet caché - Pause du polling');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return useRealTimePolling(fetchFunction, intervalMs, isVisible, dependencies);
}
