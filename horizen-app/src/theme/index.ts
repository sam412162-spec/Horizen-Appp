// Design tokens taken from "Horizen App v2" (glassmorphism).

export const colors = {
  ink: '#17120F',
  inkSoft: 'rgba(23,18,15,0.9)',
  inkGlass: 'rgba(23,17,14,0.88)',
  cream: '#FDF6F4',
  pink: '#F5CBCB',
  pinkSoft: 'rgba(245,203,203,0.45)',
  pinkTile: 'rgba(245,203,203,0.4)',
  pinkButton: 'rgba(245,203,203,0.92)',
  rose: '#E9A5A5',
  roseDeep: '#C07F7F',
  alert: '#D2504F',
  alertBorder: '#E08D8D',
  expired: '#E89090',

  muted: '#9A8B87',
  mutedDeep: '#8F7C78',
  faint: '#C2B3AF',
  label: '#B5A29E',
  inactive: '#B3A09C',
  chipText: '#6B5B57',
  chevron: '#C7B6B2',

  onDarkMuted: '#C9BBB7',
  onDarkFaint: '#A5978F',
  onDarkLabel: '#A99B97',

  glass: 'rgba(255,255,255,0.45)',
  glassStrong: 'rgba(255,255,255,0.55)',
  glassInput: 'rgba(255,255,255,0.6)',
  glassBorder: 'rgba(255,255,255,0.65)',
  glassBorderStrong: 'rgba(255,255,255,0.7)',
  hairline: 'rgba(120,80,80,0.15)',

  bgTop: '#FBF3F1',
  bgMid: '#F7EAE8',
  bgBottom: '#F4E2E0',
} as const;

export const radius = {
  sm: 14,
  md: 16,
  lg: 20,
  card: 24,
  panel: 26,
  pill: 100,
} as const;

// Page padding used by all tab screens.
export const space = {
  page: 24,
  pageTop: 14, // extra top offset below the safe area (design: 58px incl. 44px status bar)
  tabBarClearance: 128,
} as const;

export const fonts = {
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const;

export type FontWeight = keyof typeof fonts;

export const shadow = {
  card: {
    shadowColor: '#502828',
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 2,
  },
  soft: {
    shadowColor: '#502828',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1,
  },
  dark: {
    shadowColor: '#17120F',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 14 },
    elevation: 6,
  },
  tabBar: {
    shadowColor: '#3C1E1E',
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 16 },
    elevation: 10,
  },
} as const;
