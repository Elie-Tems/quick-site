import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AccessibilitySettings {
  fontSize: number; // 0 = normal, 1 = large, 2 = extra-large
  highContrast: boolean;
  highlightLinks: boolean;
  stopAnimations: boolean;
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  setFontSize: (size: number) => void;
  toggleHighContrast: () => void;
  toggleHighlightLinks: () => void;
  toggleStopAnimations: () => void;
  resetSettings: () => void;
}

const defaultSettings: AccessibilitySettings = {
  fontSize: 0,
  highContrast: false,
  highlightLinks: false,
  stopAnimations: false,
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

const STORAGE_KEY = 'accessibility_settings';

export const AccessibilityProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return defaultSettings;
        }
      }
    }
    return defaultSettings;
  });

  // Apply settings to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Font size
    const fontSizeClasses = ['a11y-font-normal', 'a11y-font-large', 'a11y-font-xlarge'];
    fontSizeClasses.forEach(cls => root.classList.remove(cls));
    root.classList.add(fontSizeClasses[settings.fontSize]);
    
    // High contrast
    root.classList.toggle('a11y-high-contrast', settings.highContrast);
    
    // Highlight links
    root.classList.toggle('a11y-highlight-links', settings.highlightLinks);
    
    // Stop animations
    root.classList.toggle('a11y-stop-animations', settings.stopAnimations);
    
    // Persist settings
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // Respect prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches && !settings.stopAnimations) {
      setSettings(prev => ({ ...prev, stopAnimations: true }));
    }
  }, []);

  const setFontSize = (size: number) => {
    setSettings(prev => ({ ...prev, fontSize: Math.max(0, Math.min(2, size)) }));
  };

  const toggleHighContrast = () => {
    setSettings(prev => ({ ...prev, highContrast: !prev.highContrast }));
  };

  const toggleHighlightLinks = () => {
    setSettings(prev => ({ ...prev, highlightLinks: !prev.highlightLinks }));
  };

  const toggleStopAnimations = () => {
    setSettings(prev => ({ ...prev, stopAnimations: !prev.stopAnimations }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  return (
    <AccessibilityContext.Provider
      value={{
        settings,
        setFontSize,
        toggleHighContrast,
        toggleHighlightLinks,
        toggleStopAnimations,
        resetSettings,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};
