export function StaticPoster({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`static-poster ${compact ? "poster-compact" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="poster-sky" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#130b1e" /><stop offset=".55" stopColor="#3a142e" /><stop offset="1" stopColor="#07060b" /></linearGradient>
          <radialGradient id="poster-glow"><stop stopColor="#e73555" stopOpacity=".35" /><stop offset="1" stopColor="#e73555" stopOpacity="0" /></radialGradient>
        </defs>
        <rect width="1440" height="900" fill="url(#poster-sky)" />
        <ellipse cx="920" cy="330" rx="420" ry="230" fill="url(#poster-glow)" />
        <g fill="#0b0811" stroke="#4c2843">
          {Array.from({ length: 30 }, (_, index) => {
            const x = index * 52 - 20;
            const h = 90 + ((index * 73) % 280);
            return <rect key={index} x={x} y={650 - h} width={38} height={h + 250} />;
          })}
        </g>
        <g opacity=".75">
          {Array.from({ length: 120 }, (_, index) => {
            const x = 15 + ((index * 137) % 1380);
            const y = 390 + ((index * 47) % 260);
            return <rect key={index} x={x} y={y} width="3" height="7" fill={index % 7 === 0 ? "#59dff5" : index % 5 === 0 ? "#f2c96d" : "#e73555"} />;
          })}
        </g>
        <g transform="translate(580 180)">
          {[0,1,2,3,4].map((index) => <g key={index} transform={`translate(${index * 65} 0)`}><line x1="18" x2="18" y1="0" y2="18" stroke="#27e59a" strokeWidth="4" /><rect x="5" y="18" width="26" height="90" fill="#170f20" stroke="#27e59a" strokeWidth="2" /><line x1="18" x2="18" y1="108" y2="130" stroke="#27e59a" strokeWidth="4" /></g>)}
        </g>
        <text x="720" y="425" textAnchor="middle" fill="#fff4ee" stroke="#e73555" strokeWidth="1.4" fontFamily="Tilt Neon, sans-serif" fontSize="88" letterSpacing="4">BROKE VEGAS</text>
        <rect x="320" y="460" width="800" height="2" fill="#f2c96d" opacity=".45" />
      </svg>
      <div className="poster-fade" />
    </div>
  );
}
