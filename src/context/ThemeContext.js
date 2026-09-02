import React, { createContext, useContext, useState } from 'react';

const ThemeContext = createContext();

const lightTheme = {
  isDark: false,
  bg: '#f0f0f0',
  card: '#ffffff',
  cardAlt: '#f7f7f7',
  text: '#545454',
  textSecondary: '#808080',
  textMuted: '#b5b5b5',
  border: '#d4d4d4',
  borderLight: '#e8e8e8',
  primary: '#545454',
  primaryLight: '#e8e8e8',
  danger: '#545454',
  dangerBg: '#e8e8e8',
  dangerBorder: '#d4d4d4',
  success: '#545454',
  successLight: '#e8e8e8',
  warning: '#545454',
  warningLight: '#e8e8e8',
  input: '#f7f7f7',
  shadow: '#000',
};

const darkTheme = {
  isDark: true,
  bg: '#1a1a1a',
  card: '#2a2a2a',
  cardAlt: '#222222',
  text: '#e0e0e0',
  textSecondary: '#a0a0a0',
  textMuted: '#707070',
  border: '#404040',
  borderLight: '#333333',
  primary: '#e0e0e0',
  primaryLight: '#333333',
  danger: '#e0e0e0',
  dangerBg: '#2a2a2a',
  dangerBorder: '#404040',
  success: '#e0e0e0',
  successLight: '#2a2a2a',
  warning: '#e0e0e0',
  warningLight: '#2a2a2a',
  input: '#2a2a2a',
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
