"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Activity, ArrowLeft, Flag, RotateCcw, Zap } from "lucide-react";
import { ASSETS, computeLeaderboard, type Symbol } from "../../../packages/engine/index";
import { useMarketStore } from "@/features/market/store";
import { formatMoney, formatPercent, formatTimer } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ModeBadge } from "@/components/mode-badge";
import { CandleChart } from "./candle-chart";
import { OrderEntry } from "./order-entry";
import { Leaderboard, CrashComparison } from "./leaderboard";
import { CrashVisual } from "./crash-visual";
import { OrderBookPanel, OrdersPanel, PortfolioPanel, SentimentDial, TradesPanel, Watchlist } from "./terminal-panels";

export function TradingTerminal() {
  const snapshot = useMarketStore((state) => state.snapshot);
  const busy = useMarketStore((state) => state.busy);
  const error = useMarketStore((state) => state.error);
  const notice = useMarketStore((state) => state.notice);
  const clearFeedback = useMarketStore((state) => state.clearFeedback);
  const cancelOrder = useMarketStore((state) => state.cancelOrder);
  const triggerMeltdown = useMarketStore((state) => state.triggerMeltdown);
  const finishMatch = useMarketStore((state) => state.finishMatch);
  const resetMatch = useMarketStore((state) => state.resetMatch);
  const [symbol, setSymbol] = useState<Symbol>("NEON");
  const [mobilePanel, setMobilePanel] = useState("market");
  // The overlay is derived: a new event re-opens it, dismissing records which event was closed.
  const [dismissedEventId, setDismissedEventId] = useState<string | null>(null);
  const latestEvent = snapshot?.state.events[snapshot.state.events.length - 1];
  const latestEventId = latestEvent?.id;
  const crashActive = Boolean(latestEventId) && dismissedEventId !== latestEventId;
  const closeCrash = useCallback(() => setDismissedEventId(latestEventId ?? null), [latestEventId]);
  const leaderboard = useMemo(() => snapshot ? computeLeaderboard(snapshot.state) : [], [snapshot]);

  if (!snapshot) return <div className="min-h-screen grid place-items-center"><p className="display-face neon-wordmark text-3xl">THE DEALER IS PREPARING THE MARKET.</p></div>;
  const { state } = snapshot;
  if (snapshot.phase === "preview" || snapshot.phase === "lobby") return (
    <main className="min-h-screen grid place-items-center px-6">
      <div className="solid-panel max-w-lg p-8 text-center"><h1 className="text-3xl">Your seat is not ready yet.</h1><p className="mt-3 text-muted">Create or join a table, ready up, and open the market.</p><Button asChild className="mt-6"><Link href="/lobby">Return to the lobby</Link></Button></div>
    </main>
  );
  const asset = state.assets[symbol];
  const change = (asset.mid - asset.sessionOpen) / asset.sessionOpen * 100;
  const mobile = (panel: string) => mobilePanel === panel ? "mobile-active" : "";

  return (
    <main className="terminal-shell">
      <a href="#terminal-grid" className="sr-only focus:not-sr-only">Skip to trading terminal</a>
      <header className="terminal-header">
        <div className="terminal-brand"><Link href="/" className="display-face neon-wordmark">BROKE VEGAS</Link><span className="room-identity">THE OBSIDIAN TABLE <strong>{snapshot.roomCode}</strong></span></div>
        <div className="market-clock"><span className={snapshot.phase === "live" ? "status-live" : "status-closed"}>{snapshot.phase === "live" ? "MARKET OPEN" : "TRADING CLOSED"}</span><strong className="number">{formatTimer(state.config.maxTicks - state.tick)}</strong></div>
        <div className="player-chip"><span>You · Host</span><strong className="number">{formatMoney(state.players.you.cash)}</strong></div>
      </header>

      <div className="terminal-actions">
        <ModeBadge />
        <div className="mobile-terminal-tabs" role="tablist" aria-label="Terminal panels">
          {["market", "trade", "portfolio"].map((panel) => <button key={panel} role="tab" aria-selected={mobilePanel === panel} className={mobilePanel === panel ? "active" : ""} onClick={() => setMobilePanel(panel)}>{panel[0].toUpperCase() + panel.slice(1)}</button>)}
        </div>
        <div className="host-actions">
          <Button variant="ghost" size="sm" asChild><Link href="/lobby"><ArrowLeft size={14} /> Lobby</Link></Button>
          {snapshot.phase === "live" && <><Button variant="ghost" size="sm" onClick={() => finishMatch()} disabled={busy}><Flag size={14} /> End match</Button><Button variant="crimson" size="sm" onClick={() => triggerMeltdown()} disabled={busy}><Zap size={15} /> TRIGGER MARKET MELTDOWN</Button></>}
          {snapshot.phase === "finished" && <><Button variant="ghost" size="sm" onClick={() => resetMatch()} disabled={busy}><RotateCcw size={14} /> Reset demo match</Button><Button size="sm" asChild><Link href="/results">Match results</Link></Button></>}
        </div>
      </div>
      {(error || notice) && <div className={`terminal-toast ${error ? "toast-error" : "toast-success"}`} role="status"><span>{error ?? notice}</span><button onClick={clearFeedback} aria-label="Dismiss notification">Dismiss</button></div>}
      <div className="sr-only" aria-live="polite">{state.fills.length ? `Latest fill: ${state.fills[state.fills.length - 1].qty} ${state.fills[state.fills.length - 1].symbol} at ${formatMoney(state.fills[state.fills.length - 1].price, true)}` : "No fills yet"}</div>

      <div className="terminal-grid" id="terminal-grid">
        <div className={`terminal-area-watch ${mobile("market")}`} data-mobile-panel><Watchlist state={state} selected={symbol} onSelect={setSymbol} /></div>
        <section className={`solid-panel chart-panel terminal-area-chart ${mobile("market")}`} data-mobile-panel aria-labelledby="chart-title">
          <div className="chart-heading">
            <div><h1 id="chart-title">{symbol} <span>{ASSETS[symbol].name}</span></h1><p>{ASSETS[symbol].character}</p></div>
            <div className="chart-last number"><strong>{formatMoney(asset.mid, true)}</strong><span className={change >= 0 ? "gain" : "loss"}>{change >= 0 ? "▲" : "▼"} {formatPercent(change)}</span></div>
            <div className="chart-quote number"><span>Bid <strong className="gain">{formatMoney(asset.bid, true)}</strong></span><span>Ask <strong className="loss">{formatMoney(asset.ask, true)}</strong></span><span>Tick <strong>{state.tick}</strong></span></div>
          </div>
          <div className="chart-canvas"><CandleChart asset={asset} symbol={symbol} /></div>
        </section>
        <div className={`terminal-area-order ${mobile("trade")}`} data-mobile-panel><OrderEntry symbol={symbol} /></div>
        <div className={`terminal-area-portfolio ${mobile("portfolio")}`} data-mobile-panel><PortfolioPanel state={state} /></div>
        <div className={`terminal-area-book ${mobile("market")}`} data-mobile-panel><OrderBookPanel state={state} symbol={symbol} /></div>
        <div className={`terminal-area-leaderboard ${mobile("portfolio")}`} data-mobile-panel><Leaderboard entries={leaderboard} /></div>
        <div className={`terminal-area-sentiment ${mobile("portfolio")}`} data-mobile-panel><SentimentDial state={state} /></div>
        <div className={`terminal-area-orders ${mobile("trade")}`} data-mobile-panel><OrdersPanel state={state} onCancel={cancelOrder} busy={busy} /></div>
        <div className={`terminal-area-trades ${mobile("trade")}`} data-mobile-panel><TradesPanel state={state} /></div>
      </div>
      <CrashComparison event={latestEvent} />
      <footer className="terminal-footer"><span><Activity size={13} /> Engine tick {state.tick} · State {snapshot.hash.slice(0, 12)}</span><span>Educational simulation. Fictional assets. Not financial advice.</span><Link href="/results">Results</Link></footer>
      {latestEvent && <CrashVisual active={crashActive} severity={latestEvent.severity} headline={latestEvent.headline} affectedAssets={latestEvent.affectedAssets} startedAt={latestEvent.startedAt} onComplete={closeCrash} />}
    </main>
  );
}
