import type { MetadataRoute } from "next";
import { APP_URL } from "@/config/app";

/**
 * /sitemap.xml — only the publicly-discoverable surfaces of the
 * agent portal. Agent-only routes (dashboard, bookings, etc.) are
 * intentionally excluded — they require auth and would 302 anyone
 * who lands on them without a token.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const publicRoutes: { path: string; priority: number; changefreq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/login", priority: 1.0, changefreq: "monthly" },
    { path: "/register", priority: 0.9, changefreq: "monthly" },
    { path: "/forgot-password", priority: 0.4, changefreq: "yearly" },
    { path: "/about", priority: 0.7, changefreq: "monthly" },
    { path: "/faq", priority: 0.7, changefreq: "monthly" },
    { path: "/privacy", priority: 0.5, changefreq: "yearly" },
    { path: "/terms", priority: 0.5, changefreq: "yearly" },
    { path: "/refund", priority: 0.5, changefreq: "yearly" },
  ];

  return publicRoutes.map((r) => ({
    url: `${APP_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changefreq,
    priority: r.priority,
  }));
}
