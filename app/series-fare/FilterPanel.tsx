"use client";

import { Filter, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtINR } from "./utils";

// ─── Sidebar filter primitives ────────────────────────────────────────────────
function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground">
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function FilterRadio({
  active, onClick, children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all text-left",
        active
          ? "bg-primary text-primary-foreground font-semibold shadow-sm"
          : "text-foreground hover:bg-muted/60",
      )}
    >
      {active && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
      {children}
    </button>
  );
}

// ─── FilterPanel ──────────────────────────────────────────────────────────────
export function FilterPanel({
  priceBounds,
  maxPrice,
  onMaxPriceChange,
  sortBy,
  onSortChange,
  stopsFilter,
  onStopsChange,
  refundFilter,
  onRefundChange,
  airlinesFilter,
  onAirlinesChange,
  airlineCounts,
}: {
  priceBounds: { min: number; max: number };
  maxPrice: number | null;
  onMaxPriceChange: (price: number) => void;
  sortBy: "cheapest" | "earliest" | "fastest";
  onSortChange: (key: "cheapest" | "earliest" | "fastest") => void;
  stopsFilter: "any" | "nonstop" | "1stop" | "2plus";
  onStopsChange: (key: "any" | "nonstop" | "1stop" | "2plus") => void;
  refundFilter: "any" | "refundable" | "nonrefundable";
  onRefundChange: (key: "any" | "refundable" | "nonrefundable") => void;
  airlinesFilter: string[];
  onAirlinesChange: (airlines: string[]) => void;
  airlineCounts: Array<[string, number]>;
}) {
  return (
    <aside className="lg:w-72 lg:flex-shrink-0 lg:sticky lg:top-20 lg:self-start">
      <div className="bg-card border border-border rounded-2xl p-4 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto space-y-5">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm">Filters</h3>
        </div>

        {/* Price range */}
        {priceBounds.max > 0 && (
          <FilterSection title="Price Range">
            {/* Current cap — prominent so the agent can see what they've
                set without having to read off the slider thumb. */}
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Showing under
              </span>
              <span className="text-sm font-semibold text-primary tabular-nums">
                {fmtINR(maxPrice ?? priceBounds.max)}
              </span>
            </div>

            <input
              type="range"
              min={priceBounds.min}
              max={priceBounds.max}
              // Step of 1 so the rightmost slider position lands EXACTLY on
              // priceBounds.max — otherwise a coarse step (e.g. 136) snaps
              // the cap to a value below the actual maximum fare and the
              // most expensive fare disappears even though the user dragged
              // the slider all the way right. Range inputs are smooth in
              // modern browsers; step=1 doesn't hurt UX.
              step={1}
              value={maxPrice ?? priceBounds.max}
              onChange={(e) => {
                const v = Number(e.target.value);
                // Treat "at or above the max" as "no cap" so the price
                // filter never silently hides a valid fare.
                onMaxPriceChange(v >= priceBounds.max ? priceBounds.max : v);
              }}
              className="w-full accent-primary"
            />

            {/* End-points — anchored to the actual range of the result set.
                These NEVER change as the agent drags the slider, so they
                act as stable reference points for what's available. */}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
              <span>{fmtINR(priceBounds.min)}</span>
              <span>{fmtINR(priceBounds.max)}</span>
            </div>
          </FilterSection>
        )}

        {/* Sort by */}
        <FilterSection title="Sort By">
          {[
            { key: "cheapest", label: "Cheapest first", emoji: "💰" },
            { key: "earliest", label: "Earliest first", emoji: "⏰" },
            { key: "fastest",  label: "Fastest first",  emoji: "⚡" },
          ].map(({ key, label, emoji }) => (
            <FilterRadio
              key={key}
              active={sortBy === key}
              onClick={() => onSortChange(key as any)}
            >
              <span>{emoji}</span> {label}
            </FilterRadio>
          ))}
        </FilterSection>

        {/* Stops */}
        <FilterSection title="Stops">
          {[
            { key: "any",     label: "Any stops"    },
            { key: "nonstop", label: "Non-stop only" },
            { key: "1stop",   label: "1 stop"        },
          ].map(({ key, label }) => (
            <FilterRadio
              key={key}
              active={stopsFilter === key}
              onClick={() => onStopsChange(key as any)}
            >
              {label}
            </FilterRadio>
          ))}
        </FilterSection>

        {/* Refund policy */}
        <FilterSection title="Refund Policy">
          {[
            { key: "any",            label: "Any"             },
            { key: "refundable",     label: "Refundable only" },
            { key: "nonrefundable",  label: "Non-refundable"  },
          ].map(({ key, label }) => (
            <FilterRadio
              key={key}
              active={refundFilter === key}
              onClick={() => onRefundChange(key as any)}
            >
              {label}
            </FilterRadio>
          ))}
        </FilterSection>

        {/* Airlines */}
        {airlineCounts.length > 0 && (
          <FilterSection title="Airlines">
            <FilterRadio
              active={airlinesFilter.length === 0}
              onClick={() => onAirlinesChange([])}
            >
              All airlines
            </FilterRadio>
            {airlineCounts.map(([name, count]) => (
              <FilterRadio
                key={name}
                active={airlinesFilter.includes(name)}
                onClick={() =>
                  onAirlinesChange(
                    airlinesFilter.includes(name)
                      ? airlinesFilter.filter((x) => x !== name)
                      : [...airlinesFilter, name],
                  )
                }
              >
                <span className="truncate">{name}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">{count}</span>
              </FilterRadio>
            ))}
          </FilterSection>
        )}
      </div>
    </aside>
  );
}
