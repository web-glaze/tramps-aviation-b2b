"use client";

/**
 * Footer.tsx — single footer for the whole site.
 *
 * Replaces B2BAuthFooter and CommonFooter.
 *
 * Auto-picks one of two visual modes from `usePathname()`:
 *
 *   ┌─ COMPACT MODE ─────────────────────────────────────────────────────┐
 *   │  Used on auth pages (/b2b/login, /b2b/register, /b2b/forgot-       │
 *   │  password, /b2b/reset-password, /b2b/kyc).                          │
 *   │  Layout: thin bar — copyright + Home / Sign In / Register links     │
 *   │  + support email.                                                  │
 *   └────────────────────────────────────────────────────────────────────┘
 *
 *   ┌─ FULL MODE ────────────────────────────────────────────────────────┐
 *   │  Used everywhere else.                                              │
 *   │  Layout: full marketing footer with brand block, 4 nav columns,    │
 *   │  contact card, agent CTA banner, trust badges, copyright.          │
 *   └────────────────────────────────────────────────────────────────────┘
 *
 * Callers don't pick a variant — just <Footer />.
 */

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Phone,
  Mail,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  MessageCircle,
  Shield,
  BadgeCheck,
  Plane,
  ArrowRight,
  Zap,
} from "lucide-react";
import { AppLogo } from "@/components/shared/AppLogo";
import { APP_NAME } from "@/config/app";
import { useAuthStore, usePlatformStore } from "@/lib/store";

// Routes that should use the compact footer.
const COMPACT_PREFIXES = [
  "/b2b/login",
  "/b2b/register",
  "/b2b/forgot-password",
  "/b2b/reset-password",
  "/b2b/kyc",
];

// ─────────────────────────────────────────────────────────────────────────────
// MODE PICKER
// ─────────────────────────────────────────────────────────────────────────────

export function Footer() {
  const pathname = usePathname() || "/";
  const isCompact = COMPACT_PREFIXES.some((p) => pathname.startsWith(p));
  return isCompact ? <CompactFooter /> : <FullFooter />;
}

// ═════════════════════════════════════════════════════════════════════════════
// COMPACT FOOTER — used on auth + KYC pages
// ═════════════════════════════════════════════════════════════════════════════

const COMPACT_LINKS = [
  { label: "Home", href: "/" },
  { label: "Sign In", href: "/b2b/login" },
  { label: "Register", href: "/b2b/register" },
];

function CompactFooter() {
  return (
    <footer className="bg-card/50 shadow-[0_-2px_8px_rgba(32,154,205,0.05)]">
      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          © {new Date().getFullYear()} Tramps Aviation B2B. All rights reserved.
        </span>
        <div className="flex items-center gap-4 flex-wrap justify-center">
          {COMPACT_LINKS.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="hover:text-foreground transition-colors"
            >
              {label}
            </Link>
          ))}
          <a
            href="mailto:support@trampsaviation.com"
            className="hover:text-foreground transition-colors"
          >
            support@trampsaviation.com
          </a>
        </div>
      </div>
    </footer>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// FULL FOOTER — marketing + portal default
// ═════════════════════════════════════════════════════════════════════════════

const NAV_COLUMNS = [
  {
    title: "Platform",
    links: [
      { href: "/flights", label: "Search Flights" },
      { href: "/hotels", label: "Book Hotels" },
      { href: "/insurance", label: "Travel Insurance" },
      { href: "/series-fare", label: "Series Fares" },
    ],
  },
  {
    title: "Agent",
    links: [
      { href: "/b2b/login", label: "Agent Login" },
      { href: "/b2b/register", label: "Register as Agent" },
      { href: "/b2b/dashboard", label: "Dashboard" },
      { href: "/b2b/wallet", label: "My Wallet" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/faq", label: "FAQs" },
      { href: "/refund", label: "Refund Policy" },
      { href: "/b2b/help", label: "Agent Support" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms of Service" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/about", label: "About Us" },
    ],
  },
];

const SOCIAL_ICONS: Record<string, { Icon: any; label: string }> = {
  socialFacebook: { Icon: Facebook, label: "Facebook" },
  socialTwitter: { Icon: Twitter, label: "Twitter / X" },
  socialInstagram: { Icon: Instagram, label: "Instagram" },
  socialLinkedin: { Icon: Linkedin, label: "LinkedIn" },
  socialYoutube: { Icon: Youtube, label: "YouTube" },
  socialWhatsapp: { Icon: MessageCircle, label: "WhatsApp" },
};

function FullFooter() {
  const { role } = useAuthStore();
  const { ps, fetchIfStale } = usePlatformStore();
  useEffect(() => {
    fetchIfStale();
  }, []);

  // Logged-in agents browsing /flights etc. should bounce to the /b2b/* mirror
  // when clicking nav links — anonymous visitors stay on the public version.
  const routeForContext = (href: string) => {
    if (
      role === "agent" &&
      ["/flights", "/hotels", "/insurance", "/series-fare"].includes(href)
    ) {
      return `/b2b${href}`;
    }
    return href;
  };

  const name = ps.platformName || APP_NAME;
  const tagline = ps.platformTagline || "B2B Travel Agent Platform";
  const description =
    ps.platformDescription ||
    "India's premier B2B travel booking platform. Exclusive agent rates on flights, hotels and insurance with dedicated wallet & commission system.";
  const copyright =
    ps.footerCopyright ||
    "Tramps Aviation India Pvt. Ltd. All rights reserved.";
  const email = ps.supportEmail || "support@trampsaviation.in";
  const phone = ps.supportPhone || "";
  const phoneDisplay = ps.supportPhoneDisplay || "1800-001-2345 (Toll Free)";
  const address = [
    ps.addressLine1,
    ps.addressLine2,
    ps.city,
    ps.state,
    ps.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  const socialLinks = Object.entries(SOCIAL_ICONS)
    .map(([key, { Icon, label }]) => ({
      key,
      Icon,
      label,
      url: (ps as any)[key],
    }))
    .filter((s) => s.url);

  return (
    <footer className="bg-card mt-16 shadow-[0_-2px_10px_rgba(32,154,205,0.06)]">
      {/* ─── Section 1: brand + nav columns + contact ──────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-14 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Brand block (3 cols) */}
          <div className="lg:col-span-3 space-y-5">
            <Link
              href={role === "agent" ? "/b2b/dashboard" : "/"}
              className="flex items-center gap-3 w-fit group"
            >
              <div className="h-11 w-11 rounded-2xl overflow-hidden border border-border bg-white flex-shrink-0 shadow-sm">
                <AppLogo size="h-11 w-11" />
              </div>
              <div>
                <span className="font-extrabold text-base leading-tight block text-[hsl(var(--brand-blue))] group-hover:text-[hsl(var(--brand-blue-dark))] transition-colors tracking-tight">
                  {name}
                </span>
                <span className="text-[10px] font-bold text-[hsl(var(--brand-orange))] tracking-[0.12em] uppercase">
                  {tagline}
                </span>
              </div>
            </Link>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>

            <div className="flex gap-2 flex-wrap">
              {socialLinks.length > 0
                ? socialLinks.map(({ key, Icon, label, url }) => (
                    <a
                      key={key}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      title={label}
                      className="h-9 w-9 rounded-xl border border-border bg-background hover:bg-[hsl(var(--brand-blue))] hover:border-[hsl(var(--brand-blue))] hover:text-white hover:shadow-md hover:shadow-[hsl(var(--brand-blue))]/30 hover:-translate-y-0.5 flex items-center justify-center transition-all text-muted-foreground"
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  ))
                : [Facebook, Twitter, Instagram, Linkedin, Youtube].map(
                    (Icon, i) => (
                      <span
                        key={i}
                        className="h-9 w-9 rounded-xl border border-border/40 flex items-center justify-center text-muted-foreground/25"
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                    ),
                  )}
            </div>
          </div>

          {/* Nav columns + Contact (9 cols = 5 columns on lg+) */}
          <div className="lg:col-span-9">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8">
              {NAV_COLUMNS.map(({ title, links }) => (
                <div key={title} className="space-y-4">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-widest border-b border-border pb-2">
                    {title}
                  </h4>
                  <ul className="space-y-2.5">
                    {links.map(({ href, label }) => (
                      <li key={label}>
                        <Link
                          href={routeForContext(href)}
                          className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 group"
                        >
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/30 group-hover:bg-primary transition-colors shrink-0" />
                          {label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {/* Contact column */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-widest border-b border-border pb-2">
                  Contact Us
                </h4>
                <ul className="space-y-3">
                  {(phone || phoneDisplay) && (
                    <li>
                      <a
                        href={phone ? `tel:${phone.replace(/\D/g, "")}` : "#"}
                        className="flex items-start gap-2.5 group"
                      >
                        <div className="mt-0.5 w-6 h-6 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                          <Phone className="h-3 w-3 text-green-600" />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide leading-none mb-0.5">
                            Phone
                          </p>
                          <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
                            {phoneDisplay}
                          </p>
                        </div>
                      </a>
                    </li>
                  )}
                  <li>
                    <a
                      href={`mailto:${email}`}
                      className="flex items-start gap-2.5 group"
                    >
                      <div className="mt-0.5 w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                        <Mail className="h-3 w-3 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide leading-none mb-0.5">
                          Email
                        </p>
                        <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors leading-tight break-all">
                          {email}
                        </p>
                      </div>
                    </a>
                  </li>
                  {address && (
                    <li>
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 w-6 h-6 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                          <MapPin className="h-3 w-3 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide leading-none mb-0.5">
                            Address
                          </p>
                          <p className="text-xs text-foreground leading-relaxed">
                            {address}
                          </p>
                        </div>
                      </div>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Section 2: Trust badges ──────────────────────────────────── */}
      <div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-center gap-8">
          {[
            {
              icon: <Shield className="h-3.5 w-3.5 text-emerald-500" />,
              text: "SSL Secured",
            },
            {
              icon: <BadgeCheck className="h-3.5 w-3.5 text-[#209ACD]" />,
              text: "IATA Accredited",
            },
            {
              icon: <BadgeCheck className="h-3.5 w-3.5 text-purple-500" />,
              text: "RBI Licensed",
            },
            {
              icon: <Plane className="h-3.5 w-3.5 text-primary" />,
              text: "200+ Airlines",
            },
          ].map(({ icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium"
            >
              {icon} {text}
            </div>
          ))}
        </div>
      </div>

      {/* ─── Section 3: Copyright ─────────────────────────────────────── */}
      <div className="bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            © {new Date().getFullYear()} {copyright}
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Link
              href="/privacy"
              className="px-2 py-1 hover:text-primary transition-colors"
            >
              Privacy
            </Link>
            <span className="text-border">·</span>
            <Link
              href="/terms"
              className="px-2 py-1 hover:text-primary transition-colors"
            >
              Terms
            </Link>
            <span className="text-border">·</span>
            <Link
              href="/refund"
              className="px-2 py-1 hover:text-primary transition-colors"
            >
              Refund
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
