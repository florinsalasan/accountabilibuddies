import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { LightTheme, DarkTheme, type ThemeColors } from '../constants/theme.ts';
import { SettingsRepo } from '../db/repo.ts';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  isDark: boolean;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'system',
  setThemeMode: async () => {},
  isDark: false,
  colors: LightTheme,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    SettingsRepo.get('theme_mode', 'system').then((val) => {
      if (val === 'light' || val === 'dark' || val === 'system') {
        setThemeModeState(val);
      }
    });
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await SettingsRepo.set('theme_mode', mode);
  };

  const isDark = useMemo(() => {
    if (themeMode === 'dark') return true;
    if (themeMode === 'light') return false;
    return systemColorScheme === 'dark';
  }, [themeMode, systemColorScheme]);

  const colors = useMemo(() => {
    return isDark ? DarkTheme : LightTheme;
  }, [isDark]);

  const value = useMemo(
    () => ({
      themeMode,
      setThemeMode,
      isDark,
      colors,
    }),
    [themeMode, isDark, colors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
