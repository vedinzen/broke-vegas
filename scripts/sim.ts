import {
  advanceMatch, computeLeaderboard, createMatch, getStateHash, submitOrder, triggerMeltdown, verifyInvariants,
  type EngineState, type OrderInput, type Symbol,
} from "../packages/engine/index";

const args = process.argv.slice(2);
const value = (name: string, fallback: string) => args[args.indexOf(name) + 1] || fallback;
const seed = value("--seed", "42");
const ticks = Math.max(1, Number(value("--ticks", "120")));

const players = [
  { id: "dealer", name: "The Dealer", isHost: true },
  { id: "momentum", name: "Momentum Mick", isBot: true },
  { id: "reversion", name: "Reversion Rita", isBot: true },
];

/** Deterministic bot intents, so the CLI run is reproducible from the seed alone. */
function botIntents(state: EngineState, tick: number): OrderInput[] {
  const intents: OrderInput[] = [];
  for (const bot of ["momentum", "reversion"]) {
    if (tick % 4 !== 0) continue;
    const symbol = (["NEON", "CHIP", "ACES"] as Symbol[])[(tick / 4 + (bot === "momentum" ? 0 : 1)) % 3];
    const asset = state.assets[symbol];
    const rising = asset.mid >= asset.previousMid;
    const wantsToBuy = bot === "momentum" ? rising : !rising;
    const holding = state.players[bot].positions[symbol];
    const canSell = (holding?.qty ?? 0) - (holding?.reservedQty ?? 0);
    if (!wantsToBuy && canSell >= 4) {
      intents.push({ playerId: bot, symbol, side: "sell", type: "market", qty: 4, idempotencyKey: `${bot}-${tick}-sell` });
    } else {
      intents.push({ playerId: bot, symbol, side: "buy", type: "market", qty: 3, idempotencyKey: `${bot}-${tick}-buy` });
    }
  }
  return intents;
}

let state = createMatch(seed, players, { maxTicks: ticks });
const crashTick = Math.min(ticks - 1, Math.floor(ticks * 0.6));
let crashBefore = computeLeaderboard(state);
let crashAfter = computeLeaderboard(state);

for (let tick = 0; tick < ticks; tick += 1) {
  for (const intent of botIntents(state, state.tick)) {
    state = submitOrder(state, intent).state;
  }
  if (state.tick === crashTick && state.status === "live") {
    const result = triggerMeltdown(state, "dealer");
    if (result.error) throw new Error(`meltdown rejected: ${result.error}`);
    state = result.state;
    crashBefore = state.events.at(-1)!.before;
    crashAfter = state.events.at(-1)!.after ?? crashAfter;
  }
  state = advanceMatch(state, state.tick + 1);
}

const invariants = verifyInvariants(state);
const report = {
  seed,
  ticks: state.tick,
  status: state.status,
  fills: state.fills.length,
  houseFills: state.fills.filter((fill) => fill.house).length,
  assets: Object.fromEntries(Object.entries(state.assets).map(([symbol, asset]) => [symbol, {
    open: asset.sessionOpen, mid: asset.mid, low: asset.sessionLow, high: asset.sessionHigh,
  }])),
  leaderboard: computeLeaderboard(state).map((entry) => ({
    rank: entry.rank, name: entry.name, equity: entry.equity, pnl: entry.pnl, returnPct: Number(entry.returnPct.toFixed(2)),
  })),
  crash: state.events.length ? {
    tick: state.events[0].startTick,
    severity: Number(state.events[0].severity.toFixed(3)),
    duration: state.events[0].duration,
    before: crashBefore.map((entry) => ({ name: entry.name, rank: entry.rank, equity: entry.equity })),
    after: crashAfter.map((entry) => ({ name: entry.name, rank: entry.rank, equity: entry.equity })),
  } : null,
  invariantErrors: invariants,
  stateHash: getStateHash(state),
};

console.log(JSON.stringify(report, null, 2));
if (invariants.length) process.exit(1);
