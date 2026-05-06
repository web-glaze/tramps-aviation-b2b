import { CmsPage } from "@/components/cms/CmsPage";

const FALLBACK_HTML = `
<p>Tramps Aviation is India's full-service B2B and B2C travel platform — connecting authorised travel agents, corporate buyers, and individual travellers with the best fares on flights, hotels, and travel insurance.</p>

<h2>What we do</h2>
<p>We aggregate live inventory from leading domestic and international suppliers (TBO, Amadeus, Bajaj Allianz) and present it through a single, clean booking flow. Travel agents get a dedicated B2B portal with wallet-based bookings, agent-specific commission, KYC-verified onboarding, and real-time markups. Travellers get a clean, fast B2C experience focused on confirmed bookings — not endless filters.</p>

<h2>Our values</h2>
<ul>
  <li><strong>Transparent pricing</strong> — every fare is shown with base, taxes, and convenience fee broken out.</li>
  <li><strong>Reliable bookings</strong> — atomic wallet + supplier ticketing means no orphan bookings, no money-stuck-in-limbo edge cases.</li>
  <li><strong>Fast support</strong> — WhatsApp + email replies within business hours; refund processing within 30 minutes.</li>
</ul>

<h2>Compliance</h2>
<p>Tramps Aviation India Pvt. Ltd. is IATA-accredited and operates under RBI guidelines for wallet and payment services. All payments are processed through PCI-DSS certified gateways.</p>

<h2>Reach us</h2>
<p>For partnerships, support, or general enquiries — visit our <a href="/b2b/help">help centre</a>.</p>
`;

export default function AboutPage() {
  return (
    <CmsPage
      slug="about"
      fallbackTitle="About Tramps Aviation"
      fallbackSubtitle="India's premier B2B & B2C travel booking platform"
      fallbackHtml={FALLBACK_HTML}
    />
  );
}
