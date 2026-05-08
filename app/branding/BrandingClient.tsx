"use client";

import { useEffect, useState } from "react";
import {
  Upload,
  Image as ImageIcon,
  Save,
  Eye,
  Plane,
  Lock,
  Sparkles,
  Trash2,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { agentApi, unwrap } from "@/lib/api/services";

/**
 * White-label branding settings — admin-controlled feature for KYC-approved
 * agents who want their own logo / agency name on tickets and itineraries
 * sent to their clients.
 *
 * Backend contract (TODO):
 *   GET  /api/agents/branding          → { logoUrl, agencyName, supportPhone, supportEmail, primaryColor, isActive }
 *   PUT  /api/agents/branding          body: same shape
 *   POST /api/uploads/agent-logo       form-data: file → returns { url }
 *
 * Until those land, this page persists locally so agents can preview the
 * flow. Uploaded logo is stored as a data-URL in localStorage (good enough
 * for preview; real uploads go to S3 once the API is live).
 */
interface BrandingState {
  logoUrl: string;
  agencyName: string;
  supportPhone: string;
  supportEmail: string;
  primaryColor: string;
  websiteUrl: string;
  taglineText: string;
  isActive: boolean;
}

const DEFAULT: BrandingState = {
  logoUrl: "",
  agencyName: "",
  supportPhone: "",
  supportEmail: "",
  primaryColor: "#208dcb",
  websiteUrl: "",
  taglineText: "Your trusted travel partner",
  isActive: false,
};

const STORAGE_KEY = "tp-agent-branding";

export default function BrandingClient() {
  const [form, setForm] = useState<BrandingState>(DEFAULT);
  const [agentProfile, setAgentProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(false);

  // Helper — derive a sensible default branding from the agent's own
  // profile so a brand-new agent doesn't see empty fields. They can still
  // edit any of these.
  const buildDefaultsFromAgent = (agent: any): Partial<BrandingState> => {
    if (!agent) return {};
    return {
      agencyName: agent.agencyName || agent.contactPerson || "",
      supportPhone: agent.phone || agent.mobile || "",
      supportEmail: agent.email || "",
      websiteUrl: agent.website || "",
    };
  };

  // Load — backend first, fallback to localStorage so the page doesn't
  // look empty before the API ships. Whatever's missing is filled in
  // from the agent's profile (so phone / email / agency name auto-show).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 1) Fetch the agent profile in parallel so we have defaults to merge
      let agent: any = null;
      try {
        const res = await agentApi.getProfile();
        agent = unwrap(res);
        agent = agent?.agent || agent;
        if (!cancelled) setAgentProfile(agent);
      } catch {
        /* keep agent null */
      }

      // 2) Read whatever we've saved locally first — we'll layer the
      //    backend response on top, but localStorage is also our
      //    fallback for fields the backend forgets to echo back (the
      //    most common offender being `isActive`, which was making the
      //    toggle flip OFF on every navigation).
      let local: Partial<BrandingState> = {};
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) local = JSON.parse(raw);
      } catch {
        /* ignore */
      }

      // 3) Try fetching saved branding from the backend
      try {
        const apiBase =
          process.env.NEXT_PUBLIC_API_URL ||
          "https://api.trampsaviation.com/api";
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("auth_token") ||
              localStorage.getItem("agent_token")
            : null;
        const res = await fetch(`${apiBase}/agents/branding`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok && !cancelled) {
          const json = await res.json();
          const d = json?.data || json;
          if (d?.agencyName) {
            // Merge order matters:
            //   DEFAULT          (false-y baseline)
            //   agent profile    (auto-pulled name/phone/email)
            //   backend response (server-side text fields)
            //   local            (the SOURCE OF TRUTH — wins last)
            //
            // We deliberately let local win over the backend response.
            // The backend's branding endpoint is unreliable about
            // round-tripping `isActive` (it sometimes returns false or
            // omits the field entirely), and we don't want a stale
            // server response stomping the toggle the user just turned
            // on. localStorage is mirrored on every form change below,
            // so it always reflects the user's most recent intent.
            const merged: BrandingState = {
              ...DEFAULT,
              ...buildDefaultsFromAgent(agent),
              ...d,
              ...local,
            };
            setForm(merged);
            setLoading(false);
            return;
          }
        }
      } catch {
        /* fall through */
      }

      // 4) Fall back to localStorage, again merged on top of agent defaults
      if (!cancelled) {
        setForm({
          ...DEFAULT,
          ...buildDefaultsFromAgent(agent),
          ...local,
        });
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-mirror to localStorage on every form change. Two reasons:
  //
  //   1. The toggle was flipping to inactive on revisit because the
  //      backend GET sometimes returns the record without `isActive`,
  //      and there was no local copy to fall back on if the user hadn't
  //      hit "Save". Now every keystroke / click is mirrored so the
  //      next mount restores exactly what the user last did.
  //   2. The user's intent shouldn't be lost because they navigated
  //      away mid-edit — we can recover it on return.
  //
  // We skip the very first render (while `loading` is true) so we
  // don't immediately overwrite localStorage with the loading-state
  // form before the load merge has finished.
  useEffect(() => {
    if (loading) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {
      /* ignore quota errors */
    }
  }, [form, loading]);

  // Manual "reset to my profile" — clears overrides and re-pulls from the
  // logged-in agent.
  const resetToProfileDefaults = () => {
    if (!agentProfile) return;
    setForm((f) => ({
      ...f,
      ...buildDefaultsFromAgent(agentProfile),
    }));
    toast.success("Reset to your agent profile");
  };

  const set = <K extends keyof BrandingState>(k: K, v: BrandingState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2 MB");
      return;
    }
    if (!/^image\//.test(file.type)) {
      toast.error("Only image files allowed");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set("logoUrl", String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!form.agencyName.trim()) {
      toast.error("Agency name is required");
      return;
    }
    setSaving(true);

    // Always write to localStorage first. The backend may not echo every
    // field back on the next GET (the recurring offender is `isActive`,
    // which would make the toggle flip OFF every time the user navigates
    // away and returns). Mirroring locally guarantees the toggle / tagline
    // / colour survive a round-trip even when the backend forgets them.
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {
      /* ignore quota errors */
    }

    try {
      const apiBase =
        process.env.NEXT_PUBLIC_API_URL ||
        "https://api.trampsaviation.com/api";
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("auth_token") ||
            localStorage.getItem("agent_token")
          : null;
      const res = await fetch(`${apiBase}/agents/branding`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Branding saved — tickets will reflect on your next booking");
    } catch {
      // Backend not ready — the localStorage write above already happened
      // so the agent's preview stays correct on revisit.
      toast.success("Saved locally (backend will sync once available)");
    } finally {
      setSaving(false);
    }
  };

  const removeLogoFn = () => set("logoUrl", "");

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-300/50 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-widest">
          <Sparkles className="h-3 w-3" /> Premium feature
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight mt-3">
          White-label branding
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
          Upload your agency logo and details — we&apos;ll print them on every
          ticket, itinerary and PDF voucher sent to your clients. Your clients
          see <strong>your brand</strong>, not Tramps Aviation.
        </p>
      </div>

      {/* Activation toggle */}
      <div className="card-base p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center",
              form.isActive
                ? "bg-emerald-500/15 text-emerald-600"
                : "bg-muted text-muted-foreground",
            )}
          >
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-sm">
              White-label is{" "}
              <span
                className={
                  form.isActive
                    ? "text-emerald-600"
                    : "text-muted-foreground"
                }
              >
                {form.isActive ? "Active" : "Inactive"}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {form.isActive
                ? "Tickets are being sent with your branding."
                : "Toggle on to start branding. KYC verification required."}
            </p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
            className="sr-only peer"
          />
          <span className="w-12 h-6 bg-muted rounded-full peer-focus:ring-2 peer-focus:ring-primary/40 peer-checked:bg-emerald-500 transition-all" />
          <span className="absolute left-0.5 top-0.5 h-5 w-5 bg-white rounded-full shadow transform peer-checked:translate-x-6 transition-all" />
        </label>
      </div>

      <div className="grid lg:grid-cols-[1fr,420px] gap-6">
        {/* ── Left: form ─────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Logo */}
          <div className="card-base p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Agency Logo
              </p>
              {form.logoUrl && (
                <button
                  onClick={removeLogoFn}
                  className="text-xs font-semibold text-rose-500 hover:text-rose-600 inline-flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              )}
            </div>
            {form.logoUrl ? (
              <div className="relative h-24 w-full rounded-xl bg-muted/40 border border-border flex items-center justify-center overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.logoUrl}
                  alt="Logo preview"
                  className="max-h-20 max-w-[80%] object-contain"
                />
              </div>
            ) : (
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={onLogoUpload}
                  className="hidden"
                />
                <div className="h-24 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 cursor-pointer flex flex-col items-center justify-center gap-1.5 transition-all">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <p className="text-xs font-semibold text-muted-foreground">
                    Click to upload (PNG / JPG · max 2 MB)
                  </p>
                </div>
              </label>
            )}
          </div>

          {/* Text fields */}
          <div className="card-base p-5 space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Agency details
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-semibold mb-1 block">
                  Agency name *
                </label>
                <input
                  value={form.agencyName}
                  onChange={(e) => set("agencyName", e.target.value)}
                  placeholder="Sharma Travels Pvt. Ltd."
                  className="input-base"
                />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block">
                  Support phone
                </label>
                <input
                  value={form.supportPhone}
                  onChange={(e) => set("supportPhone", e.target.value)}
                  placeholder="+91 98765 43210"
                  className="input-base"
                />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block">
                  Support email
                </label>
                <input
                  type="email"
                  value={form.supportEmail}
                  onChange={(e) => set("supportEmail", e.target.value)}
                  placeholder="hello@agency.com"
                  className="input-base"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold mb-1 block">
                  Website (optional)
                </label>
                <input
                  type="url"
                  value={form.websiteUrl}
                  onChange={(e) => set("websiteUrl", e.target.value)}
                  placeholder="https://yourtravels.com"
                  className="input-base"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold mb-1 block">
                  Tagline
                </label>
                <input
                  value={form.taglineText}
                  onChange={(e) => set("taglineText", e.target.value)}
                  placeholder="Your trusted travel partner"
                  className="input-base"
                  maxLength={50}
                />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block">
                  Primary colour
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.primaryColor}
                    onChange={(e) => set("primaryColor", e.target.value)}
                    className="h-10 w-14 rounded-lg border border-border cursor-pointer bg-transparent"
                  />
                  <input
                    value={form.primaryColor}
                    onChange={(e) => set("primaryColor", e.target.value)}
                    className="input-base font-mono uppercase flex-1"
                    maxLength={7}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="btn-primary px-5 py-2.5 text-sm font-bold disabled:opacity-60 flex-1"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Saving…" : "Save branding"}
            </button>
            <button
              onClick={() => setPreview((p) => !p)}
              className="btn-outline px-5 py-2.5 text-sm font-bold"
            >
              <Eye className="h-4 w-4" /> {preview ? "Hide" : "Preview"}
            </button>
            {agentProfile && (
              <button
                onClick={resetToProfileDefaults}
                title="Re-pull name / phone / email from your agent profile"
                className="btn-outline px-3 py-2.5 text-xs font-semibold"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
            )}
          </div>
          {agentProfile && (
            <p className="text-[11px] text-muted-foreground -mt-1">
              <Sparkles className="h-3 w-3 inline mr-1 text-primary" />
              Defaults pulled from your agent profile. Edit any field above
              to override; tap &quot;Reset&quot; to re-pull.
            </p>
          )}
        </div>

        {/* ── Right: live ticket preview ──────────────────── */}
        <div className="lg:sticky lg:top-20 h-fit">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Live ticket preview
          </p>
          <TicketPreview branding={form} />
        </div>
      </div>

      {/* Live full-page preview overlay */}
      {preview && (
        <div className="fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold">Full ticket preview</p>
              <button
                onClick={() => setPreview(false)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
            <TicketPreview branding={form} large />
          </div>
        </div>
      )}
    </div>
  );
}

function TicketPreview({
  branding,
  large,
}: {
  branding: BrandingState;
  large?: boolean;
}) {
  const accent = branding.primaryColor || "#208dcb";
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-white text-slate-900 shadow-md overflow-hidden",
        large ? "p-6" : "p-4",
      )}
    >
      <div
        className="px-4 py-3 -mx-4 -mt-4 mb-3 flex items-center gap-3"
        style={{ background: accent, color: "white" }}
      >
        {branding.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={branding.logoUrl}
            alt="Logo"
            className="h-8 max-w-[120px] object-contain bg-white rounded p-0.5"
          />
        ) : (
          <div className="h-8 w-8 bg-white/20 rounded flex items-center justify-center">
            <ImageIcon className="h-4 w-4" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">
            {branding.agencyName || "Your agency name"}
          </p>
          <p className="text-[10px] opacity-90 truncate">
            {branding.taglineText || "Your trusted travel partner"}
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-widest font-bold opacity-80">
          E-Ticket
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Plane className="h-4 w-4 text-slate-400" />
          <div>
            <p className="text-xs text-slate-500">Sample passenger</p>
            <p className="font-bold">Mr. Sandeep Kumar</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 py-3 border-y border-slate-200">
          <div>
            <p className="text-[9px] uppercase tracking-wider text-slate-500">
              From
            </p>
            <p className="text-lg font-black">DEL</p>
            <p className="text-[10px] text-slate-500">06:00</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-slate-500 uppercase">2h 10m</p>
            <Plane className="h-3 w-3 mx-auto" style={{ color: accent }} />
            <p className="text-[10px] text-slate-500">Non-stop</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-wider text-slate-500">
              To
            </p>
            <p className="text-lg font-black">BOM</p>
            <p className="text-[10px] text-slate-500">08:10</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-slate-500">PNR</p>
            <p className="font-mono font-bold">AB1234</p>
          </div>
          <div>
            <p className="text-slate-500">Total</p>
            <p className="font-bold" style={{ color: accent }}>
              ₹6,499
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-200 text-[10px] text-slate-500">
        <p>
          Issues? Contact{" "}
          <strong>
            {branding.supportPhone || "+91 ..."}
          </strong>{" "}
          ·{" "}
          <strong>
            {branding.supportEmail || "support@youragency.com"}
          </strong>
        </p>
        {branding.websiteUrl && (
          <p className="mt-0.5">{branding.websiteUrl}</p>
        )}
        <p className="mt-1 opacity-60">
          Powered by Tramps Aviation · IATA accredited
        </p>
      </div>
    </div>
  );
}
