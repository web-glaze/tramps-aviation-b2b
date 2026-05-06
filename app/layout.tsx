import type { Metadata, Viewport } from "next";
import "./globals.css";
import { APP_NAME, APP_URL } from "@/config/app";
import { RootProviders } from "@/components/layout/RootProviders";
import { AgentShell } from "@/components/layout/AgentShell";

/**
 * Anti-flash inline script — reads the persisted `tp-settings` blob
 * BEFORE the first paint and applies the dark/light class + theme
 * data-attributes to <html>. Without this you see a flash of the
 * default theme on every cold load. Must stay in <head> and must
 * remain inline (no module imports) so the browser executes it
 * before React hydrates.
 */
const ANTI_FLASH = `
(function(){
  try{
    var raw = localStorage.getItem('tp-settings');
    var s = raw ? JSON.parse(raw) : {};
    var st = s.state || {};
    if(st.colorTheme === 'blue' || st.colorTheme === 'brand' && !raw || st.colorTheme === undefined) {
      st.theme = 'light';
      st.colorTheme = 'brand';
      try{
        s.state = Object.assign({}, st, {theme:'light', colorTheme:'brand'});
        localStorage.setItem('tp-settings', JSON.stringify(s));
      }catch(e){}
    }
    var t = st.theme || 'light';
    var dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if(dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    var r = document.documentElement;
    r.setAttribute('data-color',     st.colorTheme   || 'brand');
    r.setAttribute('data-font',      st.fontFamily   || 'jakarta');
    r.setAttribute('data-fontsize',  st.fontSize     || 'md');
    r.setAttribute('data-radius',    st.borderRadius || 'lg');
    r.setAttribute('data-compact',   st.compactMode  ? 'true' : 'false');
    r.setAttribute('data-animations',st.animations === false ? 'false' : 'true');
  }catch(e){}
})();
`;

// Next.js Metadata API — gets injected as <meta>, <link>, <title>,
// OpenGraph and Twitter tags. Per-page `metadata` exports merge with
// these via the `template`.
export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: `${APP_NAME} — Agent Portal`,
    template: `%s | ${APP_NAME}`,
  },
  description:
    `${APP_NAME} agent portal — wholesale fares for flights, hotels, ` +
    "and travel insurance, with agent commission, wallet payments and " +
    "instant ticketing for authorised travel agents in India.",
  applicationName: APP_NAME,
  authors: [{ name: APP_NAME }],
  generator: "Next.js",
  keywords: [
    "B2B travel agent portal",
    "wholesale flight fares",
    "travel agency software",
    "Tramps Aviation",
    "agent commission",
    "series fares",
    "GDS booking",
    "TBO Amadeus",
  ],
  referrer: "origin-when-cross-origin",
  // Agent portal — keep it out of search indexes by default. Public
  // marketing pages live on the B2C subdomain.
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
    apple: "/logo.svg",
    other: [{ rel: "mask-icon", url: "/logo.svg", color: "#209ACD" }],
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: `${APP_NAME} — Agent Portal`,
    description:
      "Wholesale fares, agent commission and instant ticketing for authorised travel agents.",
    url: APP_URL,
    locale: "en_IN",
  },
  twitter: {
    card: "summary",
    title: `${APP_NAME} — Agent Portal`,
    description:
      "Wholesale fares and instant ticketing for authorised travel agents.",
  },
  formatDetection: { email: false, address: false, telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#209ACD",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: ANTI_FLASH }} />
      </head>
      <body>
        <RootProviders>
          <AgentShell>{children}</AgentShell>
        </RootProviders>
      </body>
    </html>
  );
}
