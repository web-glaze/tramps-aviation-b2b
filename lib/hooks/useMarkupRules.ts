"use client";

/**
 * useMarkupRules — Read + persist the agent's per-product markup toggles.
 *
 * Backend shape (Mongo, agent.markupRules array):
 *   {
 *     type: "product:flight" | "product:hotel" | "product:series",
 *     markupType: "flat" | "percent",
 *     markupValue: number,
 *     isActive: boolean,
 *   }
 *
 * The "product:*" type is the contract this hook owns — it lets us identify
 * the per-product preference rules separately from the older route/airline/
 * global rules. Old-shape rules are left untouched.
 *
 * Components on the search pages read this hook to decide:
 *   - is markup enabled for this product?  → `getRule(product).isActive`
 *   - if yes, what markup to apply?         → `applyMarkup(product, base)`
 *
 * Note: backend `agentApi.saveMarkupRule` upserts based on a key built from
 * (type, origin, destination, airlineCode). Since we leave route fields blank
 * for product-level rules, the upsert correctly updates the same row.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { agentApi, unwrap } from "@/lib/api/services";

export type Product = "flight" | "hotel" | "series";
export type MarkupType = "flat" | "percent";

export interface ProductMarkupRule {
  product:    Product;
  isActive:   boolean;
  markupType: MarkupType;
  markupValue: number;
}

interface RawRule {
  type:        string;
  markupType?: string;
  markupValue?: number;
  isActive?:   boolean;
  [k: string]: any;
}

const PRODUCT_TYPE_PREFIX = "product:";

const productFromType = (raw: string): Product | null => {
  if (!raw?.startsWith(PRODUCT_TYPE_PREFIX)) return null;
  const v = raw.slice(PRODUCT_TYPE_PREFIX.length).toLowerCase();
  if (v === "flight" || v === "hotel" || v === "series") return v;
  return null;
};

const defaultRule = (product: Product): ProductMarkupRule => ({
  product,
  isActive: false,            // off by default — agent must opt in
  markupType: "percent",
  markupValue: 0,
});

export function useMarkupRules() {
  const [rules,   setRules]   = useState<Record<Product, ProductMarkupRule>>({
    flight: defaultRule("flight"),
    hotel:  defaultRule("hotel"),
    series: defaultRule("series"),
  });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState<Product | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  // ── Load on mount ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await agentApi.getMarkupRules();
        const list = (unwrap(res) as RawRule[]) || [];
        if (cancelled) return;

        const next: Record<Product, ProductMarkupRule> = {
          flight: defaultRule("flight"),
          hotel:  defaultRule("hotel"),
          series: defaultRule("series"),
        };

        for (const r of list) {
          const product = productFromType(r.type);
          if (!product) continue;            // ignore non-product rules
          next[product] = {
            product,
            isActive:    !!r.isActive,
            markupType:  (r.markupType as MarkupType) || "percent",
            markupValue: Number(r.markupValue) || 0,
          };
        }
        setRules(next);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load markup rules");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Save one product's rule ──────────────────────────────────────────────
  const saveRule = useCallback(
    async (rule: ProductMarkupRule) => {
      setSaving(rule.product);
      setError(null);
      try {
        await agentApi.saveMarkupRule({
          // Cast to bypass the legacy two-field DTO shape — backend accepts the
          // extra fields and persists them on the agent doc as-is.
          ...( {
            type:        `${PRODUCT_TYPE_PREFIX}${rule.product}`,
            markupType:  rule.markupType,
            markupValue: rule.markupValue,
            isActive:    rule.isActive,
          } as any ),
        });
        setRules((prev) => ({ ...prev, [rule.product]: rule }));
      } catch (e: any) {
        setError(e?.message || "Failed to save");
        throw e;
      } finally {
        setSaving(null);
      }
    },
    [],
  );

  // ── Toggle convenience: flip isActive without changing markup config ─────
  const toggle = useCallback(
    (product: Product) => {
      const current = rules[product];
      return saveRule({ ...current, isActive: !current.isActive });
    },
    [rules, saveRule],
  );

  // ── Apply markup to a base amount, only if the rule for `product` is on. ─
  const applyMarkup = useCallback(
    (product: Product, baseAmount: number) => {
      const r = rules[product];
      if (!r.isActive || !baseAmount || baseAmount <= 0) {
        return { markup: 0, total: baseAmount };
      }
      const markup =
        r.markupType === "flat"
          ? r.markupValue
          : Math.round((baseAmount * r.markupValue) / 100);
      return { markup, total: baseAmount + markup };
    },
    [rules],
  );

  const isEnabled = useCallback(
    (product: Product) => rules[product].isActive,
    [rules],
  );

  // Stable view
  const list = useMemo<ProductMarkupRule[]>(
    () => [rules.flight, rules.hotel, rules.series],
    [rules],
  );

  return {
    rules,
    list,
    loading,
    saving,
    error,
    saveRule,
    toggle,
    applyMarkup,
    isEnabled,
  };
}
