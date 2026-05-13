"use client";

/**
 * ContactQueryForm — inline contact form on the home page.
 *
 * Smart behaviour:
 *  - If the visitor is logged in → name + email pre-filled from auth store
 *    and read-only (we send the JWT bearer too, so backend attaches the
 *    enquiry to their account automatically).
 *  - Topic dropdown lists every option BUT topics that only make sense
 *    for an existing booking (Booking issue / Refund / Wallet) prompt
 *    for a Booking Reference field, AND warn anonymous visitors that
 *    they can resolve those faster by signing in first.
 *  - Honeypot field (`website`) hidden from humans via CSS — bots fill it,
 *    backend silently ignores those submissions.
 *  - Forwards bearer token if present, so backend can identify the user
 *    and stamp the enquiry with agentId/customerId for one-click linking
 *    in the admin enquiries inbox.
 *
 * Backend endpoint: POST /contact/submit (public, rate-limited 5/10min/IP).
 * The endpoint has a strict DTO — name 2–80, email valid, phone format,
 * subject 2–120, message 5–2000. Frontend mirrors those limits so the
 * user sees the error before round-tripping to the server.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Send, CheckCircle2, Loader2, Info, Lock } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/store";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8080/api";

/**
 * Each topic carries the backend `type` enum value AND a flag for whether
 * it's "booking-related" — those topics show a Booking Reference field
 * and a sign-in nudge for anonymous visitors.
 */
const TOPICS = [
  { label: "General enquiry",      type: "general",       bookingRelated: false, requiresLogin: false },
  { label: "Booking issue",        type: "booking_help",  bookingRelated: true,  requiresLogin: true  },
  { label: "Refund / cancellation",type: "refund",        bookingRelated: true,  requiresLogin: true  },
  { label: "Agent registration",   type: "agent_support", bookingRelated: false, requiresLogin: true  },
  { label: "Wallet / payments",    type: "agent_support", bookingRelated: true,  requiresLogin: true  },
  { label: "Other",                type: "other",         bookingRelated: false, requiresLogin: false },
] as const;

const NAME_MAX    = 80;
const EMAIL_MAX   = 120;
const PHONE_MAX   = 20;
const SUBJECT_MAX = 120;
const MESSAGE_MIN = 5;
const MESSAGE_MAX = 2000;

export function ContactQueryForm() {
  const { user, isAuthenticated, _hasHydrated, token } = useAuthStore();

  const loggedIn = _hasHydrated && isAuthenticated;
  const userName  = user?.name || (user as any)?.agencyName || "";
  const userEmail = user?.email || "";

  const [name, setName]               = useState("");
  const [email, setEmail]             = useState("");
  const [phone, setPhone]             = useState("");
  const [topicIdx, setTopicIdx]       = useState(0);
  const [bookingRef, setBookingRef]   = useState("");
  const [message, setMessage]         = useState("");
  // Honeypot — never displayed; if it ever has a value it's a bot.
  const [website, setWebsite]         = useState("");
  const [step, setStep]               = useState<"form" | "loading" | "done">("form");
  const [refId, setRefId]             = useState("");

  // Pre-fill from auth on hydration
  useEffect(() => {
    if (loggedIn) {
      if (!name)  setName(userName);
      if (!email) setEmail(userEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn, userName, userEmail]);

  // Topic visibility: agent-only topics (Booking issue, Refund, Agent
  // registration, Wallet / payments) need login. Anonymous visitors see
  // only "General enquiry" + "Other" — everything else requires an
  // account so we can attach the enquiry to the right record. The list
  // is recomputed on every login-state flip; topicIdx is reset below
  // if the previously-selected topic becomes hidden.
  const visibleTopics = useMemo(
    () => TOPICS.filter((t) => loggedIn || !t.requiresLogin),
    [loggedIn],
  );

  // Clamp topicIdx into the visible-topics range whenever the visible
  // list shrinks (e.g. user logs out while having "Booking issue" picked).
  useEffect(() => {
    if (topicIdx >= visibleTopics.length) setTopicIdx(0);
  }, [visibleTopics.length, topicIdx]);

  const topic = visibleTopics[topicIdx] ?? visibleTopics[0];

  const charsLeft = useMemo(
    () => MESSAGE_MAX - message.length,
    [message],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // Frontend validation (backend re-checks, but failing fast is nicer)
    if (!name.trim() || name.trim().length < 2) {
      toast.error("Please enter your name (min 2 characters)");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }
    if (!message.trim() || message.trim().length < MESSAGE_MIN) {
      toast.error(`Please describe your question (min ${MESSAGE_MIN} characters)`);
      return;
    }
    if (topic.bookingRelated && !bookingRef.trim() && !loggedIn) {
      toast.error(
        `Please add your booking reference, or sign in to look it up automatically.`,
      );
      return;
    }
    setStep("loading");
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      // Forward the JWT if logged in — backend's @Public() route still
      // does a soft-decode to populate req.user, which then attaches the
      // enquiry to the right agent / customer record.
      if (loggedIn && token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`${API_BASE}/contact/submit`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name:       name.trim(),
          email:      email.trim(),
          phone:      phone.trim(),
          subject:    topic.label,
          type:       topic.type,
          message:    message.trim(),
          bookingRef: bookingRef.trim() || undefined,
          source:     "home",
          website,    // honeypot
        }),
      });
      if (res.status === 429) {
        toast.error("Too many messages from this device. Please wait a few minutes and try again.");
        setStep("form");
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      const data = json?.data || json;
      setRefId(data?.referenceId || "");
      setStep("done");
    } catch {
      toast.error("Could not send your message. Try WhatsApp or email above.");
      setStep("form");
    }
  }

  if (step === "done") {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-300 dark:border-emerald-700/40 rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[280px]">
        <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-3">
          <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="font-bold text-lg text-foreground mb-1">
          Thanks for reaching out!
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          We&apos;ve logged your enquiry
          {refId && (
            <>
              {" "}
              (<span className="font-mono font-semibold text-foreground">#{refId}</span>)
            </>
          )}
          . Our team will reply to{" "}
          <span className="font-semibold text-foreground">{email}</span> within
          24 hours.
        </p>
        <button
          onClick={() => {
            if (!loggedIn) {
              setName(""); setEmail("");
            }
            setPhone(""); setBookingRef("");
            setTopicIdx(0); setMessage("");
            setStep("form");
          }}
          className="mt-5 text-xs text-primary font-semibold hover:underline"
        >
          Send another message →
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="bg-card border border-border rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm"
    >
      {/* Logged-in indicator — single line of plain prose with the email
          highlighted; uses inline-flex so it wraps as natural prose
          instead of awkward column breaks. */}
      {loggedIn && (
        <div className="flex items-start gap-2 text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/30 rounded-lg px-3 py-2.5 leading-relaxed">
          <Lock className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          <p>
            Signed in as{" "}
            <span className="font-bold text-foreground break-all">
              {userEmail}
            </span>{" "}
            — we&apos;ll attach this enquiry to your account automatically.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Your name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Rahul Kumar"
            required
            maxLength={NAME_MAX}
            disabled={step === "loading" || (loggedIn && !!userName)}
            className="mt-1 w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Email *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="rahul@example.com"
            required
            maxLength={EMAIL_MAX}
            disabled={step === "loading" || (loggedIn && !!userEmail)}
            className="mt-1 w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Phone (optional)
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98xxxxxxxx"
            maxLength={PHONE_MAX}
            disabled={step === "loading"}
            className="mt-1 w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none disabled:opacity-60"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Topic
          </label>
          <select
            value={topicIdx}
            onChange={(e) => setTopicIdx(Number(e.target.value))}
            disabled={step === "loading"}
            className="mt-1 w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none disabled:opacity-60"
          >
            {visibleTopics.map((t, i) => (
              <option key={t.label} value={i}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Booking-ref field — only when topic relates to an existing booking */}
      {topic.bookingRelated && (
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            Booking reference
            {!loggedIn && <span className="text-amber-600 dark:text-amber-400">— required for guests</span>}
          </label>
          <input
            type="text"
            value={bookingRef}
            onChange={(e) => setBookingRef(e.target.value.toUpperCase())}
            placeholder="e.g. TAHP20260504-Z64QRT"
            maxLength={60}
            required={!loggedIn}
            disabled={step === "loading"}
            className="mt-1 w-full h-10 px-3 rounded-lg border border-border bg-background text-sm font-mono uppercase tracking-wide focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none disabled:opacity-60"
          />
          {!loggedIn && (
            <p className="mt-1.5 text-[11px] text-muted-foreground flex items-start gap-1.5">
              <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />
              <span>
                Tip:{" "}
                <Link href="/login" className="text-primary font-semibold hover:underline">
                  Sign in
                </Link>{" "}
                first and we&apos;ll auto-link your booking — faster resolution.
              </span>
            </p>
          )}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Message *
          </label>
          <span
            className={`text-[10px] ${
              charsLeft < 100
                ? "text-amber-600 dark:text-amber-400"
                : "text-muted-foreground"
            }`}
          >
            {charsLeft} / {MESSAGE_MAX}
          </span>
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
          placeholder={
            topic.bookingRelated
              ? `Describe the issue with your booking… include dates and what you'd like us to do.`
              : `Describe your question or what you're looking for in a few lines…`
          }
          rows={4}
          required
          minLength={MESSAGE_MIN}
          maxLength={MESSAGE_MAX}
          disabled={step === "loading"}
          className="mt-1 w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none resize-y disabled:opacity-60"
        />
      </div>

      {/*
        Honeypot field — hidden from sighted users via the absolute-position
        offscreen pattern. Bots typically fill EVERY input they see, so any
        non-empty value here is a bot. The DTO has @Length(0,0) on this
        field so the request is rejected before reaching the service.
        aria-hidden + tabindex=-1 keep keyboard / screen-reader users away.
      */}
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        autoComplete="off"
        tabIndex={-1}
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-9999px",
          width: 1,
          height: 1,
          opacity: 0,
        }}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          We reply within 24 hours · Max 5 messages per 10 min
        </p>
        <button
          type="submit"
          disabled={step === "loading"}
          className="inline-flex items-center justify-center gap-2 px-6 h-11 rounded-xl bg-primary text-primary-foreground font-bold text-sm whitespace-nowrap hover:opacity-90 disabled:opacity-60 transition-opacity shadow-sm self-stretch sm:self-auto sm:min-w-[160px]"
        >
          {step === "loading" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Sending…</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>Send Message</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
