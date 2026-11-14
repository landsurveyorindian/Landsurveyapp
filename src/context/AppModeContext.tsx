import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppMode = 'simple' | 'advanced';

interface AppModeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  toggleMode: () => void;
  isSimple: boolean;
  isAdvanced: boolean;
}

const STORAGE_KEY = 'sthal_measure_app_mode';

const AppModeContext = createContext<AppModeContextType>({
  mode: 'simple',
  setMode: () => {},
  toggleMode: () => {},
  isSimple: true,
  isAdvanced: false,
});

export const AppModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<AppMode>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'advanced' || stored === 'simple') {
        return stored;
      }
    } catch {
      // ignore
    }
    // Default new users to Simple mode
    return 'simple';
  });

  const setMode = (newMode: AppMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(STORAGE_KEY, newMode);
    } catch (err) {
      console.warn('Failed to persist app mode:', err);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'simple' ? 'advanced' : 'simple');
  };

  return (
    <AppModeContext.Provider
      value={{
        mode,
        setMode,
        toggleMode,
        isSimple: mode === 'simple',
        isAdvanced: mode === 'advanced',
      }}
    >
      {children}
    </AppModeContext.Provider>
  );
};

export const useAppMode = () => useContext(AppModeContext);
