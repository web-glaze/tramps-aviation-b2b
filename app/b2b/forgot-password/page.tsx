"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, CheckCircle, KeyRound, Mail, Shield } from "lucide-react";
import { toast } from "sonner";
import { authApi, unwrap } from "@/lib/api/services";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

type Step = "email" | "otp" | "newpass" | "done";

export default function B2BForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try { await authApi.forgotPassword({ email: email.toLowerCase().trim() }); } catch { /* silent */ }
    finally { setLoading(false); setStep("otp"); toast.success("OTP sent! Check your inbox (and spam folder)."); }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.trim().length !== 6) return toast.error("Enter the 6-digit OTP");
    setStep("newpass");
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd.length < 8) return toast.error("Password must be at least 8 characters");
    if (newPwd !== confirmPwd) return toast.error("Passwords don't match");
    setLoading(true);
    try {
      const res = await authApi.resetPassword({ email: email.toLowerCase().trim(), otp: otp.trim(), newPassword: newPwd });
      const data = unwrap(res) as any;
      if (data?.error) throw new Error(data?.message || "Reset failed");
      setStep("done");
      toast.success("Password reset successfully!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || "Reset failed. The OTP may be wrong or expired.");
    } finally { setLoading(false); }
  };

  const steps = [
    { key: "email", icon: Mail, label: "Email" },
    { key: "otp", icon: Shield, label: "OTP" },
    { key: "newpass", icon: KeyRound, label: "Password" },
  ];
  const stepIdx: Record<Step, number> = { email: 0, otp: 1, newpass: 2, done: 3 };

  const INPUT_CLS = "w-full bg-background border border-input rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all";
  const BTN_CLS = "w-full h-11 bg-primary text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center p-4 py-8 sm:py-12">
        <div className="w-full max-w-sm sm:max-w-md">
          {/* Back link */}
          <div className="mb-5">
            <Link href="/b2b/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
            </Link>
          </div>

          {/* Brand */}
          <div className="text-center mb-7">
            <div className="inline-flex h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center mb-3">
              <KeyRound className="h-6 w-6 text-primary" />
            </div>
            <h1 className="font-bold text-2xl text-foreground">Reset Password</h1>
            <p className="text-sm text-muted-foreground mt-1">We'll send a 6-digit OTP to your email</p>
          </div>

          {/* Step indicator */}
          {step !== "done" && (
            <div className="flex items-center mb-6 px-2">
              {steps.map((s, i) => {
                const done = i < stepIdx[step];
                const active = i === stepIdx[step];
                const Icon = s.icon;
                return (
                  <div key={s.key} className="flex items-center" style={{ flex: i < steps.length - 1 ? 1 : undefined }}>
                    <div className="flex flex-col items-center gap-1">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all ${done ? "bg-emerald-500 border-emerald-500" : active ? "bg-primary border-primary" : "bg-muted border-border"}`}>
                        {done ? <CheckCircle className="h-4 w-4 text-white" /> : <Icon className={`h-3.5 w-3.5 ${active ? "text-primary-foreground" : "text-muted-foreground"}`} />}
                      </div>
                      <span className={`text-xs font-medium ${active ? "text-primary" : done ? "text-emerald-500" : "text-muted-foreground"}`}>{s.label}</span>
                    </div>
                    {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-2 mb-4 transition-all ${done ? "bg-emerald-500" : "bg-border"}`} />}
                  </div>
                );
              })}
            </div>
          )}

          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
            {step === "email" && (
              <>
                <h2 className="text-lg font-bold text-foreground mb-1">Enter your email</h2>
                <p className="text-sm text-muted-foreground mb-5">We'll send a 6-digit code to reset your password.</p>
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Business Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus placeholder="agent@agency.com" className={INPUT_CLS} />
                  </div>
                  <button type="submit" disabled={loading} className={BTN_CLS}>
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending OTP...</> : "Send OTP →"}
                  </button>
                </form>
              </>
            )}

            {step === "otp" && (
              <>
                <h2 className="text-lg font-bold text-foreground mb-1">Enter OTP</h2>
                <p className="text-sm text-muted-foreground mb-5">
                  A 6-digit code was sent to <span className="font-semibold text-foreground">{email}</span>. Check inbox and spam.
                </p>
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">6-Digit OTP</label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      required autoFocus placeholder="••••••" inputMode="numeric"
                      className={`${INPUT_CLS} text-2xl font-mono tracking-[0.75rem] text-center`}
                    />
                  </div>
                  <button type="submit" disabled={otp.length !== 6} className={BTN_CLS}>Verify OTP →</button>
                  <button type="button" onClick={() => { setStep("email"); setOtp(""); }} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-1">
                    ← Resend / Change email
                  </button>
                </form>
              </>
            )}

            {step === "newpass" && (
              <>
                <h2 className="text-lg font-bold text-foreground mb-1">Set new password</h2>
                <p className="text-sm text-muted-foreground mb-5">Choose a strong password of at least 8 characters.</p>
                <form onSubmit={handleReset} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">New Password</label>
                    <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} required autoFocus placeholder="Min 8 characters" className={INPUT_CLS} />
                    {newPwd && newPwd.length < 8 && <p className="text-amber-500 text-xs mt-1">⚠ Min 8 characters</p>}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Confirm Password</label>
                    <input
                      type="password" value={confirmPwd} onChange={(e) => setConfirm(e.target.value)} required placeholder="Re-enter password"
                      className={`${INPUT_CLS} ${confirmPwd && confirmPwd !== newPwd ? "border-red-500 focus:border-red-500" : ""}`}
                    />
                    {confirmPwd && confirmPwd !== newPwd && <p className="text-red-500 text-xs mt-1">❌ Passwords don't match</p>}
                    {confirmPwd && confirmPwd === newPwd && newPwd.length >= 8 && <p className="text-emerald-500 text-xs mt-1">✅ Passwords match</p>}
                  </div>
                  <button type="submit" disabled={loading || newPwd.length < 8 || newPwd !== confirmPwd} className={BTN_CLS}>
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Resetting...</> : "Reset Password →"}
                  </button>
                </form>
              </>
            )}

            {step === "done" && (
              <div className="text-center py-4">
                <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-emerald-500" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">Password Reset!</h2>
                <p className="text-sm text-muted-foreground mb-6">Your password has been updated. You can now sign in with your new password.</p>
                <button onClick={() => router.push("/b2b/login")} className={BTN_CLS}>Go to Login →</button>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
