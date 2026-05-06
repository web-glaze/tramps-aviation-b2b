"use client";

interface TagProps {
  color: string;
  bg: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function Tag({ color, bg, icon, children }: TagProps) {
  return (
    <span
      style={{
        fontSize: "0.65rem",
        color,
        background: bg,
        padding: "0.1rem 0.45rem",
        borderRadius: "999px",
        display: "flex",
        alignItems: "center",
        gap: "0.2rem",
      }}
    >
      {icon}
      {children}
    </span>
  );
}
