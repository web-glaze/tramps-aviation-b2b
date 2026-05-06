import Link from "next/link";
import { Compass, Home } from "lucide-react";

/**
 * Custom 404 page. Plays nicer than the Next.js default and gives
 * the agent a quick way to get back to the dashboard or login.
 */
export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
      <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
        <Compass className="h-8 w-8 text-primary" aria-hidden="true" />
      </div>
      <p className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground mb-2">
        404
      </p>
      <h1 className="text-2xl font-extrabold text-foreground mb-2">
        We couldn&apos;t find that page
      </h1>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        The page may have moved, been renamed, or never existed. Use one of
        the shortcuts below to get back on track.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
        >
          <Home className="h-4 w-4" />
          Go to dashboard
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-4 h-10 rounded-xl border border-border bg-background text-foreground text-sm font-semibold hover:bg-muted"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
