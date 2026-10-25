import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  advanceMatch, averageCost, cancelOrder, computeLeaderboard, createMatch, getStateHash,
  mulberry32, replayMatch, sha256, submitOrder, triggerMeltdown, verifyInvariants,
  type EngineState, type OrderInput,
} from "./index";

const players = [
  { id: "host", name: "Host", isHost: true },
  { id: "rival", name: "Rival" },
];
const make = (seed = "42", maxTicks = 600) => createMatch(seed, players, { maxTicks });
const order = (overrides: Partial<OrderInput> = {}): OrderInput => ({
  playerId: "host", symbol: "NEON", side: "buy", type: "limit", qty: 10,
  limitPrice: 41_000, idempotencyKey: Math.random().toString(36), ...overrides,
});

describe("deterministic primitives", () => {
  it("mulberry32 and SHA-256 are stable", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect(Array.from({ length: 20 }, a)).toEqual(Array.from({ length: 20 }, b));
    expect(sha256("broke-vegas")).toMatch(/^[a-f0-9]{64}$/);
    expect(sha256("broke-vegas")).toBe(sha256("broke-vegas"));
  });

  it("materializes an identical lazy price path", () => {
    const direct = advanceMatch(make(), 100);
    const lazy = advanceMatch(advanceMatch(make(), 37), 100);
    expect(lazy.assets).toEqual(direct.assets);
    expect(getStateHash(lazy)).toBe(getStateHash(direct));
    expect(advanceMatch(direct, 100)).toEqual(direct);
  });
});

describe("order matching and accounting", () => {
  it("reserves and releases limit cash on cancel", () => {
    const initial = make();
    // A bid 5% under mid is inside the ±20% band and is not marketable against House asks.
    const limitPrice = Math.floor(initial.assets.NEON.mid * 0.95 / 5) * 5;
    const submitted = submitOrder(initial, order({ limitPrice, qty: 10, idempotencyKey: "cancel" }));
    expect(submitted.error).toBeUndefined();
    const reserved = 10 * limitPrice;
    expect(submitted.state.players.host.cash).toBe(initial.players.host.cash - reserved);
    expect(submitted.state.players.host.reserved).toBe(reserved);
    const cancelled = cancelOrder(submitted.state, "host", submitted.order!.id);
    expect(cancelled.state.players.host.cash).toBe(initial.players.host.cash);
    expect(cancelled.state.players.host.reserved).toBe(0);
  });

  it("is idempotent per player and key", () => {
    const first = submitOrder(make(), order({ idempotencyKey: "same" }));
    const second = submitOrder(first.state, order({ idempotencyKey: "same" }));
    expect(second.state.orders).toHaveLength(1);
    expect(second.order!.id).toBe(first.order!.id);
  });

  it("uses price-time priority and gives the aggressor the resting price", () => {
    let state = createMatch("priority", [...players, { id: "seller", name: "Seller" }], { maxTicks: 600 });
    // Remove House competition to isolate two player limits.
    state.quotes = [];
    const first = submitOrder(state, order({ playerId: "host", limitPrice: 40_000, qty: 5, idempotencyKey: "b1" }));
    state = first.state;
    state = submitOrder(state, order({ playerId: "rival", limitPrice: 40_500, qty: 5, idempotencyKey: "b2" })).state;
    const buyA = state.orders[0];
    const buyB = state.orders[1];
    state.players.seller.positions.NEON = { qty: 10, reservedQty: 0, costBasis: 350_000 };
    state = submitOrder(state, order({ playerId: "seller", side: "sell", type: "market", qty: 10, idempotencyKey: "sell" })).state;
    expect(state.orders.find((o) => o.id === buyB.id)!.filledQty).toBe(5);
    expect(state.orders.find((o) => o.id === buyA.id)!.filledQty).toBe(5);
    expect(state.fills.filter((fill) => fill.buyerId === "rival")[0].price).toBe(40_500);
    expect(buyA.seq).toBeLessThan(buyB.seq);
  });

  it("prevents self-trading", () => {
    let state = make();
    state.quotes = [];
    state.players.host.positions.NEON = { qty: 10, reservedQty: 0, costBasis: 400_000 };
    state = submitOrder(state, order({ side: "sell", limitPrice: 40_000, qty: 5, idempotencyKey: "rest-sell" })).state;
    state = submitOrder(state, order({ side: "buy", limitPrice: 41_000, qty: 5, idempotencyKey: "own-buy" })).state;
    expect(state.fills).toHaveLength(0);
  });

  it("partially fills against size-limited House quotes without negative balances", () => {
    const state = submitOrder(make(), order({ type: "market", qty: 55, limitPrice: undefined, idempotencyKey: "partial" })).state;
    const submitted = state.orders[0];
    expect(submitted.filledQty).toBeGreaterThan(0);
    expect(submitted.filledQty).toBeLessThanOrEqual(55);
    expect(state.players.host.cash).toBeGreaterThanOrEqual(0);
    expect(verifyInvariants(state)).toEqual([]);
  });

  it("fills a resting buy at the House's new crash quote, limit-or-better", () => {
    let state = make("crash-rule");
    const limit = Math.floor(state.assets.NEON.mid * 0.9 / 5) * 5;
    state = submitOrder(state, order({ limitPrice: limit, qty: 5, idempotencyKey: "knife" })).state;
    const resting = state.orders[0];
    state = triggerMeltdown(state, "host").state;
    state = advanceMatch(state, state.tick + 6);
    const crashFills = state.fills.filter((fill) => fill.orderId === resting.id || fill.counterpartyOrderId === resting.id);
    expect(crashFills.length).toBeGreaterThan(0);
    for (const fill of crashFills) expect(fill.price).toBeLessThanOrEqual(limit);
  });

  it("uses average-cost basis and realizes sell P&L", () => {
    let state = make();
    state.quotes = [];
    state = submitOrder(state, order({ type: "market", qty: 1, idempotencyKey: "no-liquidity" })).state;
    state.players.host.positions.NEON = { qty: 10, reservedQty: 0, costBasis: 400_000 };
    expect(averageCost(state.players.host.positions.NEON!)).toBe(40_000);
    state = submitOrder(state, order({ playerId: "rival", side: "buy", limitPrice: 45_000, qty: 5, idempotencyKey: "rival-buy" })).state;
    state = submitOrder(state, order({ side: "sell", limitPrice: 45_000, qty: 5, idempotencyKey: "host-sell" })).state;
    expect(state.players.host.realizedPnl).toBe(25_000);
    expect(state.players.host.positions.NEON!.costBasis).toBe(200_000);
  });
});

describe("events, replay and invariants", () => {
  it("crash is deterministic and replay reproduces the final state hash", () => {
    let state = make("replay-seed", 80);
    state = submitOrder(state, order({ idempotencyKey: "one", limitPrice: 38_000 })).state;
    state = advanceMatch(state, 5);
    state = triggerMeltdown(state, "host").state;
    state = advanceMatch(state, 30);
    const replayed = replayMatch("replay-seed", players, { maxTicks: 80 }, state.replay);
    expect(getStateHash(replayed)).toBe(getStateHash(state));
    expect(replayed.events[0].after).toEqual(state.events[0].after);
    expect(computeLeaderboard(state)).toHaveLength(2);
  });

  it("rejects a non-host meltdown", () => {
    const result = triggerMeltdown(make(), "rival");
    expect(result.error).toMatch(/host/);
    expect(result.state.events).toHaveLength(0);
  });

  it("keeps accounting invariants over randomized valid intents", () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 1000000 }), fc.array(fc.integer({ min: 1, max: 30 }), { minLength: 1, maxLength: 20 }), (seedNumber, quantities) => {
      let state: EngineState = make(String(seedNumber), 200);
      quantities.forEach((qty, index) => {
        const symbol = (["NEON", "CHIP", "ACES"] as const)[index % 3];
        const mid = state.assets[symbol].mid;
        const limitPrice = Math.round(mid / 5) * 5;
        const buy = submitOrder(state, order({ playerId: index % 2 ? "host" : "rival", symbol, qty, limitPrice, idempotencyKey: `b-${index}` }));
        state = buy.state;
        const playerId = index % 2 ? "rival" : "host";
        const position = state.players[playerId].positions[symbol];
        if (position && position.qty - position.reservedQty >= qty) {
          state = submitOrder(state, order({ playerId, symbol, side: "sell", type: "market", qty, idempotencyKey: `s-${index}` })).state;
        }
        state = advanceMatch(state, state.tick + 1);
        expect(verifyInvariants(state)).toEqual([]);
      });
    }), { numRuns: 20 });
  });
});
