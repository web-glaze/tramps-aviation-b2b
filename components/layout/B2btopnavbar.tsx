/**
 * @deprecated  Replaced by `Header` in `./Header.tsx`.
 *
 * The full agent-portal navbar (menu, wallet badge, user dropdown, mobile
 * drawer) is now part of `Header` — it auto-picks the full or compact layout
 * based on `usePathname()` + auth state.
 *
 * This file exists only to keep any stray imports compiling. All call sites
 * in this repo have already been migrated. Safe to delete:
 *
 *   rm components/layout/B2btopnavbar.tsx
 */
export { Header as B2BTopNavbar } from "./Header";
