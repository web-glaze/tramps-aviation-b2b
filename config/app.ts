import {
  LayoutDashboard,
  Settings,
  BarChart3,
  Plane,
  Hotel,
  Shield,
  Wallet,
  BookOpen,
  TrendingUp,
  Tag,
  FileText,
  HelpCircle,
  User,
  Users,
  BadgePercent,
  Image as ImageIcon,
  Contact,
} from "lucide-react";
import type { NavItem } from "@/types";

export const APP_NAME = "Tramps Aviation";
export const APP_DESCRIPTION = "Tramps Aviation Agent Portal — wholesale fares, instant booking, agent commission and wallet payments for travel agents.";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://agent.tramps.aviation";

// All routes are agent-portal routes (this app is deployed on the
// agents subdomain). The `B2B_` prefix on the key is kept for
// backward-compatibility with imports across the codebase, but the
// values are now flat (no /b2b/* prefix).
export const ROUTES = {
  HOME: "/",
  B2B_LOGIN: "/login",
  B2B_REGISTER: "/register",
  B2B_DASHBOARD: "/dashboard",
  B2B_FLIGHTS: "/flights",
  B2B_HOTELS: "/hotels",
  B2B_INSURANCE: "/insurance",
  B2B_BOOKINGS: "/bookings",
  B2B_WALLET: "/wallet",
  B2B_COMMISSION: "/commission",
  B2B_REPORTS: "/reports",
  B2B_PROFILE: "/profile",
  B2B_KYC: "/kyc",
  B2B_SERIES_FARE: "/series-fare",
  B2B_SUBAGENTS: "/subagents",
  B2B_MARKUP: "/markup",
  B2B_BRANDING: "/branding",
  B2B_CLIENTS: "/clients",
  B2B_HELP: "/help",
  B2B_FORGOT_PASSWORD: "/forgot-password",
} as const;

// Primary nav items — shown directly in the top bar.
//
// Pre-fix: this was labelled "Wallet" — but agents wanted a single
// "Account" entry that bundles balance, top-ups, invoices and
// bank-account details (similar to the "Account" pattern on TBO /
// Riya). The URL stays /wallet for backward-compat (deep links,
// bookmarks, the orange round wallet icon in the header), but the
// visible label is "Account" and the page itself shows tabs for
// Make Payment, Statement, Invoices and Bank Accounts.
export const B2B_SIDEBAR_NAV: NavItem[] = [
  { label: "Dashboard", href: ROUTES.B2B_DASHBOARD, icon: LayoutDashboard },
  { label: "Flights", href: ROUTES.B2B_FLIGHTS, icon: Plane },
  { label: "Hotels", href: ROUTES.B2B_HOTELS, icon: Hotel },
  { label: "Insurance", href: ROUTES.B2B_INSURANCE, icon: Shield },
  { label: "Account", href: ROUTES.B2B_WALLET, icon: Wallet },
  { label: "Series Fare", href: ROUTES.B2B_SERIES_FARE, icon: Tag },
];

// Items that live inside the "More" dropdown in the B2B top nav.
//
// NOTE — Markup Tool and Sub-Agents are temporarily commented out per the
// product owner's request (the agent-side markup is admin-controlled now,
// and sub-agent management has open issues we'll revisit later). Re-enable
// by uncommenting the lines below — no other code change needed.
export const B2B_SIDEBAR_MORE: NavItem[] = [
  { label: "My Bookings", href: ROUTES.B2B_BOOKINGS, icon: BookOpen },
  { label: "Commission", href: ROUTES.B2B_COMMISSION, icon: TrendingUp },
  { label: "Clients",     href: ROUTES.B2B_CLIENTS,   icon: Contact },
  { label: "Branding",    href: ROUTES.B2B_BRANDING,  icon: ImageIcon },
  // { label: "Markup Tool", href: ROUTES.B2B_MARKUP,    icon: BadgePercent },
  // { label: "Sub-Agents",  href: ROUTES.B2B_SUBAGENTS, icon: Users },
  { label: "Reports",     href: ROUTES.B2B_REPORTS,   icon: BarChart3 },
];

export const B2B_SIDEBAR_BOTTOM: NavItem[] = [
  { label: "Profile", href: ROUTES.B2B_PROFILE, icon: User },
  { label: "Help", href: ROUTES.B2B_HELP, icon: HelpCircle },
];