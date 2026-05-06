"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Plane, X } from "lucide-react";
import { searchApi, unwrap } from "@/lib/api/services";
import { POPULAR_AIRPORTS } from "./constants";

// ── Airport Autocomplete Input ────────────────────────────
export function AirportInput({
  value, label, placeholder, onChange, onSelect, disabled,
}: {
  value: string; label: string; placeholder: string;
  onChange: (v: string) => void;
  onSelect: (airport: { code: string; city: string; name: string }) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [remoteResults, setRemoteResults] = useState<
    { code: string; city: string; name: string; country?: string }[]
  >([]);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced remote lookup against /flights/airports — keeps the form responsive
  // while still letting agents pick from the full master list (not just popular).
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = value.trim();
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchApi.searchAirports(q, 8);
        const d = unwrap(res) as any;
        const list = Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : [];
        setRemoteResults(list);
      } catch {
        setRemoteResults([]);
      }
    }, 220);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  // Combined results: prefer remote (fresh), fallback to local list
  const filtered = useMemo(() => {
    if (remoteResults.length > 0) return remoteResults.slice(0, 8);
    const q = value.toLowerCase().trim();
    if (!q) return POPULAR_AIRPORTS.slice(0, 8);
    return POPULAR_AIRPORTS.filter(
      a =>
        a.code.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [value, remoteResults]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative flex-1 min-w-0">
      <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        <Plane className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="w-full h-12 pl-9 pr-4 rounded-xl border border-border bg-background text-sm font-semibold focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:font-normal placeholder:text-muted-foreground"
        />
        {value && (
          <button
            onClick={() => { onChange(""); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
          {filtered.map(a => (
            <button
              key={a.code}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onSelect(a); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors text-left"
            >
              <span className="font-black text-primary text-sm font-mono w-10 flex-shrink-0">
                {a.code}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{a.city}</p>
                <p className="text-xs text-muted-foreground truncate">{a.name}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
