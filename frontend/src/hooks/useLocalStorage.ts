import { useState } from 'react';

/**
 * Custom hook for localStorage persistence.
 * Essential for maintaining user layout preferences (Sidebar Width, Theme, etc).
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Use a state-based approach for initialization
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof globalThis.window === "undefined") {
      return initialValue;
    }
    try {
      const item = globalThis.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = typeof value === "function" ? (value as Function)(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof globalThis.window !== "undefined") {
        globalThis.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}
