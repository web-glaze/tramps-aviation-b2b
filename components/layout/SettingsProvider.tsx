'use client'

import { useEffect } from 'react'
import { useSettingsStore } from '@/lib/store'

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  TO CHANGE THE GLOBAL THEME — edit config/theme.ts              ║
 * ║  AND update the defaults in lib/store/index.ts:                 ║
 * ║    theme: 'light' | 'dark' | 'system'                           ║
 * ║    colorTheme: 'brand' | 'blue' | 'violet' | ...               ║
 * ║    fontFamily: 'jakarta' | 'inter' | 'poppins' | ...           ║
 * ║    borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'  ║
 * ║  Color CSS vars live in app/globals.css :root { }              ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

// Font map — matches globals.css [data-font="..."] attributes
const FONT_IMPORTS: Record<string, string> = {
  inter:    'Inter:wght@400;500;600;700;800',
  poppins:  'Poppins:wght@400;500;600;700;800',
  rajdhani: 'Rajdhani:wght@400;500;600;700',
  nunito:   'Nunito:wght@400;500;600;700;800',
  jakarta:  'Plus+Jakarta+Sans:wght@400;500;600;700;800',
  'dm-sans':'DM+Sans:wght@400;500;600;700;800',
  outfit:   'Outfit:wght@400;500;600;700;800',
  sora:     'Sora:wght@400;500;600;700;800',
  space:    'Space+Grotesk:wght@400;500;600;700;800',
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const {
    theme, colorTheme, fontSize, fontFamily,
    borderRadius, compactMode, animations,
  } = useSettingsStore()

  // Apply theme to <html>.
  //
  // Pre-fix #1: a `prefers-color-scheme` listener auto-flipped dark mode
  // whenever the OS toggled — agents complained their theme jumped at
  // sunset.
  // Pre-fix #2: even after killing the listener, if a user had
  // `theme: 'system'` saved AND their OS preferred dark, opening +
  // closing a `window.print()` dialog re-fired the effect and re-applied
  // dark mode. So we now treat 'system' as a synonym for 'light' — the
  // ONLY way the page goes dark is by the agent explicitly tapping the
  // header toggle (which writes 'dark' to the store).
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // After print, re-apply the user's theme. Some Chromium builds drop the
  // `dark` class or flip the document's color-scheme during the print
  // simulation — this restores it the moment the dialog closes so the
  // agent isn't left staring at an unexpected dark page.
  useEffect(() => {
    const onAfter = () => {
      const root = document.documentElement
      root.classList.toggle('dark', theme === 'dark')
    }
    window.addEventListener('afterprint', onAfter)
    return () => window.removeEventListener('afterprint', onAfter)
  }, [theme])

  // Apply all data-* attributes — globals.css reads these for color, font, size, radius
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-color',      colorTheme)
    root.setAttribute('data-font',       fontFamily)
    root.setAttribute('data-fontsize',   fontSize)
    root.setAttribute('data-radius',     borderRadius)
    root.setAttribute('data-compact',    compactMode ? 'true' : 'false')
    root.setAttribute('data-animations', animations  ? 'true' : 'false')
  }, [colorTheme, fontFamily, fontSize, borderRadius, compactMode, animations])

  // Load Google Font dynamically when fontFamily changes
  useEffect(() => {
    const imp = FONT_IMPORTS[fontFamily]
    if (!imp) return
    const existing = document.getElementById('dynamic-font')
    if (existing) existing.remove()
    const link = document.createElement('link')
    link.id   = 'dynamic-font'
    link.rel  = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${imp}&display=swap`
    document.head.appendChild(link)
  }, [fontFamily])

  return <>{children}</>
}

