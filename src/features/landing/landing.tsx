"use client";

import Link from "next/link";
import { ArrowRight, ChevronRight, CircleDollarSign, Radio, Zap } from "lucide-react";
import { SYMBOLS, computeLeaderboard } from "../../../packages/engine/index";
import { useMarketStore } from "@/features/market/store";
import { formatMoney, formatPercent, formatSignedMoney } from "@/lib/format";
import { NeonWordmark } from "@/components/brand/wordmark";
import { PitBossPortrait } from "@/components/brand/pit-boss";
import { ChipIcon } from "@/components/brand/chip-icon";
import { ModeBadge } from "@/components/mode-badge";
import { Button } from "@/components/ui/button";
import { CinematicLayer } from "./cinematic-layer";

const copy = ["PLACE YOUR BETS. PLACE YOUR ORDERS.", "YOUR PORTFOLIO CALLED. IT WANTS A REFUND.", "ONE CRASH AWAY FROM CHARACTER DEVELOPMENT.", "THE MARKET IS OPEN. YOUR FINANCIAL STABILITY IS NOT."];

export function LandingPage() {
  const snapshot = useMarketStore((state) => state.snapshot);
  const state = snapshot?.state;
  const entries = state ? computeLeaderboard(state) : [];
  const index = state ? SYMBOLS.reduce((sum, symbol) => sum + state.assets[symbol].mid / state.assets[symbol].sessionOpen, 0) / SYMBOLS.length * 100 : 100;
  const indexChange = index - 100;
  const selectedAsset = state?.assets.NEON;

  return (
    <main className="landing-page">
      <CinematicLayer />
      <div className="landing-scrim" aria-hidden="true" />
      <nav className="landing-nav">
        <Link href="/" aria-label="BROKE VEGAS home"><NeonWordmark compact /></Link>
        <div className="landing-links"><a href="#how">How it works</a><a href="#floor">The floor</a><a href="#boss">Pit Boss</a><Link href="/lobby">Lobby</Link></div>
        <ModeBadge />
      </nav>

      <header className="landing-hero" id="top">
        <div className="hero-copy">
          <div className="hero-tag"><Radio size={14} /> A multiplayer trading arena · virtual money only</div>
          <h1>THE MARKET IS A CASINO.<br />AT LEAST HERE, YOU KNOW IT.</h1>
          <p>Start with ₹1,00,000 in virtual cash. Trade the chaos, outsmart your friends, and try not to go broke.</p>
          <div className="hero-actions"><Button asChild size="lg"><Link href="/lobby">ENTER THE ARENA <ArrowRight size={17} /></Link></Button><Button asChild size="lg" variant="ghost"><Link href="/lobby">JOIN A TABLE</Link></Button></div>
          <div className="hero-stats number">
            <div><span>Live index</span><strong>{index.toFixed(2)}</strong><small className={indexChange >= 0 ? "gain" : "loss"}>{indexChange >= 0 ? "▲" : "▼"} {formatPercent(indexChange)}</small></div>
            <div><span>Engine tick</span><strong>{state?.tick ?? "—"}</strong><small>1 Hz simulation</small></div>
            <div><span>Table stakes</span><strong>₹1,00,000</strong><small>integer paise</small></div>
          </div>
        </div>
        <div className="hero-note"><span>THE HOUSE ALWAYS WINS.</span><strong>PROBABLY.</strong></div>
      </header>

      <div className="market-tape" aria-label="Simulated market ticker">
        <div className="market-tape-track">
          {[...SYMBOLS, ...SYMBOLS].map((symbol, index) => {
            const asset = state?.assets[symbol];
            const change = asset ? (asset.mid - asset.sessionOpen) / asset.sessionOpen * 100 : 0;
            return <span key={`${symbol}-${index}`}><strong>{symbol}</strong><span className="number">{asset ? formatMoney(asset.mid, true) : "—"}</span><small className={change >= 0 ? "gain" : "loss"}>{change >= 0 ? "▲" : "▼"} {formatPercent(change)}</small></span>;
          })}
        </div>
      </div>

      <section className="landing-section how-section" id="how">
        <div className="section-index">HOW TO GO BROKE</div>
        <div className="how-grid">
          <div>
            <h2>Three decisions between you and character development.</h2>
            <p className="section-lede">A shared market, a House that makes prices, and friends who will absolutely sell into your stop-loss. The rules are simple; the consequences are theatrical.</p>
            <div className="how-steps">
              <article><span>01</span><div><h3>Take a seat</h3><p>Create a private room or join with a six-character code. Three seats, one market, everyone starts equal.</p></div></article>
              <article><span>02</span><div><h3>Make a market call</h3><p>Buy or sell six fictional assets. Market orders take liquidity; limits reserve cash and wait in the same book as the House.</p></div></article>
              <article><span>03</span><div><h3>Survive the meltdown</h3><p>The host can shock the market. Prices gap, House quotes re-price, resting orders fill, and the leaderboard tells the truth.</p></div></article>
            </div>
          </div>
          <div className="how-object" aria-hidden="true">
            <div className="chip-stack"><ChipIcon tone="gold" size={118} /><ChipIcon tone="crimson" size={118} /><ChipIcon tone="emerald" size={118} /></div>
            <div className="orbit-line" />
            <p className="display-face">BET YOUR BRAINS.<br />NOT YOUR MONEY.</p>
          </div>
        </div>
      </section>

      <section className="landing-section floor-section" id="floor">
        <div className="section-index">THE TRADING FLOOR</div>
        <div className="floor-heading"><h2>A terminal built to be read at 2 AM.</h2><p>Dense numbers on solid surfaces. Candles from real engine ticks. The casino stays in the atmosphere, never between you and a price.</p></div>
        <div className="terminal-preview" data-ui>
          <div className="preview-top"><span className="number">{selectedAsset ? formatMoney(selectedAsset.mid, true) : "—"}</span><strong>NEON · NEON HOLDINGS</strong><small className={selectedAsset && selectedAsset.mid >= selectedAsset.sessionOpen ? "gain" : "loss"}>{selectedAsset ? formatPercent((selectedAsset.mid - selectedAsset.sessionOpen) / selectedAsset.sessionOpen * 100) : "—"}</small></div>
          <div className="preview-body">
            <div className="preview-watch">{SYMBOLS.map((symbol) => <div key={symbol}><strong>{symbol}</strong><span className="number">{state ? formatMoney(state.assets[symbol].mid, true) : "—"}</span></div>)}</div>
            <div className="preview-chart">
              <svg viewBox="0 0 600 250" role="img" aria-label="Recent simulated price path for NEON">
                <defs><linearGradient id="preview-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#59dff5" stopOpacity=".22" /><stop offset="1" stopColor="#59dff5" stopOpacity="0" /></linearGradient></defs>
                {selectedAsset && (() => {
                  const candles = selectedAsset.candles.slice(-60);
                  const min = Math.min(...candles.map((c) => c.low));
                  const max = Math.max(...candles.map((c) => c.high));
                  const x = (index: number) => 10 + index / Math.max(1, candles.length - 1) * 580;
                  const y = (price: number) => 20 + (max - price) / Math.max(1, max - min) * 205;
                  return <>
                    <polygon points={`10,230 ${candles.map((c,i)=>`${x(i)},${y(c.close)}`).join(" ")} 590,230`} fill="url(#preview-fill)" />
                    <polyline points={candles.map((c,i)=>`${x(i)},${y(c.close)}`).join(" ")} fill="none" stroke="#59dff5" strokeWidth="2.5" />
                    {candles.slice(-18).map((c, i) => <line key={c.time} x1={x(candles.length - 18 + i)} x2={x(candles.length - 18 + i)} y1={y(c.high)} y2={y(c.low)} stroke={c.close >= c.open ? "#27e59a" : "#e73555"} strokeWidth="2" />)}
                  </>;
                })()}
              </svg>
              <div className="preview-order"><span>MARKET BUY</span><strong>10 NEON</strong><small>Confirmed against the live book</small></div>
            </div>
            <div className="preview-portfolio"><span>NET EQUITY</span><strong className="number">{state ? formatMoney(state.players.you.cash + Object.values(state.players.you.positions).reduce((sum, position) => sum + (position?.qty ?? 0) * (position ? state.assets[SYMBOLS.find((s)=>state.players.you.positions[s]===position)!]?.mid ?? 0 : 0), 0)) : "₹1,00,000"}</strong><div><small>Realized</small><span className="number">{formatSignedMoney(state?.players.you.realizedPnl ?? 0)}</span></div><div><small>Reserved</small><span className="number">{formatMoney(state?.players.you.reserved ?? 0)}</span></div><div><small>Engine tick</small><span className="number">{state?.tick ?? 0}</span></div></div>
          </div>
        </div>
      </section>

      <section className="landing-section friends-section">
        <div className="section-index">YOUR FRIENDS ARE THE HOUSE</div>
        <div className="friends-grid">
          <div><h2>The only opponent worse than the market is your group chat.</h2><p>Every player is marked to the same mid, ranked on the same ledger, and forced to watch the same crash. Badges are computed from what actually happened, not handed out for showing up.</p><Button asChild variant="ghost"><Link href="/lobby">Open a private table <ArrowRight size={16} /></Link></Button></div>
          <div className="friends-board">
            <div className="friends-board-head"><span>LIVE DEMO TABLE</span><span>3 seats</span></div>
            {entries.map((entry) => <div key={entry.playerId} className="friends-row"><span className="number">{entry.rank}</span><div><strong>{entry.name}</strong><small>{entry.movement > 0 ? `▲ Up ${entry.movement}` : entry.movement < 0 ? `▼ Down ${Math.abs(entry.movement)}` : "No rank change"}</small></div><span className="number">{formatMoney(entry.equity)}</span><small className={entry.pnl >= 0 ? "gain" : "loss"}>{formatSignedMoney(entry.pnl)}</small></div>)}
          </div>
        </div>
      </section>

      <section className="landing-section crash-section">
        <div className="crash-scene">
          <div className="crash-signal"><Zap size={20} /><span>HOST-ONLY CONTROL</span></div>
          <h2>VEGAS JUST CRASHED.</h2>
          <p>A real market event, published to every seat. House quotes re-price, resting buys fill at the new prices, portfolios revalue, and before/after ranks appear. The button is theatrical. The numbers are not.</p>
          <div className="crash-figures">
            <div><span>SEVERITY</span><strong>65–95</strong><small>seeded per event</small></div>
            <div><span>SHOCK WINDOW</span><strong>3–5 ticks</strong><small>scaled by beta</small></div>
            <div><span>AFTERSHOCK</span><strong>12 ticks</strong><small>decaying volatility</small></div>
          </div>
          <Button asChild variant="crimson"><Link href="/lobby">Take a seat. Pull the lever. <ChevronRight size={16} /></Link></Button>
        </div>
      </section>

      <section className="landing-section boss-section" id="boss">
        <div className="boss-portrait-wrap"><PitBossPortrait /><span>ORIGINAL CHARACTER · FICTIONAL OPINIONS</span></div>
        <div className="boss-copy">
          <div className="section-index">THE PIT BOSS</div>
          <h2>Your analyst has seen worse. Probably.</h2>
          <p>The Pit Boss reviews your return, drawdown, concentration, win rate, turnover and exposure at the crash. The deterministic layer always works with zero credentials; an optional server-side model only rewrites those facts, never invents trades.</p>
          <ul><li><CircleDollarSign size={16} /> Metrics computed from recorded fills and snapshots</li><li><CircleDollarSign size={16} /> Plain-English feedback from deterministic templates</li><li><CircleDollarSign size={16} /> Educational simulation, not financial advice</li></ul>
        </div>
      </section>

      <section className="landing-cta" id="enter">
        <NeonWordmark />
        <h2>TRADE THE CHAOS.<br />BET ON YOURSELF.</h2>
        <p>₹1,00,000 virtual cash. Six fictional assets. One House that always wins. Probably.</p>
        <div><Button asChild size="lg"><Link href="/lobby">ENTER THE ARENA</Link></Button><Button asChild size="lg" variant="ghost"><Link href="/lobby">JOIN A TABLE</Link></Button></div>
      </section>

      <footer className="landing-footer">
        <div><NeonWordmark compact /><p>THE HOUSE ALWAYS WINS. PROBABLY.</p></div>
        <p>Educational simulation. Virtual money only. Fictional companies, assets and news. No real tickers, brands, casinos, landmarks or people. Not financial advice.</p>
        <div><ModeBadge /><span className="number">SEED COMMITMENT · SHA-256</span></div>
      </footer>
      <div className="sr-only">{copy.join(" ")}</div>
    </main>
  );
}
