import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('dashboard-theme') as Theme;
    // Default to LIGHT (Moti's call) - feels cleaner/more familiar for merchants.
    // The toggle still lets them switch to dark and the choice is remembered.
    return savedTheme || 'light';
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('dashboard-theme', theme);
    // Also put the theme class on <html> so Radix dialogs/dropdowns/popovers
    // (which render in a portal at document.body, OUTSIDE the wrapper div below)
    // inherit the correct light/dark CSS variables. Without this, inputs inside
    // portals fell back to the dark :root vars and were invisible in light mode.
    const el = document.documentElement;
    el.classList.toggle('dashboard-dark', theme === 'dark');
    el.classList.toggle('dashboard-light', theme === 'light');
    return () => {
      el.classList.remove('dashboard-dark', 'dashboard-light');
    };
  }, [theme]);

  const toggleTheme = () => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      <div ref={containerRef} className={`${theme === 'dark' ? 'dashboard-dark' : 'dashboard-light'} bg-background`} style={{ minHeight: '100vh' }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
