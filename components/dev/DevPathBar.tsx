"use client";

/**
 * DevPathBar — tiny floating dev tool that shows which source files
 * are responsible for the page you're currently looking at, plus a
 * one-click copy of each absolute path. Renders only in development.
 *
 * Set NEXT_PUBLIC_PROJECT_ROOT in your `.env.development` so the
 * absolute-path button matches your local checkout, e.g.:
 *
 *   NEXT_PUBLIC_PROJECT_ROOT=D:\Web App\tramps-aviation\tramps-aviation-b2b
 */

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Copy, Check, FolderOpen, ChevronDown, ChevronUp } from "lucide-react";

type Kind = "PAGE" | "LAYOUT" | "COMPONENT" | "CSS" | "THEME";
type FileEntry = { label: string; type: Kind; file: string };

// Files every route shares — the root layout, agent shell, and global CSS.
const SHARED_FILES: FileEntry[] = [
  { label: "Root Layout",   type: "LAYOUT",    file: "app/layout.tsx" },
  { label: "Agent Shell",   type: "COMPONENT", file: "components/layout/AgentShell.tsx" },
  { label: "Root Providers",type: "COMPONENT", file: "components/layout/RootProviders.tsx" },
  { label: "Global CSS",    type: "CSS",       file: "app/globals.css" },
];

// Per-route page entries. Only the page-specific file goes here — the
// shared layout/CSS is appended automatically below.
const ROUTE_PAGES: Record<string, FileEntry[]> = {
  "/": [
    { label: "Home (smart redirect)", type: "PAGE", file: "app/page.tsx" },
  ],
  "/login": [
    { label: "Login Page",   type: "PAGE",      file: "app/login/page.tsx" },
    { label: "Header",       type: "COMPONENT", file: "components/layout/Header.tsx" },
    { label: "Footer",       type: "COMPONENT", file: "components/layout/Footer.tsx" },
  ],
  "/register": [
    { label: "Register Page",type: "PAGE",      file: "app/register/page.tsx" },
    { label: "Register Form",type: "COMPONENT", file: "app/register/b2b-register.tsx" },
  ],
  "/forgot-password": [
    { label: "Forgot Password",type: "PAGE",    file: "app/forgot-password/page.tsx" },
  ],
  "/kyc": [
    { label: "KYC Page",     type: "PAGE",      file: "app/kyc/page.tsx" },
    { label: "KYC Form",     type: "COMPONENT", file: "app/kyc/b2b-kyc.tsx" },
  ],
  "/dashboard": [
    { label: "Dashboard",    type: "PAGE",      file: "app/dashboard/page.tsx" },
    { label: "Header",       type: "COMPONENT", file: "components/layout/Header.tsx" },
    { label: "Stats",        type: "COMPONENT", file: "components/dashboard/DashboardStats.tsx" },
    { label: "Chart",        type: "COMPONENT", file: "components/dashboard/DashboardChart.tsx" },
  ],
  "/flights": [
    { label: "Flights Page", type: "PAGE",      file: "app/flights/page.tsx" },
  ],
  "/hotels": [
    { label: "Hotels Page",  type: "PAGE",      file: "app/hotels/page.tsx" },
  ],
  "/insurance": [
    { label: "Insurance Page",type: "PAGE",     file: "app/insurance/page.tsx" },
  ],
  "/series-fare": [
    { label: "Series Fare Page",type: "PAGE",   file: "app/series-fare/page.tsx" },
    { label: "Booking Dialog",type: "COMPONENT",file: "components/booking/SeriesFareBookingDialog.tsx" },
  ],
  "/bookings": [
    { label: "Bookings List",type: "PAGE",      file: "app/bookings/page.tsx" },
  ],
  "/wallet": [
    { label: "Wallet Page",  type: "PAGE",      file: "app/wallet/page.tsx" },
  ],
  "/commission": [
    { label: "Commission",   type: "PAGE",      file: "app/commission/page.tsx" },
  ],
  "/reports": [
    { label: "Reports",      type: "PAGE",      file: "app/reports/page.tsx" },
  ],
  "/profile": [
    { label: "Profile",      type: "PAGE",      file: "app/profile/page.tsx" },
  ],
  "/help": [
    { label: "Help",         type: "PAGE",      file: "app/help/page.tsx" },
  ],
  "/markup": [
    { label: "Markup Tool",  type: "PAGE",      file: "app/markup/page.tsx" },
  ],
  "/subagents": [
    { label: "Sub-Agents",   type: "PAGE",      file: "app/subagents/page.tsx" },
  ],
  "/account": [
    { label: "Make Payment", type: "PAGE",      file: "app/account/payments/page.tsx" },
    { label: "Account Layout",type: "COMPONENT",file: "components/account/AccountLayout.tsx" },
  ],
  "/account/payments": [
    { label: "Payments",     type: "PAGE",      file: "app/account/payments/page.tsx" },
    { label: "Account Layout",type: "COMPONENT",file: "components/account/AccountLayout.tsx" },
  ],
  "/account/invoices": [
    { label: "Invoices",     type: "PAGE",      file: "app/account/invoices/page.tsx" },
    { label: "Account Layout",type: "COMPONENT",file: "components/account/AccountLayout.tsx" },
  ],
  "/account/bank-accounts": [
    { label: "Bank Accounts",type: "PAGE",      file: "app/account/bank-accounts/page.tsx" },
    { label: "Account Layout",type: "COMPONENT",file: "components/account/AccountLayout.tsx" },
  ],
  "/bookings/[bookingId]": [
    { label: "Booking Detail",type: "PAGE",     file: "app/bookings/[bookingId]/page.tsx" },
  ],
  "/about":   [{ label: "About",   type: "PAGE", file: "app/about/page.tsx" }],
  "/faq":     [{ label: "FAQ",     type: "PAGE", file: "app/faq/page.tsx" }],
  "/privacy": [{ label: "Privacy", type: "PAGE", file: "app/privacy/page.tsx" }],
  "/terms":   [{ label: "Terms",   type: "PAGE", file: "app/terms/page.tsx" }],
  "/refund":  [{ label: "Refund",  type: "PAGE", file: "app/refund/page.tsx" }],
};

// Type badge colours
const TYPE_STYLE: Record<Kind, { bg: string; label: string }> = {
  PAGE:      { bg: "#a6e3a1", label: "PAGE" },
  LAYOUT:    { bg: "#89b4fa", label: "LAYOUT" },
  COMPONENT: { bg: "#cba6f7", label: "COMP" },
  CSS:       { bg: "#f38ba8", label: "CSS" },
  THEME:     { bg: "#fab387", label: "THEME" },
};

function getFullPath(file: string): string {
  const root =
    process.env.NEXT_PUBLIC_PROJECT_ROOT ||
    "D:\\Web App\\tramps-aviation\\tramps-aviation-b2b";
  return root + "\\" + file.replace(/\//g, "\\");
}

// Match dynamic routes like /bookings/abc-123 to the [bookingId] template.
function matchRoute(pathname: string): string {
  if (ROUTE_PAGES[pathname]) return pathname;
  // Bookings detail: /bookings/<id>
  if (pathname.startsWith("/bookings/") && pathname.split("/").length === 3) {
    return "/bookings/[bookingId]";
  }
  // Account sub-routes
  if (pathname.startsWith("/account/")) {
    const sub = pathname.split("/")[2];
    if (sub) {
      const guess = `/account/${sub}`;
      if (ROUTE_PAGES[guess]) return guess;
    }
    return "/account";
  }
  // Prefix match for anything else
  for (const key of Object.keys(ROUTE_PAGES)) {
    if (pathname.startsWith(key + "/")) return key;
  }
  return pathname;
}

export function DevPathBar() {
  if (process.env.NODE_ENV !== "development") return null;
  return <Inner />;
}

function Inner() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const route = matchRoute(pathname);
  const pageFiles =
    ROUTE_PAGES[route] || [
      { label: "Page File", type: "PAGE" as const, file: `app${pathname}/page.tsx` },
    ];
  const files: FileEntry[] = [...pageFiles, ...SHARED_FILES];

  const copy = (path: string, key: string) => {
    navigator.clipboard.writeText(path).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <>
      {/* ── Popup panel ── */}
      {open && (
        <div
          className="fixed bottom-10 right-4 z-[9998] w-[520px] max-w-[calc(100vw-2rem)] rounded-xl overflow-hidden shadow-2xl"
          style={{ background: "#1e1e2e", border: "1px solid #313244" }}
        >
          <div
            style={{ background: "#181825", borderBottom: "1px solid #313244" }}
            className="flex items-center justify-between px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <FolderOpen size={13} color="#89b4fa" />
              <span style={{ color: "#cdd6f4", fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>
                Files on this page
              </span>
              <span style={{ color: "#6c7086", fontSize: 10, fontFamily: "monospace" }}>
                — {pathname}
              </span>
            </div>
            <span style={{ color: "#6c7086", fontSize: 10, fontFamily: "monospace" }}>
              Click path to copy
            </span>
          </div>

          <div>
            {files.map((item, i) => {
              const fullPath = getFullPath(item.file);
              const ts = TYPE_STYLE[item.type];
              const isCopied = copied === item.file;
              return (
                <button
                  key={`${item.file}-${i}`}
                  onClick={() => copy(fullPath, item.file)}
                  className="w-full text-left flex items-center gap-2.5 px-3 py-2 transition-colors group"
                  style={{ borderBottom: "1px solid #313244" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#313244")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span
                    className="flex-shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold"
                    style={{ background: ts.bg + "33", color: ts.bg, fontFamily: "monospace" }}
                  >
                    {ts.label}
                  </span>
                  <span
                    className="flex-shrink-0 text-[10px] w-32"
                    style={{ color: "#a6adc8", fontFamily: "monospace" }}
                  >
                    {item.label}
                  </span>
                  <span
                    className="flex-1 text-[10px] truncate"
                    style={{
                      color: isCopied ? "#a6e3a1" : "#cdd6f4",
                      fontFamily: "monospace",
                    }}
                  >
                    {fullPath}
                  </span>
                  {isCopied ? (
                    <Check size={12} color="#a6e3a1" className="flex-shrink-0" />
                  ) : (
                    <Copy
                      size={12}
                      color="#6c7086"
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div
            style={{ background: "#181825", borderTop: "1px solid #313244" }}
            className="px-3 py-1.5"
          >
            <span style={{ color: "#45475a", fontSize: 10, fontFamily: "monospace" }}>
              Set root in .env.development → NEXT_PUBLIC_PROJECT_ROOT=D:\your\path
            </span>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-[9999] flex items-center gap-1.5 px-3 py-1.5 rounded-lg shadow-lg transition-all select-none"
        style={{
          background: open ? "#313244" : "#1e1e2e",
          border: "1px solid #45475a",
          fontFamily: "monospace",
        }}
        title="Show page files (dev only)"
      >
        <FolderOpen size={12} color="#89b4fa" />
        <span style={{ color: "#cdd6f4", fontSize: 10, fontWeight: 700 }}>DEV</span>
        <span style={{ color: "#6c7086", fontSize: 10 }}>{pathname}</span>
        {open ? (
          <ChevronDown size={10} color="#6c7086" />
        ) : (
          <ChevronUp size={10} color="#6c7086" />
        )}
      </button>
    </>
  );
}
