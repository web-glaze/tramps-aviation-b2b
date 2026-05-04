"use client";

/**
 * Header.tsx — single header for the whole site.
 *
 * Replaces the old trio: B2BAuthHeader, B2btopnavbar, B2BSidebar.
 *
 * It picks one of two visual modes automatically:
 *
 *   ┌─ COMPACT MODE ─────────────────────────────────────────────────────┐
 *   │  Used on:                                                          │
 *   │    • home (/) and public marketing pages                           │
 *   │    • auth pages (/b2b/login, /b2b/register, /b2b/forgot-password,  │
 *   │      /b2b/reset-password, /b2b/kyc)                                │
 *   │    • public product pages (/flights, /hotels, /insurance,          │
 *   │      /series-fare) when the visitor is NOT logged in               │
 *   │  Layout: sticky logo bar with theme toggle + a contextual CTA.     │
 *   └────────────────────────────────────────────────────────────────────┘
 *
 *   ┌─ FULL MODE ────────────────────────────────────────────────────────┐
 *   │  Used on every authenticated /b2b/* portal page.                   │
 *   │  Layout: fixed top navbar with menu, wallet, notifications, user.  │
 *   │  (b2b/layout.tsx already adds the matching pt-[…] for the fixed    │
 *   │  header — don't change that.)                                       │
 *   └────────────────────────────────────────────────────────────────────┘
 *
 * Callers don't need to pass any props or pick a variant — just <Header />.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Menu, X, Bell, Sun, Moon, Home, ChevronDown, LogOut,
  Wallet, BookOpen, MoreHorizontal,
} from "lucide-react";
import { useAuthStore, useSettingsStore, usePlatformStore } from "@/lib/store";
import { agentApi, unwrap } from "@/lib/api/services";
import { B2B_SIDEBAR_NAV, B2B_SIDEBAR_MORE, B2B_SIDEBAR_BOTTOM, APP_NAME } from "@/config/app";
import { AppLogo } from "@/components/shared/AppLogo";
import { B2BLogo } from "@/components/ui/B2BLogo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/utils";

// Pathnames that should always use the compact header (auth/public pages).
// Anything under /b2b/* not in this list is treated as an authenticated
// portal page and gets the full navbar.
const COMPACT_B2B_PREFIXES = [
  "/b2b/login",
  "/b2b/register",
  "/b2b/forgot-password",
  "/b2b/reset-password",
  "/b2b/kyc",
];

const PAGE_TITLES: Record<string, string> = {
  "/b2b/dashboard":  "Dashboard",
  "/b2b/flights":    "Book Flights",
  "/b2b/hotels":     "Book Hotels",
  "/b2b/insurance":  "Travel Insurance",
  "/b2b/series-fare":"Series Fare",
  "/b2b/bookings":   "My Bookings",
  "/b2b/wallet":     "Wallet",
  "/b2b/commission": "Commission",
  "/b2b/markup":     "Markup Tool",
  "/b2b/subagents":  "Sub-Agent Management",
  "/b2b/reports":    "Reports",
  "/b2b/profile":    "My Profile",
  "/b2b/help":       "Help & Support",
};

// ─────────────────────────────────────────────────────────────────────────────
// MODE PICKER
//
// Anti-flicker rule:  on /b2b/* portal pages we *always* render the full
// navbar shell (even before hydration), because that's the only mode that
// page can be in. On every other page we render the compact header. The
// auth-state-dependent CTAs inside the compact header gracefully hide
// themselves until hydration completes.
// ─────────────────────────────────────────────────────────────────────────────

export function Header() {
  const pathname = usePathname() || "/";

  const isCompactB2BRoute = COMPACT_B2B_PREFIXES.some((p) => pathname.startsWith(p));
  const isOnB2BPortal     = pathname.startsWith("/b2b/") && !isCompactB2BRoute;

  // Pathname alone determines layout — no auth-state read here, so the first
  // server / pre-hydration render matches the post-hydration render exactly.
  return isOnB2BPortal ? <FullHeader /> : <CompactHeader pathname={pathname} />;
}

// ═════════════════════════════════════════════════════════════════════════════
// COMPACT HEADER — auth pages, home, public marketing pages
// ═════════════════════════════════════════════════════════════════════════════

function CompactHeader({ pathname }: { pathname: string }) {
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  // CTA selection logic, in priority order:
  //   1. If the visitor is signed in → "Go to Dashboard" (orange brand accent)
  //   2. On /b2b/login → "Register Free"
  //   3. On /b2b/register → "Sign In"
  //   4. Anywhere else (home, /flights, etc.) → both buttons
  //
  // Anti-flicker: until the persisted store hydrates we *don't know* yet
  // whether the visitor is logged in. Render nothing in the CTA slot during
  // that brief window so we don't flash the wrong button. The slot itself
  // is reserved with a min-width so the layout doesn't jump.
  const showAuthedCTA    = _hasHydrated && isAuthenticated;
  const showOnlyRegister = pathname.startsWith("/b2b/login");
  const showOnlyLogin    = pathname.startsWith("/b2b/register");

  return (
    <header className="w-full border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <B2BLogo size="sm" />
          <span className="font-bold text-sm text-foreground hidden sm:block group-hover:text-primary transition-colors">
            Tramps Aviation B2B
          </span>
        </Link>

        {/* Right cluster */}
        <div className="flex items-center gap-2 min-h-9">
          <ThemeToggle />

          {/* Pre-hydration: render nothing in the CTA slot to avoid flashing
              the wrong button before we know auth state. */}
          {!_hasHydrated && null}

          {showAuthedCTA && (
            <Link
              href="/b2b/dashboard"
              className="px-4 py-1.5 rounded-lg bg-[hsl(var(--brand-orange))] text-white font-semibold text-xs hover:opacity-90 transition-opacity"
            >
              Go to Dashboard
            </Link>
          )}

          {_hasHydrated && !showAuthedCTA && showOnlyRegister && (
            <>
              <span className="text-muted-foreground text-sm hidden sm:block">New agency?</span>
              <Link
                href="/b2b/register"
                className="px-4 py-1.5 rounded-lg bg-[hsl(var(--brand-orange))] text-white font-semibold text-xs hover:opacity-90 transition-opacity"
              >
                Register Free
              </Link>
            </>
          )}

          {_hasHydrated && !showAuthedCTA && showOnlyLogin && (
            <>
              <span className="text-muted-foreground text-sm hidden sm:block">Already registered?</span>
              <Link
                href="/b2b/login"
                className="px-4 py-1.5 rounded-lg border border-border text-foreground font-semibold text-xs hover:bg-muted transition-colors"
              >
                Sign In
              </Link>
            </>
          )}

          {_hasHydrated && !showAuthedCTA && !showOnlyRegister && !showOnlyLogin && (
            <>
              <Link
                href="/b2b/login"
                className="hidden sm:inline-flex px-3 py-1.5 rounded-lg border border-border text-foreground font-semibold text-xs hover:bg-muted transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/b2b/register"
                className="px-4 py-1.5 rounded-lg bg-[hsl(var(--brand-orange))] text-white font-semibold text-xs hover:opacity-90 transition-opacity"
              >
                Register Free
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// FULL HEADER — authenticated B2B portal
// (preserves all the behaviour of the previous B2btopnavbar)
// ═════════════════════════════════════════════════════════════════════════════

function FullHeader() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const { theme, setTheme } = useSettingsStore();
  const { ps, fetchIfStale } = usePlatformStore();

  const platformName = ps.platformName || APP_NAME;

  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [liveBalance,  setLiveBalance]  = useState<number | null>(null);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");
  useEffect(() => { fetchIfStale(); }, []);

  // Wallet balance — fetched once on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await agentApi.getWallet();
        const data = unwrap(res) as any;
        const balance = data?.balance ?? data?.walletBalance ?? 0;
        setLiveBalance(Number(balance) || 0);
      } catch { /* silent */ }
    })();
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) setMoreMenuOpen(false);
    };
    if (userMenuOpen || moreMenuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [userMenuOpen, moreMenuOpen]);

  // Close drawer / menus on route change
  useEffect(() => { setDrawerOpen(false); setMoreMenuOpen(false); }, [pathname]);

  // Lock body scroll while drawer open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const handleLogout = () => {
    if (clearAuth) clearAuth();
    router.push("/b2b/login");
  };

  const userName    = user?.name || (user as any)?.agencyName || "Agent";
  const userInitial = userName[0]?.toUpperCase() || "A";
  const pageTitle   = PAGE_TITLES[pathname] || "";

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* Main navbar — fixed; b2b/layout adds matching pt-[…] to <main> */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/95 dark:bg-card/95 backdrop-blur-xl border-b border-border">

        {/* Row 1: Brand + center nav + actions */}
        <div className="h-16 flex items-center px-4 sm:px-6 gap-4">
          {/* Mobile hamburger */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="h-9 w-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all xl:hidden flex-shrink-0"
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </button>

          {/* Brand */}
          <Link href="/b2b/dashboard" className="flex items-center gap-2.5 flex-shrink-0 group">
            <div className="h-9 w-9 rounded-xl overflow-hidden border border-border shadow-sm bg-white">
              <AppLogo size="h-9 w-9" />
            </div>
            <div className="hidden sm:block">
              <p className="font-extrabold text-sm leading-none text-foreground group-hover:text-primary transition-colors">
                {platformName}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 tracking-wider uppercase">
                Agent Portal
              </p>
            </div>
          </Link>

          {/* Centre nav (xl+) */}
          <nav className="hidden xl:flex items-center gap-0.5 flex-1 justify-center">
            {B2B_SIDEBAR_NAV.map((item) => {
              const Icon = item.icon!;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}

            {/* "More" dropdown */}
            <div className="relative" ref={moreMenuRef}>
              <button
                onClick={() => setMoreMenuOpen((v) => !v)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap",
                  B2B_SIDEBAR_MORE.some((i) => isActive(i.href))
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
                aria-haspopup="menu"
                aria-expanded={moreMenuOpen}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
                More
                <ChevronDown className={cn("h-3 w-3 transition-transform", moreMenuOpen && "rotate-180")} />
              </button>

              {moreMenuOpen && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-52 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-1" role="menu">
                  <div className="py-1">
                    {B2B_SIDEBAR_MORE.map((item) => {
                      const Icon = item.icon!;
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMoreMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                            active ? "bg-primary/10 text-primary font-semibold" : "text-foreground hover:bg-muted",
                          )}
                          role="menuitem"
                        >
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Spacer when nav hidden */}
          <div className="flex-1 xl:hidden" />

          {/* Right actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <Link
              href="/"
              className="h-9 w-9 rounded-xl border border-border hidden sm:flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              title="Home"
            >
              <Home className="h-4 w-4" />
            </Link>

            {/* Wallet shortcut with live balance check badge */}
            <Link
              href="/b2b/wallet"
              className="relative h-9 w-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/5 hover:border-primary/30 transition-all group"
              title={liveBalance !== null ? `Wallet: ₹${liveBalance.toLocaleString("en-IN")}` : "Wallet"}
            >
              <Wallet className="h-4 w-4" />
              {liveBalance !== null && liveBalance > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-emerald-500 border-2 border-background text-[9px] font-bold text-white flex items-center justify-center leading-none">
                  ✓
                </span>
              )}
            </Link>

            <button
              onClick={toggleTheme}
              className="h-9 w-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <button
              className="relative h-9 w-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
            </button>

            {/* User dropdown */}
            {user && (
              <div className="relative ml-1 pl-2 border-l border-border" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 p-1 rounded-xl hover:bg-muted transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                    {userInitial}
                  </div>
                  <div className="hidden lg:block text-left pr-1">
                    <p className="text-xs font-semibold leading-none truncate max-w-[120px]">{userName}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Agent</p>
                  </div>
                  <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform hidden lg:block mr-1", userMenuOpen && "rotate-180")} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-1">
                    <div className="p-3 border-b border-border bg-muted/30">
                      <p className="text-sm font-bold text-foreground truncate">{userName}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email || "Agent"}</p>
                    </div>
                    <div className="py-1">
                      {B2B_SIDEBAR_BOTTOM.map((item) => {
                        const Icon = item.icon!;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors"
                          >
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            {item.label}
                          </Link>
                        );
                      })}
                      <Link
                        href="/b2b/wallet"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors"
                      >
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                        My Wallet
                      </Link>
                      <Link
                        href="/b2b/bookings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors"
                      >
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        My Bookings
                      </Link>
                      <div className="border-t border-border my-1" />
                      <button
                        onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: scrollable secondary nav (md to <xl) */}
        <div className="hidden md:block xl:hidden border-t border-border bg-muted/20">
          <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto scrollbar-thin">
            {[...B2B_SIDEBAR_NAV, ...B2B_SIDEBAR_MORE].map((item) => {
              const Icon = item.icon!;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0",
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Mobile-only page-title strip */}
        {pageTitle && (
          <div className="md:hidden px-4 pb-2 border-t border-border bg-muted/10">
            <p className="text-sm font-bold text-foreground pt-2">{pageTitle}</p>
          </div>
        )}
      </header>

      {/* ═════ Mobile drawer ═════ */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm animate-in fade-in"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="fixed top-0 left-0 bottom-0 w-[280px] z-50 bg-card border-r border-border shadow-xl flex flex-col animate-in slide-in-from-left">
            <div className="flex items-center justify-between h-16 px-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl overflow-hidden bg-white border border-border">
                  <AppLogo size="h-9 w-9" />
                </div>
                <div>
                  <p className="font-bold text-sm leading-none">{platformName}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Agent Portal</p>
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {liveBalance !== null && (
              <Link
                href="/b2b/wallet"
                className="mx-3 mt-3 mb-2 flex items-center gap-3 p-3 rounded-xl border border-primary/25 bg-primary/5 hover:bg-primary/10 transition-colors"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide leading-none">Wallet Balance</p>
                  <p className="text-base font-bold text-foreground mt-1">₹{liveBalance.toLocaleString("en-IN")}</p>
                </div>
              </Link>
            )}

            <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
              {B2B_SIDEBAR_NAV.map((item) => {
                const Icon = item.icon!;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                      active ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground hover:bg-muted",
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {item.label}
                  </Link>
                );
              })}

              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 pt-4 pb-1">More</p>
              {B2B_SIDEBAR_MORE.map((item) => {
                const Icon = item.icon!;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                      active ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground hover:bg-muted",
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {item.label}
                  </Link>
                );
              })}

              <div className="border-t border-border my-3" />

              {B2B_SIDEBAR_BOTTOM.map((item) => {
                const Icon = item.icon!;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                      active ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground hover:bg-muted",
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {user && (
              <div className="border-t border-border p-3 flex-shrink-0">
                <div className="flex items-center gap-2.5 mb-2 px-1">
                  <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm">
                    {userInitial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{userName}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            )}
          </aside>
        </>
      )}
    </>
  );
}
