/**
 * Hooks réutilisables pour LeadSynch
 * 
 * Import centralisé:
 * import { usePagination, useModal, useAsync } from '@/hooks';
 */

export { usePagination } from './usePagination';
export { useModal } from './useModal';
export { useAsync } from './useAsync';
export { useTabs } from './useTabs';
export { useDebounce, useDebouncedCallback } from './useDebounce';

// Re-export du hook existant
export { default as useRealTimePolling } from './useRealTimePolling';
