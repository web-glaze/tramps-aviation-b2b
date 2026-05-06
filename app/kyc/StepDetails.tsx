"use client";

import { Shield, Building2, Info, ChevronRight } from "lucide-react";
import { Field } from "./Field";
import { styles } from "./utils";
import type { KycForm } from "./types";

interface StepDetailsProps {
  form: KycForm;
  onChange: (updates: Partial<KycForm>) => void;
  onNext: () => void;
}

export function StepDetails({ form, onChange, onNext }: StepDetailsProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Identity */}
      <div style={styles.card}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          <Shield
            style={{
              width: 16,
              height: 16,
              color: "hsl(var(--primary))",
            }}
          />
          <span
            style={{
              fontSize: "0.9rem",
              fontWeight: 700,
              color: "hsl(var(--foreground))",
            }}
          >
            Identity Details
          </span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.875rem",
          }}
        >
          <Field
            label="PAN Number *"
            placeholder="AAPFU0939F"
            maxLength={10}
            value={form.panNumber}
            onChange={(v) => onChange({ panNumber: v.toUpperCase() })}
            hint="Format: AAAAA0000A (10 characters)"
          />
          <Field
            label="Aadhaar Number *"
            placeholder="1234 5678 9012"
            maxLength={12}
            type="tel"
            value={form.aadharNumber}
            onChange={(v) => onChange({ aadharNumber: v })}
            hint="12-digit Aadhaar number"
          />
          <Field
            label="GST Number (Optional)"
            placeholder="27AAPFU0939F1ZV"
            maxLength={15}
            value={form.gstNumber}
            onChange={(v) => onChange({ gstNumber: v.toUpperCase() })}
            hint="15-character GST registration number"
          />
        </div>
      </div>

      {/* Bank */}
      <div style={styles.card}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "0.5rem",
          }}
        >
          <Building2
            style={{ width: 16, height: 16, color: "#a78bfa" }}
          />
          <span
            style={{
              fontSize: "0.9rem",
              fontWeight: 700,
              color: "hsl(var(--foreground))",
            }}
          >
            Bank Details
          </span>
          <span
            style={{
              fontSize: "0.7rem",
              color: "hsl(var(--muted-foreground))",
              marginLeft: "0.25rem",
            }}
          >
            (for commission payouts)
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.6rem 0.875rem",
            background: "rgba(99,102,241,0.07)",
            border: "1px solid rgba(99,102,241,0.2)",
            borderRadius: "0.625rem",
            marginBottom: "0.875rem",
          }}
        >
          <Info
            style={{
              width: 13,
              height: 13,
              color: "#818cf8",
              flexShrink: 0,
            }}
          />
          <p style={{ fontSize: "0.72rem", color: "#818cf8", margin: 0 }}>
            Add IFSC and account number carefully — required for receiving
            commissions.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.875rem",
          }}
        >
          <Field
            label="Bank Name"
            placeholder="State Bank of India"
            value={form.bankName}
            onChange={(v) => onChange({ bankName: v })}
          />
          <Field
            label="Account Holder Name"
            placeholder="Rajesh Kumar"
            value={form.accountHolder}
            onChange={(v) => onChange({ accountHolder: v })}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.75rem",
            }}
          >
            <Field
              label="Account Number"
              placeholder="1234567890"
              type="tel"
              value={form.accountNumber}
              onChange={(v) => onChange({ accountNumber: v })}
            />
            <Field
              label="IFSC Code"
              placeholder="SBIN0001234"
              maxLength={11}
              value={form.ifscCode}
              onChange={(v) => onChange({ ifscCode: v.toUpperCase() })}
              hint="11 characters"
            />
          </div>
          <div>
            <label style={styles.label}>Account Type</label>
            <select
              value={form.accountType}
              onChange={(e) => onChange({ accountType: e.target.value as "savings" | "current" })}
              style={{ ...styles.input, appearance: "none" }}
            >
              <option value="savings">Savings Account</option>
              <option value="current">Current Account</option>
            </select>
          </div>
        </div>
      </div>

      <button onClick={onNext} style={styles.primaryBtn}>
        Continue to Document Upload{" "}
        <ChevronRight style={{ width: 16, height: 16 }} />
      </button>
    </div>
  );
}
