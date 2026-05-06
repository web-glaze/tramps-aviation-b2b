"use client";

import { styles } from "./utils";

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  type?: string;
  hint?: string;
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  type = "text",
  hint,
}: FieldProps) {
  return (
    <div>
      <label style={styles.label}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        style={styles.input}
      />
      {hint && (
        <p
          style={{
            fontSize: "0.7rem",
            color: "hsl(var(--muted-foreground))",
            margin: "0.25rem 0 0",
          }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
