
'use client';

// This file contains utility functions for interacting with localStorage.
// It should only be used in client-side components.

const FAST_VERIFY_MODE_KEY = 'datafill-fast-verify-mode';
const IMPORTED_THERMO_SERIALS_KEY = 'datafill-imported-thermo-serials';

const safeJSONParse = <T>(jsonString: string | null, fallback: T): T => {
  if (typeof window === 'undefined' || jsonString === null) {
      return fallback;
  }
  try {
    return JSON.parse(jsonString) as T;
  } catch (e) {
    console.error("Failed to parse JSON from localStorage", e);
    return fallback;
  }
};

const getItem = (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
}

const setItem = (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
}

const removeItem = (key: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
}

export const getFastVerifyMode = (): boolean => {
  return getItem(FAST_VERIFY_MODE_KEY) === 'true';
}

export const saveFastVerifyMode = (isEnabled: boolean): void => {
  setItem(FAST_VERIFY_MODE_KEY, String(isEnabled));
}

export const getImportedThermoSerials = (): string[] => {
    return safeJSONParse<string[]>(getItem(IMPORTED_THERMO_SERIALS_KEY), []);
}

export const saveImportedThermoSerials = (serials: string[]): void => {
    if (serials.length > 0) {
        setItem(IMPORTED_THERMO_SERIALS_KEY, JSON.stringify(serials));
    } else {
        removeItem(IMPORTED_THERMO_SERIALS_KEY);
    }
}
