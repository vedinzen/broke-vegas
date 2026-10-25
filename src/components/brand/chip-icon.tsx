export function ChipIcon({ value, tone = "gold", size = 42 }: { value?: string; tone?: "gold" | "emerald" | "crimson" | "cyan"; size?: number }) {
  const colors = { gold: "#f2c96d", emerald: "#27e59a", crimson: "#e73555", cyan: "#59dff5" };
  const color = colors[tone];
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label={value ? `${value} casino chip` : "Casino chip"}>
      <circle cx="24" cy="24" r="21" fill="#100d17" stroke={color} strokeWidth="3" />
      <circle cx="24" cy="24" r="14" fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="3 3" />
      <path d="M24 3v7M24 38v7M3 24h7M38 24h7M9.2 9.2l5 5M33.8 33.8l5 5M38.8 9.2l-5 5M14.2 33.8l-5 5" stroke={color} strokeWidth="3" />
      {value && <text x="24" y="28" textAnchor="middle" fill="#f7f1e8" fontSize="11" fontFamily="monospace">{value}</text>}
    </svg>
  );
}
