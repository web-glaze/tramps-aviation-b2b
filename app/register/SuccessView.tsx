"use client";

import Link from "next/link";
import { CheckCircle } from "lucide-react";

interface SuccessViewProps {
  registeredEmail: string;
  registeredAgentId: string;
  onCopyId: () => void;
  copiedId: boolean;
}

/**
 * Post-submission success screen showing:
 * - Success confirmation
 * - Agent ID card with copy button
 * - Registered email info
 * - Action buttons (KYC, Login)
 * - Next steps guide
 */
export function SuccessView({
  registeredEmail,
  registeredAgentId,
  onCopyId,
  copiedId,
}: SuccessViewProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg text-center">
        {/* Success icon */}
        <div
          style={{
            width: 80,
            height: 80,
            background: "rgba(34,197,94,0.15)",
            border: "1px solid rgba(34,197,94,0.3)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.5rem",
          }}
        >
          <CheckCircle style={{ width: 40, height: 40, color: "#4ade80" }} />
        </div>

        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "hsl(var(--foreground))",
            marginBottom: "0.5rem",
          }}
        >
          Registration Successful! 🎉
        </h1>
        <p
          style={{
            color: "hsl(var(--muted-foreground))",
            fontSize: "0.875rem",
            marginBottom: "1.5rem",
            lineHeight: 1.6,
          }}
        >
          Your agency account has been created. Save your Agent ID below — you
          will need it to login.
        </p>

        {/* Agent ID Card — most important info */}
        {registeredAgentId && (
          <div
            style={{
              background:
                "linear-gradient(135deg, hsl(var(--primary)/0.08), hsl(var(--primary)/0.03))",
              border: "1px solid hsl(var(--primary)/0.3)",
              borderRadius: "1rem",
              padding: "1.5rem",
              marginBottom: "1.5rem",
            }}
          >
            <p
              style={{
                fontSize: "0.75rem",
                color: "hsl(var(--muted-foreground))",
                fontWeight: 600,
                margin: "0 0 0.5rem",
                letterSpacing: "0.05em",
              }}
            >
              YOUR AGENT ID
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.75rem",
              }}
            >
              <span
                style={{
                  fontSize: "2rem",
                  fontWeight: 800,
                  color: "hsl(var(--primary))",
                  fontFamily: "monospace",
                  letterSpacing: "0.1em",
                }}
              >
                {registeredAgentId}
              </span>
              <button
                onClick={onCopyId}
                style={{
                  background: copiedId ? "#16a34a" : "#1d4ed8",
                  border: "none",
                  borderRadius: "0.5rem",
                  padding: "0.375rem 0.75rem",
                  color: "hsl(var(--foreground))",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
              >
                {copiedId ? "✓ Copied!" : "Copy"}
              </button>
            </div>
            <p
              style={{
                fontSize: "0.75rem",
                color: "hsl(var(--muted-foreground))",
                margin: "0.75rem 0 0",
              }}
            >
              Login with this ID + your password
            </p>
          </div>
        )}

        {/* Email info */}
        <div
          style={{
            background: "hsl(var(--card))",
            border: "1px solid #1a2840",
            borderRadius: "0.75rem",
            padding: "1rem",
            marginBottom: "1.5rem",
            textAlign: "left",
          }}
        >
          <p
            style={{
              fontSize: "0.75rem",
              color: "hsl(var(--muted-foreground))",
              margin: "0 0 0.25rem",
            }}
          >
            Registered Email
          </p>
          <p
            style={{
              fontSize: "0.875rem",
              color: "hsl(var(--muted-foreground))",
              fontWeight: 500,
              margin: 0,
            }}
          >
            {registeredEmail}
          </p>
          <p
            style={{
              fontSize: "0.7rem",
              color: "#334155",
              margin: "0.5rem 0 0",
            }}
          >
            You can login with your email, Agent ID ({registeredAgentId || "TAHPXXXXX"}), or phone number
          </p>
        </div>

        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          <Link
            href="/kyc"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              width: "100%",
              background: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
              borderRadius: "0.75rem",
              padding: "0.875rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Upload KYC Documents →
          </Link>
          <Link
            href="/login"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              background: "hsl(var(--background))",
              border: "1px solid #1e293b",
              color: "hsl(var(--muted-foreground))",
              borderRadius: "0.75rem",
              padding: "0.75rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Go to Login
          </Link>
        </div>

        <div
          style={{
            marginTop: "2rem",
            padding: "1.25rem",
            background: "hsl(var(--card))",
            border: "1px solid #1a2840",
            borderRadius: "0.75rem",
            textAlign: "left",
          }}
        >
          <p
            style={{
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "hsl(var(--foreground))",
              marginBottom: "0.75rem",
            }}
          >
            Next Steps:
          </p>
          {[
            {
              n: 1,
              text: "Upload KYC documents (PAN, GST, Trade License)",
              done: false,
            },
            {
              n: 2,
              text: "Wait for admin approval (24–48 hrs)",
              done: false,
            },
            { n: 3, text: "Start booking flights & hotels!", done: false },
          ].map((s) => (
            <div
              key={s.n}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                fontSize: "0.875rem",
                marginBottom: "0.5rem",
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  flexShrink: 0,
                  background: "hsl(var(--background))",
                  border: "1px solid #1e293b",
                  color: "hsl(var(--muted-foreground))",
                }}
              >
                {s.n}
              </div>
              <span style={{ color: "hsl(var(--muted-foreground))" }}>
                {s.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
