import { useState, useCallback, useMemo } from 'react';

/**
 * Hook réutilisable pour gérer les onglets
 * 
 * @param {string|number} defaultTab - Onglet par défaut
 * @param {Array} tabs - Liste des onglets (optionnel)
 * @returns {Object} État et fonctions des onglets
 * 
 * @example
 * const { activeTab, setActiveTab, isActive } = useTabs('info');
 * 
 * // Vérifier si un onglet est actif
 * <button className={isActive('info') ? 'active' : ''}>Info</button>
 */
export function useTabs(defaultTab = 0, tabs = []) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const isActive = useCallback((tab) => {
    return activeTab === tab;
  }, [activeTab]);

  const switchTo = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  const next = useCallback(() => {
    if (tabs.length > 0) {
      const currentIndex = tabs.indexOf(activeTab);
      if (currentIndex < tabs.length - 1) {
        setActiveTab(tabs[currentIndex + 1]);
      }
    } else if (typeof activeTab === 'number') {
      setActiveTab(prev => prev + 1);
    }
  }, [activeTab, tabs]);

  const prev = useCallback(() => {
    if (tabs.length > 0) {
      const currentIndex = tabs.indexOf(activeTab);
      if (currentIndex > 0) {
        setActiveTab(tabs[currentIndex - 1]);
      }
    } else if (typeof activeTab === 'number' && activeTab > 0) {
      setActiveTab(prev => prev - 1);
    }
  }, [activeTab, tabs]);

  const tabProps = useMemo(() => ({
    activeTab,
    setActiveTab: switchTo,
    isActive
  }), [activeTab, switchTo, isActive]);

  return {
    activeTab,
    setActiveTab: switchTo,
    isActive,
    switchTo,
    next,
    prev,
    tabProps
  };
}

export default useTabs;
