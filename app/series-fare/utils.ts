export const todayISO = () => new Date().toISOString().split("T")[0];

export const fmtINR = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export const minDurationMins = (s: string) => {
  if (!s) return 999;
  const m = s.match(/(\d+)h\s*(\d+)?m?/);
  if (!m) return 999;
  return parseInt(m[1]) * 60 + parseInt(m[2] || "0");
};
