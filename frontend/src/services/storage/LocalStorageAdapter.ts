import { StorageAdapter } from './types';

const localStorageAdapter: StorageAdapter = {
  checkAvailability(): boolean {
    const testKey = `__test__${Math.random}`;

    try {
      localStorage.setItem(testKey, '__test-value__');
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      console.warn('Local storage is not available! Some features will be disabled!');
      return false;
    }
  },

  setItem(key: string, value: string): void {
    localStorage.setItem(key, value);
  },

  getItem(key: string): string | null {
    return localStorage.getItem(key);
  },

  removeItem(key: string): void {
    localStorage.removeItem(key);
  },

  getAllKeys(): string[] {
    return Object.entries(localStorage).map(([key]) => key);
  },
};

export { localStorageAdapter };
