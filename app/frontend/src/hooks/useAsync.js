import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Hook réutilisable pour gérer les opérations asynchrones
 * 
 * @param {Function} asyncFunction - Fonction async à exécuter
 * @param {boolean} immediate - Exécuter immédiatement (default: false)
 * @returns {Object} État et fonctions
 * 
 * @example
 * const { execute, data, loading, error } = useAsync(fetchData);
 * 
 * // Appel manuel
 * const result = await execute(params);
 * 
 * // Ou exécution immédiate
 * const { data, loading } = useAsync(fetchData, true);
 */
export function useAsync(asyncFunction, immediate = false) {
  const [status, setStatus] = useState('idle'); // idle | pending | success | error
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  
  // Ref pour éviter les updates sur composant démonté
  const mountedRef = useRef(true);

  const execute = useCallback(async (...args) => {
    setStatus('pending');
    setError(null);
    
    try {
      const result = await asyncFunction(...args);
      if (mountedRef.current) {
        setData(result);
        setStatus('success');
      }
      return result;
    } catch (err) {
      if (mountedRef.current) {
        setError(err);
        setStatus('error');
      }
      throw err;
    }
  }, [asyncFunction]);

  const reset = useCallback(() => {
    setStatus('idle');
    setData(null);
    setError(null);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (immediate) {
      execute();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [immediate, execute]);

  return {
    execute,
    data,
    error,
    status,
    loading: status === 'pending',
    isIdle: status === 'idle',
    isSuccess: status === 'success',
    isError: status === 'error',
    reset
  };
}

export default useAsync;
