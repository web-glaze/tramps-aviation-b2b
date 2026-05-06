import { CmsPage } from "@/components/cms/CmsPage";

const FALLBACK_HTML = `
<p>Tramps Aviation India Pvt. Ltd. ("we", "us", "our") respects your privacy. This policy explains what personal data we collect, why we collect it, and how it's used.</p>

<h2>What we collect</h2>
<ul>
  <li><strong>Identity & contact</strong> — name, email, phone, date of birth, gender. Required to issue tickets to airlines and hotels in your name.</li>
  <li><strong>Travel documents</strong> — passport number / Aadhaar / PAN, only when you upload them for KYC or international travel.</li>
  <li><strong>Payment data</strong> — card details are tokenised by Razorpay; we never see or store your raw card number. Wallet ledger entries are stored against your account.</li>
  <li><strong>Usage data</strong> — pages viewed, search queries, IP address, device — used for security and to improve the product.</li>
</ul>

<h2>How we use it</h2>
<ul>
  <li>Issue tickets and manage your bookings with the relevant airlines, hotels, and insurance providers.</li>
  <li>Process payments and refunds.</li>
  <li>Send booking confirmations, e-tickets, refund updates, and (with your consent) occasional offers.</li>
  <li>Comply with regulatory requests — RBI, DGCA, and tax authorities.</li>
</ul>

<h2>Who we share with</h2>
<p>Only the parties needed to fulfil your booking — airlines, hotels, insurance underwriters (Bajaj Allianz), and payment processors (Razorpay). We never sell your data to advertisers.</p>

<h2>Security</h2>
<p>All transit is HTTPS-encrypted. KYC documents are stored in private S3 buckets with short-lived presigned URLs. Passwords are bcrypt-hashed (never stored in plaintext).</p>

<h2>Your rights</h2>
<ul>
  <li>Request a copy of your data — email <a href="mailto:support@trampsaviation.com">support@trampsaviation.com</a>.</li>
  <li>Request deletion of your account and personal data, subject to legal retention requirements (GST records: 6 years).</li>
  <li>Opt out of marketing emails using the unsubscribe link in any of our emails.</li>
</ul>

<h2>Updates</h2>
<p>We may update this policy. Material changes will be notified via email and shown as a banner on the home page.</p>
`;

export default function PrivacyPage() {
  return (
    <CmsPage
      slug="privacy"
      fallbackTitle="Privacy Policy"
      fallbackSubtitle="How we collect, use, and protect your personal data"
      fallbackHtml={FALLBACK_HTML}
    />
  );
}
