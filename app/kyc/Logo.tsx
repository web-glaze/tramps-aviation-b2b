"use client";

import Image from "next/image";

export function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <div className="h-11 w-11 rounded-xl overflow-hidden bg-white border border-border flex-shrink-0">
        <Image
          src="/logo.svg"
          alt="Tramps Aviation"
          width={44}
          height={44}
          className="h-11 w-11 object-contain"
        />
      </div>
      <div>
        <p
          style={{
            fontWeight: 700,
            color: "hsl(var(--foreground))",
            margin: 0,
            fontSize: "0.95rem",
          }}
        >
          Tramps Aviation B2B
        </p>
        <p
          style={{
            color: "hsl(var(--muted-foreground))",
            fontSize: "0.65rem",
            margin: 0,
          }}
        >
          Agent Portal · KYC Verification
        </p>
      </div>
    </div>
  );
}
