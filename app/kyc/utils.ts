import type { KycStatus } from "./types";

export function normalizeStatus(raw: string): KycStatus {
  if (!raw || raw === "inactive" || raw === "pending_kyc") return "pending";
  if (raw === "kyc_submitted" || raw === "submitted") return "submitted";
  if (raw === "under_review") return "under_review";
  if (raw === "active" || raw === "approved") return "approved";
  if (raw === "rejected") return "rejected";
  return "pending";
}

export const styles = {
  page: {
    minHeight: "100vh",
    background: "hsl(var(--background))",
    padding: "2rem 1rem",
  } as React.CSSProperties,
  card: {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "0.875rem",
    padding: "1.25rem",
  } as React.CSSProperties,
  input: {
    width: "100%",
    background: "hsl(var(--background))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "0.75rem",
    padding: "0.7rem 1rem",
    fontSize: "0.875rem",
    color: "hsl(var(--foreground))",
    outline: "none",
    boxSizing: "border-box",
  } as React.CSSProperties,
  label: {
    fontSize: "0.78rem",
    color: "hsl(var(--muted-foreground))",
    fontWeight: 600,
    display: "block",
    marginBottom: "0.375rem",
  } as React.CSSProperties,
  primaryBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    width: "100%",
    background: "hsl(var(--primary))",
    color: "hsl(var(--foreground))",
    border: "none",
    borderRadius: "0.75rem",
    padding: "0.8rem",
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: "pointer",
  } as React.CSSProperties,
  outlineBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    width: "100%",
    background: "transparent",
    color: "hsl(var(--muted-foreground))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "0.75rem",
    padding: "0.8rem",
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: "pointer",
  } as React.CSSProperties,
  uploadBtn: (bg: string, disabled = false) =>
    ({
      display: "flex",
      alignItems: "center",
      gap: "0.375rem",
      padding: "0.5rem 0.875rem",
      borderRadius: "0.5rem",
      fontSize: "0.75rem",
      fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer",
      border: "none",
      color: "hsl(var(--foreground))",
      background: bg,
      opacity: disabled ? 0.6 : 1,
      flexShrink: 0,
    }) as React.CSSProperties,
};
