'use client'

import { useState, useEffect } from 'react'
import {
  Settings, X, Sun, Moon, Monitor, Check, Palette,
  Type, LayoutGrid, Zap, ZapOff, RotateCcw,
  Minimize2, Maximize2, Eye, Layout, ChevronDown
} from 'lucide-react'
import { useSettingsStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const COLOR_THEMES = [
  { key: 'blue',    label: 'Ocean',   hex: '#3b82f6' },
  { key: 'violet',  label: 'Royal',   hex: '#8b5cf6' },
  { key: 'emerald', label: 'Forest',  hex: '#10b981' },
  { key: 'rose',    label: 'Rose',    hex: '#f43f5e' },
  { key: 'orange',  label: 'Sunset',  hex: '#f97316' },
  { key: 'teal',    label: 'Teal',    hex: '#14b8a6' },
  { key: 'cyan',    label: 'Cyan',    hex: '#06b6d4' },
  { key: 'amber',   label: 'Amber',   hex: '#f59e0b' },
  { key: 'pink',    label: 'Pink',    hex: '#ec4899' },
  { key: 'indigo',  label: 'Indigo',  hex: '#6366f1' },
  { key: 'slate',   label: 'Slate',   hex: '#64748b' },
  { key: 'lime',    label: 'Lime',    hex: '#65a30d' },
] as const

const FONTS = [
  { key: 'jakarta',  label: 'Jakarta Sans',  preview: 'Aa' },
  { key: 'inter',    label: 'Inter',         preview: 'Aa' },
  { key: 'poppins',  label: 'Poppins',       preview: 'Aa' },
  { key: 'outfit',   label: 'Outfit',        preview: 'Aa' },
  { key: 'sora',     label: 'Sora',          preview: 'Aa' },
  { key: 'space',    label: 'Space Grotesk', preview: 'Aa' },
  { key: 'dm-sans',  label: 'DM Sans',       preview: 'Aa' },
  { key: 'nunito',   label: 'Nunito',        preview: 'Aa' },
  { key: 'rajdhani', label: 'Rajdhani',      preview: 'Aa' },
] as const

const RADII = [
  { key: 'none', label: '⬜', desc: 'Sharp' },
  { key: 'sm',   label: '◻',  desc: 'Slight' },
  { key: 'md',   label: '▢',  desc: 'Medium' },
  { key: 'lg',   label: '▣',  desc: 'Large' },
  { key: 'xl',   label: '🔲', desc: 'Extra' },
  { key: 'full', label: '⬤', desc: 'Pill' },
] as const

const FONT_SIZES = [
  { key: 'xs', label: 'XS', px: '11' },
  { key: 'sm', label: 'S',  px: '13' },
  { key: 'md', label: 'M',  px: '14' },
  { key: 'lg', label: 'L',  px: '16' },
  { key: 'xl', label: 'XL', px: '18' },
] as const

type Section = 'appearance' | 'colors' | 'typography' | 'layout' | null

export function SettingsFab() {
  const [open, setOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<Section>('appearance')
  const s = useSettingsStore()

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const resetAll = () => {
    s.setTheme('dark')
    s.setColorTheme('blue')
    s.setFontSize('md')
    s.setFontFamily('jakarta')
    s.setBorderRadius('lg')
    s.setCompactMode(false)
    s.setAnimations(true)
  }

  const toggleSection = (sec: Section) =>
    setActiveSection(prev => prev === sec ? null : sec)

  return (
    <>
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}

      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-[360px] bg-card border border-border rounded-2xl shadow-2xl shadow-black/20 overflow-hidden settings-panel">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-primary/8 to-transparent">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-primary/15 flex items-center justify-center ring-1 ring-primary/20">
                <Palette className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm font-display">Site Customizer</p>
                <p className="text-[11px] text-muted-foreground">Personalize your experience</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="h-7 w-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[80vh] overflow-y-auto">
            {/* Section: Appearance */}
            <AccordionSection
              icon={Eye}
              title="Appearance"
              badge={s.theme}
              open={activeSection === 'appearance'}
              onToggle={() => toggleSection('appearance')}
            >
              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: 'light',  label: 'Light',  icon: Sun },
                  { key: 'dark',   label: 'Dark',   icon: Moon },
                  { key: 'system', label: 'System', icon: Monitor },
                ] as const).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => s.setTheme(key)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 py-3.5 rounded-xl border text-xs font-medium transition-all',
                      s.theme === key
                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                        : 'border-border hover:border-primary/40 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </AccordionSection>

            {/* Section: Colors */}
            <AccordionSection
              icon={Palette}
              title="Color Theme"
              badge={COLOR_THEMES.find(c => c.key === s.colorTheme)?.label}
              open={activeSection === 'colors'}
              onToggle={() => toggleSection('colors')}
            >
              <div className="grid grid-cols-6 gap-2">
                {COLOR_THEMES.map(({ key, label, hex }) => (
                  <button
                    key={key}
                    onClick={() => s.setColorTheme(key)}
                    title={label}
                    className={cn(
                      'flex flex-col items-center gap-1.5 py-2.5 rounded-xl border transition-all group relative',
                      s.colorTheme === key
                        ? 'border-2 scale-105 shadow-md'
                        : 'border-border hover:scale-105 hover:border-current/40'
                    )}
                    style={s.colorTheme === key ? { borderColor: hex } : { color: hex }}
                  >
                    <span
                      className="h-5 w-5 rounded-full shadow-sm"
                      style={{ backgroundColor: hex }}
                    />
                    <span className="text-[9px] font-medium text-muted-foreground leading-none">{label}</span>
                    {s.colorTheme === key && (
                      <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-card flex items-center justify-center shadow-sm" style={{ color: hex }}>
                        <Check className="h-2 w-2" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </AccordionSection>

            {/* Section: Typography */}
            <AccordionSection
              icon={Type}
              title="Typography"
              badge={FONTS.find(f => f.key === s.fontFamily)?.label}
              open={activeSection === 'typography'}
              onToggle={() => toggleSection('typography')}
            >
              <div className="space-y-4">
                {/* Font Family */}
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Font Family</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {FONTS.map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => s.setFontFamily(key)}
                        className={cn(
                          'flex items-center justify-between px-2.5 py-2 rounded-lg border text-xs transition-all',
                          s.fontFamily === key
                            ? 'border-primary bg-primary/8 text-primary'
                            : 'border-border hover:border-primary/40 text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <span className="truncate text-[11px]">{label}</span>
                        {s.fontFamily === key && <Check className="h-3 w-3 flex-shrink-0 ml-1" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Size */}
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Text Size</p>
                  <div className="flex gap-1.5">
                    {FONT_SIZES.map(({ key, label, px }) => (
                      <button
                        key={key}
                        onClick={() => s.setFontSize(key)}
                        title={`${px}px`}
                        className={cn(
                          'flex-1 py-2 rounded-lg border text-xs font-semibold transition-all',
                          s.fontSize === key
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-primary/40 text-muted-foreground'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </AccordionSection>

            {/* Section: Layout */}
            <AccordionSection
              icon={Layout}
              title="Layout & Effects"
              open={activeSection === 'layout'}
              onToggle={() => toggleSection('layout')}
            >
              <div className="space-y-3">
                {/* Border Radius */}
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Corner Radius</p>
                  <div className="grid grid-cols-6 gap-1.5">
                    {RADII.map(({ key, desc }) => {
                      const radiusMap: Record<string, string> = {
                        none: '0', sm: '4px', md: '8px', lg: '12px', xl: '16px', full: '9999px'
                      }
                      return (
                        <button
                          key={key}
                          onClick={() => s.setBorderRadius(key)}
                          title={desc}
                          className={cn(
                            'flex flex-col items-center gap-1.5 py-2.5 border transition-all rounded-lg',
                            s.borderRadius === key
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/40'
                          )}
                        >
                          <span
                            className={cn(
                              'h-5 w-5 border-2',
                              s.borderRadius === key ? 'border-primary' : 'border-muted-foreground/40'
                            )}
                            style={{ borderRadius: radiusMap[key] }}
                          />
                          <span className="text-[9px] text-muted-foreground">{desc}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Toggles */}
                <div className="space-y-2">
                  <ToggleRow
                    label="Compact Mode"
                    desc="Reduce spacing and padding"
                    icon={s.compactMode ? Minimize2 : Maximize2}
                    checked={s.compactMode}
                    onChange={s.setCompactMode}
                  />
                  <ToggleRow
                    label="Animations"
                    desc="UI transitions and effects"
                    icon={s.animations ? Zap : ZapOff}
                    checked={s.animations}
                    onChange={s.setAnimations}
                  />
                </div>
              </div>
            </AccordionSection>

            {/* Footer */}
            <div className="p-4 pt-2 border-t border-border">
              <button
                onClick={resetAll}
                className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground py-2.5 border border-dashed border-border rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset to defaults
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB Button */}
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg flex items-center justify-center',
          'bg-primary text-primary-foreground transition-all duration-300',
          'hover:scale-110 hover:shadow-xl hover:shadow-primary/30',
          open && 'rotate-[135deg] scale-95'
        )}
        title="Customize Site (Settings)"
      >
        <Settings className="h-5 w-5" />
      </button>
    </>
  )
}

function AccordionSection({
  icon: Icon, title, badge, open, onToggle, children
}: {
  icon: any; title: string; badge?: string; open: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{title}</span>
          {badge && (
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary rounded-full capitalize">
              {badge}
            </span>
          )}
        </div>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="px-5 pb-4">{children}</div>}
    </div>
  )
}

function ToggleRow({ label, desc, icon: Icon, checked, onChange }: {
  label: string; desc: string; icon: any; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        'w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all',
        checked ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-primary/30'
      )}
    >
      <Icon className={cn('h-4 w-4 flex-shrink-0', checked ? 'text-primary' : 'text-muted-foreground')} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-xs font-medium', checked ? 'text-foreground' : 'text-muted-foreground')}>{label}</p>
        <p className="text-[11px] text-muted-foreground">{desc}</p>
      </div>
      <div className={cn('h-5 w-9 rounded-full transition-colors flex-shrink-0 relative', checked ? 'bg-primary' : 'bg-border')}>
        <div className={cn('absolute top-0.5 h-4 w-4 rounded-full toggle-knob shadow-sm transition-transform', checked ? 'translate-x-4' : 'translate-x-0.5')} />
      </div>
    </button>
  )
}
