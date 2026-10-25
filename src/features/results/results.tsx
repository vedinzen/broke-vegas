"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Share2, Trophy } from "lucide-react";
import { badgesFor, computeLeaderboard } from "../../../packages/engine/index";
import { useMarketStore } from "@/features/market/store";
import { formatMoney, formatPercent, formatSignedMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { NeonWordmark } from "@/components/brand/wordmark";
import { PitBossReview } from "@/features/analyst/pit-boss-review";

export function MatchResults() {
  const router = useRouter();
  const snapshot = useMarketStore((state) => state.snapshot);
  const resetMatch = useMarketStore((state) => state.resetMatch);
  const [shareNote, setShareNote] = useState("");
  const entries = useMemo(() => snapshot ? computeLeaderboard(snapshot.state) : [], [snapshot]);
  if (!snapshot) return <main className="min-h-screen grid place-items-center">COUNTING YOUR LOSSES...</main>;
  const winner = entries[0];
  const share = async () => {
    const text = `BROKE VEGAS · ${winner.name} won with ${formatMoney(winner.equity)} virtual equity. THE HOUSE ALWAYS WINS. PROBABLY.`;
    try {
      if (navigator.share) await navigator.share({ title: "BROKE VEGAS results", text });
      else { await navigator.clipboard.writeText(text); setShareNote("Results copied to clipboard."); }
    } catch { setShareNote("Sharing was cancelled. Your results are still here."); }
  };
  const reset = async () => { if (await resetMatch()) router.push("/lobby"); };
  return (
    <main className="results-page">
      <nav className="results-nav"><Button variant="ghost" asChild><Link href="/terminal"><ArrowLeft size={15} /> Terminal</Link></Button><NeonWordmark compact /><Button variant="ghost" onClick={share}><Share2 size={15} /> Share result</Button></nav>
      <section className="winner-stage">
        <div className="gold-spotlight" aria-hidden="true" />
        <div className="trophy-token" aria-hidden="true"><Trophy size={72} /><span>₹</span></div>
        <p className="display-face text-gold text-xl">THE JACKPOT GOES TO</p>
        <h1>{winner.name}</h1>
        <strong className="winner-equity number">{formatMoney(winner.equity)}</strong>
        <p className={winner.pnl >= 0 ? "gain" : "loss"}>{winner.pnl >= 0 ? "▲" : "▼"} {formatSignedMoney(winner.pnl)} · {formatPercent(winner.returnPct)}</p>
        <div className="winner-badges">{badgesFor(snapshot.state, winner.playerId).map((badge) => <span key={badge}>{badge}</span>)}</div>
      </section>
      <section className="results-rankings" aria-labelledby="rankings-title">
        <div className="results-heading"><h2 id="rankings-title">Final ledger</h2><p>Every value is marked from the recorded engine state. No real money changed hands.</p></div>
        {entries.map((entry) => <article className={entry.rank === 1 ? "result-card winner" : "result-card"} key={entry.playerId}>
          <div className="result-rank number">{entry.rank}</div><div><h3>{entry.name}</h3><p>{badgesFor(snapshot.state, entry.playerId).join(" · ") || "No badge. A rare mercy."}</p></div>
          <div className="number"><strong>{formatMoney(entry.equity)}</strong><span className={entry.pnl >= 0 ? "gain" : "loss"}>{formatSignedMoney(entry.pnl)}</span></div>
        </article>)}
      </section>
      {snapshot.phase === "finished" && <PitBossReview state={snapshot.state} playerId="you" />}
      <section className="results-actions"><div><h2>Fortunes are made. Friendships are tested.</h2><p>Reset creates a fresh match with the same room and a new ledger.</p></div><div className="flex gap-2 flex-wrap">{snapshot.phase === "finished" && <Button variant="ghost" asChild><Link href="/replay">Open verified replay</Link></Button>}<Button onClick={reset}>Deal a fresh match</Button></div></section>
      {shareNote && <p className="share-note" role="status">{shareNote}</p>}
      <footer className="results-footer">THE HOUSE ALWAYS WINS. PROBABLY. · Educational simulation, not financial advice.</footer>
    </main>
  );
}
