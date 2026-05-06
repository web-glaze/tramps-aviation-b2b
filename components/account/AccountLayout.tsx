"use client";

/**
 * AccountLayout — shared left-sticky sidebar for the Account section.
 *
 * Wraps the four sub-pages (Statement / Make Payment / Invoices /
 * Bank Accounts) with a consistent two-column shell:
 *
 *   ┌──────────────┬─────────────────────────────┐
 *   │  ╔═════════╗ │                             │
 *   │  ║ Account ║ │                             │
 *   │  ║ ─────── ║ │   <main content>            │
 *   │  ║ Stmt  ★ ║ │                             │
 *   │  ║ Pay     ║ │                             │
 *   │  ║ Inv     ║ │                             │
 *   │  ║ Bank    ║ │                             │
 *   │  ╚═════════╝ │                             │
 *   │  (sticky)    │                             │
 *   └──────────────┴─────────────────────────────┘
 *
 * Pre-fix: the same nav was inline pills under each page heading,
 * scrolling away as the user scrolled. With four sub-pages this got
 * confusing — agents lost their place. The sticky sidebar keeps the
 * section navigation always visible and gives every sub-page a
 * consistent main-content width (max-w-4xl).
 *
 * Usage — wrap any /wallet or /account/* page:
 *   <AccountLayout>
 *     ...page contents...
 *   </AccountLayout>
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText, CreditCard, Receipt, Building2, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: any;
  /** True = match exactly. False (default) = match by prefix (so child
   *  routes still highlight the parent item). */
  exact?: boolean;
}

const NAV: NavItem[] = [
  {
    href: "/wallet",
    label: "Statement",
    description: "Balance & transaction history",
    icon: FileText,
    exact: true,
  },
  {
    href: "/account/payments",
    label: "Make Payment",
    description: "Add funds via Razorpay or bank transfer",
    icon: CreditCard,
  },
  {
    href: "/account/invoices",
    label: "Invoices",
    description: "Per-booking invoices, export to CSV",
    icon: Receipt,
  },
  {
    href: "/account/bank-accounts",
    label: "Bank Accounts",
    description: "Payee accounts for bank transfer",
    icon: Building2,
  },
];

export function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-6 items-start">
      {/* ── Left sidebar — sticky on desktop ─────────────────────────── */}
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="bg-card border border-border rounded-2xl p-2 shadow-sm">
          <div className="px-3 py-2.5 mb-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Account
            </p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
              Manage balance, payments, invoices
            </p>
          </div>
          <nav className="space-y-0.5">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-foreground hover:bg-muted",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 flex-shrink-0",
                      active ? "" : "text-muted-foreground",
                    )}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  <ChevronRight
                    className={cn(
                      "h-3.5 w-3.5 flex-shrink-0 transition-opacity",
                      active
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-50",
                    )}
                  />
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Below-sidebar info card — only shows the active item's
            description so the sidebar feels "alive" rather than static. */}
        {NAV.find(isActive) && (
          <div className="hidden lg:block mt-3 px-1">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {NAV.find(isActive)!.description}
            </p>
          </div>
        )}
      </aside>

      {/* ── Main content — capped width keeps all sub-pages consistent ── */}
      <main className="min-w-0 max-w-4xl w-full">{children}</main>
    </div>
  );
}
