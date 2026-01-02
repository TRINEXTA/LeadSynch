import { useState, useCallback } from 'react';

/**
 * Hook réutilisable pour gérer les modals
 * 
 * @param {boolean} initialState - État initial du modal (default: false)
 * @returns {Object} État et fonctions du modal
 * 
 * @example
 * const { isOpen, data, open, close, toggle } = useModal();
 * 
 * // Ouvrir avec des données
 * open({ id: 1, name: 'Test' });
 * 
 * // Dans le modal
 * {isOpen && <Modal data={data} onClose={close} />}
 */
export function useModal(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState);
  const [data, setData] = useState(null);

  const open = useCallback((modalData = null) => {
    setData(modalData);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Delay clearing data to allow for close animation
    setTimeout(() => setData(null), 300);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return {
    isOpen,
    data,
    open,
    close,
    toggle,
    setData
  };
}

export default useModal;
