import type { EngineState, OrderInput } from "../../../packages/engine/index";

export type GatewayMode = "demo" | "live";
export type GatewayPhase = "preview" | "lobby" | "live" | "finished";

export interface GatewaySnapshot {
  state: EngineState;
  phase: GatewayPhase;
  mode: GatewayMode;
  hash: string;
  roomCode: string;
  ready: Record<string, boolean>;
}

export interface GatewayResponse {
  snapshot?: GatewaySnapshot;
  error?: string;
}

export interface MarketGateway {
  readonly mode: GatewayMode;
  subscribe(listener: (snapshot: GatewaySnapshot) => void): () => void;
  preview(playerName?: string): Promise<GatewayResponse>;
  createRoom(playerName: string, roomName: string): Promise<GatewayResponse>;
  joinRoom(playerName: string, code: string): Promise<GatewayResponse>;
  setReady(ready: boolean): Promise<GatewayResponse>;
  startMatch(): Promise<GatewayResponse>;
  submitOrder(input: OrderInput): Promise<GatewayResponse>;
  cancelOrder(orderId: string): Promise<GatewayResponse>;
  triggerMeltdown(): Promise<GatewayResponse>;
  finishMatch(): Promise<GatewayResponse>;
  resetMatch(): Promise<GatewayResponse>;
  dispose(): void;
}
