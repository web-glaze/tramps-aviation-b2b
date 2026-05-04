"use client";
import { useState } from "react";
import { useEffect } from "react";
import { useAuthStore, usePlatformStore } from "@/lib/store";
import {
  Phone,
  Mail,
  MessageSquare,
  CheckCircle,
  FileText,
  Wallet,
  Plane,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://tramps-aviation-backend.onrender.com/api";

const AGENT_FAQS = [
  {
    q: "How do I top up my wallet?",
    a: "Go to Wallet → Add Funds. You can pay via UPI, NEFT/RTGS, or bank transfer. Credits reflect within 2 hours. For large amounts contact support.",
  },
  {
    q: "How do I check my commission earnings?",
    a: "Go to Commission page in your sidebar. You can see per-booking commissions, monthly summaries, and request settlement.",
  },
  {
    q: "My booking is showing 'Pending' — what should I do?",
    a: "Most bookings confirm within 15 minutes. If still pending after 30 minutes, contact us with your booking reference number.",
  },
  {
    q: "How do I add a sub-agent under my account?",
    a: "Go to Profile → Sub-agents. Invite them via email. They will book under your account and commissions will be shared as per your plan.",
  },
  {
    q: "How do I get KYC verified?",
    a: "Go to KYC section, upload your PAN card, GST certificate (if applicable), and agency proof. Verification takes 24–48 hours.",
  },
  {
    q: "How do I request a refund for a cancelled booking?",
    a: "Go to My Bookings → Select booking → Request Refund. Refunds to wallet are instant; bank refunds take 5–7 business days.",
  },
  {
    q: "Can I book for multiple passengers at once?",
    a: "Yes! In the flight/hotel search, you can add multiple passengers. For groups of 10+, contact our group desk for special fares.",
  },
  {
    q: "What is the Series Fare section?",
    a: "Series Fares are pre-negotiated bulk ticket slots at discounted rates for specific routes/dates. Available only to verified B2B agents.",
  },
];

export default function B2BHelpPage() {
  const { user } = useAuthStore();
  const { ps, fetchIfStale } = usePlatformStore();
  useEffect(() => {
    fetchIfStale();
  }, []);

  const [form, setForm] = useState({
    name: user?.name || user?.contactPerson || "",
    email: user?.email || "",
    phone: user?.phone || "",
    agentId: user?.agentId || "",
    type: "agent_support",
    subject: "",
    message: "",
    bookingRef: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [refId, setRefId] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Update form when user loads
  useEffect(() => {
    if (user)
      setForm((f) => ({
        ...f,
        name: user.name || user.contactPerson || f.name,
        email: user.email || f.email,
        phone: user.phone || f.phone,
        agentId: user.agentId || f.agentId,
      }));
  }, [user]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject || !form.message) {
      toast.error("Please fill subject and message");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/contact/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, userType: "agent" }),
      });
      const data = await res.json();
      if (data.success) {
        setRefId(data.referenceId || "");
        setSubmitted(true);
      } else toast.error("Failed to submit. Please try again.");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const phone = ps.supportPhone || "tel:+911800001234";
  const phoneDisplay = ps.supportPhoneDisplay || "1800-001-2345 (Toll Free)";
  const email = ps.supportEmail || "support@trampsaviation.com";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Help & Support</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Get help with bookings, wallet, commissions or any other queries
        </p>
      </div>

      {/* Contact Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            icon: Phone,
            label: "Call Us",
            value: phoneDisplay,
            sub: "Mon–Sat, 9AM–6PM",
            href: phone.startsWith("tel:") ? phone : `tel:${phone}`,
            color: "text-green-600 bg-green-50",
          },
          {
            icon: Mail,
            label: "Email Support",
            value: email,
            sub: "Response within 24 hours",
            href: `mailto:${email}`,
            color: "text-blue-600 bg-blue-50",
          },
          {
            icon: MessageSquare,
            label: "Submit Ticket",
            value: "Use the form below",
            sub: "Track with reference ID",
            href: "#support-form",
            color: "text-purple-600 bg-purple-50",
          },
        ].map(({ icon: Icon, label, value, sub, href, color }) => (
          <a
            key={label}
            href={href}
            className="bg-card border border-border rounded-2xl p-5 flex items-start gap-4 hover:border-primary/40 transition-all group"
          >
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                color,
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {label}
              </p>
              <p className="text-sm font-semibold text-foreground truncate mt-0.5">
                {value}
              </p>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </div>
          </a>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FAQs */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="font-bold text-base text-foreground mb-4 flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-primary" /> Agent FAQs
          </h2>
          <div className="space-y-2">
            {AGENT_FAQS.map((faq, i) => (
              <div
                key={i}
                className="border border-border rounded-xl overflow-hidden"
              >
                <button
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-sm font-medium text-foreground pr-2">
                    {faq.q}
                  </span>
                  {openFaq === i ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-3 text-sm text-muted-foreground leading-relaxed border-t border-border bg-muted/20">
                    <p className="pt-3">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <a
            href="/cms/faq"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            View all FAQs <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Support Form */}
        <div
          id="support-form"
          className="bg-card border border-border rounded-2xl p-6"
        >
          {submitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-bold text-foreground mb-2">
                Ticket Submitted!
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Our team will get back to you within 24 hours on {form.email}
              </p>
              {refId && (
                <div className="p-3 bg-primary/10 rounded-xl mb-4">
                  <p className="text-xs text-muted-foreground">Reference ID</p>
                  <p className="text-lg font-bold font-mono text-primary">
                    #{refId}
                  </p>
                </div>
              )}
              <button
                onClick={() => {
                  setSubmitted(false);
                  setForm((f) => ({
                    ...f,
                    subject: "",
                    message: "",
                    bookingRef: "",
                  }));
                }}
                className="px-4 py-2 text-sm border border-border rounded-xl hover:bg-muted transition-colors"
              >
                Submit Another
              </button>
            </div>
          ) : (
            <>
              <h2 className="font-bold text-base text-foreground mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Submit Support
                Ticket
              </h2>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Agent ID
                    </label>
                    <input
                      type="text"
                      value={form.agentId}
                      onChange={(e) =>
                        set("agentId", e.target.value.toUpperCase())
                      }
                      placeholder="TAHP00001"
                      readOnly={!!user?.agentId}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm font-mono text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Issue Type
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => set("type", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="agent_support">🤝 Agent Support</option>
                    <option value="booking_help">✈️ Booking Help</option>
                    <option value="refund">💰 Refund / Cancellation</option>
                    <option value="complaint">⚠️ Complaint</option>
                    <option value="general">💬 General</option>
                    <option value="other">📋 Other</option>
                  </select>
                </div>
                {(form.type === "booking_help" || form.type === "refund") && (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Booking Reference
                    </label>
                    <input
                      type="text"
                      value={form.bookingRef}
                      onChange={(e) =>
                        set("bookingRef", e.target.value.toUpperCase())
                      }
                      placeholder="BK-XXXXXXXX"
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm font-mono text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) => set("subject", e.target.value)}
                    required
                    placeholder="Brief description..."
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Message *
                  </label>
                  <textarea
                    value={form.message}
                    onChange={(e) => set("message", e.target.value)}
                    required
                    rows={4}
                    placeholder="Describe your issue in detail..."
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : null}
                  {submitting ? "Submitting..." : "Submit Ticket"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Useful links */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="font-bold text-base text-foreground mb-4">
          📚 Useful Resources
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: FileText, label: "Terms & Conditions", href: "/cms/terms" },
            { icon: FileText, label: "Refund Policy", href: "/cms/refund" },
            { icon: FileText, label: "Privacy Policy", href: "/cms/privacy" },
            { icon: Wallet, label: "Add Wallet Funds", href: "/b2b/wallet" },
          ].map(({ icon: Icon, label, href }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/50 text-sm text-muted-foreground hover:text-foreground transition-all"
            >
              <Icon className="h-4 w-4 text-primary shrink-0" /> {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
