/**
 * @deprecated  Replaced by `Footer` in `./Footer.tsx`.
 *
 * The full marketing footer (4 nav columns, contact, agent CTA, trust badges,
 * copyright) is now part of `Footer` — it auto-picks the full or compact
 * layout based on `usePathname()`.
 *
 * This file exists only to keep any stray imports compiling. All call sites
 * in this repo have already been migrated. Safe to delete:
 *
 *   rm components/layout/CommonFooter.tsx
 */
export { Footer as CommonFooter } from "./Footer";
