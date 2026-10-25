import { ASSETS } from "./assets";
import { sha256, stateHash } from "./hash";
import { clamp, normalFor, randomFor } from "./random";
import {
  STARTING_CASH, SYMBOLS,
  type EngineConfig, type EngineResult, type EngineState, type Fill, type HouseQuote,
  type LeaderboardEntry, type MarketEvent, type Order, type OrderInput, type PlayerState,
  type Position, type PublicState, type ReplayEvent, type Symbol,
} from "./types";

const clone = <T,>(value: T): T => structuredClone(value);
const roundTick = (value: number, tick: number) => Math.max(tick, Math.round(value / tick) * tick);
const floorTick = (value: number, tick: number) => Math.max(tick, Math.floor(value / tick) * tick);
const ceilTick = (value: number, tick: number) => Math.ceil(value / tick) * tick;
const remaining = (order: Order) => order.qty - order.filledQty;
const isOpen = (order: Order) => order.status === "open" || order.status === "partial";
const isHouse = (entry: Order | HouseQuote): entry is HouseQuote => !("playerId" in entry);
/** House quotes carry `price`; player orders carry `limitPrice` (null for market). */
const priceOf = (entry: Order | HouseQuote): number => (isHouse(entry) ? entry.price : entry.limitPrice ?? 0);

export const DEFAULT_CONFIG: EngineConfig = {
  matchId: "local-arena",
  maxTicks: 600,
  startingCash: STARTING_CASH,
  crashCooldown: 20,
};

export function createMatch(
  seed: string,
  players: Array<{ id: string; name: string; isHost?: boolean; isBot?: boolean }>,
  config: Partial<EngineConfig> = {},
): EngineState {
  const resolved = { ...DEFAULT_CONFIG, ...config };
  const playerMap: Record<string, PlayerState> = {};
  for (const player of players) {
    playerMap[player.id] = {
      id: player.id,
      name: player.name.slice(0, 24),
      isHost: Boolean(player.isHost),
      isBot: Boolean(player.isBot),
      startingCash: resolved.startingCash,
      cash: resolved.startingCash,
      reserved: 0,
      realizedPnl: 0,
      positions: {},
      equityHistory: [{ tick: 0, equity: resolved.startingCash }],
      peakPositionValue: 0,
      trades: [],
    };
  }
  const assets = Object.fromEntries(SYMBOLS.map((symbol) => {
    const config = ASSETS[symbol];
    const mid = config.basePrice;
    const spread = roundTick(mid * 0.002, config.tickSize);
    const tick = { tick: 0, mid, bid: floorTick(mid - spread / 2, config.tickSize), ask: ceilTick(mid + spread / 2, config.tickSize), volume: 0 };
    return [symbol, {
      ...tick,
      previousMid: mid,
      sessionOpen: mid,
      sessionHigh: mid,
      sessionLow: mid,
      realizedVol: config.vol,
      spreadMultiplier: 1,
      history: [tick],
      candles: [{ time: 0, open: mid, high: mid, low: mid, close: mid, volume: 0 }],
    }];
  })) as EngineState["assets"];
  const state: EngineState = {
    seed,
    config: resolved,
    tick: 0,
    status: "live",
    seq: 0,
    players: playerMap,
    assets,
    orders: [],
    fills: [],
    quotes: [],
    events: [],
    replay: [],
    lastCrashTick: -1000,
  };
  state.quotes = makeQuotes(state);
  return state;
}

function appendReplay(state: EngineState, type: ReplayEvent["type"], payload: unknown) {
  state.replay.push({ seq: ++state.seq, tick: state.tick, type, payload: clone(payload) });
}

function spreadFor(state: EngineState, symbol: Symbol): number {
  const asset = state.assets[symbol];
  const config = ASSETS[symbol];
  const raw = asset.mid * (0.0012 + asset.realizedVol * 0.075) * asset.spreadMultiplier;
  return Math.max(config.tickSize * 2, roundTick(raw, config.tickSize));
}

function makeQuotes(state: EngineState): HouseQuote[] {
  const quotes: HouseQuote[] = [];
  for (const symbol of SYMBOLS) {
    const asset = state.assets[symbol];
    const tickSize = ASSETS[symbol].tickSize;
    const spread = spreadFor(state, symbol);
    for (const side of ["buy", "sell"] as const) {
      for (let level = 0; level < 3; level += 1) {
        const centre = side === "buy" ? asset.mid - spread / 2 : asset.mid + spread / 2;
        const raw = centre + (side === "buy" ? -1 : 1) * level * tickSize * 2;
        const price = side === "buy" ? floorTick(raw, tickSize) : ceilTick(raw, tickSize);
        quotes.push({
          id: `house-${state.tick}-${symbol}-${side}-${level}`,
          symbol,
          side,
          price,
          qty: 40 + Math.floor(randomFor(state.seed, state.tick, symbol, side, level) * 120),
          seq: ++state.seq,
        });
      }
    }
  }
  return quotes;
}

export function averageCost(position: Position): number {
  return position.qty > 0 ? Math.round(position.costBasis / position.qty) : 0;
}

export function equityOf(state: EngineState, playerId: string, tick = state.tick): number {
  const player = state.players[playerId];
  if (!player) return 0;
  let equity = player.cash + player.reserved;
  for (const symbol of SYMBOLS) {
    const position = player.positions[symbol];
    if (position) equity += position.qty * state.assets[symbol].mid;
  }
  return equity + (tick === state.tick ? 0 : 0);
}

export function unrealizedOf(state: EngineState, playerId: string): number {
  const player = state.players[playerId];
  return SYMBOLS.reduce((sum, symbol) => {
    const position = player.positions[symbol];
    return sum + (position ? position.qty * state.assets[symbol].mid - position.costBasis : 0);
  }, 0);
}

export function computeLeaderboard(state: EngineState, atTick = state.tick): LeaderboardEntry[] {
  const entries = Object.values(state.players).map((player) => {
    let equity = player.cash + player.reserved;
    for (const symbol of SYMBOLS) {
      const position = player.positions[symbol];
      if (!position) continue;
      const mid = atTick === state.tick
        ? state.assets[symbol].mid
        : state.assets[symbol].history[Math.min(atTick, state.assets[symbol].history.length - 1)]?.mid ?? state.assets[symbol].mid;
      equity += position.qty * mid;
    }
    const pnl = equity - player.startingCash;
    return { playerId: player.id, name: player.name, equity, pnl, returnPct: pnl / player.startingCash * 100, rank: 0, movement: 0 };
  }).sort((a, b) => b.equity - a.equity || a.playerId.localeCompare(b.playerId));
  entries.forEach((entry, index) => { entry.rank = index + 1; });
  if (atTick === state.tick && state.tick > 0) {
    const previous = computeLeaderboard(state, state.tick - 1);
    for (const entry of entries) entry.movement = (previous.find((p) => p.playerId === entry.playerId)?.rank ?? entry.rank) - entry.rank;
  }
  return entries;
}

function updateOrderStatus(order: Order) {
  if (order.filledQty === order.qty) order.status = "filled";
  else if (order.filledQty > 0) order.status = "partial";
}

function executeFill(
  state: EngineState,
  aggressor: Order | HouseQuote,
  resting: Order | HouseQuote,
  price: number,
  qty: number,
) {
  if (qty <= 0 || !Number.isSafeInteger(qty) || !Number.isSafeInteger(price)) throw new Error("INVALID_FILL");
  const buy = aggressor.side === "buy" ? aggressor : resting;
  const sell = aggressor.side === "sell" ? aggressor : resting;
  const buyerId = isHouse(buy) ? "HOUSE" : buy.playerId;
  const sellerId = isHouse(sell) ? "HOUSE" : sell.playerId;
  if (buyerId !== "HOUSE" && buyerId === sellerId) throw new Error("SELF_TRADE");
  const fill: Fill = {
    id: `fill-${++state.seq}`,
    orderId: isHouse(aggressor) ? (isHouse(resting) ? aggressor.id : resting.id) : aggressor.id,
    counterpartyOrderId: isHouse(aggressor) ? aggressor.id : resting.id,
    symbol: aggressor.symbol,
    buyerId,
    sellerId,
    qty,
    price,
    tick: state.tick,
    house: isHouse(buy) || isHouse(sell),
  };
  state.fills.push(fill);

  for (const entry of [buy, sell]) {
    if (isHouse(entry)) entry.qty -= qty;
    else {
      entry.filledQty += qty;
      updateOrderStatus(entry);
    }
  }

  if (!isHouse(buy)) {
    const player = state.players[buy.playerId];
    if (buy.type === "limit") {
      const released = qty * (buy.limitPrice ?? price);
      player.reserved -= released;
      player.cash += qty * ((buy.limitPrice ?? price) - price);
    } else {
      player.cash -= qty * price;
    }
    const position = player.positions[buy.symbol] ?? { qty: 0, reservedQty: 0, costBasis: 0 };
    position.qty += qty;
    position.costBasis += qty * price;
    player.positions[buy.symbol] = position;
    player.trades.push({ orderId: buy.id, symbol: buy.symbol, side: "buy", qty, price, tick: state.tick, pnl: 0, notional: qty * price });
  }

  if (!isHouse(sell)) {
    const player = state.players[sell.playerId];
    const position = player.positions[sell.symbol];
    if (!position || position.qty < qty) throw new Error("POSITION_INVARIANT");
    const oldQty = position.qty;
    const allocatedCost = Math.round(position.costBasis * qty / oldQty);
    position.qty -= qty;
    position.costBasis -= allocatedCost;
    if (sell.type === "limit") position.reservedQty -= qty;
    player.cash += qty * price;
    const pnl = qty * price - allocatedCost;
    player.realizedPnl += pnl;
    player.trades.push({ orderId: sell.id, symbol: sell.symbol, side: "sell", qty, price, tick: state.tick, pnl, notional: qty * price });
    if (position.qty === 0) {
      position.costBasis = 0;
      position.reservedQty = 0;
    }
  }
  state.assets[aggressor.symbol].volume += qty;
}

function bestOpposite(state: EngineState, incoming: Order): Order | HouseQuote | null {
  const candidates: Array<Order | HouseQuote> = [
    ...state.quotes.filter((quote) => quote.qty > 0 && quote.symbol === incoming.symbol && quote.side !== incoming.side),
    ...state.orders.filter((order) => isOpen(order) && remaining(order) > 0 && order.symbol === incoming.symbol && order.side !== incoming.side && order.playerId !== incoming.playerId),
  ];
  const eligible = candidates.filter((candidate) => {
    if (incoming.type === "market") return true;
    return incoming.side === "buy" ? priceOf(candidate) <= (incoming.limitPrice ?? 0) : priceOf(candidate) >= (incoming.limitPrice ?? Infinity);
  });
  eligible.sort((a, b) => {
    const priceOrder = incoming.side === "buy" ? priceOf(a) - priceOf(b) : priceOf(b) - priceOf(a);
    return priceOrder || a.seq - b.seq;
  });
  return eligible[0] ?? null;
}

function matchIncoming(state: EngineState, order: Order) {
  while (remaining(order) > 0) {
    const opposite = bestOpposite(state, order);
    if (!opposite) break;
    const counterRemaining = isHouse(opposite) ? opposite.qty : remaining(opposite);
    let qty = Math.min(remaining(order), counterRemaining);
    if (order.side === "buy" && order.type === "market") {
      const player = state.players[order.playerId];
      qty = Math.min(qty, Math.floor(player.cash / priceOf(opposite)));
    }
    if (qty <= 0) break;
    // Aggressive player orders receive the resting order's price.
    executeFill(state, order, opposite, priceOf(opposite), qty);
    if (isHouse(opposite) && opposite.qty <= 0) state.quotes = state.quotes.filter((quote) => quote !== opposite);
  }
  if (order.filledQty === order.qty) order.status = "filled";
  else if (order.type === "market") order.status = order.filledQty > 0 ? "cancelled" : "rejected";
  else updateOrderStatus(order);
}

export function submitOrder(current: EngineState, input: OrderInput): EngineResult {
  const state = clone(current);
  const existing = state.orders.find((order) => order.playerId === input.playerId && order.idempotencyKey === input.idempotencyKey);
  if (existing) return { state, order: existing };
  const player = state.players[input.playerId];
  if (!player) return { state: current, error: "Player is not in this match." };
  if (state.status !== "live") return { state: current, error: "Trading is closed." };
  if (!Number.isSafeInteger(input.qty) || input.qty < 1 || input.qty > 1_000_000) return { state: current, error: "Quantity must be a whole number between 1 and 1,000,000." };
  if (!SYMBOLS.includes(input.symbol)) return { state: current, error: "Unknown asset." };
  const config = ASSETS[input.symbol];
  if (input.type === "limit") {
    const limit = input.limitPrice;
    if (!limit || !Number.isSafeInteger(limit) || limit <= 0) return { state: current, error: "Enter a valid limit price in paise." };
    if (limit % config.tickSize !== 0) return { state: current, error: `Price must align to the ${config.tickSize}-paise tick size.` };
    const mid = state.assets[input.symbol].mid;
    if (limit < mid * 0.8 || limit > mid * 1.2) return { state: current, error: "Limit price must be within 20% of mid." };
  }
  const position = player.positions[input.symbol];
  if (input.side === "sell") {
    const available = (position?.qty ?? 0) - (position?.reservedQty ?? 0);
    if (input.qty > available) return { state: current, error: `Only ${available} shares are available to sell.` };
  }
  if (input.side === "buy" && input.type === "limit") {
    const reserve = input.qty * (input.limitPrice ?? 0);
    if (!Number.isSafeInteger(reserve) || reserve > player.cash) return { state: current, error: "Not enough available cash for this reservation." };
  }
  if (input.side === "buy" && input.type === "market" && player.cash < state.assets[input.symbol].ask) {
    return { state: current, error: "Not enough cash for one share at the current ask." };
  }

  const order: Order = {
    id: `order-${++state.seq}`,
    matchId: state.config.matchId,
    playerId: input.playerId,
    symbol: input.symbol,
    side: input.side,
    type: input.type,
    qty: input.qty,
    filledQty: 0,
    limitPrice: input.type === "limit" ? input.limitPrice ?? null : null,
    status: "open",
    seq: state.seq,
    idempotencyKey: input.idempotencyKey.slice(0, 80),
    createdTick: state.tick,
  };
  if (order.side === "buy" && order.type === "limit") {
    const reserve = order.qty * (order.limitPrice ?? 0);
    player.cash -= reserve;
    player.reserved += reserve;
  }
  if (order.side === "sell" && order.type === "limit" && position) position.reservedQty += order.qty;
  state.orders.push(order);
  matchIncoming(state, order);
  appendReplay(state, "submit_order", input);
  return { state, order };
}

export function cancelOrder(current: EngineState, playerId: string, orderId: string): EngineResult {
  const state = clone(current);
  const order = state.orders.find((candidate) => candidate.id === orderId && candidate.playerId === playerId);
  if (!order || !isOpen(order)) return { state: current, error: "This order is no longer open." };
  const player = state.players[playerId];
  if (order.side === "buy" && order.type === "limit") {
    const release = remaining(order) * (order.limitPrice ?? 0);
    player.reserved -= release;
    player.cash += release;
  }
  if (order.side === "sell" && order.type === "limit") {
    const position = player.positions[order.symbol];
    if (position) position.reservedQty -= remaining(order);
  }
  order.status = "cancelled";
  appendReplay(state, "cancel_order", { playerId, orderId });
  return { state, order };
}

function matchHouseAgainstPlayers(state: EngineState, symbol: Symbol) {
  for (const house of state.quotes.filter((quote) => quote.symbol === symbol)) {
    while (house.qty > 0) {
      const candidates = state.orders.filter((order) => {
        if (!isOpen(order) || order.symbol !== symbol || order.side === house.side || remaining(order) <= 0) return false;
        return house.side === "sell" ? (order.limitPrice ?? 0) >= house.price : (order.limitPrice ?? Infinity) <= house.price;
      });
      candidates.sort((a, b) => {
        const price = house.side === "sell" ? (b.limitPrice ?? 0) - (a.limitPrice ?? 0) : (a.limitPrice ?? 0) - (b.limitPrice ?? 0);
        return price || a.seq - b.seq;
      });
      const playerOrder = candidates[0];
      if (!playerOrder) break;
      const qty = Math.min(house.qty, remaining(playerOrder));
      // House re-quotes are the documented exception: the resting player receives the House's new quote, limit-or-better.
      executeFill(state, house, playerOrder, house.price, qty);
    }
  }
}

function matchCrossedPlayers(state: EngineState, symbol: Symbol) {
  for (let guard = 0; guard < 100; guard += 1) {
    const buys = state.orders.filter((order) => isOpen(order) && order.side === "buy" && order.symbol === symbol && remaining(order) > 0).sort((a,b) => (b.limitPrice ?? 0) - (a.limitPrice ?? 0) || a.seq - b.seq);
    const sells = state.orders.filter((order) => isOpen(order) && order.side === "sell" && order.symbol === symbol && remaining(order) > 0).sort((a,b) => (a.limitPrice ?? Infinity) - (b.limitPrice ?? Infinity) || a.seq - b.seq);
    let matched = false;
    for (const buy of buys) {
      const sell = sells.find((candidate) => candidate.playerId !== buy.playerId && (buy.limitPrice ?? 0) >= (candidate.limitPrice ?? Infinity));
      if (!sell) continue;
      const aggressor = buy.seq > sell.seq ? buy : sell;
      const resting = aggressor === buy ? sell : buy;
      executeFill(state, aggressor, resting, resting.limitPrice ?? state.assets[symbol].mid, Math.min(remaining(buy), remaining(sell)));
      matched = true;
      break;
    }
    if (!matched) break;
  }
}

function activeShock(state: EngineState, symbol: Symbol, tick: number): { shock: number; volatility: number; spread: number } {
  let shock = 0;
  let volatility = 1;
  let spread = 1;
  for (const event of state.events) {
    const elapsed = tick - event.startTick;
    if (elapsed >= 0 && elapsed < event.duration) {
      shock -= (0.02 + event.severity * 0.06) * ASSETS[symbol].beta / event.duration;
      volatility += event.severity * 1.8;
      spread += event.severity * 1.5;
    } else if (elapsed >= event.duration && elapsed < event.duration + 12) {
      const decay = 1 - (elapsed - event.duration) / 12;
      volatility += event.severity * decay * 1.2;
      spread += event.severity * decay;
    }
  }
  return { shock, volatility, spread };
}

function materializeOneTick(state: EngineState) {
  if (state.status !== "live" || state.tick >= state.config.maxTicks) return;
  state.tick += 1;
  const marketFactor = normalFor(state.seed, state.tick, "shared-market") * 0.0012;
  for (const symbol of SYMBOLS) {
    const config = ASSETS[symbol];
    const asset = state.assets[symbol];
    const previous = asset.mid;
    const active = activeShock(state, symbol, state.tick);
    const epsilon = normalFor(state.seed, state.tick, symbol, "epsilon");
    const logReturn = config.drift + config.vol * active.volatility * epsilon + config.beta * marketFactor + active.shock;
    const mid = roundTick(previous * Math.exp(logReturn), config.tickSize);
    const spread = spreadFor({ ...state, assets: { ...state.assets, [symbol]: { ...asset, mid, spreadMultiplier: active.spread } } }, symbol);
    asset.previousMid = previous;
    asset.mid = mid;
    asset.bid = floorTick(mid - spread / 2, config.tickSize);
    asset.ask = Math.max(asset.bid + config.tickSize, ceilTick(mid + spread / 2, config.tickSize));
    asset.volume = 100 + Math.floor(randomFor(state.seed, state.tick, symbol, "volume") * 800);
    asset.sessionHigh = Math.max(asset.sessionHigh, mid);
    asset.sessionLow = Math.min(asset.sessionLow, mid);
    asset.realizedVol = clamp(asset.realizedVol * 0.94 + Math.abs(logReturn) * 0.06, 0.0005, 0.08);
    asset.spreadMultiplier = active.spread;
    asset.history.push({ tick: state.tick, mid, bid: asset.bid, ask: asset.ask, volume: asset.volume });
    const previousCandle = asset.candles[asset.candles.length - 1];
    asset.candles.push({ time: state.tick, open: previousCandle?.close ?? previous, high: Math.max(previous, mid), low: Math.min(previous, mid), close: mid, volume: asset.volume });
  }
  appendReplay(state, "advance", { tick: state.tick });
  state.quotes = makeQuotes(state);
  for (const symbol of SYMBOLS) {
    matchHouseAgainstPlayers(state, symbol);
    matchCrossedPlayers(state, symbol);
    const asset = state.assets[symbol];
    asset.candles[asset.candles.length - 1].volume = asset.volume;
    asset.history[asset.history.length - 1].volume = asset.volume;
  }
  for (const player of Object.values(state.players)) {
    const positionValue = SYMBOLS.reduce((sum, symbol) => sum + (player.positions[symbol]?.qty ?? 0) * state.assets[symbol].mid, 0);
    player.peakPositionValue = Math.max(player.peakPositionValue, positionValue);
    player.equityHistory.push({ tick: state.tick, equity: equityOf(state, player.id) });
  }
  if (state.tick >= state.config.maxTicks) {
    state.status = "finished";
    appendReplay(state, "finish", {});
  }
}

export function advanceMatch(current: EngineState, targetTick: number): EngineState {
  const state = clone(current);
  const target = Math.min(Math.max(state.tick, Math.floor(targetTick)), state.config.maxTicks);
  while (state.tick < target && state.status === "live") materializeOneTick(state);
  return state;
}

export function triggerMeltdown(current: EngineState, playerId: string): EngineResult {
  let state = clone(current);
  const player = state.players[playerId];
  if (!player?.isHost) return { state: current, error: "Only the room host can trigger a meltdown." };
  if (state.status !== "live") return { state: current, error: "The match is not live." };
  if (state.tick - state.lastCrashTick < state.config.crashCooldown) return { state: current, error: `The meltdown button is cooling down for ${state.config.crashCooldown - (state.tick - state.lastCrashTick)} more ticks.` };
  const eventNumber = state.events.length + 1;
  const severity = 0.65 + randomFor(state.seed, eventNumber, "meltdown-severity") * 0.3;
  const duration = 3 + Math.floor(randomFor(state.seed, eventNumber, "meltdown-duration") * 3);
  const event: MarketEvent = {
    id: `crash-${eventNumber}-${sha256(`${state.seed}|${eventNumber}`).slice(0, 10)}`,
    type: "meltdown",
    headline: "BREAKING: EMERGENCY RATE SHOCK. MARKETS IN FREEFALL.",
    severity,
    affectedAssets: [...SYMBOLS],
    startTick: state.tick + 1,
    duration,
    startedAt: state.tick * 1000,
    before: computeLeaderboard(state),
    after: null,
  };
  state.events.push(event);
  state.lastCrashTick = state.tick;
  appendReplay(state, "trigger_meltdown", { playerId });
  materializeOneTick(state);
  event.after = computeLeaderboard(state);
  state = clone(state);
  return { state };
}

export function finishMatch(current: EngineState): EngineState {
  const state = clone(current);
  if (state.status === "live") {
    state.status = "finished";
    appendReplay(state, "finish", {});
  }
  return state;
}

export function getOrderBook(state: EngineState, symbol: Symbol) {
  const aggregate = (side: "buy" | "sell") => {
    const levels = new Map<number, { price: number; qty: number; houseQty: number; playerQty: number }>();
    const entries: Array<Order | HouseQuote> = [
      ...state.quotes.filter((quote) => quote.symbol === symbol && quote.side === side && quote.qty > 0),
      ...state.orders.filter((order) => order.symbol === symbol && order.side === side && isOpen(order) && remaining(order) > 0),
    ];
    for (const entry of entries) {
      const qty = isHouse(entry) ? entry.qty : remaining(entry);
      const price = priceOf(entry);
      const level = levels.get(price) ?? { price, qty: 0, houseQty: 0, playerQty: 0 };
      level.qty += qty;
      if (isHouse(entry)) level.houseQty += qty;
      else level.playerQty += qty;
      levels.set(price, level);
    }
    return [...levels.values()].sort((a,b) => side === "buy" ? b.price - a.price : a.price - b.price).slice(0, 7);
  };
  return { bids: aggregate("buy"), asks: aggregate("sell") };
}

export function getPublicState(state: EngineState): PublicState {
  const { seed, ...publicState } = clone(state);
  void seed;
  return { ...publicState, seedHash: sha256(state.seed) };
}

export function getStateHash(state: EngineState): string {
  return stateHash(state);
}

export function verifyInvariants(state: EngineState): string[] {
  const errors: string[] = [];
  for (const player of Object.values(state.players)) {
    if (!Number.isSafeInteger(player.cash) || player.cash < 0) errors.push(`${player.id}: invalid cash ${player.cash}`);
    if (!Number.isSafeInteger(player.reserved) || player.reserved < 0) errors.push(`${player.id}: invalid reserve ${player.reserved}`);
    for (const symbol of SYMBOLS) {
      const position = player.positions[symbol];
      if (position && (!Number.isSafeInteger(position.qty) || position.qty < 0 || position.reservedQty < 0 || position.reservedQty > position.qty)) errors.push(`${player.id}/${symbol}: invalid position`);
    }
  }
  for (const order of state.orders) {
    const fills = state.fills.filter((fill) => fill.orderId === order.id || fill.counterpartyOrderId === order.id).reduce((sum, fill) => sum + fill.qty, 0);
    if (order.filledQty > order.qty) errors.push(`${order.id}: overfilled`);
    if (order.filledQty > 0 && fills !== order.filledQty) errors.push(`${order.id}: fill sum ${fills} != ${order.filledQty}`);
  }
  return errors;
}

export function replayMatch(
  seed: string,
  players: Array<{ id: string; name: string; isHost?: boolean; isBot?: boolean }>,
  config: Partial<EngineConfig>,
  log: ReplayEvent[],
): EngineState {
  let state = createMatch(seed, players, config);
  for (const event of [...log].sort((a,b) => a.seq - b.seq)) {
    if (event.type === "submit_order") state = submitOrder(state, event.payload as OrderInput).state;
    else if (event.type === "cancel_order") {
      const payload = event.payload as { playerId: string; orderId: string };
      state = cancelOrder(state, payload.playerId, payload.orderId).state;
    } else if (event.type === "trigger_meltdown") state = triggerMeltdown(state, (event.payload as { playerId: string }).playerId).state;
    else if (event.type === "advance") state = advanceMatch(state, (event.payload as { tick: number }).tick);
    else if (event.type === "finish") state = finishMatch(state);
  }
  return state;
}

// Badge rules are computed only from recorded fills, positions and event windows.
export function badgesFor(state: EngineState, playerId: string): string[] {
  const badges: string[] = [];
  const players = Object.values(state.players);
  const player = state.players[playerId];
  if (!player) return badges;
  if (player.peakPositionValue === Math.max(...players.map((p) => p.peakPositionValue))) badges.push("THE WHALE");
  if (player.trades.length === Math.max(...players.map((p) => p.trades.length)) && player.trades.length > 0) badges.push("MARKET MENACE");
  const losses = player.trades.filter((trade) => trade.side === "sell" && trade.pnl < 0);
  const largestLossShare = losses.reduce((max, trade) => Math.max(max, Math.abs(trade.pnl)), 0) / Math.max(1, losses.reduce((sum, trade) => sum + Math.abs(trade.pnl), 0));
  const totalPnl = player.trades.reduce((sum, trade) => sum + Math.abs(trade.pnl), 0);
  const largestTradeShare = player.trades.reduce((max, trade) => Math.max(max, Math.abs(trade.pnl)), 0) / Math.max(1, totalPnl);
  if (Math.max(largestLossShare, largestTradeShare) >= 0.5 && totalPnl > 0) badges.push("LUCKY BASTARD");
  for (const event of state.events) {
    const crashSells = player.trades.filter((trade) => trade.side === "sell" && trade.tick >= event.startTick && trade.tick <= event.startTick + 5);
    const losingQty = crashSells.filter((trade) => trade.pnl < 0).reduce((sum, trade) => sum + trade.qty, 0);
    const totalQty = crashSells.reduce((sum, trade) => sum + trade.qty, 0);
    if (totalQty > 0 && losingQty / Math.max(1, totalQty) >= 0.5) badges.push("PAPER HANDS");
    else if (losingQty === 0 && !badges.includes("DIAMOND HANDS")) badges.push("DIAMOND HANDS");
  }
  return [...new Set(badges)];
}
