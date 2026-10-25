"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import { Crown } from "lucide-react";
import type { LeaderboardEntry, MarketEvent } from "../../../packages/engine/index";
import { formatMoney, formatPercent, formatSignedMoney } from "@/lib/format";

gsap.registerPlugin(Flip);

export function Leaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  const container = useRef<HTMLDivElement>(null);
  const previous = useRef<ReturnType<typeof Flip.getState> | null>(null);
  useLayoutEffect(() => {
    if (!container.current) return;
    const rows = container.current.querySelectorAll(".leader-row");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (previous.current && !reduced) Flip.from(previous.current, { targets: rows, duration: 0.45, ease: "power2.inOut" });
    previous.current = Flip.getState(rows);
  }, [entries]);
  return (
    <section className="solid-panel leaderboard" aria-labelledby="leaderboard-title">
      <div className="panel-heading"><h2 id="leaderboard-title">The leaderboard</h2><span>Marked to mid</span></div>
      <div className="leader-head"><span>Rank</span><span>Player</span><span>Equity</span><span>Return</span></div>
      <div ref={container}>
        {entries.map((entry) => (
          <div className={`leader-row ${entry.rank === 1 ? "leader-first" : ""}`} key={entry.playerId} data-flip-id={entry.playerId}>
            <span className="rank number">{entry.rank === 1 ? <Crown size={15} aria-label="Leader" /> : entry.rank}</span>
            <span className="leader-player"><i>{entry.name.split(" ").map((word) => word[0]).join("").slice(0,2)}</i><span><strong>{entry.name}</strong><small className={entry.movement > 0 ? "gain" : entry.movement < 0 ? "loss" : "muted"}>{entry.movement > 0 ? `▲ Up ${entry.movement}` : entry.movement < 0 ? `▼ Down ${Math.abs(entry.movement)}` : "— No rank change"}</small></span></span>
            <span className="leader-equity number"><strong>{formatMoney(entry.equity)}</strong><small className={entry.pnl >= 0 ? "gain" : "loss"}>{formatSignedMoney(entry.pnl)}</small></span>
            <span className={`number ${entry.returnPct >= 0 ? "gain" : "loss"}`}>{entry.returnPct >= 0 ? "▲" : "▼"} {formatPercent(entry.returnPct)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CrashComparison({ event }: { event: MarketEvent | undefined }) {
  if (!event?.after) return null;
  return (
    <section className="crash-comparison" aria-labelledby="crash-comparison-title">
      <div><span className="crash-kicker">VEGAS JUST CRASHED</span><h2 id="crash-comparison-title">Before the shock. After the truth.</h2></div>
      <div className="crash-comparison-grid">
        {event.after.map((after) => {
          const before = event.before.find((entry) => entry.playerId === after.playerId)!;
          const delta = after.equity - before.equity;
          return <div key={after.playerId}><strong>{after.name}</strong><span className="number">{formatMoney(before.equity)} → {formatMoney(after.equity)}</span><small className={delta >= 0 ? "gain" : "loss"}>{delta >= 0 ? "▲" : "▼"} {formatSignedMoney(delta)} · Rank {before.rank} → {after.rank}</small></div>;
        })}
      </div>
    </section>
  );
}
