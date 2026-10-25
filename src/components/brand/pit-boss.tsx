export function PitBossPortrait({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 420" role="img" aria-labelledby="pit-boss-title" className={className}>
      <title id="pit-boss-title">The Pit Boss, an original fictional casino analyst in a dark suit</title>
      <defs>
        <radialGradient id="boss-bg"><stop stopColor="#48223e" /><stop offset="1" stopColor="#100d17" /></radialGradient>
        <linearGradient id="boss-suit" x2="1" y2="1"><stop stopColor="#25202e" /><stop offset="1" stopColor="#09080d" /></linearGradient>
      </defs>
      <rect width="360" height="420" rx="24" fill="url(#boss-bg)" />
      <circle cx="180" cy="146" r="91" fill="#f2c96d" opacity=".08" />
      <path d="M72 420c5-100 37-153 86-166h44c51 13 82 66 87 166" fill="url(#boss-suit)" stroke="#54465d" />
      <path d="M145 251l35 42 36-42-12-22h-48z" fill="#d7a887" />
      <path d="M158 259l22 34 23-34-23 12z" fill="#f7f1e8" />
      <path d="M180 272l-10 15 10 51 11-51z" fill="#e73555" />
      <path d="M145 251l35 42-34 28-22-55M215 251l-35 42 35 28 22-55" fill="none" stroke="#6b5b72" strokeWidth="3" />
      <ellipse cx="180" cy="157" rx="67" ry="89" fill="#c88f72" />
      <path d="M113 151c-5-74 30-107 72-107 49 0 73 41 63 103l-17-44c-42 15-72 8-100-8z" fill="#15111b" />
      <path d="M118 134c-14-10-20 7-12 29 4 13 12 20 20 17M242 134c14-10 20 7 12 29-4 13-12 20-20 17" fill="#c88f72" />
      <path d="M143 151l25-3M194 148l25 3" stroke="#2c1c25" strokeWidth="6" strokeLinecap="round" />
      <path d="M153 161h12M198 161h12" stroke="#f7f1e8" strokeWidth="3" strokeLinecap="round" />
      <path d="M180 159l-7 34 15 3" fill="none" stroke="#9d6857" strokeWidth="3" />
      <path d="M151 215c18 12 40 12 58 0-20 4-38 4-58 0z" fill="#5d3034" />
      <path d="M130 135c20-13 36-14 49-6M184 129c16-8 33-5 48 6" fill="none" stroke="#2b1a24" strokeWidth="5" strokeLinecap="round" />
      <path d="M239 330h30v8h-30z" fill="#f2c96d" />
      <circle cx="102" cy="336" r="5" fill="#f2c96d" />
      <text x="180" y="395" textAnchor="middle" fill="#f2c96d" fontFamily="sans-serif" fontSize="13" letterSpacing="4">THE PIT BOSS</text>
    </svg>
  );
}
