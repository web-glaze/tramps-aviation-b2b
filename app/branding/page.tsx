import type { Metadata } from "next";
import BrandingClient from "./BrandingClient";

export const metadata: Metadata = {
  title: "White-label Branding",
  description:
    "Upload your agency logo and details — we'll print branded tickets and itineraries for your clients.",
  alternates: { canonical: "/branding" },
};

export default function BrandingPage() {
  return <BrandingClient />;
}
