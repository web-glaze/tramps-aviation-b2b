"use client";

import "./globals.css";
import { Toaster } from "sonner";
import { SettingsProvider } from "@/components/layout/SettingsProvider";
import { DevPathBar } from "@/components/dev/DevPathBar";

// Anti-flash: reads tp-settings BEFORE first paint → no theme flicker
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Tramps Aviation — Agent Portal</title>
        <meta
          name="description"
          content="Tramps Aviation B2B portal for travel agents."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/logo.svg" type="image/jpeg" />
        <link rel="apple-touch-icon" href="/logo.svg" />
        <script dangerouslySetInnerHTML={{ __html: ANTI_FLASH }} />
      </head>
      <body>
        <SettingsProvider>
          {children}
          <DevPathBar />
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              style: {
                borderRadius: "var(--radius)",
                fontFamily: "var(--font-body, inherit)",
                fontSize: "13px",
                background: "hsl(var(--card))",
                color: "hsl(var(--card-foreground))",
                border: "1px solid hsl(var(--border))",
              },
              duration: 4000,
            }}
          />
        </SettingsProvider>
      </body>
    </html>
  );
}
