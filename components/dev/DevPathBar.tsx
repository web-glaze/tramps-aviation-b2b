"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Copy, Check, FolderOpen, ChevronDown, ChevronUp } from "lucide-react";

// ══════════════════════════════════════════════════════════════
// PAGE → FILE PATHS MAP
// Jis page par ho, uske saare related files yahan hain
// ══════════════════════════════════════════════════════════════
const PAGE_FILES: Record<string, { label: string; type: "PAGE" | "LAYOUT" | "COMPONENT" | "CSS" | "THEME"; file: string }[]> = {
  "/": [
    { label: "Home Page",      type: "PAGE",      file: "app/page.tsx" },
    { label: "Common Header",  type: "COMPONENT", file: "components/layout/CommonHeader.tsx" },
    { label: "Common Footer",  type: "COMPONENT", file: "components/layout/CommonFooter.tsx" },
    { label: "Root Layout",    type: "LAYOUT",    file: "app/layout.tsx" },
    { label: "Global CSS",     type: "CSS",       file: "app/globals.css" },
  ],
  "/flights": [
    { label: "Flights Page",   type: "PAGE",      file: "app/b2c/flights/page.tsx" },
    { label: "B2C Layout",     type: "LAYOUT",    file: "app/b2c/layout.tsx" },
    { label: "Common Header",  type: "COMPONENT", file: "components/layout/CommonHeader.tsx" },
    { label: "Common Footer",  type: "COMPONENT", file: "components/layout/CommonFooter.tsx" },
    { label: "Global CSS",     type: "CSS",       file: "app/globals.css" },
  ],
  "/hotels": [
    { label: "Hotels Page",    type: "PAGE",      file: "app/b2c/hotels/page.tsx" },
    { label: "B2C Layout",     type: "LAYOUT",    file: "app/b2c/layout.tsx" },
    { label: "Common Header",  type: "COMPONENT", file: "components/layout/CommonHeader.tsx" },
    { label: "Common Footer",  type: "COMPONENT", file: "components/layout/CommonFooter.tsx" },
    { label: "Global CSS",     type: "CSS",       file: "app/globals.css" },
  ],
  "/insurance": [
    { label: "Insurance Page", type: "PAGE",      file: "app/b2c/insurance/page.tsx" },
    { label: "B2C Layout",     type: "LAYOUT",    file: "app/b2c/layout.tsx" },
    { label: "Common Header",  type: "COMPONENT", file: "components/layout/CommonHeader.tsx" },
    { label: "Common Footer",  type: "COMPONENT", file: "components/layout/CommonFooter.tsx" },
    { label: "Global CSS",     type: "CSS",       file: "app/globals.css" },
  ],
  "/series-fare": [
    { label: "Series Fare Page", type: "PAGE",    file: "app/b2c/series-fare/page.tsx" },
    { label: "B2C Layout",     type: "LAYOUT",    file: "app/b2c/layout.tsx" },
    { label: "Common Header",  type: "COMPONENT", file: "components/layout/CommonHeader.tsx" },
    { label: "Common Footer",  type: "COMPONENT", file: "components/layout/CommonFooter.tsx" },
    { label: "Global CSS",     type: "CSS",       file: "app/globals.css" },
  ],
  "/b2c/my-trips": [
    { label: "My Trips Page",  type: "PAGE",      file: "app/b2c/my-trips/page.tsx" },
    { label: "B2C Layout",     type: "LAYOUT",    file: "app/b2c/layout.tsx" },
    { label: "Common Header",  type: "COMPONENT", file: "components/layout/CommonHeader.tsx" },
    { label: "Common Footer",  type: "COMPONENT", file: "components/layout/CommonFooter.tsx" },
    { label: "Global CSS",     type: "CSS",       file: "app/globals.css" },
  ],
  "/b2c/login": [
    { label: "B2C Login Page", type: "PAGE",      file: "app/b2c/login/page.tsx" },
    { label: "B2C Layout",     type: "LAYOUT",    file: "app/b2c/layout.tsx" },
    { label: "Common Header",  type: "COMPONENT", file: "components/layout/CommonHeader.tsx" },
    { label: "Global CSS",     type: "CSS",       file: "app/globals.css" },
  ],
  "/b2c/register": [
    { label: "B2C Register",   type: "PAGE",      file: "app/b2c/register/b2c-register.tsx" },
    { label: "B2C Layout",     type: "LAYOUT",    file: "app/b2c/layout.tsx" },
    { label: "Global CSS",     type: "CSS",       file: "app/globals.css" },
  ],
  "/b2c/search": [
    { label: "Search Page",    type: "PAGE",      file: "app/b2c/search/page.tsx" },
    { label: "B2C Layout",     type: "LAYOUT",    file: "app/b2c/layout.tsx" },
    { label: "Common Header",  type: "COMPONENT", file: "components/layout/CommonHeader.tsx" },
    { label: "Global CSS",     type: "CSS",       file: "app/globals.css" },
  ],
  "/b2b/login": [
    { label: "B2B Login",      type: "PAGE",      file: "app/b2b/b2b-login.tsx" },
    { label: "B2B Layout",     type: "LAYOUT",    file: "app/b2b/layout.tsx" },
    { label: "Global CSS",     type: "CSS",       file: "app/globals.css" },
  ],
  "/b2b/register": [
    { label: "B2B Register",   type: "PAGE",      file: "app/b2b/register/b2b-register.tsx" },
    { label: "B2B Layout",     type: "LAYOUT",    file: "app/b2b/layout.tsx" },
    { label: "Global CSS",     type: "CSS",       file: "app/globals.css" },
  ],
  "/b2b/kyc": [
    { label: "KYC Page",       type: "PAGE",      file: "app/b2b/kyc/b2b-kyc.tsx" },
    { label: "B2B Layout",     type: "LAYOUT",    file: "app/b2b/layout.tsx" },
    { label: "Global CSS",     type: "CSS",       file: "app/globals.css" },
  ],
  "/b2b/forgot-password": [
    { label: "Forgot Password", type: "PAGE",     file: "app/b2b/forgot-password/page.tsx" },
    { label: "B2B Layout",     type: "LAYOUT",    file: "app/b2b/layout.tsx" },
    { label: "Global CSS",     type: "CSS",       file: "app/globals.css" },
  ],
  "/b2b/dashboard": [
    { label: "Dashboard Page", type: "PAGE",      file: "app/b2b/dashboard/page.tsx" },
    { label: "B2B Layout",     type: "LAYOUT",    file: "app/b2b/layout.tsx" },
    { label: "B2B Sidebar",    type: "COMPONENT", file: "components/layout/B2BSidebar.tsx" },
    { label: "Dashboard Header", type: "COMPONENT", file: "components/layout/DashboardHeader.tsx" },
    { label: "Dashboard Stats", type: "COMPONENT", file: "components/dashboard/DashboardStats.tsx" },
    { label: "Dashboard Chart", type: "COMPONENT", file: "components/dashboard/DashboardChart.tsx" },
    { label: "Global CSS",     type: "CSS",       file: "app/globals.css" },
  ],
  "/b2b/flights": [
    { label: "B2B Flights",    type: "PAGE",      file: "app/b2b/flights/page.tsx" },
    { label: "B2B Layout",     type: "LAYOUT",    file: "app/b2b/layout.tsx" },
    { label: "B2B Sidebar",    type: "COMPONENT", file: "components/layout/B2BSidebar.tsx" },
    { label: "Dashboard Header", type: "COMPONENT", file: "components/layout/DashboardHeader.tsx" },
    { label: "Global CSS",     type: "CSS",       file: "app/globals.css" },
  ],
  "/b2b/hotels": [
    { label: "B2B Hotels",     type: "PAGE",      file: "app/b2b/hotels/page.tsx" },
    { label: "B2B Layout",     type: "LAYOUT",    file: "app/b2b/layout.tsx" },
    { label: "B2B Sidebar",    type: "COMPONENT", file: "components/layout/B2BSidebar.tsx" },
    { label: "Dashboard Header", type: "COMPONENT", file: "components/layout/DashboardHeader.tsx" },
    { label: "Global CSS",     type: "CSS",       file: "app/globals.css" },
  ],
  "/b2b/insurance": [
    { label: "B2B Insurance",  type: "PAGE",      file: "app/b2b/insurance/page.tsx" },
    { label: "B2B Layout",     type: "LAYOUT",    file: "app/b2b/layout.tsx" },
    { label: "B2B Sidebar",    type: "COMPONENT", file: "components/layout/B2BSidebar.tsx" },
    { label: "Global CSS",     type: "CSS",       file: "app/globals.css" },
  ],
  "/b2b/bookings": [
    { label: "Bookings Page",  type: "PAGE",      file: "app/b2b/bookings/page.tsx" },
    { label: "B2B Layout",     type: "LAYOUT",    file: "app/b2b/layout.tsx" },
    { label: "B2B Sidebar",    type: "COMPONENT", file: "components/layout/B2BSidebar.tsx" },
    { label: "Global CSS",     type: "CSS",       file: "app/globals.css" },
  ],
  "/b2b/wallet": [
    { label: "Wallet Page",    type: "PAGE",      file: "app/b2b/wallet/page.tsx" },
    { label: "B2B Layout",     type: "LAYOUT",    file: "app/b2b/layout.tsx" },
    { label: "B2B Sidebar",    type: "COMPONENT", file: "components/layout/B2BSidebar.tsx" },
    { label: "Global CSS",     type: "CSS",       file: "app/globals.css" },
  ],
  "/b2b/commission": [
    { label: "Commission Page", type: "PAGE",     file: "app/b2b/commission/page.tsx" },
    { label: "B2B Layout",     type: "LAYOUT",    file: "app/b2b/layout.tsx" },
    { label: "B2B Sidebar",    type: "COMPONENT", file: "components/layout/B2BSidebar.tsx" },
    { label: "Global CSS",     type: "CSS",       file: "app/globals.css" },
  ],
  "/b2b/reports": [
    { label: "Reports Page",   type: "PAGE",      file: "app/b2b/reports/page.tsx" },
    { label: "B2B Layout",     type: "LAYOUT",    file: "app/b2b/layout.tsx" },
    { label: "B2B Sidebar",    type: "COMPONENT", file: "components/layout/B2BSidebar.tsx" },
    { label: "Global CSS",     type: "CSS",       file: "app/globals.css" },
  ],
  "/b2b/profile": [
    { label: "Profile Page",   type: "PAGE",      file: "app/b2b/profile/page.tsx" },
    { label: "B2B Layout",     type: "LAYOUT",    file: "app/b2b/layout.tsx" },
    { label: "B2B Sidebar",    type: "COMPONENT", file: "components/layout/B2BSidebar.tsx" },
    { label: "Global CSS",     type: "CSS",       file: "app/globals.css" },
  ],
};

// Type badge colors
const TYPE_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  PAGE:      { bg: "#a6e3a1", text: "#1e1e2e", label: "PAGE" },
  LAYOUT:    { bg: "#89b4fa", text: "#1e1e2e", label: "LAYOUT" },
  COMPONENT: { bg: "#cba6f7", text: "#1e1e2e", label: "COMP" },
  CSS:       { bg: "#f38ba8", text: "#1e1e2e", label: "CSS" },
  THEME:     { bg: "#fab387", text: "#1e1e2e", label: "THEME" },
};

function getFullPath(file: string): string {
  const root = process.env.NEXT_PUBLIC_PROJECT_ROOT ||
    "D:\\Web App\\tramps-aviation\\tramps-aviation-frontend";
  return root + "\\" + file.replace(/\//g, "\\");
}

// Match dynamic routes like /b2b/bookings/[bookingId]
function matchRoute(pathname: string): string {
  if (PAGE_FILES[pathname]) return pathname;
  // Try prefix match for dynamic segments
  const keys = Object.keys(PAGE_FILES);
  for (const key of keys) {
    if (pathname.startsWith(key + "/")) return key;
  }
  return pathname;
}

export function DevPathBar() {
  if (process.env.NODE_ENV !== "development") return null;
  return <Inner />;
}

function Inner() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const route = matchRoute(pathname);
  const files = PAGE_FILES[route] || [
    { label: "Page File", type: "PAGE" as const,
      file: `app${pathname}/page.tsx` },
    { label: "Global CSS", type: "CSS" as const,
      file: "app/globals.css" },
  ];

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
          {/* Header */}
          <div style={{ background: "#181825", borderBottom: "1px solid #313244" }}
            className="flex items-center justify-between px-3 py-2">
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

          {/* File rows */}
          <div>
            {files.map((item, i) => {
              const fullPath = getFullPath(item.file);
              const ts = TYPE_STYLE[item.type];
              const isCopied = copied === item.file;
              return (
                <button key={i} onClick={() => copy(fullPath, item.file)}
                  className="w-full text-left flex items-center gap-2.5 px-3 py-2 transition-colors group"
                  style={{ borderBottom: "1px solid #313244" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#313244")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Type badge */}
                  <span className="flex-shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold"
                    style={{ background: ts.bg + "33", color: ts.bg, fontFamily: "monospace" }}>
                    {ts.label}
                  </span>
                  {/* Label */}
                  <span className="flex-shrink-0 text-[10px] w-32"
                    style={{ color: "#a6adc8", fontFamily: "monospace" }}>
                    {item.label}
                  </span>
                  {/* Full path */}
                  <span className="flex-1 text-[10px] truncate"
                    style={{ color: isCopied ? "#a6e3a1" : "#cdd6f4", fontFamily: "monospace" }}>
                    {fullPath}
                  </span>
                  {/* Copy icon */}
                  {isCopied
                    ? <Check size={12} color="#a6e3a1" className="flex-shrink-0" />
                    : <Copy size={12} color="#6c7086" className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  }
                </button>
              );
            })}
          </div>

          {/* Footer hint */}
          <div style={{ background: "#181825", borderTop: "1px solid #313244" }}
            className="px-3 py-1.5">
            <span style={{ color: "#45475a", fontSize: 10, fontFamily: "monospace" }}>
              Set root in .env.development → NEXT_PUBLIC_PROJECT_ROOT=D:\your\path
            </span>
          </div>
        </div>
      )}

      {/* ── Floating tab button (always visible) ── */}
      <button
        onClick={() => setOpen(v => !v)}
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
        {open
          ? <ChevronDown size={10} color="#6c7086" />
          : <ChevronUp size={10} color="#6c7086" />
        }
      </button>
    </>
  );
}
