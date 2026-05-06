"use client";

import { useState, useMemo } from "react";
import {
  Calculator, Printer, Copy, Share2, TrendingUp,
  IndianRupee, Percent, CheckCircle2, RefreshCw,
  Plane, Hotel, Shield, ChevronDown,
} from "lucide-react";
import { usePlatformStore } from "@/lib/store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MarkupSettings } from "@/components/shared/MarkupSettings";

// ─── Types ────────────────────────────────────────────────────────────────────
type ServiceType = "flight" | "hotel" | "insurance";
type MarkupType = "flat" | "percent";

interface QuoteInput {
  serviceType: ServiceType;
  baseFare: string;
  markupType: MarkupType;
  markupValue: string;
  clientName: string;
  route: string;
  travelDate: string;
  pax: string;
  notes: string;
}

// ─── Calculation ──────────────────────────────────────────────────────────────
function calculate(baseFare: number, markupType: MarkupType, markupValue: number, commissionPct: number, gstPct: number) {
  const markup = markupType === "flat"
    ? markupValue
    : Math.round((baseFare * markupValue) / 100);
  const clientTotal = baseFare + markup;
  const agentCommission = Math.round((baseFare * commissionPct) / 100);
  const gstOnComm = Math.round((agentCommission * gstPct) / 100);
  const netEarning = markup + agentCommission - gstOnComm;
  return { markup, clientTotal, agentCommission, gstOnComm, netEarning };
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MarkupPage() {
  const { ps } = usePlatformStore();

  const [form, setForm] = useState<QuoteInput>({
    serviceType: "flight",
    baseFare: "",
    markupType: "flat",
    markupValue: "",
    clientName: "",
    route: "",
    travelDate: "",
    pax: "1",
    notes: "",
  });

  const [showQuote, setShowQuote] = useState(false);

  const commissionPct = ps.flightMarkupPercent ?? 2;
  const gstPct = ps.gstPercent ?? 18;

  const base = parseFloat(form.baseFare) || 0;
  const mValue = parseFloat(form.markupValue) || 0;

  const calc = useMemo(
    () => calculate(base, form.markupType, mValue, commissionPct, gstPct),
    [base, form.markupType, mValue, commissionPct, gstPct],
  );

  const fmtINR = (n: number) =>
    `₹${Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  const serviceIcons: Record<ServiceType, React.ElementType> = {
    flight: Plane,
    hotel: Hotel,
    insurance: Shield,
  };

  const handleGenerateQuote = () => {
    if (!form.baseFare || parseFloat(form.baseFare) <= 0) {
      toast.error("Please enter a valid base fare"); return;
    }
    setShowQuote(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyQuote = () => {
    const text = [
      `Client Quote — ${form.route || "Travel"}`,
      `Service: ${form.serviceType.charAt(0).toUpperCase() + form.serviceType.slice(1)}`,
      form.travelDate && `Travel Date: ${form.travelDate}`,
      form.pax && `Passengers: ${form.pax}`,
      `Total Fare: ${fmtINR(calc.clientTotal)}`,
      form.notes && `\nNote: ${form.notes}`,
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Quote copied to clipboard!");
  };

  const handleReset = () => {
    setForm({
      serviceType: "flight",
      baseFare: "",
      markupType: "flat",
      markupValue: "",
      clientName: "",
      route: "",
      travelDate: "",
      pax: "1",
      notes: "",
    });
    setShowQuote(false);
  };

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display">Quote Calculator</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Markup is set centrally by Tramps Aviation admin (see card below).
            Use the calculator to generate client quotes.
          </p>
        </div>
        <button onClick={handleReset}
          className="flex items-center gap-2 h-9 px-4 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
          <RefreshCw className="h-4 w-4" /> Reset
        </button>
      </div>

      {/* ── Admin-controlled markup configuration (read-only) ──────────────
          Markup is no longer agent-editable. This card surfaces the live
          admin config so agents can verify what's being added to their
          quotes for Flights / Hotels / Series Fares.
      */}
      <MarkupSettings />

      <div className="grid lg:grid-cols-5 gap-6">

        {/* ── Left: Input form ─────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-5">

          {/* Service type */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <h3 className="font-bold text-sm">Service Type</h3>
            <div className="grid grid-cols-3 gap-2">
              {(["flight", "hotel", "insurance"] as ServiceType[]).map(type => {
                const Icon = serviceIcons[type];
                return (
                  <button key={type} onClick={() => setForm(f => ({ ...f, serviceType: type }))}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-semibold capitalize",
                      form.serviceType === type
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    )}>
                    <Icon className="h-5 w-5" />
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fare inputs */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-sm">Fare Details</h3>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Base Fare (Supplier Price) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">₹</span>
                <input type="number" min="0" placeholder="e.g. 8500"
                  value={form.baseFare}
                  onChange={e => setForm(f => ({ ...f, baseFare: e.target.value }))}
                  className="w-full pl-8 pr-4 h-11 rounded-xl border border-border bg-background text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none font-semibold text-lg" />
              </div>
            </div>

            {/* Markup type toggle */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Markup Type</label>
              <div className="flex gap-2">
                {([
                  { key: "flat", label: "Flat Amount (₹)" },
                  { key: "percent", label: "Percentage (%)" },
                ] as { key: MarkupType; label: string }[]).map(({ key, label }) => (
                  <button key={key} onClick={() => setForm(f => ({ ...f, markupType: key, markupValue: "" }))}
                    className={cn(
                      "flex-1 h-10 rounded-xl border-2 text-xs font-semibold transition-all",
                      form.markupType === key
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    )}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Markup value */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {form.markupType === "flat" ? "Markup Amount (₹)" : "Markup Percentage (%)"}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">
                  {form.markupType === "flat" ? "₹" : "%"}
                </span>
                <input type="number" min="0"
                  placeholder={form.markupType === "flat" ? "e.g. 500" : "e.g. 5"}
                  value={form.markupValue}
                  onChange={e => setForm(f => ({ ...f, markupValue: e.target.value }))}
                  className="w-full pl-8 pr-4 h-11 rounded-xl border border-border bg-background text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none font-semibold" />
              </div>
              {/* Quick markup presets */}
              <div className="flex gap-2 mt-2">
                {(form.markupType === "flat" ? [100, 200, 500, 1000] : [1, 2, 5, 10]).map(v => (
                  <button key={v} onClick={() => setForm(f => ({ ...f, markupValue: String(v) }))}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                      form.markupValue === String(v)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    )}>
                    {form.markupType === "flat" ? `₹${v}` : `${v}%`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Client quote details */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-sm">Quote Details (for client)</h3>

            {[
              { key: "clientName", label: "Client Name", placeholder: "Rajesh Mehta" },
              { key: "route", label: "Route / Destination", placeholder: "DEL → BOM" },
              { key: "travelDate", label: "Travel Date", type: "date" },
              { key: "pax", label: "No. of Passengers", type: "number", placeholder: "1" },
            ].map(({ key, label, placeholder = "", type = "text" }) => (
              <div key={key} className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">{label}</label>
                <input type={type} placeholder={placeholder}
                  value={(form as any)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full px-3.5 h-10 rounded-xl border border-border bg-background text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" />
              </div>
            ))}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Notes (optional)</label>
              <textarea placeholder="Includes meals, 15kg check-in baggage, free cancellation within 24hrs…"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none" />
            </div>

            <button onClick={handleGenerateQuote} disabled={!form.baseFare}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all">
              <Calculator className="h-4 w-4" />
              Generate Quote
            </button>
          </div>
        </div>

        {/* ── Right: Live breakdown + Quote ─────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Live earnings breakdown */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden sticky top-20">
            <div className="px-4 py-3 border-b border-border bg-emerald-500/5">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                  Your Earnings
                </span>
              </div>
            </div>

            <div className="px-4 py-4 space-y-3">
              {[
                { label: "Base Fare", value: fmtINR(base), muted: true },
                { label: `Your Markup (${form.markupType === "flat" ? `₹${mValue}` : `${mValue}%`})`, value: `+${fmtINR(calc.markup)}`, positive: true },
                { label: "Client Pays", value: fmtINR(calc.clientTotal), bold: true, divider: true },
                { label: `Commission (${commissionPct}%)`, value: `+${fmtINR(calc.agentCommission)}`, positive: true },
                { label: `GST on Comm (${gstPct}%)`, value: `-${fmtINR(calc.gstOnComm)}`, negative: true },
              ].map(({ label, value, muted, positive, negative, bold, divider }) => (
                <div key={label}>
                  {divider && <div className="border-t border-dashed border-border my-2" />}
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("text-xs truncate", muted ? "text-muted-foreground" : bold ? "font-semibold text-foreground" : "text-foreground")}>
                      {label}
                    </span>
                    <span className={cn(
                      "text-xs font-semibold whitespace-nowrap flex-shrink-0",
                      positive ? "text-emerald-600 dark:text-emerald-400"
                        : negative ? "text-red-500"
                        : bold ? "font-bold text-foreground"
                        : "text-muted-foreground"
                    )}>
                      {value}
                    </span>
                  </div>
                </div>
              ))}

              {/* Net earning highlight */}
              <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between">
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Net Earning</span>
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {fmtINR(calc.netEarning)}
                </span>
              </div>
            </div>
          </div>

          {/* Generated quote card */}
          {showQuote && (
            <div className="bg-card border-2 border-primary/30 rounded-2xl overflow-hidden print:border-gray-300">
              <div className="px-4 py-3 bg-primary text-primary-foreground flex items-center justify-between print:bg-gray-800">
                <span className="font-bold text-sm">Client Quote</span>
                <div className="flex gap-1.5 print:hidden">
                  <button onClick={handleCopyQuote}
                    className="h-7 w-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center" title="Copy">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={handlePrint}
                    className="h-7 w-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center" title="Print">
                    <Printer className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="px-4 py-4 space-y-3 text-sm">
                {form.clientName && (
                  <div>
                    <p className="text-xs text-muted-foreground">Prepared for</p>
                    <p className="font-bold text-foreground">{form.clientName}</p>
                  </div>
                )}

                {form.route && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {form.serviceType === "flight" ? "Route" : "Destination"}
                    </p>
                    <p className="font-semibold">{form.route}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {form.travelDate && (
                    <div>
                      <p className="text-xs text-muted-foreground">Travel Date</p>
                      <p className="font-semibold">
                        {new Date(form.travelDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  )}
                  {form.pax && (
                    <div>
                      <p className="text-xs text-muted-foreground">Passengers</p>
                      <p className="font-semibold">{form.pax} Pax</p>
                    </div>
                  )}
                </div>

                <div className="border-t border-dashed border-border pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Total Fare</span>
                    <span className="text-2xl font-black text-primary">{fmtINR(calc.clientTotal)}</span>
                  </div>
                  {parseInt(form.pax) > 1 && (
                    <p className="text-xs text-muted-foreground text-right mt-0.5">
                      {fmtINR(Math.round(calc.clientTotal / parseInt(form.pax)))} per person
                    </p>
                  )}
                </div>

                {form.notes && (
                  <div className="bg-muted/40 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">Includes</p>
                    <p className="text-xs text-foreground leading-relaxed">{form.notes}</p>
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Valid for 24 hours from time of quote</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
