"use client";

import { XCircle } from "lucide-react";

interface RejectionBannerProps {
  reason: string;
}

export function RejectionBanner({ reason }: RejectionBannerProps) {
  return (
    <div
      style={{
        border: "1px solid rgba(248,113,113,0.35)",
        background: "rgba(248,113,113,0.07)",
        borderRadius: "0.75rem",
        padding: "0.875rem 1rem",
        marginBottom: "1.25rem",
        display: "flex",
        alignItems: "flex-start",
        gap: "0.75rem",
      }}
    >
      <XCircle
        style={{
          width: 18,
          height: 18,
          color: "#f87171",
          flexShrink: 0,
          marginTop: 1,
        }}
      />
      <div>
        <p
          style={{
            fontSize: "0.85rem",
            fontWeight: 600,
            color: "#f87171",
            margin: "0 0 0.2rem",
          }}
        >
          KYC Rejected
        </p>
        <p style={{ fontSize: "0.8rem", color: "#fca5a5", margin: 0 }}>
          {reason || "Please re-upload clear, valid documents and resubmit."}
        </p>
      </div>
    </div>
  );
}
