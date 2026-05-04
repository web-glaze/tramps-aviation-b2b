"use client";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/store";
import { agentApi, authApi, unwrap } from "@/lib/api/services";
import {
  User,
  Shield,
  Save,
  Loader2,
  KeyRound,
  Building2,
  Phone,
  Mail,
  Eye,
  EyeOff,
  Copy,
  Check,
  MapPin,
  BadgeCheck,
  Wallet,
  Plane,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

const STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Chandigarh",
  "Puducherry",
];

type Tab = "profile" | "security";

export default function B2BProfilePage() {
  const { token, user, setAuth } = useAuthStore();
  const [tab, setTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    contactPerson: "",
    alternatePhone: "",
    city: "",
    state: "",
    pincode: "",
    address: "",
  });
  const [pwd, setPwd] = useState({ current: "", newPwd: "", confirm: "" });
  const [showPwd, setShowPwd] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [changingPwd, setChangingPwd] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await agentApi.getProfile();
      const d = unwrap(res) as any;
      const p = d?.agent || d;
      setProfile(p);
      setForm({
        contactPerson: p.contactPerson || "",
        alternatePhone: p.alternatePhone || "",
        city: p.city || "",
        state: p.state || "",
        pincode: p.pincode || "",
        address: p.address || "",
      });
    } catch {
      /* use store */
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await agentApi.updateProfile(form);
      const d = unwrap(res) as any;
      setProfile(d?.agent || d);
      if (user) setAuth({ ...user, ...form }, token!);
      toast.success("Profile updated successfully");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (pwd.newPwd.length < 8) return toast.error("Min 8 characters");
    if (pwd.newPwd !== pwd.confirm) return toast.error("Passwords don't match");
    if (!pwd.current) return toast.error("Enter current password");
    if (pwd.current === pwd.newPwd)
      return toast.error("New password must be different");
    setChangingPwd(true);
    try {
      await authApi.changePassword({
        currentPassword: pwd.current,
        newPassword: pwd.newPwd,
      });
      toast.success("Password changed successfully");
      setPwd({ current: "", newPwd: "", confirm: "" });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to change password");
    } finally {
      setChangingPwd(false);
    }
  };

  const copyAgentId = () => {
    const id = data.agentId;
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    toast.success(`Agent ID ${id} copied!`);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const data = profile || user || {};

  const kycColor =
    data.kycStatus === "approved"
      ? "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-500/20"
      : data.kycStatus === "submitted"
        ? "bg-primary/10 text-primary border-primary/20"
        : data.kycStatus === "rejected"
          ? "bg-red-500/10 text-red-600 border-red-200"
          : "bg-amber-500/10 text-amber-600 border-amber-200";

  const inp =
    "w-full h-11 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-muted-foreground";
  const lbl =
    "text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5";
  const readonlyField =
    "flex items-center gap-2.5 h-11 px-4 rounded-xl border border-border bg-muted/30 text-sm text-foreground";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">My Profile</h1>
          <p className="text-sm text-muted-foreground">
            Manage your account and security settings
          </p>
        </div>
        <button
          onClick={loadProfile}
          className="h-9 w-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* ── Hero card — Agent ID + avatar ── */}
      <div className="relative overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground shadow-sm">
        {/* Decorative blobs */}
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -right-2 bottom-0 h-20 w-20 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute left-1/2 -bottom-10 h-28 w-28 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative flex flex-col gap-5 md:flex-row md:items-center">
          {/* Avatar */}
          <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-black flex-shrink-0">
            {(data.agencyName || data.name || "A")[0].toUpperCase()}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-xl leading-tight truncate">
              {data.agencyName || data.name || "—"}
            </p>
            <p className="text-sm text-primary-foreground/70 mt-0.5">
              {data.email}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span
                className={cn(
                  "text-[11px] font-bold px-2.5 py-0.5 rounded-full border",
                  data.kycStatus === "approved"
                    ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/30"
                    : "bg-white/10 text-white/70 border-white/20",
                )}
              >
                {data.kycStatus === "approved"
                  ? "✓ KYC Approved"
                  : `KYC ${data.kycStatus || "pending"}`}
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/20">
                {data.status || "inactive"}
              </span>
            </div>
          </div>

          {/* Agent ID pill */}
          {data.agentId && (
            <div className="flex-shrink-0 text-right hidden sm:block">
              <p className="text-[10px] font-bold text-primary-foreground/60 uppercase tracking-widest mb-1">
                Agent ID
              </p>
              <button
                onClick={copyAgentId}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-black text-sm transition-all",
                  copiedId
                    ? "bg-emerald-500 text-white"
                    : "bg-white/20 hover:bg-white/30 text-white",
                )}
              >
                {copiedId ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {data.agentId}
              </button>
              <p className="text-[10px] text-primary-foreground/50 mt-1">
                Click to copy
              </p>
            </div>
          )}
        </div>

        {/* Mobile Agent ID */}
        {data.agentId && (
          <div className="relative mt-4 pt-4 border-t border-white/15 flex items-center justify-between sm:hidden">
            <div>
              <p className="text-[10px] text-primary-foreground/60 font-bold uppercase tracking-widest">
                Agent ID
              </p>
              <p className="font-mono font-black text-lg">{data.agentId}</p>
            </div>
            <button
              onClick={copyAgentId}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold transition-all",
                copiedId
                  ? "bg-emerald-500 text-white"
                  : "bg-white/20 hover:bg-white/30 text-white",
              )}
            >
              {copiedId ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ── Quick stats ── */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[
          {
            label: "Wallet Balance",
            value: `₹${(data.walletBalance || 0).toLocaleString("en-IN")}`,
            icon: Wallet,
            color: "text-primary",
            bg: "bg-primary/10",
            href: "/b2b/wallet",
          },
          {
            label: "Total Bookings",
            value: data.totalBookings ?? "—",
            icon: Plane,
            color: "text-amber-500",
            bg: "bg-amber-500/10",
            href: "/b2b/bookings",
          },
          {
            label: "Commission",
            value: data.totalCommission
              ? `₹${Number(data.totalCommission).toLocaleString("en-IN")}`
              : "—",
            icon: TrendingUp,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            href: "/b2b/commission",
          },
        ].map(({ label, value, icon: Icon, color, bg, href }) => (
          <Link
            href={href}
            key={label}
            className="bg-card border border-border rounded-2xl p-4 hover:border-primary/30 hover:shadow-sm transition-all group"
          >
            <div
              className={cn(
                "h-9 w-9 rounded-xl flex items-center justify-center mb-3",
                bg,
              )}
            >
              <Icon className={cn("h-4 w-4", color)} />
            </div>
            <p className={cn("text-lg font-bold", color)}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </Link>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 bg-muted/60 rounded-xl w-fit">
        {(
          [
            { key: "profile", label: "Profile", icon: User },
            { key: "security", label: "Security", icon: Shield },
          ] as any[]
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as Tab)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              tab === key
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {/* ── Profile Tab ── */}
      {tab === "profile" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Read-only section */}
              <div className="px-6 py-5 border-b border-border">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
                  Account Information
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className={lbl}>Agency Name</label>
                    <div className={readonlyField}>
                      <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{data.agencyName || "—"}</span>
                    </div>
                  </div>
                  <div>
                    <label className={lbl}>Agent ID</label>
                    <button
                      onClick={copyAgentId}
                      className="w-full flex items-center justify-between h-11 px-4 rounded-xl border border-primary/30 bg-primary/5 text-sm font-mono font-bold text-primary hover:bg-primary/10 transition-all"
                    >
                      <span>{data.agentId || "Not assigned"}</span>
                      {data.agentId &&
                        (copiedId ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 opacity-50" />
                        ))}
                    </button>
                  </div>
                  <div>
                    <label className={lbl}>Business Email</label>
                    <div className={readonlyField}>
                      <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{data.email || "—"}</span>
                    </div>
                  </div>
                  <div>
                    <label className={lbl}>Primary Phone</label>
                    <div className={readonlyField}>
                      <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span>{data.phone || "—"}</span>
                    </div>
                  </div>
                  <div>
                    <label className={lbl}>GST Number</label>
                    <div className={cn(readonlyField, "font-mono")}>
                      {data.gstNumber || (
                        <span className="text-muted-foreground">
                          Not provided
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className={lbl}>PAN Number</label>
                    <div className={cn(readonlyField, "font-mono")}>
                      {data.panNumber || (
                        <span className="text-muted-foreground">
                          Not provided
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* KYC status */}
              <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-2.5">
                  <BadgeCheck
                    className={cn(
                      "h-5 w-5",
                      data.kycStatus === "approved"
                        ? "text-emerald-500"
                        : "text-muted-foreground",
                    )}
                  />
                  <div>
                    <p className="text-sm font-semibold">KYC Verification</p>
                    <p className="text-xs text-muted-foreground">
                      {data.kycStatus === "approved"
                        ? "Your account is fully verified"
                        : data.kycStatus === "submitted"
                          ? "Under review by admin"
                          : data.kycStatus === "rejected"
                            ? "Verification was rejected"
                            : "Not yet submitted"}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "text-xs font-bold px-3 py-1 rounded-full border",
                    kycColor,
                  )}
                >
                  {data.kycStatus || "pending"}
                </span>
              </div>

              {/* Editable section */}
              <div className="px-6 py-5 space-y-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Editable Details
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className={lbl}>Contact Person</label>
                    <input
                      value={form.contactPerson}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          contactPerson: e.target.value,
                        }))
                      }
                      placeholder="Your name"
                      className={inp}
                    />
                  </div>
                  <div>
                    <label className={lbl}>Alternate Phone</label>
                    <input
                      value={form.alternatePhone}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          alternatePhone: e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 10),
                        }))
                      }
                      placeholder="Optional"
                      inputMode="numeric"
                      className={inp}
                    />
                  </div>
                  <div>
                    <label className={lbl}>Pincode</label>
                    <input
                      value={form.pincode}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          pincode: e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 6),
                        }))
                      }
                      placeholder="400001"
                      inputMode="numeric"
                      className={inp}
                    />
                  </div>
                  <div>
                    <label className={lbl}>City</label>
                    <input
                      value={form.city}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, city: e.target.value }))
                      }
                      placeholder="Mumbai"
                      className={inp}
                    />
                  </div>
                  <div>
                    <label className={lbl}>State</label>
                    <select
                      value={form.state}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, state: e.target.value }))
                      }
                      className={cn(inp, "cursor-pointer")}
                    >
                      <option value="">Select State</option>
                      {STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className={lbl}>Full Address</label>
                    <input
                      value={form.address}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, address: e.target.value }))
                      }
                      placeholder="Shop 12, ABC Building, Street..."
                      className={inp}
                    />
                  </div>
                </div>
              </div>

              {/* Save button */}
              <div className="px-6 pb-6">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60 transition-all shadow-sm hover:shadow-md hover:shadow-primary/20"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Security Tab ── */}
      {tab === "security" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-border bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <KeyRound className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Change Password</p>
                <p className="text-xs text-muted-foreground">
                  Use a strong password with 8+ characters
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-4">
            {[
              {
                key: "current",
                label: "Current Password",
                show: showPwd.current,
                toggle: () =>
                  setShowPwd((s) => ({ ...s, current: !s.current })),
              },
              {
                key: "newPwd",
                label: "New Password",
                show: showPwd.new,
                toggle: () => setShowPwd((s) => ({ ...s, new: !s.new })),
              },
              {
                key: "confirm",
                label: "Confirm New Password",
                show: showPwd.confirm,
                toggle: () =>
                  setShowPwd((s) => ({ ...s, confirm: !s.confirm })),
              },
            ].map(({ key, label, show, toggle }) => (
              <div key={key}>
                <label className={lbl}>{label}</label>
                <div className="relative">
                  <input
                    type={show ? "text" : "password"}
                    value={(pwd as any)[key]}
                    onChange={(e) =>
                      setPwd((p) => ({ ...p, [key]: e.target.value }))
                    }
                    placeholder={
                      key === "current"
                        ? "Current password"
                        : "Min 8 characters"
                    }
                    className={cn(inp, "pr-11")}
                  />
                  <button
                    type="button"
                    onClick={toggle}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {show ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}

            {pwd.confirm && pwd.newPwd !== pwd.confirm && (
              <p className="text-xs text-red-500 flex items-center gap-1.5">
                <span className="text-base">✗</span> Passwords don&apos;t match
              </p>
            )}
            {pwd.newPwd && pwd.newPwd === pwd.confirm && pwd.confirm && (
              <p className="text-xs text-emerald-600 flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" /> Passwords match
              </p>
            )}

            <button
              onClick={handlePasswordChange}
              disabled={
                changingPwd ||
                !pwd.current ||
                !pwd.newPwd ||
                pwd.newPwd !== pwd.confirm
              }
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60 transition-all shadow-sm mt-2"
            >
              {changingPwd ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Changing…
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  Change Password
                </>
              )}
            </button>
          </div>

          {/* Security tips */}
          <div className="px-6 pb-6">
            <div className="bg-muted/40 rounded-xl p-4 border border-border space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                Security Tips
              </p>
              {[
                "Use at least 8 characters with a mix of letters and numbers",
                "Never share your Agent ID or password with anyone",
                "Log out from shared devices after use",
              ].map((tip) => (
                <p
                  key={tip}
                  className="text-xs text-muted-foreground flex items-start gap-2"
                >
                  <Shield className="h-3 w-3 text-primary flex-shrink-0 mt-0.5" />
                  {tip}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
