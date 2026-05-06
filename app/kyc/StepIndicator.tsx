"use client";

import { Shield, FileText, CheckCircle } from "lucide-react";
import type { Step } from "./types";

interface StepIndicatorProps {
  currentStep: Step;
  kycStatus: string;
}

export function StepIndicator({ currentStep, kycStatus }: StepIndicatorProps) {
  const steps = [
    { key: "details", label: "Details", icon: Shield },
    { key: "upload", label: "Documents", icon: FileText },
  ];

  return (
    <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
      {steps.map((s, i) => {
        const Icon = s.icon;
        const isActive = currentStep === s.key;
        const isDone = s.key === "details" && currentStep === "upload";
        return (
          <div
            key={s.key}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.625rem 0.875rem",
              borderRadius: "0.75rem",
              border: `1px solid ${isActive ? "rgba(59,130,246,0.5)" : isDone ? "rgba(74,222,128,0.3)" : "hsl(var(--border))"}`,
              background: isActive
                ? "rgba(59,130,246,0.08)"
                : isDone
                  ? "rgba(74,222,128,0.06)"
                  : "transparent",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: isActive
                  ? "#2563eb"
                  : isDone
                    ? "#16a34a"
                    : "hsl(var(--border))",
                flexShrink: 0,
              }}
            >
              {isDone ? (
                <CheckCircle
                  style={{
                    width: 14,
                    height: 14,
                    color: "hsl(var(--foreground))",
                  }}
                />
              ) : (
                <Icon
                  style={{
                    width: 13,
                    height: 13,
                    color: isActive
                      ? "white"
                      : "hsl(var(--muted-foreground))",
                  }}
                />
              )}
            </div>
            <div>
              <p
                style={{
                  fontSize: "0.7rem",
                  color: "hsl(var(--muted-foreground))",
                  margin: 0,
                }}
              >
                Step {i + 1}
              </p>
              <p
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: isActive
                    ? "white"
                    : isDone
                      ? "#4ade80"
                      : "hsl(var(--muted-foreground))",
                  margin: 0,
                }}
              >
                {s.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
