"use client";

/**
 * useAdminProductFlags
 * ────────────────────
 * Reads admin-controlled per-product feature flags from the existing
 * platform-settings doc (already fetched by `usePlatformStore`).
 *
 *   { flight: { commission: true, markup: true },
 *     hotel:  { commission: true, markup: false },
 *     series: { commission: true, markup: true } }
 *
 * Backend contract (`Settings` doc, exposed via GET /admin/public-settings):
 *   - `commissionEnabledProducts: ("flight" | "hotel" | "series")[]`
 *   - `markupEnabledProducts:     ("flight" | "hotel" | "series")[]`
 *
 * If those fields are missing from the response (e.g. backend hasn't been
 * upgraded yet), we default to "all enabled" so existing agents don't lose
 * features they were already using.
 *
 * Used by:
 *   • MarkupSettings  — locks rows for products admin disabled
 *   • MarkupBanner    — hides itself if admin disabled markup for the product
 *   • Search pages    — skip applying markup if admin disabled it
 */

import { useEffect } from "react";
import { usePlatformStore } from "@/lib/store";

export type Product = "flight" | "hotel" | "series";

export interface ProductFlags {
  commission: boolean;
  markup:     boolean;
}

export type AllProductFlags = Record<Product, ProductFlags>;

const ALL_ENABLED: AllProductFlags = {
  flight: { commission: true, markup: true },
  hotel:  { commission: true, markup: true },
  series: { commission: true, markup: true },
};

const DEFAULT_LIST: Product[] = ["flight", "hotel", "series"];

export function useAdminProductFlags() {
  const { ps, fetchIfStale } = usePlatformStore();

  // Trigger lazy fetch — no-op if already fetched recently
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchIfStale(); }, []);

  const commissionList: Product[] = Array.isArray((ps as any).commissionEnabledProducts)
    ? ((ps as any).commissionEnabledProducts as Product[])
    : DEFAULT_LIST;

  const markupList: Product[] = Array.isArray((ps as any).markupEnabledProducts)
    ? ((ps as any).markupEnabledProducts as Product[])
    : DEFAULT_LIST;

  const has = (arr: Product[], p: Product) => arr.includes(p);

  const flags: AllProductFlags = {
    flight: { commission: has(commissionList, "flight"), markup: has(markupList, "flight") },
    hotel:  { commission: has(commissionList, "hotel"),  markup: has(markupList, "hotel")  },
    series: { commission: has(commissionList, "series"), markup: has(markupList, "series") },
  };

  return {
    flags,
    isCommissionEnabled: (p: Product) => flags[p].commission,
    isMarkupEnabled:     (p: Product) => flags[p].markup,
  };
}
