import { CmsPage } from "@/components/cms/CmsPage";

const FALLBACK_HTML = `
<p>By using Tramps Aviation you agree to these terms. Please read them carefully.</p>

<h2>1. The platform</h2>
<p>Tramps Aviation is a booking facilitator. We aggregate inventory from airlines, hotels, and insurance providers and present it through one booking flow. We do NOT operate flights, hotels, or insurance products. The supplier is the principal in every booking; we are the agent.</p>

<h2>2. Bookings</h2>
<p>Every booking is subject to the supplier's own terms — fare rules, cabin baggage allowance, hotel cancellation windows, insurance coverage limits. These are surfaced during the booking flow; please read them before paying.</p>
<p>Once a booking is confirmed and ticketed, changes and cancellations are subject to the airline / hotel's published rules — typically with a fee.</p>

<h2>3. Payments</h2>
<p>Payments via Razorpay (cards, UPI, net banking) attract Razorpay's gateway fee, capped at 2%. B2B agents may pay from their wallet — wallet credit is non-refundable to bank account but is fully redeemable against future bookings.</p>

<h2>4. Refunds</h2>
<p>Refunds for cancelled bookings follow the supplier's policy. Customer-initiated cancellations: refund processed within 7 working days to the original payment method (B2B agents: instant credit to wallet). Supplier-initiated cancellations (e.g., airline cancels the flight): full refund within 7 working days.</p>

<h2>5. Agent obligations (B2B)</h2>
<ul>
  <li>Maintain accurate KYC documents.</li>
  <li>Use the platform only for genuine travel bookings; speculative or "test" bookings will result in account suspension.</li>
  <li>Pass on the actual fare to your end-customer transparently. Markup decisions remain at your discretion within platform limits.</li>
</ul>

<h2>6. Liability</h2>
<p>Our liability is limited to the convenience fee charged on the affected booking. We are not liable for supplier-side failures (flight delay, hotel overbooking, etc.) — those claims must be raised with the supplier directly. We will assist you in escalating where reasonably possible.</p>

<h2>7. Governing law</h2>
<p>These terms are governed by the laws of India. Disputes are subject to the exclusive jurisdiction of courts at Mandi, Himachal Pradesh.</p>
`;

export default function TermsPage() {
  return (
    <CmsPage
      slug="terms"
      fallbackTitle="Terms of Service"
      fallbackSubtitle="The agreement between you and Tramps Aviation"
      fallbackHtml={FALLBACK_HTML}
    />
  );
}
