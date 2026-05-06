import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

export const fmtINR = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export const fmtDate = (iso: string) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      weekday: "short", day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return iso; }
};

export const todayISO = () => new Date().toISOString().split("T")[0];

export const generateIdempotencyKey = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const inputCls = (hasError: boolean) => cn(
  "w-full px-3.5 h-10 rounded-xl border bg-background text-sm focus:ring-2 outline-none transition-all",
  hasError
    ? "border-red-400 focus:border-red-400 focus:ring-red-400/20"
    : "border-border focus:border-primary focus:ring-primary/20"
);
