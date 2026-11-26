// Design tokens. Layout and glass styling come from "Horizen App v2";
// the palette is the "More than movement" brand: terracotta, sand and ink.

export const brand = {
  terracotta: '#AA7155',
  terracottaDeep: '#7E4A33',
  sand: '#C6AD9D',
  sandLight: '#E7D8CD',
  ink: '#17120F',
} as const;

export const colors = {
  ink: brand.ink,
  inkSoft: 'rgba(23,18,15,0.9)',
  inkGlass: 'rgba(23,17,14,0.88)',
  cream: '#FBF3EE',
  // "pink" tokens are the brand's sand accent (names kept so screens don't change)
  pink: brand.sand,
  pinkSoft: 'rgba(198,173,157,0.5)',
  pinkTile: 'rgba(170,113,85,0.16)',
  pinkButton: 'rgba(231,216,205,0.95)',
  rose: brand.terracotta,
  roseDeep: brand.terracottaDeep,
  alert: '#A3361F',
  alertBorder: '#C8735A',
  expired: '#C8735A',

  // Secondary text. Dark enough to read on the terracotta pattern and on glass cards.
  muted: '#4A3226',
  mutedDeep: '#3E2A20',
  faint: '#6E5244',
  label: '#5E4436',
  inactive: '#6A4F41',
  chipText: '#3E2A20',
  chevron: '#6E5244',

  onDarkMuted: '#D9C7BB',
  onDarkFaint: '#B39C8E',
  onDarkLabel: '#BFA898',

  glass: 'rgba(251,243,238,0.55)',
  glassStrong: 'rgba(251,243,238,0.68)',
  glassInput: 'rgba(251,243,238,0.72)',
  glassBorder: 'rgba(251,243,238,0.7)',
  glassBorderStrong: 'rgba(251,243,238,0.8)',
  hairline: 'rgba(80,45,30,0.18)',

  bgTop: brand.terracotta,
  bgMid: brand.terracotta,
  bgBottom: brand.terracotta,
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

// CSS box-shadow strings (React Native's legacy shadow*/elevation props are not used).
export const shadow = {
  card: { boxShadow: '0 12px 16px rgba(58,30,18,0.07)' },
  soft: { boxShadow: '0 8px 12px rgba(58,30,18,0.05)' },
  dark: { boxShadow: '0 14px 18px rgba(23,18,15,0.2)' },
  tabBar: { boxShadow: '0 16px 20px rgba(58,30,18,0.16)' },
} as const;
