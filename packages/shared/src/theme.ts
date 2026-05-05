// ─── Colors ──────────────────────────────────────────────────────────────────

export const colors = {
  brand: {
    prussianBlue: '#00345A',  // Prussian Blue — header, page titles, primary text
    lochmara:     '#0074C8',  // Lochmara — interactive elements, hover states
    white:        '#FFFFFF',
  },
  neutral: {
    50:  '#f8f9fa',
    100: '#f1f3f5',
    200: '#e9ecef',
    300: '#dee2e6',
    600: '#6c757d',
    700: '#495057',
    900: '#212529',
  },
  semantic: {
    success: { bg: '#d1e7dd', text: '#0a3622', border: '#badbcc' },
    error:   { bg: '#f8d7da', text: '#842029', border: '#f5c2c7' },
    warning: { bg: '#fff3cd', text: '#664d03', border: '#ffecb5' },
    info:    { bg: '#cff4fc', text: '#055160', border: '#b6effb' },
  },
} as const;

// Flat palette for Chart.js / canvas contexts
export const chartPalette = [
  colors.brand.lochmara,
  colors.brand.prussianBlue,
  '#20c997',  // teal
  '#fd7e14',  // orange
  '#6f42c1',  // indigo
  '#e83e8c',  // pink
] as const;

// ─── Typography ───────────────────────────────────────────────────────────────

export const typography = {
  fontFamily: {
    base: "'Figtree', system-ui, -apple-system, sans-serif",
    mono: "ui-monospace, 'Cascadia Code', monospace",
  },
  fontWeight: {
    light:    300,
    normal:   400,
    medium:   500,
    semibold: 600,
    bold:     700,
    extrabold: 800,
  },
  fontSize: {
    xs:   '0.75rem',
    sm:   '0.875rem',
    base: '1rem',
    lg:   '1.125rem',
    xl:   '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
  },
} as const;

// ─── Spacing ──────────────────────────────────────────────────────────────────

export const spacing = {
  1:  '0.25rem',
  2:  '0.5rem',
  3:  '0.75rem',
  4:  '1rem',
  5:  '1.25rem',
  6:  '1.5rem',
  8:  '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
} as const;

// ─── Border Radius ────────────────────────────────────────────────────────────

export const borderRadius = {
  sm:   '0.25rem',
  md:   '0.375rem',
  lg:   '0.5rem',
  xl:   '0.75rem',
  full: '9999px',
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────────────

export const shadows = {
  sm: '0 1px 3px rgba(0,0,0,0.08)',
  md: '0 4px 12px rgba(0,0,0,0.10)',
  lg: '0 8px 24px rgba(0,0,0,0.12)',
} as const;

// ─── Logos & Brand Assets ─────────────────────────────────────────────────────

export const brand = {
  name: 'Formunauts',
  tagline: 'Donation Dashboard',
  /** Inline SVG icon — drop directly into a template with [innerHTML] or as a background. */
  svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <rect width="40" height="40" rx="8" fill="#00345A"/>
    <path d="M10 28 L20 12 L30 28" stroke="#0074C8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M15 22 L25 22" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`,
  /** Public path for the logo image (place the file in apps/web/public/). */
  logoPath: '/logo.svg',
} as const;

// ─── Dark Mode Colors ─────────────────────────────────────────────────────────

export const darkColors = {
  neutral: {
    50:  '#18191a',
    100: '#242526',
    200: '#3a3b3c',
    300: '#4e4f50',
    600: '#b0b3b8',
    700: '#e4e6eb',
    900: '#f0f2f5',
  },
  semantic: {
    success: { bg: '#1e3a2f', text: '#75b798', border: '#2d5a3d' },
    error:   { bg: '#3d1a1d', text: '#f1aeb5', border: '#7d2330' },
    warning: { bg: '#332701', text: '#ffca2c', border: '#664d03' },
    info:    { bg: '#032d36', text: '#6edff6', border: '#0e616e' },
  },
  shadows: {
    sm: '0 1px 3px rgba(0,0,0,0.4)',
    md: '0 4px 12px rgba(0,0,0,0.5)',
    lg: '0 8px 24px rgba(0,0,0,0.6)',
  },
} as const;

// ─── Full Theme Object ────────────────────────────────────────────────────────

export const theme = {
  colors,
  chartPalette,
  typography,
  spacing,
  borderRadius,
  shadows,
  brand,
} as const;

export type Theme = typeof theme;

// ─── CSS Variable Generator ───────────────────────────────────────────────────
// Run this to regenerate the :root block in apps/web/src/styles.css.

export function generateCSSVars(): string {
  const { brand: c, neutral: n, semantic: s } = colors;
  const { fontFamily, fontSize, fontWeight } = typography;
  const { neutral: dn, semantic: ds, shadows: dsh } = darkColors;
  return `
:root {
  /* brand */
  --color-prussian-blue: ${c.prussianBlue};
  --color-lochmara:      ${c.lochmara};
  --color-white:         ${c.white};

  /* neutral */
  --color-neutral-50:  ${n[50]};
  --color-neutral-100: ${n[100]};
  --color-neutral-200: ${n[200]};
  --color-neutral-300: ${n[300]};
  --color-neutral-600: ${n[600]};
  --color-neutral-700: ${n[700]};
  --color-neutral-900: ${n[900]};

  /* semantic */
  --color-success-bg:     ${s.success.bg};
  --color-success-text:   ${s.success.text};
  --color-success-border: ${s.success.border};
  --color-error-bg:       ${s.error.bg};
  --color-error-text:     ${s.error.text};
  --color-error-border:   ${s.error.border};
  --color-warning-bg:     ${s.warning.bg};
  --color-warning-text:   ${s.warning.text};
  --color-info-bg:        ${s.info.bg};
  --color-info-text:      ${s.info.text};

  /* typography */
  --font-family-base:    ${fontFamily.base};
  --font-family-mono:    ${fontFamily.mono};
  --font-size-xs:        ${fontSize.xs};
  --font-size-sm:        ${fontSize.sm};
  --font-size-base:      ${fontSize.base};
  --font-size-lg:        ${fontSize.lg};
  --font-size-xl:        ${fontSize.xl};
  --font-size-2xl:       ${fontSize['2xl']};
  --font-size-3xl:       ${fontSize['3xl']};
  --font-weight-light:     ${fontWeight.light};
  --font-weight-normal:    ${fontWeight.normal};
  --font-weight-medium:    ${fontWeight.medium};
  --font-weight-semibold:  ${fontWeight.semibold};
  --font-weight-bold:      ${fontWeight.bold};
  --font-weight-extrabold: ${fontWeight.extrabold};

  /* spacing */
  --space-1:  ${spacing[1]};
  --space-2:  ${spacing[2]};
  --space-3:  ${spacing[3]};
  --space-4:  ${spacing[4]};
  --space-5:  ${spacing[5]};
  --space-6:  ${spacing[6]};
  --space-8:  ${spacing[8]};
  --space-10: ${spacing[10]};
  --space-12: ${spacing[12]};
  --space-16: ${spacing[16]};

  /* border radius */
  --radius-sm:   ${borderRadius.sm};
  --radius-md:   ${borderRadius.md};
  --radius-lg:   ${borderRadius.lg};
  --radius-xl:   ${borderRadius.xl};
  --radius-full: ${borderRadius.full};

  /* shadows */
  --shadow-sm: ${shadows.sm};
  --shadow-md: ${shadows.md};
  --shadow-lg: ${shadows.lg};
}

[data-theme="dark"] {
  color-scheme: dark;

  /* neutral */
  --color-neutral-50:  ${dn[50]};
  --color-neutral-100: ${dn[100]};
  --color-neutral-200: ${dn[200]};
  --color-neutral-300: ${dn[300]};
  --color-neutral-600: ${dn[600]};
  --color-neutral-700: ${dn[700]};
  --color-neutral-900: ${dn[900]};

  /* semantic */
  --color-success-bg:     ${ds.success.bg};
  --color-success-text:   ${ds.success.text};
  --color-success-border: ${ds.success.border};
  --color-error-bg:       ${ds.error.bg};
  --color-error-text:     ${ds.error.text};
  --color-error-border:   ${ds.error.border};
  --color-warning-bg:     ${ds.warning.bg};
  --color-warning-text:   ${ds.warning.text};
  --color-info-bg:        ${ds.info.bg};
  --color-info-text:      ${ds.info.text};

  /* shadows */
  --shadow-sm: ${dsh.sm};
  --shadow-md: ${dsh.md};
  --shadow-lg: ${dsh.lg};
}
`.trim();
}
