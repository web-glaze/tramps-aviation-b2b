"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { agentApi, unwrap } from "@/lib/api/services";
import { Loader2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { OfflineBanner } from "@/components/shared/OfflineBanner";

// Pages inside /b2b that are fully public (no auth needed)
const B2B_PUBLIC = [
  "/b2b/login",
  "/b2b/register",
  "/b2b/kyc",
  "/b2b/forgot-password",
  "/b2b/reset-password",
];

export default function B2BLayout({ children }: { children: React.ReactNode }) {
  const { user, token, role, isAuthenticated, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  const isPublicPage = B2B_PUBLIC.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (!_hasHydrated) return;

    // Public b2b pages — always allow
    if (isPublicPage) {
      setChecked(true);
      return;
    }

    // No token or wrong role → go to B2B login
    const localToken =
      typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if ((!isAuthenticated && !localToken) || (role && role !== "agent")) {
      router.replace("/b2b/login");
      return;
    }

    // Agent logged in — check KYC
    const kycStatus = user?.kycStatus || user?.status || "";
    const kycApproved = kycStatus === "approved" || kycStatus === "active";
    const isOnKycPage = pathname.startsWith("/b2b/kyc");

    if (!kycApproved && !isOnKycPage) {
      // FIX: before redirecting, fetch fresh KYC status from API
      // (store might have stale "submitted" status even after admin approved)
      agentApi
        .getKycStatus()
        .then((res: any) => {
          const data = unwrap(res) as any;
          const raw =
            data?.kycStatus || data?.kyc?.status || data?.agentStatus || "";
          const freshApproved = raw === "approved" || raw === "active";
          if (freshApproved) {
            // Update store with fresh status
            const { setAuth, token } = useAuthStore.getState();
            if (user && token)
              setAuth(
                { ...user, kycStatus: "approved", status: "active" },
                token,
              );
            setChecked(true);
          } else {
            router.replace("/b2b/kyc");
          }
        })
        .catch(() => {
          router.replace("/b2b/kyc");
        });
      return;
    }

    setChecked(true);
  }, [_hasHydrated, isAuthenticated, role, pathname, user]);

  // Spinner while checking
  if (!_hasHydrated || (!checked && !isPublicPage)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Public pages — no sidebar, no footer (login/register pages are standalone)
  if (isPublicPage) return <>{children}</>;

  // Not authenticated after check
  if (
    !isAuthenticated &&
    typeof window !== "undefined" &&
    !localStorage.getItem("auth_token")
  )
    return null;

  // KYC page — full-screen (no sidebar)
  if (pathname.startsWith("/b2b/kyc")) return <>{children}</>;

  // Full agent dashboard layout — top navbar only, no left sidebar
  // pt-16 on mobile (single row), md:pt-[104px] accounts for secondary nav (md to <xl), xl:pt-16 (no secondary)
  return (
    <div className="min-h-screen bg-background">
      <OfflineBanner />
      <Header />
      <main className="pt-[88px] md:pt-[104px] xl:pt-16 min-h-screen flex flex-col">
        {/* max-w-7xl + mx-auto keeps the dashboard / search pages aligned to
            the same width as the public marketing pages (PublicPageChrome
            uses the same container). Without this each page picked its own
            width and the UI looked inconsistent across flights / hotels /
            series-fare. */}
        <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
        <Footer />
      </main>
    </div>
  );
}
