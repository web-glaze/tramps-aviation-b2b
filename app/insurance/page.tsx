"use client";

/**
 * app/insurance/page.tsx — B2B Travel Insurance Plans
 * ────────────────────────────────────────────────────
 * Reused by B2B: app/b2b/insurance/page.tsx → dynamic(() => import("../../insurance/page"))
 *
 * Fetches available plans from GET /insurance/plans and allows agents to
 * issue a policy via POST /insurance/issue (after booking confirmation).
 */

import { useState, useMemo } from "react";
import {
  Shield,
  Search,
  Calendar,
  Users,
  Plane,
  Check,
  X,
  Loader2,
  AlertCircle,
  Star,
  Zap,
  Globe,
  MapPin,
  ChevronDown,
  ChevronUp,
  Info,
  Wallet,
  Phone,
  Stethoscope,
  Luggage,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { searchApi, unwrap } from "@/lib/api/services";
import { getErrorMessage } from "@/lib/utils/errors";
import { toast } from "sonner";
import { PublicPageChrome } from "@/components/layout/PublicPageChrome";

// ─── Types ────────────────────────────────────────────────────────────────────
interface InsurancePlan {
  planId: string;
  planName: string;
  type: "domestic" | "international";
  tier: "basic" | "standard" | "premium";
  pricePerPerson: number;
  totalPremium?: number;
  currency?: string;
  coverageHighlights?: string[];
  coverages?: {
    tripCancellation?: string;
    medicalExpenses?: string;
    baggageLoss?: string;
    flightDelay?: string;
    accidentalDeath?: string;
    emergencyEvacuation?: string;
  };
  agentCommission?: number;
  recommended?: boolean;
}

interface SearchForm {
  origin: string;
  destination: string;
  departureDate: string;
  passengerCount: number;
}

const fmtINR = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const todayISO = () => new Date().toISOString().split("T")[0];

const PLAN_COLORS = {
  basic: { bg: "bg-slate-500/10", text: "text-slate-600 dark:text-slate-400", border: "border-slate-200 dark:border-slate-700" },
  standard: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/30" },
  premium: { bg: "bg-amber-500/10", text: "text-amber-600", border: "border-amber-200 dark:border-amber-700" },
};

const COVERAGE_ICONS: Record<string, any> = {
  tripCancellation: X,
  medicalExpenses: Stethoscope,
  baggageLoss: Luggage,
  flightDelay: Clock,
  accidentalDeath: Shield,
  emergencyEvacuation: Zap,
};

const COVERAGE_LABELS: Record<string, string> = {
  tripCancellation: "Trip Cancellation",
  medicalExpenses: "Medical Expenses",
  baggageLoss: "Baggage Loss",
  flightDelay: "Flight Delay",
  accidentalDeath: "Accidental Death",
  emergencyEvacuation: "Emergency Evacuation",
};

// ─── Plan Card ────────────────────────────────────────────────────────────────
function PlanCard({
  plan,
  passengerCount,
  onSelect,
  selected,
}: {
  plan: InsurancePlan;
  passengerCount: number;
  onSelect: (p: InsurancePlan) => void;
  selected: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const total = plan.totalPremium || plan.pricePerPerson * passengerCount;
  const commission = plan.agentCommission || 0;
  const colors = PLAN_COLORS[plan.tier] || PLAN_COLORS.standard;
  const highlights = plan.coverageHighlights || [];
  const coverages = plan.coverages || {};

  return (
    <div
      className={cn(
        "relative bg-card border rounded-2xl overflow-hidden transition-all duration-200",
        selected ? "border-primary shadow-lg ring-2 ring-primary/20" : "border-border hover:shadow-md",
        plan.recommended && !selected && "border-amber-300 dark:border-amber-600",
      )}
    >
      {plan.recommended && (
        <div className="flex items-center gap-1.5 px-5 py-2 bg-amber-500/10 border-b border-amber-200 dark:border-amber-700">
          <Star className="h-3 w-3 text-amber-500 fill-amber-400" />
          <span className="text-xs font-semibold text-amber-600">Most Popular</span>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Plan info */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", colors.bg)}>
                <Shield className={cn("h-3.5 w-3.5", colors.text)} />
              </div>
              <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", colors.bg, colors.text)}>
                {plan.tier.charAt(0).toUpperCase() + plan.tier.slice(1)}
              </span>
              <span className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1",
                plan.type === "international"
                  ? "bg-violet-500/10 text-violet-600"
                  : "bg-emerald-500/10 text-emerald-600"
              )}>
                {plan.type === "international" ? <Globe className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                {plan.type === "international" ? "International" : "Domestic"}
              </span>
            </div>
            <h3 className="font-semibold">{plan.planName}</h3>
            <p className="text-xs text-muted-foreground">
              {passengerCount} passenger{passengerCount > 1 ? "s" : ""}
            </p>
          </div>

          {/* Pricing */}
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold">{fmtINR(total)}</p>
            <p className="text-xs text-muted-foreground">
              {fmtINR(plan.pricePerPerson)}/person
            </p>
            {commission > 0 && (
              <p className="text-xs font-semibold text-emerald-500 mt-0.5">
                +{fmtINR(commission)} commission
              </p>
            )}
          </div>
        </div>

        {/* Highlights */}
        {highlights.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {highlights.slice(0, 4).map((h) => (
              <span key={h} className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/40 px-2 py-1 rounded-lg">
                <Check className="h-3 w-3 text-emerald-500" />
                {h}
              </span>
            ))}
          </div>
        )}

        {/* Expanded coverages */}
        {expanded && Object.keys(coverages).length > 0 && (
          <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-2">
            {Object.entries(coverages).map(([key, value]) => {
              const Icon = COVERAGE_ICONS[key] || Shield;
              return (
                <div key={key} className="flex items-start gap-2 text-xs">
                  <Icon className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">{COVERAGE_LABELS[key] || key}</p>
                    <p className="font-medium">{value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            Coverage details
          </button>
          <div className="flex-1" />
          <button
            onClick={() => onSelect(plan)}
            className={cn(
              "px-5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2",
              selected
                ? "bg-primary text-primary-foreground"
                : "border border-primary text-primary hover:bg-primary/5",
            )}
          >
            {selected ? <Check className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
            {selected ? "Selected" : "Add to Booking"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function PlanSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-muted rounded-2xl h-40" />
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function InsurancePage() {
  const [form, setForm] = useState<SearchForm>({
    origin: "DEL",
    destination: "BOM",
    departureDate: todayISO(),
    passengerCount: 1,
  });
  const [plans, setPlans] = useState<InsurancePlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<InsurancePlan | null>(null);
  const [filterType, setFilterType] = useState<"all" | "domestic" | "international">("all");

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.origin || !form.destination) {
      toast.error("Please enter origin and destination");
      return;
    }
    setLoading(true);
    setError(null);
    setSearched(true);
    setSelectedPlan(null);
    try {
      const res = await searchApi.searchInsurance({
        origin: form.origin.toUpperCase(),
        destination: form.destination.toUpperCase(),
        departureDate: form.departureDate,
        passengerCount: form.passengerCount,
      });
      const d = unwrap(res) as any;
      const list: InsurancePlan[] = Array.isArray(d?.plans)
        ? d.plans
        : Array.isArray(d)
        ? d
        : [];
      setPlans(list);
      if (list.length === 0) toast.info("No insurance plans available for this route");
    } catch (err) {
      const msg = getErrorMessage(err, "Failed to load insurance plans");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const displayPlans = useMemo(() => {
    let list = [...plans];
    if (filterType !== "all") list = list.filter((p) => p.type === filterType);
    // recommended first, then by price
    list.sort((a, b) => {
      if (a.recommended && !b.recommended) return -1;
      if (!a.recommended && b.recommended) return 1;
      return a.pricePerPerson - b.pricePerPerson;
    });
    return list;
  }, [plans, filterType]);

  return (
    <PublicPageChrome>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <Shield className="h-5 w-5 text-emerald-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-display">Travel Insurance</h1>
          <p className="text-sm text-muted-foreground">
            Protect your clients&apos; journeys — domestic & international plans
          </p>
        </div>
      </div>

      {/* Search form */}
      <form
        onSubmit={handleSearch}
        className="bg-card border border-border rounded-2xl p-5"
      >
        <div className="flex flex-wrap gap-4 items-end">
          {/* Origin */}
          <div className="space-y-1 flex-1 min-w-32">
            <label className="block text-xs font-medium text-muted-foreground">From</label>
            <div className="relative">
              <Plane className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={form.origin}
                onChange={(e) => setForm((f) => ({ ...f, origin: e.target.value.toUpperCase() }))}
                placeholder="DEL"
                maxLength={3}
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-sm font-mono outline-none focus:border-primary transition-colors uppercase"
              />
            </div>
          </div>

          {/* Destination */}
          <div className="space-y-1 flex-1 min-w-32">
            <label className="block text-xs font-medium text-muted-foreground">To</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={form.destination}
                onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value.toUpperCase() }))}
                placeholder="BOM"
                maxLength={3}
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-sm font-mono outline-none focus:border-primary transition-colors uppercase"
              />
            </div>
          </div>

          {/* Departure date */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-muted-foreground">Departure</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={form.departureDate}
                min={todayISO()}
                onChange={(e) => setForm((f) => ({ ...f, departureDate: e.target.value }))}
                className="h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          {/* Passengers */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-muted-foreground">Passengers</label>
            <div className="flex items-center gap-2 h-11 px-3 rounded-xl border border-border bg-background">
              <Users className="h-4 w-4 text-muted-foreground" />
              <button type="button" onClick={() => setForm((f) => ({ ...f, passengerCount: Math.max(1, f.passengerCount - 1) }))} className="h-5 w-5 rounded-full border border-border flex items-center justify-center text-xs">−</button>
              <span className="text-sm w-4 text-center">{form.passengerCount}</span>
              <button type="button" onClick={() => setForm((f) => ({ ...f, passengerCount: Math.min(9, f.passengerCount + 1) }))} className="h-5 w-5 rounded-full border border-border flex items-center justify-center text-xs">+</button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="h-11 px-6 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Get Plans
          </button>
        </div>
      </form>

      {/* Loading */}
      {loading && <PlanSkeleton />}

      {/* Results */}
      {!loading && searched && (
        <>
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {displayPlans.length > 0 && (
            <>
              {/* Filter tabs */}
              <div className="flex items-center gap-3">
                <div className="flex gap-1 p-1 bg-muted/60 rounded-xl">
                  {(["all", "domestic", "international"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setFilterType(t)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize",
                        filterType === t
                          ? "bg-background shadow-sm text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {t === "all" ? `All (${plans.length})` : t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Plans auto-selected based on route type
                </p>
              </div>

              <div className="space-y-4">
                {displayPlans.map((p) => (
                  <PlanCard
                    key={p.planId}
                    plan={p}
                    passengerCount={form.passengerCount}
                    onSelect={(plan) => setSelectedPlan(selectedPlan?.planId === plan.planId ? null : plan)}
                    selected={selectedPlan?.planId === p.planId}
                  />
                ))}
              </div>

              {/* Selected plan CTA */}
              {selectedPlan && (
                <div className="sticky bottom-4 bg-card border border-primary shadow-2xl rounded-2xl p-4 flex items-center gap-4">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{selectedPlan.planName}</p>
                    <p className="text-xs text-muted-foreground">
                      {form.passengerCount} passenger{form.passengerCount > 1 ? "s" : ""} · {fmtINR(selectedPlan.totalPremium || selectedPlan.pricePerPerson * form.passengerCount)} total
                      {selectedPlan.agentCommission ? ` · +${fmtINR(selectedPlan.agentCommission)} commission` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => toast.info("Add this plan during flight booking checkout")}
                    className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
                  >
                    <Shield className="h-4 w-4" />
                    Add to Booking
                  </button>
                </div>
              )}
            </>
          )}

          {!error && displayPlans.length === 0 && (
            <div className="py-16 text-center border border-dashed border-border rounded-2xl">
              <Shield className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm font-medium">No plans available</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try a different route or contact support
              </p>
            </div>
          )}
        </>
      )}

      {/* Initial state */}
      {!searched && !loading && (
        <div className="py-16 text-center">
          <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Travel Insurance Plans</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
            Protect your clients with comprehensive domestic and international travel insurance. Earn commission on every policy.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-xl mx-auto text-sm">
            {[
              { icon: Stethoscope, label: "Medical cover", sub: "Up to ₹50L" },
              { icon: X, label: "Trip cancellation", sub: "Full refund" },
              { icon: Luggage, label: "Baggage loss", sub: "Up to ₹1L" },
              { icon: Clock, label: "Flight delay", sub: "₹500/hr" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-2 p-3 bg-muted/40 rounded-xl">
                <item.icon className="h-5 w-5 text-emerald-500" />
                <p className="font-medium text-xs">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    </PublicPageChrome>
  );
}
