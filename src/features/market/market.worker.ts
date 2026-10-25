/// <reference lib="webworker" />
import {
  advanceMatch, cancelOrder, createMatch, finishMatch, getStateHash, submitOrder,
  triggerMeltdown, SYMBOLS, type EngineState, type OrderInput,
} from "../../../packages/engine/index";
import type { GatewayPhase, GatewaySnapshot } from "./gateway";

const PLAYER_ID = "you";
let state: EngineState;
let phase: GatewayPhase = "preview";
let roomCode = "STRIP";
let ready: Record<string, boolean> = {};
let timer: ReturnType<typeof setInterval> | undefined;

function snapshot(): GatewaySnapshot {
  return { state, phase, mode: "demo", hash: getStateHash(state), roomCode, ready };
}

function emit(requestId?: string, error?: string) {
  self.postMessage({ type: "snapshot", snapshot: snapshot(), requestId, error });
}

function initialise(playerName: string, code: string, nextPhase: GatewayPhase) {
  if (timer) clearInterval(timer);
  roomCode = code;
  phase = nextPhase;
  ready = { [PLAYER_ID]: false, momentum: true, reversion: true };
  state = createMatch(`demo-${code}-42`, [
    { id: PLAYER_ID, name: playerName || "You", isHost: true },
    { id: "momentum", name: "Momentum Mick", isBot: true },
    { id: "reversion", name: "Reversion Rita", isBot: true },
  ], { matchId: `demo-${code}`, maxTicks: 600 });
  timer = setInterval(() => {
    if (phase !== "live" && phase !== "preview") return;
    runBots();
    state = advanceMatch(state, state.tick + 1);
    if (state.status === "finished") phase = "finished";
    emit();
  }, 1000);
}

function runBots() {
  if (phase !== "live" || state.tick % 4 !== 0) return;
  for (const [index, botId] of (["momentum", "reversion"] as const).entries()) {
    const symbol = SYMBOLS[(state.tick / 4 + index * 2) % SYMBOLS.length];
    const history = state.assets[symbol].history;
    const previous = history[Math.max(0, history.length - 6)]?.mid ?? state.assets[symbol].sessionOpen;
    const change = state.assets[symbol].mid - previous;
    const momentumBuy = change >= 0;
    const shouldBuy = botId === "momentum" ? momentumBuy : !momentumBuy;
    const player = state.players[botId];
    const position = player.positions[symbol];
    const side = shouldBuy || !position || position.qty - position.reservedQty < 1 ? "buy" : "sell";
    const qty = Math.min(side === "sell" ? position?.qty ?? 1 : 4 + (state.tick % 5), 12);
    const result = submitOrder(state, {
      playerId: botId, symbol, side, type: "market", qty,
      idempotencyKey: `bot-${botId}-${state.tick}-${symbol}`,
    });
    state = result.state;
  }
}

function act(requestId: string, callback: () => void) {
  try {
    callback();
    emit(requestId);
  } catch {
    emit(requestId, "The simulator could not complete that action. Reset the demo match and try again.");
  }
}

self.onmessage = (event: MessageEvent<{ type: string; requestId: string; payload?: Record<string, unknown> }>) => {
  const { type, requestId, payload = {} } = event.data;
  act(requestId, () => {
    if (type === "preview") initialise(String(payload.playerName || "You"), "STRIP", "preview");
    else if (type === "createRoom" || type === "joinRoom") initialise(String(payload.playerName || "You"), String(payload.code || "NEON42").toUpperCase(), "lobby");
    else if (type === "setReady") ready[PLAYER_ID] = Boolean(payload.ready);
    else if (type === "startMatch") {
      if (phase !== "lobby") throw new Error("NOT_IN_LOBBY");
      if (!ready[PLAYER_ID]) { emit(requestId, "Ready up before opening the market."); return; }
      phase = "live";
    }
    else if (type === "submitOrder") {
      const result = submitOrder(state, payload as unknown as OrderInput);
      if (result.error) { emit(requestId, result.error); return; }
      state = result.state;
    }
    else if (type === "cancelOrder") {
      const result = cancelOrder(state, PLAYER_ID, String(payload.orderId));
      if (result.error) { emit(requestId, result.error); return; }
      state = result.state;
    }
    else if (type === "triggerMeltdown") {
      if (phase !== "live") { emit(requestId, "The match is not live."); return; }
      const result = triggerMeltdown(state, PLAYER_ID);
      if (result.error) { emit(requestId, result.error); return; }
      state = result.state;
    }
    else if (type === "finishMatch") { state = finishMatch(state); phase = "finished"; }
    else if (type === "resetMatch") initialise(state.players[PLAYER_ID].name, roomCode, "lobby");
  });
};

export {};
