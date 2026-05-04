/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  TRAMPS AVIATION — GLOBAL THEME TOKENS                              ║
 * ║  Single source of truth. Change here → updates everywhere.          ║
 * ║                                                                      ║
 * ║  Brand Colors:                                                       ║
 * ║    Orange  #e44b0f  (vivid orange — accents, prices, highlights)    ║
 * ║    Azure   #208dcb  (primary blue — buttons, active states, links)  ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * HOW TO CHANGE THE THEME:
 *   1. Edit the values below (colors, radius, font, etc.)
 *   2. Save — all pages update automatically via CSS variables + these tokens
 *
 * USAGE IN COMPONENTS:
 *   import { T } from '@/config/theme'
 *   className={T.btn.primary}      → primary button
 *   className={T.card.base}        → standard card
 *   className={T.input.base}       → form input
 *   className={T.text.muted}       → muted text
 */

// ─── Brand Palette ────────────────────────────────────────────────────────────
export const BRAND = {
  /** Vivid orange #e44b0f — prices, Book Now CTAs, stat numbers, exclusive badges, agent CTA */
  orange:     '#e44b0f',
  orangeHsl:  '16 82% 48%',

  /** Azure blue #208dcb — search button, active nav, sign in button, links, info */
  azure:      '#208dcb',
  azureHsl:   '205 72% 45%',
} as const;

// ─── Semantic color tokens (map to Tailwind CSS variable classes) ─────────────
// These use hsl(var(--*)) under the hood — they respect dark/light mode.
export const T = {

  // ── Page / Layout ────────────────────────────────────────────────────────
  page: {
    /** Full-page background — white in light, dark in dark mode */
    bg:        'bg-background',
    /** Slightly off-background surface */
    surface:   'bg-muted/30',
  },

  // ── Cards ────────────────────────────────────────────────────────────────
  card: {
    /** Standard card */
    base:      'bg-card border border-border rounded-2xl',
    /** Card with shadow */
    elevated:  'bg-card border border-border rounded-2xl shadow-sm',
    /** Interactive card (hover lift) */
    hover:     'bg-card border border-border rounded-2xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all',
    /** Flush / no-padding wrapper */
    flush:     'bg-card border border-border rounded-2xl overflow-hidden',
  },

  // ── Buttons ───────────────────────────────────────────────────────────────
  btn: {
    /** Search / Info / Sign In — azure background */
    primary:   'bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-all active:scale-[0.98]',
    /** Secondary — outlined */
    secondary: 'border border-border text-foreground font-semibold rounded-xl hover:bg-muted transition-all',
    /** Ghost — no border */
    ghost:     'text-muted-foreground font-medium rounded-xl hover:text-foreground hover:bg-muted transition-all',
    /** Danger — red */
    danger:    'bg-destructive text-destructive-foreground font-semibold rounded-xl hover:opacity-90 transition-all',
    /** Book Now / Register / Create Account / Agent Portal CTA — orange */
    orange:    'bg-[#e44b0f] text-white font-semibold rounded-xl hover:opacity-90 transition-all active:scale-[0.98]',
    /** Small primary */
    sm:        'bg-primary text-primary-foreground text-sm font-semibold px-4 py-1.5 rounded-lg hover:opacity-90 transition-all',
  },

  // ── Form Inputs ───────────────────────────────────────────────────────────
  input: {
    /** Standard input wrapper */
    base:      'w-full bg-background border border-input rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all placeholder:text-muted-foreground',
    /** Field-wrapper style (icon + input in a row) */
    wrapper:   'field-wrapper',
    /** Select dropdown */
    select:    'w-full bg-background border border-input rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-all',
  },

  // ── Text ──────────────────────────────────────────────────────────────────
  text: {
    /** Default body text */
    base:      'text-foreground',
    /** Subdued / secondary text */
    muted:     'text-muted-foreground',
    /** Primary color text (azure) */
    primary:   'text-primary',
    /** Orange accent text */
    orange:    'text-[#e44b0f]',
    /** Error text */
    error:     'text-destructive',
    /** Success text */
    success:   'text-emerald-600 dark:text-emerald-400',
    /** Page heading */
    h1:        'text-2xl font-bold font-display text-foreground',
    h2:        'text-xl font-bold font-display text-foreground',
    h3:        'text-base font-semibold text-foreground',
    label:     'text-sm font-medium text-foreground',
    caption:   'text-xs text-muted-foreground',
  },

  // ── Badges / Pills ────────────────────────────────────────────────────────
  badge: {
    primary:   'bg-primary/10 text-primary border border-primary/20 text-xs font-semibold px-2.5 py-1 rounded-full',
    orange:    'bg-[#e44b0f]/10 text-[#e44b0f] border border-[#e44b0f]/20 text-xs font-semibold px-2.5 py-1 rounded-full',
    success:   'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold px-2.5 py-1 rounded-full',
    warning:   'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-xs font-semibold px-2.5 py-1 rounded-full',
    error:     'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 text-xs font-semibold px-2.5 py-1 rounded-full',
    muted:     'bg-muted text-muted-foreground text-xs font-medium px-2.5 py-1 rounded-full',
  },

  // ── Dividers / Separators ─────────────────────────────────────────────────
  divider: 'border-b border-border',

  // ── Active / Selected state (tabs, filters) ───────────────────────────────
  active: {
    tab:       'bg-primary text-primary-foreground shadow-sm',
    filter:    'bg-primary/10 border-primary text-primary',
    pill:      'bg-primary text-primary-foreground',
  },

  // ── Inactive state ────────────────────────────────────────────────────────
  inactive: {
    tab:       'text-muted-foreground hover:text-foreground hover:bg-muted/60',
    filter:    'border-border text-muted-foreground hover:border-primary/40',
    pill:      'text-muted-foreground hover:text-foreground hover:bg-muted',
  },

  // ── Modals / Overlays ─────────────────────────────────────────────────────
  modal: {
    overlay:   'fixed inset-0 bg-black/60 backdrop-blur-sm z-50',
    panel:     'bg-card border border-border rounded-2xl shadow-2xl',
  },

  // ── Sidebar ───────────────────────────────────────────────────────────────
  sidebar: {
    bg:        'bg-card border-r border-border',
    item:      'text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-xl transition-all',
    itemActive:'bg-primary text-primary-foreground rounded-xl shadow-sm',
  },

  // ── Skeleton loaders ──────────────────────────────────────────────────────
  skeleton:  'bg-muted animate-pulse rounded-xl',

  // ── Inline info / notice banners ──────────────────────────────────────────
  notice: {
    info:    'bg-primary/5 border border-primary/20 text-primary rounded-xl',
    warning: 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 text-amber-700 dark:text-amber-400 rounded-xl',
    success: 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/30 text-emerald-700 dark:text-emerald-400 rounded-xl',
    error:   'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/30 text-red-600 dark:text-red-400 rounded-xl',
  },

} as const;

// ─── Airline badge colors (consistent across all flight pages) ────────────────
export const AIRLINE_COLORS: Record<string, string> = {
  'IndiGo':            'bg-indigo-600',
  'Air India':         'bg-red-600',
  'SpiceJet':          'bg-orange-500',
  'Vistara':           'bg-purple-600',
  'Akasa Air':         'bg-yellow-500',
  'Go First':          'bg-sky-500',
  'GoAir':             'bg-sky-600',
  'Air India Express': 'bg-red-500',
  'AirAsia':           'bg-red-700',
  'IndiGo Express':    'bg-indigo-500',
};
export const airlineColor = (name: string): string =>
  AIRLINE_COLORS[name] ?? 'bg-primary';

// ─── Status badge variants ────────────────────────────────────────────────────
export const STATUS_COLORS: Record<string, string> = {
  CONFIRMED:   T.badge.success,
  PENDING:     T.badge.warning,
  CANCELLED:   T.badge.error,
  PROCESSING:  T.badge.primary,
  REFUNDED:    'bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-500/20 text-xs font-semibold px-2.5 py-1 rounded-full',
  FAILED:      T.badge.error,
};
export const statusColor = (status: string): string =>
  STATUS_COLORS[status?.toUpperCase()] ?? T.badge.muted;
