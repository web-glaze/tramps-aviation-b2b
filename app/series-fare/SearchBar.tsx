"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Calendar, Users, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchApi, unwrap } from "@/lib/api/services";
import { AIRPORTS } from "./constants";
import { SearchForm } from "./types";
import { todayISO } from "./utils";

// ─── Airport Input — dynamic autocomplete via backend `/flights/airports` ────
// Falls back to the local AIRPORTS list if the API is unreachable so the form
// still works offline / on a cold backend.
function AirportInput({
  value,
  label,
  placeholder,
  onChange,
  onSelect,
}: {
  value: string;
  label: string;
  placeholder: string;
  onChange: (v: string) => void;
  onSelect: (a: { code: string; city: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [remoteResults, setRemoteResults] = useState<
    { code: string; city: string; name: string }[]
  >([]);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced remote lookup
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
        // Network error — let local filter take over silently
        setRemoteResults([]);
      }
    }, 220);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  // Combined results: prefer remote (fresh), fallback to local
  const filtered = useMemo(() => {
    if (remoteResults.length > 0) return remoteResults.slice(0, 8);
    const q = value.toLowerCase();
    if (!q) return AIRPORTS.slice(0, 7);
    return AIRPORTS.filter(
      (a) =>
        a.code.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q),
    ).slice(0, 7);
  }, [value, remoteResults]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative flex-1">
      <label className="block text-xs font-medium text-muted-foreground mb-1">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
      />
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-popover border border-border rounded-xl shadow-xl overflow-hidden">
          {filtered.map((a) => (
            <button
              key={a.code}
              type="button"
              onMouseDown={() => {
                onSelect(a);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 hover:bg-muted transition-colors flex items-center gap-3"
            >
              <span className="font-mono text-xs font-bold text-primary w-10">
                {a.code}
              </span>
              <div>
                <p className="text-sm font-medium">{a.city}</p>
                <p className="text-xs text-muted-foreground truncate max-w-[220px]">
                  {a.name}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SearchBar ────────────────────────────────────────────────────────────────
export function SearchBar({
  form,
  onFormChange,
  loading,
  onSubmit,
}: {
  form: SearchForm;
  onFormChange: (fn: (f: SearchForm) => SearchForm) => void;
  loading: boolean;
  onSubmit: (e?: React.FormEvent) => void;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="bg-card border border-border rounded-2xl p-5 space-y-4"
    >
      {/* Trip type toggle — OneWay / RoundTrip */}
      <div className="flex gap-2">
        {(["OneWay", "RoundTrip"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() =>
              onFormChange((f) => ({
                ...f,
                tripType: t,
                // clear returnDate when switching back to OneWay
                returnDate: t === "OneWay" ? "" : f.returnDate,
              }))
            }
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-semibold border transition-all",
              form.tripType === t
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:border-primary/50",
            )}
          >
            {t === "OneWay" ? "One Way" : "Round Trip"}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <AirportInput
          label="From"
          value={form.originLabel}
          placeholder="Delhi (DEL)"
          onChange={(v) =>
            onFormChange((f) => {
              // Try to extract code from "(XXX)" pattern; otherwise leave origin untouched
              const m = v.match(/\(([A-Z]{3})\)/i);
              return { ...f, originLabel: v, origin: m ? m[1].toUpperCase() : f.origin };
            })
          }
          onSelect={(a) =>
            onFormChange((f) => ({
              ...f,
              origin: a.code,
              originLabel: `${a.city} (${a.code})`,
            }))
          }
        />
        <AirportInput
          label="To"
          value={form.destinationLabel}
          placeholder="Mumbai (BOM)"
          onChange={(v) =>
            onFormChange((f) => {
              const m = v.match(/\(([A-Z]{3})\)/i);
              return { ...f, destinationLabel: v, destination: m ? m[1].toUpperCase() : f.destination };
            })
          }
          onSelect={(a) =>
            onFormChange((f) => ({
              ...f,
              destination: a.code,
              destinationLabel: `${a.city} (${a.code})`,
            }))
          }
        />
        <div className="space-y-1">
          <label className="block text-xs font-medium text-muted-foreground">
            Departure
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={form.departureDate}
              min={todayISO()}
              onChange={(e) =>
                onFormChange((f) => ({ ...f, departureDate: e.target.value }))
              }
              className="h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>
        {form.tripType === "RoundTrip" && (
          <div className="space-y-1">
            <label className="block text-xs font-medium text-muted-foreground">
              Return
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={form.returnDate}
                min={form.departureDate || todayISO()}
                onChange={(e) =>
                  onFormChange((f) => ({ ...f, returnDate: e.target.value }))
                }
                className="h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>
        )}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-muted-foreground">
            Passengers
          </label>
          <div className="flex items-center gap-2 h-11 px-3 rounded-xl border border-border bg-background">
            <Users className="h-4 w-4 text-muted-foreground" />
            <button
              type="button"
              onClick={() => onFormChange((f) => ({ ...f, adults: Math.max(1, f.adults - 1) }))}
              className="h-5 w-5 rounded-full border border-border flex items-center justify-center text-xs hover:bg-muted"
            >
              −
            </button>
            <span className="text-sm w-4 text-center">{form.adults}</span>
            <button
              type="button"
              onClick={() => onFormChange((f) => ({ ...f, adults: Math.min(9, f.adults + 1) }))}
              className="h-5 w-5 rounded-full border border-border flex items-center justify-center text-xs hover:bg-muted"
            >
              +
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="h-11 px-6 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Search
        </button>
      </div>
    </form>
  );
}
