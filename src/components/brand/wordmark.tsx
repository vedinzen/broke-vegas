export function NeonWordmark({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 640 124"
      role="img"
      aria-labelledby="broke-vegas-wordmark"
      className={className}
      width={compact ? 240 : 640}
      height={compact ? 46.5 : 124}
    >
      <title id="broke-vegas-wordmark">BROKE VEGAS</title>
      <defs>
        <filter id="neon-glow" x="-30%" y="-60%" width="160%" height="220%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect x="7" y="7" width="626" height="110" rx="16" fill="none" stroke="#f2c96d" strokeWidth="3" strokeDasharray="1 15" strokeLinecap="round" />
      <text x="320" y="86" textAnchor="middle" fill="#fff4ee" stroke="#e73555" strokeWidth="1.2" filter="url(#neon-glow)" fontFamily="Tilt Neon, sans-serif" fontSize="72" letterSpacing="3">BROKE VEGAS</text>
    </svg>
  );
}
