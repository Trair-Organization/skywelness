/** Dark-first premium UI tokens — Wellness Club */
export const premium = {
  bg0: '#050810',
  bg1: '#0a1020',
  glass: 'rgba(255,255,255,0.08)',
  glassBorder: 'rgba(255,255,255,0.14)',
  text: '#f4f7fb',
  textMuted: 'rgba(244,247,251,0.62)',
  accentBlue: '#38bdf8',
  accentGreen: '#34d399',
  danger: '#f87171',
  radiusLg: 28,
  radiusMd: 18,
  radiusSm: 14,
  space: { xs: 6, sm: 10, md: 16, lg: 22, xl: 28 },
} as const;

export const gradientButton = {
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
  colors: ['#2563eb', '#06b6d4', '#10b981'] as const,
};
