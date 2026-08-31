import React, { createContext, useContext, useState } from 'react';

const ThemeContext = createContext();

const lightTheme = {
  isDark: false,
  bg: '#f7f7f5',
  card: '#ffffff',
  cardAlt: '#f8fafc',
  text: '#0f172a',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  primary: '#3b82f6',
  primaryLight: '#eff6ff',
  danger: '#ef4444',
  dangerBg: '#fef2f2',
  dangerBorder: '#fecaca',
  success: '#22c55e',
  successLight: '#f0fdf4',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  input: '#f8fafc',
  shadow: '#000',
};

const darkTheme = {
  isDark: true,
  bg: '#0f172a',
  card: '#1e293b',
  cardAlt: '#162032',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  border: '#334155',
  borderLight: '#1e293b',
  primary: '#60a5fa',
  primaryLight: '#1e3a5f',
  danger: '#f87171',
  dangerBg: '#3b1111',
  dangerBorder: '#5c1a1a',
  success: '#4ade80',
  successLight: '#0f2e1a',
  warning: '#fbbf24',
  warningLight: '#3b2f0f',
  input: '#1e293b',
  shadow: '#000',
};

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme: () => setIsDark(p => !p) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
