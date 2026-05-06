import type { MetadataRoute } from "next";
import { APP_URL } from "@/config/app";

/**
 * /robots.txt for the agent portal.
 *
 * Agent-only pages (dashboard, flights, bookings, wallet, etc.)
 * require login so we tell crawlers not to index them. Public auth
 * surfaces (login, register, forgot-password) and CMS marketing
 * pages (about, faq, privacy, terms, refund) are allowed so agents
 * can discover the portal via search.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/about",
          "/faq",
          "/privacy",
          "/terms",
          "/refund",
        ],
        disallow: [
          "/dashboard",
          "/flights",
          "/hotels",
          "/insurance",
          "/series-fare",
          "/bookings",
          "/account",
          "/wallet",
          "/commission",
          "/reports",
          "/markup",
          "/profile",
          "/subagents",
          "/help",
          "/kyc",
          "/api",
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  };
}
