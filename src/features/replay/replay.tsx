"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Pause, Play, RotateCcw } from "lucide-react";
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getStateHash, replayMatch, sha256, SYMBOLS, type Symbol } from "../../../packages/engine/index";
import { useMarketStore } from "@/features/market/store";
import { formatMoney, formatPercent } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ModeBadge } from "@/components/mode-badge";

export function MatchReplay() {
  const snapshot = useMarketStore((state) => state.snapshot);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [symbol, setSymbol] = useState<Symbol>("NEON");
  const state = snapshot?.state;
  const maxTick = state?.tick ?? 0;
  const matchKey = state ? `${state.config.matchId}:${state.seed}` : "";

  // Scrubbing and verification are keyed to the match, so a new tape starts at its final tick
  // without an effect writing state during mount.
  const [scrub, setScrub] = useState<{ key: string; tick: number } | null>(null);
  const tick = scrub?.key === matchKey ? scrub.tick : maxTick;
  const setTick = (value: number) => setScrub({ key: matchKey, tick: value });
  const isPlaying = playing && tick < maxTick;

  const [verification, setVerification] = useState<{ key: string; ok: boolean } | null>(null);
  const verified = verification?.key === matchKey ? verification.ok : null;

  useEffect(() => {
    if (!state) return;
    const timer = setTimeout(() => {
      const players = Object.values(state.players).map((player) => ({ id: player.id, name: player.name, isHost: player.isHost, isBot: player.isBot }));
      const replayed = replayMatch(state.seed, players, state.config, state.replay);
      setVerification({ key: matchKey, ok: getStateHash(replayed) === getStateHash(state) });
    }, 80);
    return () => clearTimeout(timer);
  }, [state, matchKey]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setScrub((current) => {
        const base = current?.key === matchKey ? current.tick : maxTick;
        return { key: matchKey, tick: Math.min(maxTick, base + Math.max(1, Math.round(4 * speed))) };
      });
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying, speed, maxTick, matchKey]);

  const equityData = useMemo(() => {
    if (!state) return [];
    const players = Object.values(state.players);
    const byTick = new Map<number, Record<string, number>>();
    for (const player of players) {
      for (const point of player.equityHistory) {
        if (point.tick > tick) continue;
        const row = byTick.get(point.tick) ?? { tick: point.tick };
        row[player.id] = point.equity;
        byTick.set(point.tick, row);
      }
    }
    return [...byTick.values()].sort((a,b) => a.tick - b.tick);
  }, [state, tick]);

  if (!snapshot || !state) return <main className="replay-empty"><h1>THE TAPE IS EMPTY.</h1><Button asChild><Link href="/lobby">Enter the arena</Link></Button></main>;
  if (snapshot.phase !== "finished") return <main className="replay-empty"><h1>NO MORE BETS. THE MATCH IS NOT OVER.</h1><p>Finish a match before opening its event-sourced replay.</p><Button asChild><Link href="/terminal">Return to the terminal</Link></Button></main>;

  const prices = state.assets[symbol].history.filter((point) => point.tick <= tick);
  const players = Object.values(state.players);
  const rankings = players.map((player) => ({
    player,
    equity: player.equityHistory.filter((point) => point.tick <= tick).at(-1)?.equity ?? player.startingCash,
  })).sort((a,b) => b.equity - a.equity);
  const markers = state.events.filter((event) => event.startTick <= tick);
  const tradeMarkers = state.fills.filter((fill) => fill.symbol === symbol && fill.tick <= tick && (fill.buyerId !== "HOUSE" || fill.sellerId !== "HOUSE"));

  return (
    <main className="replay-page">
      <nav className="replay-nav"><Button variant="ghost" asChild><Link href="/results"><ArrowLeft size={15} /> Results</Link></Button><span className="display-face neon-wordmark text-2xl">MATCH REPLAY</span><ModeBadge /></nav>
      <header className="replay-header">
        <div><span>EVENT-SOURCED · {state.replay.length} LOG ENTRIES</span><h1>Every fill. Every candle. No new randomness.</h1><p>Reconstructed from the recorded seed, intents and ticks. The fairness seed is revealed only after trading closes.</p></div>
        <div className={`verify-badge ${verified ? "verified" : ""}`}>{verified ? <><CheckCircle2 size={17} /> REPLAY VERIFIED</> : verified === false ? "HASH MISMATCH — NOT VERIFIED" : "VERIFYING STATE HASH…"}</div>
      </header>
      <section className="replay-controls glass">
        <Button variant="cyan" onClick={() => setPlaying(!isPlaying)}>{isPlaying ? <Pause size={16} /> : <Play size={16} />} {isPlaying ? "Pause" : "Play"}</Button>
        <Button variant="ghost" size="sm" onClick={() => { setTick(0); setPlaying(false); }}><RotateCcw size={14} /> Rewind</Button>
        <label className="replay-range"><span className="sr-only">Replay tick</span><input type="range" min="0" max={maxTick} value={tick} onChange={(event) => setTick(Number(event.target.value))} /></label>
        <span className="number">TICK {tick} / {maxTick}</span>
        <div className="speed-buttons" role="group" aria-label="Playback speed">{[0.5,1,2,4].map((value) => <button key={value} className={speed === value ? "active" : ""} onClick={() => setSpeed(value)} aria-pressed={speed === value}>{value}×</button>)}</div>
      </section>
      <div className="replay-grid">
        <section className="solid-panel replay-price" aria-labelledby="replay-price-title">
          <div className="panel-heading"><h2 id="replay-price-title">Price history · {symbol}</h2><div className="replay-symbols">{SYMBOLS.map((item) => <button key={item} className={item === symbol ? "active" : ""} onClick={() => setSymbol(item)}>{item}</button>)}</div></div>
          <div className="replay-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={prices} margin={{ top: 10, right: 15, bottom: 5, left: 5 }}>
                <XAxis dataKey="tick" tick={{ fill: "#847b8e", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={["dataMin - 1000", "dataMax + 1000"]} tick={{ fill: "#847b8e", fontSize: 10 }} axisLine={false} tickLine={false} width={65} tickFormatter={(value) => `₹${(value/100).toFixed(0)}`} />
                <Tooltip contentStyle={{ background: "#100d17", border: "1px solid rgba(255,255,255,.14)" }} formatter={(value) => [formatMoney(Number(value), true), "Mid"]} />
                {markers.map((event) => <ReferenceLine key={event.id} x={event.startTick} stroke="#e73555" strokeDasharray="4 4" label={{ value: "CRASH", fill: "#e73555", fontSize: 9, position: "insideTopRight" }} />)}
                <Line dataKey="mid" stroke="#59dff5" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
            <div className="trade-markers" aria-hidden="true">{tradeMarkers.map((fill) => <i key={fill.id} style={{ left: `${fill.tick / Math.max(1, tick) * 100}%` }} className={fill.buyerId === "HOUSE" ? "sell" : "buy"} />)}</div>
          </div>
        </section>
        <section className="solid-panel replay-equity" aria-labelledby="replay-equity-title">
          <div className="panel-heading"><h2 id="replay-equity-title">Equity history</h2><span>All players · virtual ₹</span></div>
          <div className="replay-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={equityData} margin={{ top: 10, right: 15, bottom: 5, left: 5 }}>
                <XAxis dataKey="tick" tick={{ fill: "#847b8e", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={["dataMin - 10000", "dataMax + 10000"]} tick={{ fill: "#847b8e", fontSize: 10 }} axisLine={false} tickLine={false} width={65} tickFormatter={(value) => `₹${Math.round(value/100000)}k`} />
                <Tooltip contentStyle={{ background: "#100d17", border: "1px solid rgba(255,255,255,.14)" }} formatter={(value) => formatMoney(Number(value))} />
                {players.map((player, index) => <Line key={player.id} dataKey={player.id} name={player.name} stroke={["#59dff5","#f2c96d","#e73555"][index % 3]} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />)}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="solid-panel replay-ranks" aria-labelledby="replay-ranks-title">
          <div className="panel-heading"><h2 id="replay-ranks-title">Leaderboard at tick {tick}</h2><span>Reconstructed from snapshots</span></div>
          {rankings.map((entry, index) => <div key={entry.player.id} className="replay-rank-row"><span>{index + 1}</span><strong>{entry.player.name}</strong><span className="number">{formatMoney(entry.equity)}</span><small className={entry.equity >= entry.player.startingCash ? "gain" : "loss"}>{formatPercent((entry.equity - entry.player.startingCash) / entry.player.startingCash * 100)}</small></div>)}
        </section>
        <section className="solid-panel replay-timeline" aria-labelledby="timeline-title">
          <div className="panel-heading"><h2 id="timeline-title">News and events</h2><span>Click a marker to jump</span></div>
          {state.events.length === 0 ? <p className="empty-state">No market events in this match.</p> : <div className="event-list">{state.events.map((event) => <button key={event.id} onClick={() => setTick(event.startTick)} className={tick >= event.startTick ? "passed" : ""}><span className="number">T{event.startTick}</span><div><strong>{event.headline}</strong><small>{event.affectedAssets.join(" · ")} · severity {(event.severity * 100).toFixed(0)}</small></div></button>)}</div>}
          <div className="seed-reveal"><span>COMMITMENT · SHA-256</span><code>{state.seed ? sha256(state.seed).slice(0, 32) : "unavailable"}</code><span>REVEALED SEED</span><code>{state.seed}</code></div>
        </section>
      </div>
      <footer className="replay-footer"><span>Replay verification compares the reconstructed final state hash with the stored final state hash.</span><Link href="/results">Back to final ledger</Link></footer>
    </main>
  );
}
