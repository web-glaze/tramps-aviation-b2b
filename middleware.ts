import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Edge middleware — auth gate for the B2B portal.
 *
 * Rules:
 *
 *   1. The marketing routes are PUBLIC for everyone:
 *        /                    ← landing page (always show — no redirect)
 *        /flights, /hotels, /insurance, /series-fare
 *        /faq, /privacy, /terms, /refund, /about
 *
 *   2. The B2B auth pages are public so anyone can sign in / register:
 *        /b2b/login, /b2b/register, /b2b/kyc, /b2b/forgot-password,
 *        /b2b/reset-password
 *
 *   3. Every other /b2b/* route requires a token. Without one, we send the
 *      visitor to /b2b/login with `?redirect=…` so we can bring them back
 *      after they sign in.
 *
 * Note: the previous version of this file used to force `/` → `/b2b/login`
 * unconditionally — that defeated the marketing landing page entirely.
 */

// Pages anyone can see without an auth token.
const PUBLIC_PAGES = [
  "/",
  "/flights",
  "/hotels",
  "/insurance",
  "/series-fare",
  "/faq",
  "/privacy",
  "/terms",
  "/refund",
  "/about",
];

// B2B auth pages (login / register / etc.) — public so users can get in.
const B2B_PUBLIC_PREFIXES = [
  "/b2b/login",
  "/b2b/register",
  "/b2b/kyc",
  "/b2b/forgot-password",
  "/b2b/reset-password",
];

function isPublicPage(pathname: string): boolean {
  // Exact match against marketing pages
  if (PUBLIC_PAGES.includes(pathname)) return true;
  // Auth pages and their sub-routes
  if (B2B_PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return true;
  }
  return false;
}

/**
 * Best-effort JWT inspection at the edge.
 *
 * Pre-fix: middleware just checked that the `auth_token` cookie existed;
 * it never decoded the JWT. That meant a stale/expired token still let
 * users into protected pages (where the SPA would later 401 and redirect
 * back to login — confusing UX, and a security smell because the page
 * shell briefly renders).
 *
 * We can't verify the HMAC signature in middleware (we don't ship the
 * JWT_SECRET to the edge runtime, and the secret should never leave the
 * backend). But we *can* parse the payload and reject obviously expired
 * tokens — that catches the common case of "token from yesterday".
 * The backend remains the authoritative validator.
 */
function isLikelyValidJwt(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const json = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
    );
    if (json.exp && typeof json.exp === "number") {
      const nowSec = Math.floor(Date.now() / 1000);
      if (json.exp < nowSec) return false; // expired
    }
    return true;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("auth_token")?.value;

  // Skip Next.js internals and static files
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  // Public pages — always allow, no redirect (this is the key fix:
  // `/` now serves the landing page instead of bouncing to /b2b/login)
  if (isPublicPage(pathname)) {
    return NextResponse.next();
  }

  // Anything else under /b2b/* needs a non-expired auth token
  if (pathname.startsWith("/b2b/")) {
    if (!isLikelyValidJwt(token)) {
      const url = new URL("/b2b/login", request.url);
      url.searchParams.set("redirect", pathname);
      // Drop the bad cookie so the next request doesn't loop on it.
      const res = NextResponse.redirect(url);
      if (token) res.cookies.delete("auth_token");
      return res;
    }
    return NextResponse.next();
  }

  // Non-/b2b routes that aren't in the public list — let them through.
  // (Auth gating for other namespaces, if any, can be added here later.)
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
