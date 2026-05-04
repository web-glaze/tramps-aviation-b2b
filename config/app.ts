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
} from "lucide-react";
import type { NavItem } from "@/types";

export const APP_NAME = "Tramps Aviation";
export const APP_DESCRIPTION = "B2B & B2C Travel Platform";

export const ROUTES = {
  HOME: "/",
  // B2B Agent Portal
  B2B_LOGIN: "/b2b/login",
  B2B_REGISTER: "/b2b/register",
  B2B_DASHBOARD: "/b2b/dashboard",
  B2B_FLIGHTS: "/b2b/flights",
  B2B_HOTELS: "/b2b/hotels",
  B2B_INSURANCE: "/b2b/insurance",
  B2B_BOOKINGS: "/b2b/bookings",
  B2B_WALLET: "/b2b/wallet",
  B2B_COMMISSION: "/b2b/commission",
  B2B_REPORTS: "/b2b/reports",
  B2B_PROFILE: "/b2b/profile",
  B2B_KYC: "/b2b/kyc",
  B2B_SERIES_FARE: "/b2b/series-fare",
  B2B_SUBAGENTS: "/b2b/subagents",
  B2B_MARKUP: "/b2b/markup",
  // B2C Customer Portal
  B2C_LOGIN: "/b2c/login",
  B2C_REGISTER: "/b2c/register",
  B2C_FLIGHTS: "/b2c/flights",
  B2C_HOTELS: "/b2c/hotels",
  B2C_INSURANCE: "/b2c/insurance",
  B2C_MY_TRIPS: "/b2c/my-trips",
} as const;

// B2B Sidebar Navigation — primary items (shown directly in top bar)
export const B2B_SIDEBAR_NAV: NavItem[] = [
  { label: "Dashboard", href: ROUTES.B2B_DASHBOARD, icon: LayoutDashboard },
  { label: "Flights", href: ROUTES.B2B_FLIGHTS, icon: Plane },
  { label: "Hotels", href: ROUTES.B2B_HOTELS, icon: Hotel },
  { label: "Insurance", href: ROUTES.B2B_INSURANCE, icon: Shield },
  { label: "Wallet", href: ROUTES.B2B_WALLET, icon: Wallet },
  { label: "Series Fare", href: "/b2b/series-fare", icon: Tag },
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
  // { label: "Markup Tool", href: ROUTES.B2B_MARKUP,    icon: BadgePercent },
  // { label: "Sub-Agents",  href: ROUTES.B2B_SUBAGENTS, icon: Users },
  { label: "Reports",     href: ROUTES.B2B_REPORTS,   icon: BarChart3 },
];

export const B2B_SIDEBAR_BOTTOM: NavItem[] = [
  { label: "Profile", href: ROUTES.B2B_PROFILE, icon: User },
  { label: "Help", href: "/b2b/help", icon: HelpCircle },
];