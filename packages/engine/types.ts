export const SYMBOLS = ["NEON", "CHIP", "ACES", "DICE", "LUCK", "JKPT"] as const;
export type Symbol = (typeof SYMBOLS)[number];
export type Side = "buy" | "sell";
export type OrderType = "market" | "limit";
export type OrderStatus = "open" | "partial" | "filled" | "cancelled" | "rejected";
export type MatchStatus = "live" | "finished";

export interface AssetConfig {
  symbol: Symbol;
  name: string;
  basePrice: number;
  drift: number;
  vol: number;
  beta: number;
  tickSize: number;
  character: string;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PriceTick {
  tick: number;
  mid: number;
  bid: number;
  ask: number;
  volume: number;
}

export interface AssetState extends PriceTick {
  previousMid: number;
  sessionOpen: number;
  sessionHigh: number;
  sessionLow: number;
  realizedVol: number;
  spreadMultiplier: number;
  history: PriceTick[];
  candles: Candle[];
}

export interface Position {
  qty: number;
  reservedQty: number;
  costBasis: number;
}

export interface TradeRecord {
  orderId: string;
  symbol: Symbol;
  side: Side;
  qty: number;
  price: number;
  tick: number;
  pnl: number;
  notional: number;
}

export interface PlayerState {
  id: string;
  name: string;
  isHost: boolean;
  isBot: boolean;
  startingCash: number;
  cash: number;
  reserved: number;
  realizedPnl: number;
  positions: Partial<Record<Symbol, Position>>;
  equityHistory: Array<{ tick: number; equity: number }>;
  peakPositionValue: number;
  trades: TradeRecord[];
}

export interface Order {
  id: string;
  matchId: string;
  playerId: string;
  symbol: Symbol;
  side: Side;
  type: OrderType;
  qty: number;
  filledQty: number;
  limitPrice: number | null;
  status: OrderStatus;
  seq: number;
  idempotencyKey: string;
  createdTick: number;
}

export interface Fill {
  id: string;
  orderId: string;
  counterpartyOrderId: string | null;
  symbol: Symbol;
  buyerId: string;
  sellerId: string | "HOUSE";
  qty: number;
  price: number;
  tick: number;
  house: boolean;
}

export interface HouseQuote {
  id: string;
  symbol: Symbol;
  side: Side;
  qty: number;
  price: number;
  seq: number;
}

export interface MarketEvent {
  id: string;
  type: "meltdown";
  headline: string;
  severity: number;
  affectedAssets: Symbol[];
  startTick: number;
  duration: number;
  startedAt: number;
  before: LeaderboardEntry[];
  after: LeaderboardEntry[] | null;
}

export interface ReplayEvent {
  seq: number;
  tick: number;
  type: "submit_order" | "cancel_order" | "trigger_meltdown" | "advance" | "finish";
  payload: unknown;
}

export interface EngineConfig {
  matchId: string;
  maxTicks: number;
  startingCash: number;
  crashCooldown: number;
}

export interface EngineState {
  seed: string;
  config: EngineConfig;
  tick: number;
  status: MatchStatus;
  seq: number;
  players: Record<string, PlayerState>;
  assets: Record<Symbol, AssetState>;
  orders: Order[];
  fills: Fill[];
  quotes: HouseQuote[];
  events: MarketEvent[];
  replay: ReplayEvent[];
  lastCrashTick: number;
}

export interface OrderInput {
  playerId: string;
  symbol: Symbol;
  side: Side;
  type: OrderType;
  qty: number;
  limitPrice?: number;
  idempotencyKey: string;
}

export interface LeaderboardEntry {
  playerId: string;
  name: string;
  equity: number;
  pnl: number;
  returnPct: number;
  rank: number;
  movement: number;
}

export interface PublicState extends Omit<EngineState, "seed"> {
  seedHash: string;
}

export interface EngineResult {
  state: EngineState;
  order?: Order;
  error?: string;
}

export const STARTING_CASH = 10_000_000;
