"use client";

/**
 * AgentShell — auth guard + chrome wrapper for the agent portal.
 *
 * Replaces the old `app/b2b/layout.tsx` now that `/b2b/*` has been
 * flattened to the root. Behaviour is the same as before:
 *
 *   - Unauthenticated visitors on protected pages are bounced to /login.
 *   - Logged-in agents whose KYC is still pending are bounced to /kyc.
 *     We re-check KYC against the API once on mount because the store
 *     can hold a stale "submitted" status even after admin approval.
 *   - Public pages (login / register / forgot-password / kyc / CMS) are
 *     rendered without the agent header + footer chrome.
 *   - Logged-in agents on protected pages get the full app shell:
 *     OfflineBanner, Header, Footer, error boundary, content container.
 */

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { agentApi, unwrap } from "@/lib/api/services";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { OfflineBanner } from "@/components/shared/OfflineBanner";

// Auth-flow pages — fully public, no Header/Footer chrome.
const AUTH_PAGES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

// Marketing / CMS pages — public, but they bring their own
// PublicPageChrome wrapper inside the page so we just render children.
const CMS_PAGES = ["/about", "/faq", "/privacy", "/terms", "/refund"];

// KYC page — semi-public: requires login but allows un-approved agents.
const KYC_PREFIX = "/kyc";

function isAuthPage(pathname: string) {
  return AUTH_PAGES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

function isCmsPage(pathname: string) {
  return CMS_PAGES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function AgentShell({ children }: { children: React.ReactNode }) {
  const { user, role, isAuthenticated, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  const onAuthPage = isAuthPage(pathname);
  const onCmsPage = isCmsPage(pathname);
  const onKycPage = pathname.startsWith(KYC_PREFIX);
  const onRoot = pathname === "/";

  // Skip the auth guard entirely for fully-public surfaces.
  const skipGuard = onAuthPage || onCmsPage || onRoot;

  useEffect(() => {
    if (!_hasHydrated) return;

    if (skipGuard || onKycPage) {
      setChecked(true);
      return;
    }

    // ── Authenticate ──────────────────────────────────────────────────────
    //
    // Pre-fix bug ("redirected to /login forever after clicking Go to
    // Dashboard"): we used to bounce to /login whenever zustand's
    // `isAuthenticated` was false even if a fresh JWT existed in
    // localStorage. Zustand's persist middleware sometimes flips
    // `_hasHydrated` to true *before* the rehydrated `isAuthenticated`
    // value reaches React, so the gate read stale `false` and redirected,
    // which then re-rendered the dashboard, which redirected again…
    //
    // The new rule: trust localStorage as the source of truth for
    // "is there an auth token?". The role check only fires when the
    // store explicitly says role is something OTHER than "agent" — a
    // null/undefined role is treated as "probably-an-agent, trust the
    // token". The API will 401 us out anyway if the token is invalid.
    const localToken =
      typeof window !== "undefined"
        ? localStorage.getItem("auth_token") ||
          localStorage.getItem("agent_token")
        : null;
    const hasAuth = isAuthenticated || !!localToken;

    if (!hasAuth) {
      const next =
        pathname && pathname !== "/login"
          ? `/login?redirect=${encodeURIComponent(pathname)}`
          : "/login";
      router.replace(next);
      return;
    }
    // Reject only customers explicitly logged in as B2C — never bounce
    // when role is null/undefined because that's most often a hydration
    // race (token's there, role hasn't propagated yet).
    if (role === "customer") {
      router.replace("/login");
      return;
    }

    // ── KYC gate ──────────────────────────────────────────────────────────
    // Skip when there's no user object yet (race) — we'll re-check after
    // hydration when the user data lands.
    if (!user) {
      setChecked(true);
      return;
    }

    const kycStatus = user?.kycStatus || user?.status || "";
    const kycApproved = kycStatus === "approved" || kycStatus === "active";

    if (!kycApproved) {
      // Re-check status against the API in case the store is stale.
      agentApi
        .getKycStatus()
        .then((res: any) => {
          const data = unwrap(res) as any;
          const raw =
            data?.kycStatus || data?.kyc?.status || data?.agentStatus || "";
          const freshApproved = raw === "approved" || raw === "active";
          if (freshApproved) {
            const { setAuth, token } = useAuthStore.getState();
            if (user && token) {
              setAuth(
                { ...user, kycStatus: "approved", status: "active" },
                token,
              );
            }
            setChecked(true);
          } else {
            router.replace("/kyc");
          }
        })
        .catch(() => {
          // On API failure, prefer NOT redirecting to /kyc — that traps
          // approved agents whose KYC API momentarily errored. Render
          // the dashboard; if a real KYC issue exists, the API call
          // inside the page will surface it.
          setChecked(true);
        });
      return;
    }

    setChecked(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_hasHydrated, isAuthenticated, role, pathname, user]);

  // Spinner while we wait for hydration / auth check.
  if (!_hasHydrated || (!checked && !skipGuard && !onKycPage)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Auth pages, CMS pages, KYC, root — render bare children. The pages
  // themselves provide whatever chrome they need (PublicPageChrome,
  // standalone hero, etc.).
  if (skipGuard || onKycPage) return <>{children}</>;

  // Defensive double-check before rendering the protected shell.
  if (
    !isAuthenticated &&
    typeof window !== "undefined" &&
    !localStorage.getItem("auth_token")
  ) {
    return null;
  }

  // Authenticated agent shell — top navbar only, no left sidebar. The
  // padding numbers track the Header's responsive heights:
  //   - mobile (<md): single row (88px)
  //   - md to <xl: two-row nav (104px)
  //   - xl+: collapsed nav (64px)
  return (
    <div className="min-h-screen bg-background">
      <OfflineBanner />
      <Header />
      <main className="pt-[88px] md:pt-[104px] xl:pt-16 min-h-screen flex flex-col">
        <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
        <Footer />
      </main>
    </div>
  );
}
