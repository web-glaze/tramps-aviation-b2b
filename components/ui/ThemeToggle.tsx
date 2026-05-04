"use client";
/**
 * ThemeToggle — Light / Dark mode switch
 * Uses localStorage key "tp-settings" (same as SettingsProvider / anti-flash script)
 */
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    const root = document.documentElement;
    if (next) root.classList.add("dark");
    else root.classList.remove("dark");

    // Persist in tp-settings (same format as SettingsProvider)
    try {
      const raw = localStorage.getItem("tp-settings");
      const store = raw ? JSON.parse(raw) : {};
      store.state = { ...(store.state || {}), theme: next ? "dark" : "light" };
      localStorage.setItem("tp-settings", JSON.stringify(store));
    } catch {}
  };

  if (!mounted) {
    return <div className={`h-9 w-9 rounded-xl ${className}`} />;
  }

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`h-9 w-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all ${className}`}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
