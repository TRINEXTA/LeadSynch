import { useState, useCallback, useMemo } from 'react';

/**
 * Hook réutilisable pour la pagination
 * 
 * @param {Object} options - Options de configuration
 * @param {number} options.initialPage - Page initiale (default: 1)
 * @param {number} options.initialLimit - Limite par page (default: 50)
 * @param {number} options.maxLimit - Limite maximum (default: 200)
 * @returns {Object} État et fonctions de pagination
 * 
 * @example
 * const { page, limit, setPage, setLimit, pagination, reset } = usePagination();
 * 
 * // Utiliser pagination pour afficher les infos
 * <span>{pagination.from}-{pagination.to} sur {pagination.total}</span>
 */
export function usePagination({
  initialPage = 1,
  initialLimit = 50,
  maxLimit = 200
} = {}) {
  const [page, setPageState] = useState(initialPage);
  const [limit, setLimitState] = useState(initialLimit);
  const [total, setTotal] = useState(0);

  const totalPages = useMemo(() => Math.ceil(total / limit) || 1, [total, limit]);

  const setPage = useCallback((newPage) => {
    const validPage = Math.max(1, Math.min(newPage, totalPages));
    setPageState(validPage);
  }, [totalPages]);

  const setLimit = useCallback((newLimit) => {
    const validLimit = Math.max(1, Math.min(newLimit, maxLimit));
    setLimitState(validLimit);
    setPageState(1); // Reset to first page when limit changes
  }, [maxLimit]);

  const nextPage = useCallback(() => {
    if (page < totalPages) {
      setPageState(p => p + 1);
    }
  }, [page, totalPages]);

  const prevPage = useCallback(() => {
    if (page > 1) {
      setPageState(p => p - 1);
    }
  }, [page]);

  const goToPage = useCallback((pageNum) => {
    setPage(pageNum);
  }, [setPage]);

  const reset = useCallback(() => {
    setPageState(initialPage);
    setLimitState(initialLimit);
    setTotal(0);
  }, [initialPage, initialLimit]);

  const pagination = useMemo(() => ({
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    from: total === 0 ? 0 : (page - 1) * limit + 1,
    to: Math.min(page * limit, total),
    offset: (page - 1) * limit
  }), [page, limit, total, totalPages]);

  return {
    page,
    limit,
    total,
    totalPages,
    setPage,
    setLimit,
    setTotal,
    nextPage,
    prevPage,
    goToPage,
    reset,
    pagination
  };
}

export default usePagination;
