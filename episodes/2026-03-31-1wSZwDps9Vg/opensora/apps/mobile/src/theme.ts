/**
 * OpenSora — Cinematic Amber Design System
 *
 * A premium, film-studio aesthetic built around deep blacks and warm amber gold.
 * Every token here is the single source of truth for the entire mobile app.
 */

export const colors = {
  // Backgrounds — layered depth
  bg: '#09090b', // Page background (zinc-950)
  surface: '#111113', // Cards, modals
  surfaceElevated: '#18181b', // Elevated surfaces, inputs
  overlay: 'rgba(0,0,0,0.72)', // Overlays on video

  // Borders
  border: '#1c1c1f',
  borderStrong: '#2d2d32',

  // Amber / Gold — primary brand
  amber: '#f59e0b',
  amber400: '#fbbf24', // Accent text, icons, section labels, wordmark "Open"
  amberPress: '#d97706',
  amberDeep: '#92400e',
  amberSubtle: 'rgba(245, 158, 11, 0.10)',
  amberGlow: 'rgba(245, 158, 11, 0.22)',

  // Text
  textPrimary: '#fafafa',
  textSecondary: '#a1a1aa',
  textMuted: '#52525b',
  textDisabled: '#3f3f46',

  // Semantic
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',

  // Utility
  white: '#ffffff',
  black: '#000000',
} as const;

export const typography = {
  // Display — for hero headings and logo
  displayXL: { fontSize: 38, fontWeight: '800' as const, lineHeight: 42, letterSpacing: -1.5 },
  displayL: { fontSize: 28, fontWeight: '700' as const, lineHeight: 32, letterSpacing: -0.5 },
  displayM: { fontSize: 22, fontWeight: '600' as const, lineHeight: 26, letterSpacing: -0.3 },

  // Headings
  headingL: { fontSize: 20, fontWeight: '700' as const, lineHeight: 26, letterSpacing: 0 },
  headingM: { fontSize: 17, fontWeight: '600' as const, lineHeight: 23 },
  headingS: { fontSize: 15, fontWeight: '600' as const, lineHeight: 21 },

  // Body
  bodyL: { fontSize: 16, lineHeight: 24 },
  bodyM: { fontSize: 14, lineHeight: 20 },
  bodyS: { fontSize: 13, lineHeight: 18 },

  // Utility
  caption: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16, letterSpacing: 0.3 },
  label: { fontSize: 11, fontWeight: '700' as const, lineHeight: 11, letterSpacing: 1.2 },
} as const;

export const spacing = {
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 48,
} as const;

export const radius = {
  s: 8,
  m: 12,
  l: 16,
  xl: 20,
  full: 999,
} as const;

// Reusable component presets
export const presets = {
  // Card surface
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.l,
    overflow: 'hidden' as const,
  },

  // Primary CTA button (amber)
  buttonPrimary: {
    backgroundColor: colors.amber,
    borderRadius: radius.m,
    paddingVertical: 16,
    alignItems: 'center' as const,
  },
  buttonPrimaryText: {
    color: colors.white,
    fontWeight: '600' as const,
    fontSize: 16,
    letterSpacing: 1.6,
    textTransform: 'uppercase' as const,
  },

  // Ghost / outline button
  buttonGhost: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.m,
    paddingVertical: 14,
    alignItems: 'center' as const,
  },

  // Input field
  input: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.m,
    paddingHorizontal: spacing.l,
    paddingVertical: 14,
    color: colors.textPrimary,
    fontSize: 16,
  },
} as const;
