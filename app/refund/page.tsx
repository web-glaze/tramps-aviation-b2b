import { CmsPage } from "@/components/cms/CmsPage";

const FALLBACK_HTML = `
<p>Refunds depend on the type of booking and how the cancellation happens. Below is the standard policy — supplier-specific rules (airline / hotel / insurance) take precedence and are shown on the booking confirmation.</p>

<h2>Flight bookings</h2>
<table>
  <thead>
    <tr><th>Scenario</th><th>Refund</th><th>Timeline</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>Customer cancels — refundable fare</td>
      <td>Airline fare minus airline cancellation fee minus our convenience fee (₹250)</td>
      <td>5–7 working days to source / instant to B2B wallet</td>
    </tr>
    <tr>
      <td>Customer cancels — non-refundable fare</td>
      <td>Government taxes only (typically ₹300–500)</td>
      <td>5–7 working days</td>
    </tr>
    <tr>
      <td>Airline cancels the flight</td>
      <td>Full refund — including our convenience fee</td>
      <td>5–7 working days from airline's confirmation</td>
    </tr>
    <tr>
      <td>No-show</td>
      <td>Government taxes only</td>
      <td>5–7 working days</td>
    </tr>
  </tbody>
</table>

<h2>Hotel bookings</h2>
<p>Hotel refund windows vary by property. The exact window (e.g., "free cancellation until 6 PM 24 hours before check-in") is shown on the booking page before you pay. Cancellations after the free window forfeit the booking amount.</p>

<h2>Insurance</h2>
<p>Travel insurance is refundable in full only if cancelled before the policy start date. After the policy is in force, refunds are at the underwriter's discretion (typically 50% within the first 7 days).</p>

<h2>How to request a refund</h2>
<ol>
  <li>Open the booking from <strong>My Bookings</strong> in the agent / customer portal.</li>
  <li>Click <strong>Cancel Booking</strong>. The system shows the exact refund amount before you confirm.</li>
  <li>Refunds to original payment method (cards / UPI / net banking) take 5–7 working days. Refunds to B2B wallet are credited within 30 minutes of cancellation.</li>
</ol>

<h2>Disputes</h2>
<p>If a refund is delayed beyond the timeline, email <a href="mailto:support@trampsaviation.com">support@trampsaviation.com</a> with your booking reference. We escalate with the supplier and update you within 48 hours.</p>
`;

export default function RefundPage() {
  return (
    <CmsPage
      slug="refund"
      fallbackTitle="Refund Policy"
      fallbackSubtitle="When and how refunds are processed for cancelled bookings"
      fallbackHtml={FALLBACK_HTML}
    />
  );
}
