export type ColorPaletteId =
  | 'bw-classic'
  | 'dark-lime'
  | 'warm-earth'
  | 'cool-ocean'
  | 'bold-violet'
  | 'rose-soft'
  | 'sage-green'
  | 'midnight-gold'
  | 'coral-cream'
  | 'slate-orange'
  | 'custom';

export interface ColorPalette {
  id: ColorPaletteId;
  name: string;
  swatch: string[];
  theme: {
    primaryColor: string;
    backgroundColor: string;
    foregroundColor: string;
    cardColor: string;
    mutedColor: string;
    accentColor: string;
    borderRadius: string;
    fontStyle: 'sans' | 'serif' | 'mixed';
  };
}

export const colorPalettes: Record<ColorPaletteId, ColorPalette> = {
  'bw-classic': {
    id: 'bw-classic',
    name: 'שחור ולבן',
    swatch: ['#111111', '#ffffff', '#888888'],
    theme: {
      primaryColor: '#111111',
      backgroundColor: '#ffffff',
      foregroundColor: '#111111',
      cardColor: '#fafafa',
      mutedColor: '#888888',
      accentColor: '#111111',
      borderRadius: '4px',
      fontStyle: 'sans',
    },
  },
  'dark-lime': {
    id: 'dark-lime',
    name: 'שחור וליים',
    swatch: ['#0f0f0f', '#c6ff00', '#1a1a1a'],
    theme: {
      primaryColor: '#111111',
      backgroundColor: '#0f0f0f',
      foregroundColor: '#f5f5f5',
      cardColor: '#1a1a1a',
      mutedColor: '#9a9a9a',
      accentColor: '#c6ff00',
      borderRadius: '6px',
      fontStyle: 'sans',
    },
  },
  'warm-earth': {
    id: 'warm-earth',
    name: 'חם ואדמתי',
    swatch: ['#b45309', '#fdf6ec', '#c2410c'],
    theme: {
      primaryColor: '#b45309',
      backgroundColor: '#fdf6ec',
      foregroundColor: '#4a2e12',
      cardColor: '#ffffff',
      mutedColor: '#9c7a55',
      accentColor: '#c2410c',
      borderRadius: '14px',
      fontStyle: 'mixed',
    },
  },
  'cool-ocean': {
    id: 'cool-ocean',
    name: 'כחול ים',
    swatch: ['#0077b6', '#f0f9ff', '#00b4d8'],
    theme: {
      primaryColor: '#0077b6',
      backgroundColor: '#f0f9ff',
      foregroundColor: '#1e3a5f',
      cardColor: '#ffffff',
      mutedColor: '#6b8fad',
      accentColor: '#00b4d8',
      borderRadius: '12px',
      fontStyle: 'sans',
    },
  },
  'bold-violet': {
    id: 'bold-violet',
    name: 'סגול נועז',
    swatch: ['#6b21a8', '#faf5ff', '#a855f7'],
    theme: {
      primaryColor: '#6b21a8',
      backgroundColor: '#faf5ff',
      foregroundColor: '#3b0764',
      cardColor: '#ffffff',
      mutedColor: '#7e22ce',
      accentColor: '#a855f7',
      borderRadius: '12px',
      fontStyle: 'serif',
    },
  },
  'rose-soft': {
    id: 'rose-soft',
    name: 'ורוד עדין',
    swatch: ['#9d7d6a', '#faf5f2', '#c98f83'],
    theme: {
      primaryColor: '#9d7d6a',
      backgroundColor: '#faf5f2',
      foregroundColor: '#4b3f38',
      cardColor: '#ffffff',
      mutedColor: '#b3a79f',
      accentColor: '#c98f83',
      borderRadius: '10px',
      fontStyle: 'serif',
    },
  },
  'sage-green': {
    id: 'sage-green',
    name: 'ירוק אדמה',
    swatch: ['#4a7c59', '#f5f0e8', '#8b6914'],
    theme: {
      primaryColor: '#4a7c59',
      backgroundColor: '#f5f0e8',
      foregroundColor: '#2c3e2d',
      cardColor: '#ffffff',
      mutedColor: '#8c7b6b',
      accentColor: '#8b6914',
      borderRadius: '12px',
      fontStyle: 'sans',
    },
  },
  'midnight-gold': {
    id: 'midnight-gold',
    name: 'שחור וזהב',
    swatch: ['#000000', '#ffffff', '#d4af37'],
    theme: {
      primaryColor: '#000000',
      backgroundColor: '#ffffff',
      foregroundColor: '#1a1a1a',
      cardColor: '#fafafa',
      mutedColor: '#737373',
      accentColor: '#d4af37',
      borderRadius: '0px',
      fontStyle: 'serif',
    },
  },
  'coral-cream': {
    id: 'coral-cream',
    name: 'קורל ושמנת',
    swatch: ['#e8604c', '#fff8f6', '#f4a26d'],
    theme: {
      primaryColor: '#e8604c',
      backgroundColor: '#fff8f6',
      foregroundColor: '#3d1a12',
      cardColor: '#ffffff',
      mutedColor: '#b07060',
      accentColor: '#f4a26d',
      borderRadius: '16px',
      fontStyle: 'sans',
    },
  },
  'slate-orange': {
    id: 'slate-orange',
    name: 'אפור וכתום',
    swatch: ['#374151', '#f9fafb', '#ea580c'],
    theme: {
      primaryColor: '#374151',
      backgroundColor: '#f9fafb',
      foregroundColor: '#111827',
      cardColor: '#ffffff',
      mutedColor: '#6b7280',
      accentColor: '#ea580c',
      borderRadius: '8px',
      fontStyle: 'sans',
    },
  },
  custom: {
    id: 'custom',
    name: 'בחירה אישית',
    swatch: [],
    theme: {
      primaryColor: '#111111',
      backgroundColor: '#ffffff',
      foregroundColor: '#111111',
      cardColor: '#fafafa',
      mutedColor: '#888888',
      accentColor: '#111111',
      borderRadius: '8px',
      fontStyle: 'sans',
    },
  },
};

export const paletteList = Object.values(colorPalettes).filter(p => p.id !== 'custom');

/**
 * Generate a full palette theme from a single primary hex color.
 * Produces complementary bg/fg/accent colors automatically.
 */
export function generatePaletteFromColor(primaryHex: string): ColorPalette['theme'] {
  const r = parseInt(primaryHex.slice(1, 3), 16);
  const g = parseInt(primaryHex.slice(3, 5), 16);
  const b = parseInt(primaryHex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const isDark = luminance < 0.5;

  return {
    primaryColor: primaryHex,
    backgroundColor: isDark ? '#0f0f0f' : '#ffffff',
    foregroundColor: isDark ? '#f5f5f5' : '#111111',
    cardColor: isDark ? '#1a1a1a' : '#fafafa',
    mutedColor: isDark ? '#9a9a9a' : '#888888',
    accentColor: primaryHex,
    borderRadius: '10px',
    fontStyle: 'sans',
  };
}
