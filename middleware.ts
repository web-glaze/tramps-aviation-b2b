import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Edge middleware — auth gate for the agent portal.
 *
 * This deployment serves the agent portal at the agents subdomain
 * (`agent.tramps.aviation`), so every route belongs to one app — there
 * is no `/b2b/*` namespace anymore. The split now happens at the DNS
 * level, not the URL path.
 *
 * Rules:
 *   1. Auth pages and CMS/marketing pages are public (login, register,
 *      kyc, forgot/reset-password, /, /about, /faq, /privacy, /terms,
 *      /refund). Anyone can land on these without a token.
 *   2. Every other route requires a non-expired auth token. We send
 *      visitors without a token to /login?redirect=<original-path>.
 */

// Pages anyone can see without an auth token (exact match).
const PUBLIC_EXACT = new Set<string>([
  "/",
  "/about",
  "/faq",
  "/privacy",
  "/terms",
  "/refund",
]);

// Public route prefixes (matches the path itself or any sub-path).
// `kyc` is here because newly-registered agents whose KYC is still
// pending need to reach the KYC page even when their account isn't
// "approved" yet — the page itself reads localStorage to gate access.
const PUBLIC_PREFIXES = [
  "/login",
  "/register",
  "/kyc",
  "/forgot-password",
  "/reset-password",
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

/**
 * Best-effort JWT inspection at the edge.
 *
 * We can't verify the HMAC signature here (the secret never leaves the
 * backend), but we *can* parse the payload and reject obviously expired
 * tokens — that catches the common case of "token from yesterday" and
 * stops the SPA from briefly rendering protected shells before the
 * backend 401s. The backend remains the authoritative validator.
 */
function isLikelyValidJwt(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const json = JSON.parse(
      Buffer.from(
        parts[1].replace(/-/g, "+").replace(/_/g, "/"),
        "base64",
      ).toString("utf8"),
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

  // Skip Next.js internals and static assets — defence in depth on top
  // of the matcher below.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/logo") ||
    pathname === "/sitemap.xml" ||
    pathname === "/robots.txt"
  ) {
    return NextResponse.next();
  }

  // Public pages — always allow.
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Anything else needs a non-expired auth token.
  if (!isLikelyValidJwt(token)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", pathname);
    const res = NextResponse.redirect(url);
    if (token) res.cookies.delete("auth_token");
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public|api).*)"],
};
