import { CmsPage } from "@/components/cms/CmsPage";

const FALLBACK_HTML = `
<h2>General</h2>

<h3>What is Tramps Aviation?</h3>
<p>A booking platform connecting authorised travel agents (B2B) and individual travellers (B2C) with live flight, hotel, and insurance inventory. We aggregate suppliers like TBO, Amadeus, and Bajaj Allianz into one clean booking flow.</p>

<h3>Is registration mandatory to search?</h3>
<p>No — anyone can search flights, hotels, and insurance plans without logging in. You only need an account to actually book.</p>

<h2>For travel agents (B2B)</h2>

<h3>How do I become a registered agent?</h3>
<p>Sign up at <a href="/b2b/register">b2b/register</a>, complete your KYC (PAN + GST + agency proof), and your account is active within 24 hours of approval.</p>

<h3>How does the wallet work?</h3>
<p>Top up your wallet via Razorpay (instant) or bank transfer (manual, 30 min). Every booking is paid from the wallet — no per-booking gateway fee. Commission and refunds are credited back to the wallet automatically.</p>

<h3>How is commission calculated?</h3>
<p>Each agent has a Commission Profile assigned by admin — defines % per airline / route / cabin class. Commission is shown live on every search result and credited to your wallet on booking confirmation.</p>

<h3>Can I add my own markup?</h3>
<p>Yes — set markup rules per route or airline from <strong>Markup Tool</strong>. Markup is added on top of supplier fare and goes entirely to you (we don't take a cut on agent markup).</p>

<h2>For travellers (B2C)</h2>

<h3>How do I get my e-ticket?</h3>
<p>The e-ticket is sent to your email and SMS within 5 minutes of booking confirmation. You can also download it from <strong>My Trips</strong> any time.</p>

<h3>Can I book for multiple passengers at once?</h3>
<p>Yes — up to 9 adults + 6 children + 2 infants per booking.</p>

<h3>What if my flight gets cancelled by the airline?</h3>
<p>Full refund — including our convenience fee. Refund hits your original payment method in 5–7 working days. We email you as soon as we hear from the airline.</p>

<h2>Payments & refunds</h2>

<h3>What payment methods are accepted?</h3>
<p>For B2C: cards (Visa, Mastercard, Rupay, Amex), UPI, net banking, wallets. For B2B: agent wallet (preferred) or Razorpay.</p>

<h3>How do I get a refund for a cancelled booking?</h3>
<p>Open the booking → click <strong>Cancel Booking</strong> → the refund amount is shown before you confirm → click confirm. Refund timeline depends on payment method (5–7 days for cards, instant for wallet).</p>

<h3>Why is the refund less than what I paid?</h3>
<p>Airline cancellation fees and our convenience fee are deducted (unless the airline cancels — then full refund). The exact breakdown is shown when you click Cancel.</p>

<h2>Support</h2>

<h3>How do I contact support?</h3>
<p>WhatsApp / email via the <a href="/b2b/help">help centre</a>. Average response time during business hours is under 30 minutes.</p>
`;

export default function FaqPage() {
  return (
    <CmsPage
      slug="faq"
      fallbackTitle="Frequently Asked Questions"
      fallbackSubtitle="Quick answers to the most common questions"
      fallbackHtml={FALLBACK_HTML}
    />
  );
}
