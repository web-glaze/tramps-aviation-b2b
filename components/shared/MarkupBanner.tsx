"use client";

/**
 * MarkupBanner — retained for backwards compatibility, renders nothing.
 *
 * Markup is now fully admin-controlled (see `useDisplayPrice`). Agents can
 * neither see nor change it, so the old "Your markup is being applied" /
 * "Configure markup" banners are gone. We keep the component as a no-op
 * export so the existing imports in /flights, /hotels, /series-fare don't
 * break — eventually the call sites can be removed.
 */

import type { Product } from "@/lib/hooks/useDisplayPrice";

export function MarkupBanner(_props: { product: Product }) {
  return null;
}
