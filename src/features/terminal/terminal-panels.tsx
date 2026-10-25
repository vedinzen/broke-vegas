"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ASSETS, SYMBOLS, averageCost, equityOf, getOrderBook, unrealizedOf, type EngineState, type Symbol } from "../../../packages/engine/index";
import { formatMoney, formatPercent, formatSignedMoney, integer } from "@/lib/format";
import { ChipIcon } from "@/components/brand/chip-icon";
import { Button } from "@/components/ui/button";

export function Watchlist({ state, selected, onSelect }: { state: EngineState; selected: Symbol; onSelect: (symbol: Symbol) => void }) {
  return (
    <section className="solid-panel watchlist" aria-labelledby="watchlist-title">
      <div className="panel-heading"><h2 id="watchlist-title">The floor</h2><span>6 assets</span></div>
      <div className="watchlist-rows">
        {SYMBOLS.map((symbol) => {
          const asset = state.assets[symbol];
          const change = (asset.mid - asset.sessionOpen) / asset.sessionOpen * 100;
          return (
            <button key={symbol} className={selected === symbol ? "selected" : ""} onClick={() => onSelect(symbol)} aria-pressed={selected === symbol}>
              <span className="watch-symbol"><strong>{symbol}</strong><small>{ASSETS[symbol].name}</small></span>
              <span className="watch-price number"><strong>{formatMoney(asset.mid, true)}</strong><small className={change >= 0 ? "gain" : "loss"}>{change >= 0 ? "▲" : "▼"} {formatPercent(change)}</small></span>
              <span className="watch-range number">H {formatMoney(asset.sessionHigh, true)} · L {formatMoney(asset.sessionLow, true)}<br />Spread {formatMoney(asset.ask - asset.bid, true)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function PortfolioPanel({ state }: { state: EngineState }) {
  const player = state.players.you;
  const equity = equityOf(state, "you");
  const pnl = equity - player.startingCash;
  const unrealized = unrealizedOf(state, "you");
  const values = [
    ["Starting cash", formatMoney(player.startingCash)],
    ["Available cash", formatMoney(player.cash)],
    ["Reserved cash", formatMoney(player.reserved)],
    ["Realized P&L", formatSignedMoney(player.realizedPnl)],
    ["Unrealized P&L", formatSignedMoney(unrealized)],
    ["Equity", formatMoney(equity)],
  ];
  return (
    <section className="solid-panel portfolio" aria-labelledby="portfolio-title">
      <div className="panel-heading"><h2 id="portfolio-title">Your stack</h2><span className={pnl >= 0 ? "gain" : "loss"}>{pnl >= 0 ? "▲" : "▼"} {formatPercent(pnl / player.startingCash * 100)}</span></div>
      <div className="portfolio-hero">
        <div><span className="muted">Net equity</span><strong className="number">{formatMoney(equity)}</strong><small className={pnl >= 0 ? "gain" : "loss"}>{formatSignedMoney(pnl)} all time</small></div>
        <ChipIcon value="₹" tone={pnl >= 0 ? "emerald" : "crimson"} size={58} />
      </div>
      <dl className="portfolio-stats">
        {values.map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="number">{value}</dd></div>)}
      </dl>
      <div className="equity-chart" aria-label="Equity over time">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={player.equityHistory} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
            <XAxis dataKey="tick" tick={{ fill: "#847b8e", fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={45} />
            <YAxis domain={["dataMin - 1000", "dataMax + 1000"]} tick={{ fill: "#847b8e", fontSize: 10 }} tickLine={false} axisLine={false} width={65} tickFormatter={(value) => `₹${Math.round(value / 100000)}k`} />
            <Tooltip contentStyle={{ background: "#100d17", border: "1px solid rgba(255,255,255,.14)", borderRadius: 6 }} labelStyle={{ color: "#aaa2b3" }} formatter={(value) => [formatMoney(Number(value)), "Equity"]} />
            <Line type="monotone" dataKey="equity" stroke="#59dff5" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <Holdings state={state} />
    </section>
  );
}

function Holdings({ state }: { state: EngineState }) {
  const player = state.players.you;
  const holdings = SYMBOLS.filter((symbol) => (player.positions[symbol]?.qty ?? 0) > 0);
  return (
    <div className="holdings">
      <h3>Holdings</h3>
      {holdings.length === 0 ? <p className="empty-state">No positions yet. Your cash is waiting for a bad decision.</p> : (
        <table><thead><tr><th>Asset</th><th>Qty</th><th>Avg entry</th><th>Value</th></tr></thead><tbody>
          {holdings.map((symbol) => {
            const position = player.positions[symbol]!;
            return <tr key={symbol}><td>{symbol}</td><td data-numeric>{integer.format(position.qty)}</td><td data-numeric>{formatMoney(averageCost(position), true)}</td><td data-numeric>{formatMoney(position.qty * state.assets[symbol].mid)}</td></tr>;
          })}
        </tbody></table>
      )}
    </div>
  );
}

export function OrderBookPanel({ state, symbol }: { state: EngineState; symbol: Symbol }) {
  const book = getOrderBook(state, symbol);
  const max = Math.max(1, ...book.bids.map((level) => level.qty), ...book.asks.map((level) => level.qty));
  return (
    <section className="solid-panel order-book" aria-labelledby="book-title">
      <div className="panel-heading"><h2 id="book-title">Order book</h2><span>Aggregated · owners hidden</span></div>
      <div className="book-head"><span>Size</span><span>Price</span></div>
      <div className="book-side asks">
        {book.asks.slice(0, 5).reverse().map((level) => <div className="book-row" key={level.price}><i style={{ width: `${level.qty / max * 100}%` }} /><span className="number">{integer.format(level.qty)}</span><span className="number loss">{formatMoney(level.price, true)}</span></div>)}
      </div>
      <div className="book-mid number"><strong>{formatMoney(state.assets[symbol].mid, true)}</strong><span>Mid</span></div>
      <div className="book-side bids">
        {book.bids.slice(0, 5).map((level) => <div className="book-row" key={level.price}><i style={{ width: `${level.qty / max * 100}%` }} /><span className="number">{integer.format(level.qty)}</span><span className="number gain">{formatMoney(level.price, true)}</span></div>)}
      </div>
    </section>
  );
}

export function OrdersPanel({ state, onCancel, busy }: { state: EngineState; onCancel: (orderId: string) => void; busy: boolean }) {
  const orders = state.orders.filter((order) => order.playerId === "you").slice().reverse();
  const open = orders.filter((order) => order.status === "open" || order.status === "partial");
  return (
    <section className="solid-panel orders-panel" aria-labelledby="orders-title">
      <div className="panel-heading"><h2 id="orders-title">Open orders</h2><span>{open.length} resting</span></div>
      {open.length === 0 ? <p className="empty-state">Nothing resting. Place a limit order to catch a price.</p> : <div className="table-scroll"><table><thead><tr><th>Side</th><th>Asset</th><th>Filled</th><th>Limit</th><th>Status</th><th><span className="sr-only">Action</span></th></tr></thead><tbody>
        {open.map((order) => <tr key={order.id}><td className={order.side === "buy" ? "gain" : "loss"}>{order.side.toUpperCase()}</td><td>{order.symbol}</td><td data-numeric>{order.filledQty}/{order.qty}</td><td data-numeric>{formatMoney(order.limitPrice ?? 0, true)}</td><td>{order.status}</td><td><Button size="sm" variant="ghost" onClick={() => onCancel(order.id)} disabled={busy}>Cancel</Button></td></tr>)}
      </tbody></table></div>}
    </section>
  );
}

export function TradesPanel({ state }: { state: EngineState }) {
  const fills = state.fills.filter((fill) => fill.buyerId === "you" || fill.sellerId === "you").slice(-8).reverse();
  return (
    <section className="solid-panel trades-panel" aria-labelledby="trades-title">
      <div className="panel-heading"><h2 id="trades-title">Executed trades</h2><span>{fills.length} shown</span></div>
      {fills.length === 0 ? <p className="empty-state">No fills yet. The tape is quiet.</p> : <div className="trade-list">
        {fills.map((fill) => <div key={fill.id}><span className={fill.buyerId === "you" ? "gain" : "loss"}>{fill.buyerId === "you" ? "BUY" : "SELL"}</span><strong>{fill.symbol}</strong><span className="number">{fill.qty} @ {formatMoney(fill.price, true)}</span><small>Tick {fill.tick}{fill.house ? " · House" : " · Player"}</small></div>)}
      </div>}
    </section>
  );
}

export function SentimentDial({ state }: { state: EngineState }) {
  const tick = state.tick;
  const returns = SYMBOLS.map((symbol) => {
    const history = state.assets[symbol].history;
    const then = history[Math.max(0, history.length - 21)]?.mid ?? state.assets[symbol].sessionOpen;
    return (state.assets[symbol].mid - then) / then;
  });
  const indexReturn = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const volatility = SYMBOLS.reduce((sum, symbol) => sum + state.assets[symbol].realizedVol, 0) / SYMBOLS.length;
  const eventSeverity = state.events.length && tick - state.events[state.events.length - 1].startTick < 12 ? state.events[state.events.length - 1].severity : 0;
  const sentiment = eventSeverity > 0.5 || volatility > 0.009 ? "VOLATILE" : indexReturn > 0.003 ? "BULLISH" : indexReturn < -0.003 ? "BEARISH" : "VOLATILE";
  const angle = Math.max(-65, Math.min(65, indexReturn * 4200 + (sentiment === "VOLATILE" ? 25 : 0)));
  return (
    <section className="solid-panel sentiment" aria-labelledby="sentiment-title">
      <div className="panel-heading"><h2 id="sentiment-title">Market roulette</h2><span>Computed, not random</span></div>
      <svg viewBox="0 0 240 142" role="img" aria-label={`Sentiment ${sentiment}. Rolling index return ${formatPercent(indexReturn * 100)} and realized volatility ${(volatility * 100).toFixed(2)} percent.`}>
        <path d="M30 120a90 90 0 0 1 60-85" fill="none" stroke="#e73555" strokeWidth="17" />
        <path d="M90 35a90 90 0 0 1 60 0" fill="none" stroke="#f2c96d" strokeWidth="17" />
        <path d="M150 35a90 90 0 0 1 60 85" fill="none" stroke="#27e59a" strokeWidth="17" />
        <g transform={`rotate(${angle} 120 120)`}><path d="M120 120L120 48" stroke="#f7f1e8" strokeWidth="3" /><circle cx="120" cy="120" r="8" fill="#59dff5" /></g>
        <text x="120" y="105" textAnchor="middle" fill="#f7f1e8" fontSize="15" fontWeight="700">{sentiment}</text>
        <text x="120" y="137" textAnchor="middle" fill="#aaa2b3" fontSize="10">RETURN {formatPercent(indexReturn * 100)} · VOL {(volatility * 100).toFixed(2)}%</text>
      </svg>
    </section>
  );
}
