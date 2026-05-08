"use client";

import { useEffect, useState } from "react";

/**
 * Single source of truth for agent's white-label branding.
 *
 * Reads (in priority order):
 *   1. `GET /api/agents/branding` — backend, when ready
 *   2. localStorage `tp-agent-branding` — fallback, populated by the
 *      `/branding` settings page until the backend ships
 *
 * Used by the booking detail page so every printed ticket auto-uses the
 * agent's saved logo + agency name without making them re-upload each
 * time. Per-booking override still works — components call `useAgentBranding()`
 * to read the default, then let the user tweak via the existing modal.
 */

export interface AgentBranding {
  logoUrl: string;
  agencyName: string;
  supportPhone: string;
  supportEmail: string;
  primaryColor: string;
  websiteUrl: string;
  taglineText: string;
  isActive: boolean;
}

const DEFAULT: AgentBranding = {
  logoUrl: "",
  agencyName: "",
  supportPhone: "",
  supportEmail: "",
  primaryColor: "#208dcb",
  websiteUrl: "",
  taglineText: "Your trusted travel partner",
  isActive: false,
};

const STORAGE_KEY = "tp-agent-branding";

export function useAgentBranding() {
  const [branding, setBranding] = useState<AgentBranding>(DEFAULT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Try API first
      try {
        const apiBase =
          process.env.NEXT_PUBLIC_API_URL ||
          "https://api.trampsaviation.com/api";
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("auth_token") ||
              localStorage.getItem("agent_token")
            : null;
        const res = await fetch(`${apiBase}/agents/branding`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok && !cancelled) {
          const json = await res.json();
          const d = json?.data || json;
          if (d?.agencyName || d?.logoUrl) {
            setBranding({ ...DEFAULT, ...d });
            setLoaded(true);
            return;
          }
        }
      } catch {
        /* fall through */
      }
      if (!cancelled) {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) setBranding({ ...DEFAULT, ...JSON.parse(raw) });
        } catch {
          /* ignore */
        }
        setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { branding, loaded };
}

/** Synchronous read — non-React contexts (e.g. PDF service workers). */
export function readAgentBrandingSync(): AgentBranding {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return DEFAULT;
}
