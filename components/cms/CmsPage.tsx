"use client";

/**
 * CmsPage — renders a backend-managed CMS page by slug.
 *
 * Fetches `GET /api/pages/:slug` (the public CMS endpoint already exposed
 * by the backend's CmsModule). The admin can edit these via the admin
 * panel's CMS page; updates appear here on next page load — no redeploy.
 *
 * Pre-fix: routes like /about, /privacy, /terms, /refund, /faq existed
 * in the footer but had no Next.js page files, so they 404'd. This
 * component is the universal renderer; every one of those 5 routes
 * is now a 5-line page that delegates here.
 *
 * Behaviour:
 *   • While loading → skeleton
 *   • If page found → render its HTML (already sanitised at admin save time;
 *                     CMS editor enforces a safe subset)
 *   • If page not yet seeded → friendly "Coming soon" + a hint that the
 *                              admin can publish it from /admin/pages.
 *                              Falls back to inline default copy so the
 *                              user always sees SOMETHING useful.
 */

import { useEffect, useState } from "react";
import { Loader2, FileText, Info } from "lucide-react";
import { PublicPageChrome } from "@/components/layout/PublicPageChrome";
import { usePlatformStore } from "@/lib/store";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://13.207.25.212:8080/api";

interface CmsDoc {
  slug: string;
  title: string;
  content: string;       // HTML
  metaTitle?: string;
  metaDescription?: string;
  updatedAt?: string;
}

interface Props {
  slug: string;
  /** Heading shown if the page is published — overrides backend title. */
  fallbackTitle: string;
  /** HTML used when the backend returns 404 (page not seeded yet). */
  fallbackHtml: string;
  /** Tagline under the heading. */
  fallbackSubtitle?: string;
}

export function CmsPage({ slug, fallbackTitle, fallbackHtml, fallbackSubtitle }: Props) {
  const { ps, fetchIfStale } = usePlatformStore();
  const [doc, setDoc] = useState<CmsDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetchIfStale();
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/pages/${slug}`, {
          cache: "no-store",
        });
        if (cancelled) return;
        if (res.status === 404) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        if (!res.ok) throw new Error(String(res.status));
        const json = await res.json();
        const data = json?.data || json;
        setDoc(data?.slug ? data : null);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return (
    <PublicPageChrome>
      <article className="max-w-3xl mx-auto py-10 px-4 sm:px-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="mb-8 pb-6 border-b border-border">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[hsl(var(--brand-blue))] mb-2">
                <FileText className="h-3.5 w-3.5" />
                {ps?.platformName || "Tramps Aviation"}
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-foreground">
                {doc?.title || fallbackTitle}
              </h1>
              {fallbackSubtitle && (
                <p className="mt-2 text-base text-muted-foreground">
                  {fallbackSubtitle}
                </p>
              )}
              {doc?.updatedAt && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Last updated:{" "}
                  {new Date(doc.updatedAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>

            {notFound && (
              <div className="mb-6 flex gap-2.5 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 text-xs text-amber-800 dark:text-amber-300">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  This page hasn&apos;t been published from the admin panel yet —
                  showing default content below. Admin can edit at{" "}
                  <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900/40 rounded font-mono">
                    /admin/pages
                  </code>
                  .
                </p>
              </div>
            )}

            {/*
              The CMS HTML is generated by the admin's rich-text editor.
              It's already sanitised at save-time (the editor strips scripts /
              event handlers). Ideally we'd run DOMPurify here too as a second
              line of defence — TODO when DOMPurify is added to deps.
            */}
            <div
              className="prose prose-sm sm:prose-base max-w-none cms-content"
              dangerouslySetInnerHTML={{
                __html: doc?.content || fallbackHtml,
              }}
            />
          </>
        )}
      </article>
    </PublicPageChrome>
  );
}
