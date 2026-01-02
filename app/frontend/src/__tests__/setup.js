/**
 * Vitest Setup File
 * Ce fichier est exécuté avant chaque test
 */
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
class IntersectionObserverMock {
  constructor() {
    this.observe = vi.fn();
    this.unobserve = vi.fn();
    this.disconnect = vi.fn();
  }
}
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: IntersectionObserverMock
});

// Mock ResizeObserver
class ResizeObserverMock {
  constructor() {
    this.observe = vi.fn();
    this.unobserve = vi.fn();
    this.disconnect = vi.fn();
  }
}
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverMock
});

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.getItem.mockReturnValue(null);
  sessionStorageMock.getItem.mockReturnValue(null);
});

// Export mocks for use in tests
export { localStorageMock, sessionStorageMock };
