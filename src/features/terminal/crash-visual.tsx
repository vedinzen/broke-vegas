"use client";

import { useEffect } from "react";
import { Radio } from "lucide-react";

export interface CrashVisualProps {
  active: boolean;
  severity: number;
  headline: string;
  affectedAssets: string[];
  startedAt: number;
  onComplete: () => void;
}

export function CrashVisual({ active, severity, headline, affectedAssets, startedAt, onComplete }: CrashVisualProps) {
  useEffect(() => {
    if (!active) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(onComplete, reduced ? 1800 : 4600);
    return () => clearTimeout(timer);
  }, [active, startedAt, onComplete]);
  if (!active) return null;
  return (
    <div className="crash-visual" style={{ "--crash-severity": severity } as React.CSSProperties}>
      <div className="crash-edge" aria-hidden="true" />
      <div className="breaking-news" role="alert" aria-live="assertive">
        <div className="news-label"><Radio size={16} /> PIT BOSS NEWS WIRE <span>LIVE</span></div>
        <h2>{headline}</h2>
        <p>{affectedAssets.join(" · ")} <span>Severity {(severity * 100).toFixed(0)} / 100</span></p>
        <div className="news-ticker"><span>GREEN CANDLES. RED FLAGS.</span><span>THE HOUSE IS RE-QUOTING.</span><span>NO MORE BAD BETS. PROBABLY.</span></div>
      </div>
    </div>
  );
}
