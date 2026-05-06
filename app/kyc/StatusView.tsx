"use client";

import { CheckCircle, Clock, RefreshCw, BadgeCheck } from "lucide-react";
import { Logo } from "./Logo";
import { styles } from "./utils";
import type { KycStatus } from "./types";

interface StatusViewProps {
  status: KycStatus;
  rejectionReason: string;
  name: string;
  onRefresh?: () => void;
  onApprovedDashboard?: () => void;
}

export function StatusView({
  status,
  rejectionReason,
  name,
  onRefresh,
  onApprovedDashboard,
}: StatusViewProps) {
  // ──────────────────────────────────────────────────────
  // APPROVED
  // ──────────────────────────────────────────────────────
  if (status === "approved") {
    return (
      <div style={styles.page}>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <div
          style={{
            maxWidth: "30rem",
            margin: "3rem auto",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "rgba(74,222,128,0.12)",
              border: "2px solid rgba(74,222,128,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem",
            }}
          >
            <BadgeCheck style={{ width: 40, height: 40, color: "#4ade80" }} />
          </div>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              color: "hsl(var(--foreground))",
              margin: "0 0 0.5rem",
            }}
          >
            KYC Approved! 🎉
          </h1>
          {name && (
            <p
              style={{
                color: "hsl(var(--primary))",
                fontSize: "0.9rem",
                margin: "0 0 0.5rem",
                fontWeight: 500,
              }}
            >
              {name}
            </p>
          )}
          <p
            style={{
              color: "hsl(var(--muted-foreground))",
              fontSize: "0.875rem",
              margin: "0 0 2rem",
              lineHeight: 1.6,
            }}
          >
            Your KYC is verified. You can now book flights, hotels and earn
            commissions.
          </p>
          <button
            onClick={onApprovedDashboard}
            style={{
              ...styles.primaryBtn,
              background: "#16a34a",
              border: "none",
              cursor: "pointer",
            }}
          >
            <CheckCircle style={{ width: 18, height: 18 }} /> Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────
  // UNDER REVIEW / SUBMITTED
  // ──────────────────────────────────────────────────────
  if (status === "submitted" || status === "under_review") {
    return (
      <div style={styles.page}>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <div style={{ maxWidth: "30rem", margin: "0 auto" }}>
          <Logo />
          <div
            style={{
              ...styles.card,
              border: "1px solid rgba(96,165,250,0.3)",
              background: "rgba(96,165,250,0.04)",
              textAlign: "center",
              padding: "2rem 1.5rem",
              marginTop: "2rem",
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "rgba(96,165,250,0.12)",
                border: "2px solid rgba(96,165,250,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.25rem",
              }}
            >
              <Clock
                style={{ width: 36, height: 36, color: "hsl(var(--primary))" }}
              />
            </div>
            <h2
              style={{
                fontSize: "1.375rem",
                fontWeight: 700,
                color: "hsl(var(--foreground))",
                margin: "0 0 0.375rem",
              }}
            >
              Documents Under Review
            </h2>
            {name && (
              <p
                style={{
                  color: "hsl(var(--primary))",
                  fontSize: "0.875rem",
                  margin: "0 0 0.75rem",
                  fontWeight: 500,
                }}
              >
                {name}
              </p>
            )}
            <p
              style={{
                color: "hsl(var(--muted-foreground))",
                fontSize: "0.85rem",
                margin: "0 0 1.5rem",
                lineHeight: 1.7,
              }}
            >
              Your KYC documents have been submitted and are being reviewed.
              This usually takes{" "}
              <strong style={{ color: "hsl(var(--muted-foreground))" }}>
                24–48 business hours
              </strong>
              .
            </p>
            <div
              style={{
                textAlign: "left",
                background: "hsl(var(--background))",
                borderRadius: "0.75rem",
                padding: "0.875rem 1rem",
                marginBottom: "1.5rem",
              }}
            >
              {[
                { label: "Details Submitted", done: true },
                { label: "Documents Uploaded", done: true },
                { label: "Admin Review", done: false, active: true },
                { label: "Account Activated", done: false },
              ].map((step, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.45rem 0",
                    borderBottom:
                      i < 3 ? "1px solid hsl(var(--border))" : "none",
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: step.done
                        ? "#16a34a"
                        : step.active
                          ? "rgba(96,165,250,0.2)"
                          : "hsl(var(--border))",
                      border: step.active ? "2px solid #60a5fa" : "none",
                    }}
                  >
                    {step.done ? (
                      <CheckCircle
                        style={{
                          width: 12,
                          height: 12,
                          color: "hsl(var(--foreground))",
                        }}
                      />
                    ) : step.active ? (
                      <Clock
                        style={{
                          width: 11,
                          height: 11,
                          color: "hsl(var(--primary))",
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: "0.6rem",
                          color: "hsl(var(--muted-foreground))",
                          fontWeight: 600,
                        }}
                      >
                        {i + 1}
                      </span>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: step.done
                        ? "#4ade80"
                        : step.active
                          ? "#60a5fa"
                          : "hsl(var(--muted-foreground))",
                      fontWeight: step.active ? 600 : 400,
                    }}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
            <p
              style={{
                fontSize: "0.75rem",
                color: "hsl(var(--muted-foreground))",
                margin: "0 0 1.25rem",
              }}
            >
              📧 You will be notified by email once approved.
            </p>
            <button
              onClick={onRefresh}
              style={{
                ...styles.outlineBtn,
                width: "auto",
                padding: "0.6rem 1.25rem",
                fontSize: "0.8rem",
                margin: "0 auto",
              }}
            >
              <RefreshCw style={{ width: 13, height: 13 }} /> Check Status
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
