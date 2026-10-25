import { SYMBOLS, badgesFor, equityOf, type EngineState, type Symbol } from "../../../packages/engine/index";

export interface AnalystMetrics {
  playerId: string;
  playerName: string;
  returnPct: number;
  maxDrawdownPct: number;
  concentrationHhi: number;
  topPositionPct: number;
  bestTrade: number;
  worstTrade: number;
  winRatePct: number;
  turnover: number;
  exposureAtCrashPct: number;
  timeToRecoverTicks: number | null;
  totalTrades: number;
  badges: string[];
  largestHolding: Symbol | null;
  matchedSeedHash: string;
}

export interface AnalystOutput {
  mode: "deterministic" | "llm";
  headline: string;
  review: string[];
  tip: string;
  disclaimer: string;
}

export function computeMetrics(state: EngineState, playerId: string): AnalystMetrics {
  const player = state.players[playerId];
  const equityHistory = player.equityHistory;
  const finalEquity = equityOf(state, playerId);
  const starting = player.startingCash;
  let peak = starting;
  let maxDrawdown = 0;
  let recoveryTick: number | null = null;
  for (const point of equityHistory) {
    peak = Math.max(peak, point.equity);
    maxDrawdown = Math.max(maxDrawdown, (peak - point.equity) / peak);
    if (recoveryTick === null && point.equity >= starting && point.tick > 0) recoveryTick = point.tick;
  }
  const positionValues = SYMBOLS.map((symbol) => ({ symbol, value: (player.positions[symbol]?.qty ?? 0) * state.assets[symbol].mid })).sort((a,b) => b.value - a.value);
  const totalPosition = positionValues.reduce((sum, value) => sum + value.value, 0);
  const hhi = totalPosition > 0 ? positionValues.reduce((sum, value) => sum + (value.value / totalPosition) ** 2, 0) : 0;
  const sellTrades = player.trades.filter((trade) => trade.side === "sell");
  const wins = sellTrades.filter((trade) => trade.pnl > 0);
  const crash = state.events[0];
  let exposureAtCrash = 0;
  if (crash) {
    const positionsValue = SYMBOLS.reduce((sum, symbol) => {
      const qty = player.trades.filter((trade) => trade.symbol === symbol && trade.tick <= crash.startTick).reduce((sum, trade) => sum + (trade.side === "buy" ? trade.qty : -trade.qty), 0);
      return sum + Math.max(0, qty) * state.assets[symbol].mid;
    }, 0);
    exposureAtCrash = positionsValue / Math.max(1, finalEquity) * 100;
  }
  return {
    playerId,
    playerName: player.name,
    returnPct: (finalEquity - starting) / starting * 100,
    maxDrawdownPct: maxDrawdown * 100,
    concentrationHhi: hhi,
    topPositionPct: totalPosition > 0 ? positionValues[0].value / totalPosition * 100 : 0,
    bestTrade: player.trades.reduce((best, trade) => Math.max(best, trade.pnl), 0),
    worstTrade: player.trades.reduce((worst, trade) => Math.min(worst, trade.pnl), 0),
    winRatePct: sellTrades.length ? wins.length / sellTrades.length * 100 : 0,
    turnover: player.trades.reduce((sum, trade) => sum + trade.notional, 0) / starting,
    exposureAtCrashPct: exposureAtCrash,
    timeToRecoverTicks: recoveryTick,
    totalTrades: player.trades.length,
    badges: badgesFor(state, playerId),
    largestHolding: totalPosition > 0 ? positionValues[0].symbol : null,
    matchedSeedHash: "",
  };
}

export function deterministicReview(metrics: AnalystMetrics): AnalystOutput {
  const returnText = `${metrics.returnPct >= 0 ? "+" : ""}${metrics.returnPct.toFixed(2)}%`;
  const review: string[] = [];
  review.push(`You finished ${returnText} with a maximum drawdown of ${metrics.maxDrawdownPct.toFixed(2)}%. ${metrics.totalTrades} trades reached the tape.`);
  if (metrics.totalTrades === 0) review.push("You watched the market without taking a position. Preservation is a strategy; it is also a spectator sport.");
  else if (metrics.winRatePct >= 60) review.push(`${metrics.winRatePct.toFixed(0)}% of your completed sells were profitable. The timing worked; do not mistake a short sample for an edge.`);
  else review.push(`${metrics.winRatePct.toFixed(0)}% of your completed sells were profitable. The market charged tuition.`);
  if (metrics.concentrationHhi > 0.55 || metrics.topPositionPct > 75) review.push(`Concentration is high: ${metrics.topPositionPct.toFixed(0)}% of position value sat in ${metrics.largestHolding ?? "one asset"}. One headline can rewrite that ledger.`);
  else if (metrics.largestHolding) review.push(`Your largest holding, ${metrics.largestHolding}, represented ${metrics.topPositionPct.toFixed(0)}% of invested value.`);
  if (metrics.exposureAtCrashPct > 50) review.push(`You carried ${metrics.exposureAtCrashPct.toFixed(0)}% market exposure into the first meltdown. That is why the screen turned red.`);
  if (metrics.timeToRecoverTicks !== null) review.push(`Equity first regained its starting value at tick ${metrics.timeToRecoverTicks}.`);
  const tip = metrics.maxDrawdownPct > 15
    ? "Size positions so a single gap cannot remove more capital than your plan allows. Virtual money makes the lesson cheap."
    : metrics.concentrationHhi > 0.55
      ? "Diversification is not decoration: spreading exposure reduces how much one fictional headline can decide your rank."
      : "Keep a trade journal. The engine records every fill; your reasoning is the only missing field.";
  return {
    mode: "deterministic",
    headline: metrics.returnPct >= 0 ? "THE HOUSE DID NOT WIN THIS TIME." : "THE HOUSE ALWAYS WINS. THIS ROUND, ANYWAY.",
    review,
    tip,
    disclaimer: "Educational simulation, not financial advice. All assets, events and money are fictional.",
  };
}
