"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Phone, Shield, Zap } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { authApi, extractToken, extractAgent } from "@/lib/api/services";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { B2BLogo } from "@/components/ui/B2BLogo";

function detectIdentifierType(value: string): string {
  if (value.includes("@")) return "Email";
  if (/^TAHP\d+$/i.test(value.trim())) return "Agent ID";
  if (/^\d{10}$/.test(value.replace(/\D/g, ""))) return "Phone";
  return "Agent ID / Phone";
}

export default function B2BLoginPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated, user, _hasHydrated } = useAuthStore();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [identifierType, setIdentifierType] = useState("Agent ID / Phone");

  // If the user is already signed in when they hit /login (e.g. they
  // navigated here manually or refreshed after a successful login), bounce
  // them to dashboard / KYC. Use a full-page navigation so middleware reads
  // the cookie cleanly instead of getting stuck on the client cache.
  useEffect(() => {
    if (_hasHydrated && isAuthenticated && user?.role === "agent") {
      const kycApproved = user?.kycStatus === "approved" || user?.status === "active";
      window.location.href = kycApproved ? "/dashboard" : "/kyc";
    }
  }, [_hasHydrated, isAuthenticated, user]);

  const handleIdentifierChange = (val: string) => {
    setIdentifier(val);
    setIdentifierType(detectIdentifierType(val));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      toast.error("Please enter your Email, Agent ID, or Phone number");
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.loginAgent({ identifier: identifier.trim(), password });
      const token = extractToken(res);
      const agent = extractAgent(res);
      if (!token) throw new Error("Login failed — no token returned");
      document.cookie = `auth_token=${token}; path=/; max-age=86400; SameSite=Lax`;
      localStorage.setItem("auth_token", token);
      localStorage.setItem("agent_token", token);
      const kycStatus = agent?.kycStatus || "pending";
      setAuth(
        {
          id: agent.id || agent._id,
          name: agent.contactPerson || agent.agencyName,
          email: agent.email,
          role: "agent",
          kycStatus,
          status: agent.status,
          agencyName: agent.agencyName,
          agentId: agent.agentId,
          walletBalance: agent.walletBalance,
          kycRejectionReason: agent.kycRejectionReason,
        } as any,
        token,
      );
      // Use a full-page navigation (window.location) instead of router.push.
      //
      // Why: we just wrote the auth cookie via `document.cookie`. The Edge
      // middleware reads cookies from the *request* — with client-side
      // router.push the in-flight RSC request can race against the cookie
      // commit, the middleware sees no token and bounces us back to /login
      // (which is exactly the bug we were seeing: toast fires, header shows
      // "Go to Dashboard", but the URL stays on /login). A real navigation
      // forces the browser to send the freshly-set cookie in the request
      // headers, so middleware lets us through cleanly.
      if (kycStatus === "approved" || agent.status === "active") {
        toast.success(`Welcome back, ${agent.agencyName}!`);
        window.location.href = "/dashboard";
        return;
      }
      toast.info("Please complete your KYC to activate your account.");
      window.location.href = "/kyc";
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || "";
      if (msg.toLowerCase().includes("suspend")) toast.error("Account suspended. Contact support.");
      else if (msg.toLowerCase().includes("inactive")) toast.error("Account inactive. Contact support.");
      else toast.error(msg || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center p-4 py-8 sm:py-12">
        <div className="w-full max-w-md">
          {/* Brand hero — uses /logo.svg via B2BLogo (auto-falls back if SVG missing) */}
          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center mb-3">
              <B2BLogo size={56} />
            </div>
            <h1 className="font-bold text-2xl text-foreground">Agent Portal</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in to manage bookings & commissions</p>
          </div>

          {/* Feature pills */}
          <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
            {[
              { icon: Zap, text: "Instant Bookings" },
              { icon: Shield, text: "Secure Portal" },
              { icon: Phone, text: "24/7 Support" },
            ].map(({ icon: Icon, text }) => (
              <span key={text} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 border border-border px-2.5 py-1 rounded-full">
                <Icon className="h-3 w-3" />{text}
              </span>
            ))}
          </div>

          {/* Login card */}
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-bold text-foreground mb-1">Sign In</h2>
            <p className="text-sm text-muted-foreground mb-6">Use your Agent ID, Phone, or Email</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                  {identifierType}
                  {identifier && identifierType !== "Agent ID / Phone" && (
                    <span className="ml-2 text-emerald-600 dark:text-emerald-400 normal-case font-medium">✓ {identifierType} detected</span>
                  )}
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => handleIdentifierChange(e.target.value)}
                  required
                  autoFocus
                  autoComplete="username"
                  placeholder="e.g. TAHP00001 / 9876543210"
                  className="w-full bg-background border border-input rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Password</label>
                  <Link href="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
                </div>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="Your password"
                    className="w-full bg-background border border-input rounded-xl px-4 py-3 pr-11 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                  />
                  <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1">
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-primary text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-1"
              >
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</> : "Sign In →"}
              </button>
            </form>

            <div className="mt-5 pt-5 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="text-primary font-semibold hover:underline">Register Agency</Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
