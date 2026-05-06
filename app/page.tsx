"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plane,
  Hotel,
  ShieldCheck,
  Tag,
  Users,
  ArrowRight,
  CalendarDays,
  MapPin,
  Search,
  Building2,
  BarChart3,
  Lock,
  BadgeCheck,
  Zap,
  Mail,
  Star,
  MessageCircle,
  TrendingUp,
  CreditCard,
  Clock,
} from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ContactQueryForm } from "@/components/contact/ContactQueryForm";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────

const todayISO = () => new Date().toISOString().split("T")[0];
const tomorrowISO = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
};

type ProductTab = "flights" | "hotels" | "insurance" | "series";

// ─────────────────────────────────────────────────────────────────────────────
// HERO SEARCH WIDGET
// Tabs delegate to the existing /flights, /hotels, /insurance, /series-fare
// pages with prefilled query strings.
// ─────────────────────────────────────────────────────────────────────────────

function HeroSearch() {
  const router = useRouter();
  const [tab, setTab] = useState<ProductTab>("flights");

  // Flights / Series Fare share these fields
  const [origin, setOrigin] = useState("DEL");
  const [destination, setDestination] = useState("BOM");
  const [departureDate, setDepartureDate] = useState(todayISO());
  const [adults, setAdults] = useState(1);

  // Hotel-specific
  const [city, setCity] = useState("Mumbai");
  const [checkIn, setCheckIn] = useState(todayISO());
  const [checkOut, setCheckOut] = useState(tomorrowISO());
  const [guests, setGuests] = useState(2);

  // Insurance-specific — kept structurally parallel to flights/hotels so
  // the search card stays the same height when the visitor flips between
  // tabs (no jarring shrink when "Insurance" is selected).
  const [tripScope, setTripScope] = useState<"domestic" | "international">("domestic");
  const [travelers, setTravelers] = useState(1);
  const [tripStart, setTripStart] = useState(todayISO());
  const [tripEnd, setTripEnd] = useState(tomorrowISO());

  const handleSearch = () => {
    if (tab === "flights") {
      const q = new URLSearchParams({
        origin,
        destination,
        date: departureDate,
        adults: String(adults),
      });
      router.push(`/flights?${q.toString()}`);
    } else if (tab === "series") {
      const q = new URLSearchParams({
        origin,
        destination,
        date: departureDate,
        adults: String(adults),
      });
      router.push(`/series-fare?${q.toString()}`);
    } else if (tab === "hotels") {
      const q = new URLSearchParams({
        city,
        checkIn,
        checkOut,
        guests: String(guests),
      });
      router.push(`/hotels?${q.toString()}`);
    } else if (tab === "insurance") {
      // Pass the chosen quick-filters along — the /insurance page can use
      // them to pre-filter the plan list (no-op if not implemented yet).
      const q = new URLSearchParams({
        scope: tripScope,
        travelers: String(travelers),
        startDate: tripStart,
        endDate: tripEnd,
      });
      router.push(`/insurance?${q.toString()}`);
    }
  };

  const tabs: { key: ProductTab; label: string; icon: typeof Plane }[] = [
    { key: "flights", label: "Flights", icon: Plane },
    { key: "hotels", label: "Hotels", icon: Hotel },
    { key: "insurance", label: "Insurance", icon: ShieldCheck },
    { key: "series", label: "Series Fare", icon: Tag },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl p-3 sm:p-5 shadow-xl shadow-primary/5">
      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-muted/50 rounded-xl mb-4">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex-1 sm:flex-initial justify-center",
              tab === key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/60",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Form rows */}
      {(tab === "flights" || tab === "series") && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Field label="From">
            <FieldIcon>
              <MapPin />
            </FieldIcon>
            <input
              value={origin}
              onChange={(e) => setOrigin(e.target.value.toUpperCase())}
              placeholder="DEL"
              className="w-full bg-transparent outline-none text-sm font-semibold uppercase"
              maxLength={3}
            />
          </Field>
          <Field label="To">
            <FieldIcon>
              <MapPin />
            </FieldIcon>
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value.toUpperCase())}
              placeholder="BOM"
              className="w-full bg-transparent outline-none text-sm font-semibold uppercase"
              maxLength={3}
            />
          </Field>
          <Field label="Departure date">
            <FieldIcon>
              <CalendarDays />
            </FieldIcon>
            <input
              type="date"
              min={todayISO()}
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              className="w-full bg-transparent outline-none text-sm"
            />
          </Field>
          <Field label="Adults">
            <FieldIcon>
              <Users />
            </FieldIcon>
            <input
              type="number"
              min={1}
              max={9}
              value={adults}
              onChange={(e) =>
                setAdults(
                  Math.min(9, Math.max(1, parseInt(e.target.value || "1", 10))),
                )
              }
              className="w-full bg-transparent outline-none text-sm"
            />
          </Field>
        </div>
      )}

      {tab === "hotels" && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Field label="City">
            <FieldIcon>
              <MapPin />
            </FieldIcon>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Mumbai"
              className="w-full bg-transparent outline-none text-sm font-semibold"
            />
          </Field>
          <Field label="Check-in">
            <FieldIcon>
              <CalendarDays />
            </FieldIcon>
            <input
              type="date"
              min={todayISO()}
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full bg-transparent outline-none text-sm"
            />
          </Field>
          <Field label="Check-out">
            <FieldIcon>
              <CalendarDays />
            </FieldIcon>
            <input
              type="date"
              min={checkIn}
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full bg-transparent outline-none text-sm"
            />
          </Field>
          <Field label="Guests">
            <FieldIcon>
              <Users />
            </FieldIcon>
            <input
              type="number"
              min={1}
              max={10}
              value={guests}
              onChange={(e) =>
                setGuests(
                  Math.min(
                    10,
                    Math.max(1, parseInt(e.target.value || "1", 10)),
                  ),
                )
              }
              className="w-full bg-transparent outline-none text-sm"
            />
          </Field>
        </div>
      )}

      {tab === "insurance" && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Field label="Trip type">
            <FieldIcon>
              <ShieldCheck />
            </FieldIcon>
            <select
              value={tripScope}
              onChange={(e) =>
                setTripScope(e.target.value as "domestic" | "international")
              }
              className="w-full bg-transparent outline-none text-sm font-semibold"
            >
              <option value="domestic">Domestic</option>
              <option value="international">International</option>
            </select>
          </Field>
          <Field label="Travelers">
            <FieldIcon>
              <Users />
            </FieldIcon>
            <input
              type="number"
              min={1}
              max={10}
              value={travelers}
              onChange={(e) =>
                setTravelers(
                  Math.min(
                    10,
                    Math.max(1, parseInt(e.target.value || "1", 10)),
                  ),
                )
              }
              className="w-full bg-transparent outline-none text-sm"
            />
          </Field>
          <Field label="Start date">
            <FieldIcon>
              <CalendarDays />
            </FieldIcon>
            <input
              type="date"
              min={todayISO()}
              value={tripStart}
              onChange={(e) => setTripStart(e.target.value)}
              className="w-full bg-transparent outline-none text-sm"
            />
          </Field>
          <Field label="End date">
            <FieldIcon>
              <CalendarDays />
            </FieldIcon>
            <input
              type="date"
              min={tripStart}
              value={tripEnd}
              onChange={(e) => setTripEnd(e.target.value)}
              className="w-full bg-transparent outline-none text-sm"
            />
          </Field>
        </div>
      )}

      {/* CTA — primary blue */}
      <button
        onClick={handleSearch}
        className="mt-4 w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
      >
        <Search className="h-4 w-4" />
        {tab === "flights"
          ? "Search Flights"
          : tab === "hotels"
            ? "Search Hotels"
            : tab === "insurance"
              ? "View Insurance Plans"
              : "Find Series Fares"}
      </button>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </label>
      <div className="flex items-center gap-2 h-11 px-3 rounded-xl border border-border bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-all">
        {children}
      </div>
    </div>
  );
}

function FieldIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-muted-foreground [&>svg]:h-4 [&>svg]:w-4 flex-shrink-0">
      {children}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE CARD
// One blue-tinted icon and one orange-tinted icon for visual variety,
// keeping the 80/20 mix.
// ─────────────────────────────────────────────────────────────────────────────

interface Feature {
  icon: typeof Plane;
  title: string;
  desc: string;
  accent?: "blue" | "orange";
}

function FeatureCard({ f }: { f: Feature }) {
  const isOrange = f.accent === "orange";
  return (
    <div className="bg-card border border-border rounded-2xl p-5 hover:shadow-md hover:border-primary/30 transition-all">
      <div
        className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center mb-4",
          isOrange ? "bg-[hsl(var(--brand-orange))]/10" : "bg-primary/10",
        )}
      >
        <f.icon
          className={cn(
            "h-5 w-5",
            isOrange ? "text-[hsl(var(--brand-orange))]" : "text-primary",
          )}
        />
      </div>
      <h3 className="text-base font-bold text-foreground mb-1.5">{f.title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REVIEW CARD
// ─────────────────────────────────────────────────────────────────────────────

interface Review {
  stars: number;
  body: string;
  meta: string;
  context: string;
}

function ReviewCard({ r }: { r: Review }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-0.5 text-amber-400">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                "h-4 w-4",
                i < r.stars ? "fill-current" : "text-muted-foreground/30",
              )}
            />
          ))}
        </div>
        <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {r.context}
        </span>
      </div>
      <p className="text-sm text-foreground leading-relaxed">
        &ldquo;{r.body}&rdquo;
      </p>
      <p className="text-xs text-muted-foreground mt-3 font-medium">
        — {r.meta}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  // Default-light: showing a flicker-free initial render even before hydration
  const showDashboardCta = _hasHydrated && isAuthenticated;

  const features: Feature[] = useMemo(
    () => [
      {
        icon: Plane,
        title: "Flight Booking",
        desc: "Real-time search across 200+ airlines with instant PNR and e-ticket delivery in minutes.",
        accent: "blue",
      },
      {
        icon: Hotel,
        title: "Hotel Booking",
        desc: "Thousands of hotels globally with best-price guarantee and flexible cancellation.",
        accent: "orange",
      },
      {
        icon: ShieldCheck,
        title: "Travel Insurance",
        desc: "Comprehensive plans from Bajaj Allianz starting ₹299 with cashless claim support.",
        accent: "blue",
      },
      {
        icon: Building2,
        title: "B2B Agent Portal",
        desc: "Exclusive agent rates, structured commissions, credit wallet and dedicated support.",
        accent: "orange",
      },
      {
        icon: Zap,
        title: "Instant Booking",
        desc: "Immediate confirmation, instant ticket delivery with complete PNR details.",
        accent: "blue",
      },
      {
        icon: Clock,
        title: "24/7 Support",
        desc: "Round-the-clock customer support for all your travel needs, wherever you are.",
        accent: "blue",
      },
    ],
    [],
  );

  const reviews: Review[] = [
    {
      stars: 5,
      body: "Best platform for booking flights! The prices are unbeatable and the booking process is super smooth. Highly recommended.",
      meta: "Verified Traveler",
      context: "IndiGo · DEL→BOM",
    },
    {
      stars: 5,
      body: "The B2B portal has completely transformed my business. Commission structure is excellent and wallet system works perfectly.",
      meta: "Travel Agent, Mumbai",
      context: "B2B Agent Portal",
    },
    {
      stars: 4,
      body: "Great customer support and instant ticket delivery. Had an issue once and they resolved it within 30 minutes!",
      meta: "Verified Traveler",
      context: "Air India · BOM→BLR",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1">
        {/* ════════════════════════════════════════════════════════════
            HERO
        ════════════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden">
          {/* Soft world-map background tone (inline SVG, no asset dep) */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 30%, hsl(var(--primary) / 0.15), transparent 40%), radial-gradient(circle at 80% 70%, hsl(var(--brand-orange) / 0.10), transparent 40%)",
            }}
          />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-14 sm:pt-16 sm:pb-16">
            <div className="text-center max-w-3xl mx-auto mb-10">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1]">
                Tramps Aviation Smarter,
                <br />
                <span className="text-primary">Book Faster</span>
              </h1>
              <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                Flights, hotels & travel insurance for travelers and travel
                agents. Best prices, instant confirmation, 24/7 support.
              </p>

              {showDashboardCta && (
                <div className="mt-6 flex justify-center">
                  <Link
                    href="/b2b/dashboard"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[hsl(var(--brand-orange))] text-white text-sm font-bold hover:opacity-90 transition-opacity"
                  >
                    Go to Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>

            {/* Search widget */}
            <div className="max-w-4xl mx-auto">
              <HeroSearch />
            </div>

            {/* ── Quick stats below search ──────────────────────────
                Pre-fix: this strip used to live twice on the home page —
                once here under the hero and once again after the
                feature-cards grid. The lower one was deleted; this is
                now the single source of truth for the platform numbers. */}
            <div className="mt-8 max-w-5xl mx-auto">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                  {
                    icon: Users,
                    num: "2L+",
                    label: "Happy Travelers",
                    accent: "primary" as const,
                  },
                  {
                    icon: BadgeCheck,
                    num: "500+",
                    label: "Travel Agents",
                    accent: "primary" as const,
                  },
                  {
                    icon: Plane,
                    num: "200+",
                    label: "Airlines",
                    accent: "primary" as const,
                  },
                  {
                    icon: TrendingUp,
                    num: "₹50Cr+",
                    label: "Bookings Processed",
                    accent: "orange" as const,
                  },
                ].map((s) => {
                  const isOrange = s.accent === "orange";
                  return (
                    <div
                      key={s.label}
                      className={cn(
                        "group relative overflow-hidden rounded-2xl border bg-card/80 backdrop-blur p-4 sm:p-5 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg",
                        isOrange
                          ? "border-[hsl(var(--brand-orange))]/20 hover:shadow-[hsl(var(--brand-orange))]/10 hover:border-[hsl(var(--brand-orange))]/40"
                          : "border-primary/15 hover:shadow-primary/10 hover:border-primary/30",
                      )}
                    >
                      {/* Subtle radial sheen — visible only on hover */}
                      <span
                        className={cn(
                          "pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity",
                          isOrange
                            ? "bg-[radial-gradient(ellipse_at_top,hsl(var(--brand-orange)/0.08),transparent_70%)]"
                            : "bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_70%)]",
                        )}
                        aria-hidden="true"
                      />

                      <div className="relative">
                        {/* Icon chip */}
                        <div
                          className={cn(
                            "inline-flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl mb-2 sm:mb-3 transition-transform duration-200 group-hover:scale-110",
                            isOrange
                              ? "bg-[hsl(var(--brand-orange))]/10 text-[hsl(var(--brand-orange))] ring-1 ring-[hsl(var(--brand-orange))]/20"
                              : "bg-primary/10 text-primary ring-1 ring-primary/20",
                          )}
                        >
                          <s.icon className="h-5 w-5 sm:h-5.5 sm:w-5.5" aria-hidden="true" />
                        </div>

                        {/* Big number */}
                        <p
                          className={cn(
                            "text-2xl sm:text-3xl lg:text-[2rem] font-black tracking-tight leading-none",
                            isOrange
                              ? "text-[hsl(var(--brand-orange))]"
                              : "text-primary",
                          )}
                        >
                          {s.num}
                        </p>

                        {/* Label */}
                        <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1.5">
                          {s.label}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            AIRLINES STRIP
            Unified vertical rhythm: every non-hero section uses
            py-14 sm:py-16 for equal breathing room. The airlines strip
            looks lighter than other sections because its inner card
            keeps content visually compact.
        ════════════════════════════════════════════════════════════ */}
        <section className="bg-muted/30 py-14 sm:py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="bg-card border border-border rounded-2xl px-6 py-5">
              <p className="text-center text-[11px] font-bold tracking-[0.15em] uppercase text-muted-foreground mb-3">
                We cover all major airlines
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                {[
                  "IndiGo",
                  "Air India",
                  "SpiceJet",
                  "Vistara",
                  "GoFirst",
                  "AirAsia",
                ].map((a) => (
                  <div
                    key={a}
                    className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground"
                  >
                    <Plane className="h-3.5 w-3.5 text-primary" />
                    {a}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            "ARE YOU A TRAVEL AGENT?" — first agent pitch above the fold,
            so new visitors immediately understand the value proposition.
            Orange accent because this IS the brand's agent-conversion CTA.
        ════════════════════════════════════════════════════════════ */}
        <section className="py-14 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="rounded-3xl border border-[hsl(var(--brand-orange))]/30 bg-gradient-to-br from-[hsl(var(--brand-orange))]/8 via-[hsl(var(--brand-orange))]/3 to-primary/5 p-6 sm:p-8">
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
                {/* Left — pitch */}
                <div className="flex-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[hsl(var(--brand-orange))]/15 text-[hsl(var(--brand-orange))] border border-[hsl(var(--brand-orange))]/25 text-[11px] font-bold tracking-wide uppercase">
                    <Building2 className="h-3 w-3" />
                    For Travel Agents
                  </span>
                  <h3 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    Are you a travel agent?{" "}
                    <span className="text-[hsl(var(--brand-orange))]">
                      Earn more on every booking.
                    </span>
                  </h3>
                  <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl">
                    Tramps Aviation gives travel agents{" "}
                    <strong className="text-foreground">
                      exclusive contracted fares
                    </strong>
                    ,{" "}
                    <strong className="text-foreground">
                      structured commissions up to 8%
                    </strong>
                    , a{" "}
                    <strong className="text-foreground">
                      credit wallet up to ₹5 Lakh
                    </strong>
                    , and{" "}
                    <strong className="text-foreground">
                      instant ticketing
                    </strong>{" "}
                    — everything you need to grow your travel business.
                  </p>
                </div>

                {/* Right — quick benefits + CTA */}
                <div className="w-full lg:w-auto lg:min-w-[260px] flex flex-col gap-3">
                  {[
                    { icon: TrendingUp, text: "Up to 8% commission" },
                    { icon: CreditCard, text: "₹5L credit wallet" },
                    { icon: Zap, text: "Instant PNR + e-ticket" },
                  ].map(({ icon: Icon, text }) => (
                    <div
                      key={text}
                      className="flex items-center gap-2.5 text-sm"
                    >
                      <span className="h-7 w-7 rounded-lg bg-[hsl(var(--brand-orange))]/15 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-3.5 w-3.5 text-[hsl(var(--brand-orange))]" />
                      </span>
                      <span className="font-semibold text-foreground">
                        {text}
                      </span>
                    </div>
                  ))}
                  <Link
                    href="/b2b/register"
                    className="mt-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[hsl(var(--brand-orange))] text-white text-sm font-bold hover:opacity-90 transition-opacity"
                  >
                    Register as Agent — Free
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/b2b/login"
                    className="text-center text-xs text-muted-foreground hover:text-primary transition-colors -mt-1"
                  >
                    Already an agent? Sign in →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            FEATURES — 80% blue accents, 20% orange accents
        ════════════════════════════════════════════════════════════ */}
        <section className="bg-muted/30 py-14 sm:py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-bold tracking-wide uppercase">
                Why Tramps Aviation
              </span>
              <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Everything you need to travel
              </h2>
              <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
                From booking to boarding — we&apos;ve got you covered at every
                step of your journey.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((f) => (
                <FeatureCard key={f.title} f={f} />
              ))}
            </div>

            {/* NOTE: the stats strip that used to live here was a
                duplicate of the one under the hero search widget — same
                4 numbers (Happy Travelers / Travel Agents / Airlines /
                Bookings Processed). Removed to avoid showing the same
                data twice on the page. The hero strip is the canonical
                home for these numbers. */}
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            B2B PORTAL PITCH — orange accent (the headline 20% moment)
        ════════════════════════════════════════════════════════════ */}
        <section className="py-14 sm:py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              {/* Left: copy + CTAs */}
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-bold tracking-wide uppercase">
                  <Building2 className="h-3 w-3" />
                  For Travel Professionals
                </span>
                <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
                  Grow your travel business with our{" "}
                  <span className="text-primary">B2B Agent Portal</span>
                </h2>
                <p className="mt-4 text-sm sm:text-base text-muted-foreground">
                  Join hundreds of travel agents who trust Tramps Aviation for
                  competitive rates, powerful management tools, and dedicated
                  support.
                </p>

                <ul className="mt-6 space-y-3">
                  {[
                    {
                      icon: CreditCard,
                      text: "Wallet system with credit limit up to ₹5 Lakh",
                      accent: "primary" as const,
                    },
                    {
                      icon: BarChart3,
                      text: "Commission dashboard with real-time earnings",
                      accent: "primary" as const,
                    },
                    {
                      icon: Lock,
                      text: "KYC-verified secure platform with fraud protection",
                      accent: "primary" as const,
                    },
                    {
                      icon: BadgeCheck,
                      text: "Exclusive B2B rates not available to consumers",
                      accent: "orange" as const,
                    },
                  ].map((row, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div
                        className={cn(
                          "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0",
                          row.accent === "orange"
                            ? "bg-[hsl(var(--brand-orange))]/10"
                            : "bg-primary/10",
                        )}
                      >
                        <row.icon
                          className={cn(
                            "h-4 w-4",
                            row.accent === "orange"
                              ? "text-[hsl(var(--brand-orange))]"
                              : "text-primary",
                          )}
                        />
                      </div>
                      <span className="text-sm text-foreground pt-1">
                        {row.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Dual CTA — orange register (primary action) + neutral login */}
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/b2b/register"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[hsl(var(--brand-orange))] text-white text-sm font-bold hover:opacity-90 transition-opacity"
                  >
                    Register as Agent
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/b2b/login"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-foreground text-sm font-bold hover:bg-muted transition-colors"
                  >
                    Agent Login
                  </Link>
                </div>
              </div>

              {/* Right: 4 metric tiles (mock dashboard preview) */}
              <div className="grid grid-cols-2 gap-4">
                <DashboardTilePreview
                  icon={TrendingUp}
                  num="₹4.8L"
                  label="Commission Earned"
                  sub="This month"
                  accent="primary"
                />
                <DashboardTilePreview
                  icon={Plane}
                  num="284"
                  label="Active Bookings"
                  sub="This month"
                  accent="primary"
                />
                <DashboardTilePreview
                  icon={CreditCard}
                  num="₹2.1L"
                  label="Wallet Balance"
                  sub="Available"
                  accent="primary"
                />
                <DashboardTilePreview
                  icon={Users}
                  num="500+"
                  label="Partner Agents"
                  sub="Nationwide"
                  accent="orange"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            REVIEWS
        ════════════════════════════════════════════════════════════ */}
        <section className="bg-muted/30 py-14 sm:py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-bold tracking-wide uppercase">
                Customer Reviews
              </span>
              <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Trusted by travelers & agents
              </h2>
              <p className="mt-3 text-sm sm:text-base text-muted-foreground">
                Real reviews from verified bookings
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {reviews.map((r, i) => (
                <ReviewCard key={i} r={r} />
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            CONTACT
        ════════════════════════════════════════════════════════════ */}
        <section className="py-14 sm:py-16">
          {/* Pre-fix: outer was max-w-4xl (768px) — too narrow for the
              left contact-options + right form two-column layout. The
              form ended up squeezed into ~440px, causing field labels
              to wrap and "Send Message" to break. Bumped to max-w-6xl
              (1152px) so the form has ~700px breathing room. */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="bg-card border border-border rounded-2xl p-6 sm:p-10 relative overflow-hidden">
              {/* Soft accent glow */}
              <div
                aria-hidden
                className="absolute inset-0 opacity-50 pointer-events-none"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 0% 0%, hsl(var(--primary) / 0.08), transparent 40%), radial-gradient(circle at 100% 100%, hsl(var(--brand-orange) / 0.06), transparent 40%)",
                }}
              />
              <div className="relative">
                <div className="text-center mb-8">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-bold tracking-wide uppercase">
                    <Zap className="h-3 w-3" />
                    We are here to help you
                  </span>
                  <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                    Have questions? Let&apos;s talk.
                  </h2>
                  <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-lg mx-auto">
                    Whether you&apos;re a traveler or a travel agent — drop us a
                    message and our team gets back within 24 hours.
                  </p>
                </div>

                {/* Pre-fix: the inner grid was 260px+1fr nested inside an
                    already-narrow parent, squashing the form. Now the
                    section uses the full row and the contact options sit
                    in a roomier 280px column with the form taking the
                    remaining ~520-680px depending on viewport. */}
                <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-5 mb-6 max-w-5xl mx-auto">
                  {/* Quick contact options */}
                  <div className="space-y-3">
                    <a
                      href="https://wa.me/919999999999"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 rounded-xl border-2 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors"
                    >
                      <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                        <MessageCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="text-left min-w-0 flex-1">
                        <p className="text-[10px] font-bold tracking-wider uppercase text-emerald-700 dark:text-emerald-400">
                          WhatsApp
                        </p>
                        <p className="text-sm font-bold text-foreground truncate">
                          Chat with Us
                        </p>
                      </div>
                    </a>

                    <a
                      href="mailto:support@trampsaviation.com"
                      className="flex items-center gap-3 p-4 rounded-xl border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors"
                    >
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-left min-w-0 flex-1">
                        <p className="text-[10px] font-bold tracking-wider uppercase text-primary">
                          Email
                        </p>
                        <p className="text-sm font-bold text-foreground truncate">
                          support@…
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          trampsaviation.com
                        </p>
                      </div>
                    </a>

                    <Link
                      href="/flights"
                      className="flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-muted transition-colors"
                    >
                      <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                        <Search className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="text-left min-w-0 flex-1">
                        <p className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
                          Or just
                        </p>
                        <p className="text-sm font-bold text-foreground truncate">
                          Search Flights →
                        </p>
                      </div>
                    </Link>
                  </div>

                  {/* Inline submit-query form */}
                  <ContactQueryForm />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock dashboard tile (used in B2B portal pitch). Static data, only purpose is
// to give a flavour of what an agent sees once logged in.
// ─────────────────────────────────────────────────────────────────────────────

function DashboardTilePreview({
  icon: Icon,
  num,
  label,
  sub,
  accent,
}: {
  icon: typeof Plane;
  num: string;
  label: string;
  sub: string;
  accent: "primary" | "orange";
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-shadow">
      <div
        className={cn(
          "h-9 w-9 rounded-xl flex items-center justify-center mb-3",
          accent === "orange"
            ? "bg-[hsl(var(--brand-orange))]/10"
            : "bg-primary/10",
        )}
      >
        <Icon
          className={cn(
            "h-4 w-4",
            accent === "orange"
              ? "text-[hsl(var(--brand-orange))]"
              : "text-primary",
          )}
        />
      </div>
      <p
        className={cn(
          "text-2xl font-extrabold",
          accent === "orange"
            ? "text-[hsl(var(--brand-orange))]"
            : "text-primary",
        )}
      >
        {num}
      </p>
      <p className="text-sm font-bold text-foreground mt-0.5">{label}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
