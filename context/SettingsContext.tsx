import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';

interface Settings {
  fontSize: number;
  lineHeight: number;
  setFontSize: (size: number) => void;
  setLineHeight: (height: number) => void;
}

const SettingsContext = createContext<Settings | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [fontSize, setFontSize] = useState<number>(() => {
    const saved = localStorage.getItem('sanctuary-fontSize');
    return saved ? parseInt(saved, 10) : 18;
  });

  const [lineHeight, setLineHeight] = useState<number>(() => {
    const saved = localStorage.getItem('sanctuary-lineHeight');
    return saved ? parseFloat(saved) : 1.6;
  });

  useEffect(() => {
    localStorage.setItem('sanctuary-fontSize', fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('sanctuary-lineHeight', lineHeight.toString());
  }, [lineHeight]);

  return (
    <SettingsContext.Provider value={{ fontSize, setFontSize, lineHeight, setLineHeight }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): Settings => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
