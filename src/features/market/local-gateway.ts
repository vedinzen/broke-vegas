"use client";

import type { OrderInput } from "../../../packages/engine/index";
import type { GatewayResponse, GatewaySnapshot, MarketGateway } from "./gateway";

interface WorkerMessage {
  type: string;
  requestId: string;
  payload?: Record<string, unknown>;
}

export class LocalGateway implements MarketGateway {
  readonly mode = "demo" as const;
  private worker: Worker | null = null;
  private listeners = new Set<(snapshot: GatewaySnapshot) => void>();
  private pending = new Map<string, { resolve: (response: GatewayResponse) => void }>();

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    this.worker = new Worker(new URL("./market.worker.ts", import.meta.url), { type: "module" });
    this.worker.onmessage = (event: MessageEvent<{ snapshot: GatewaySnapshot; requestId?: string; error?: string }>) => {
      const { snapshot, requestId, error } = event.data;
      this.listeners.forEach((listener) => listener(snapshot));
      if (requestId) {
        this.pending.get(requestId)?.resolve({ snapshot, error });
        this.pending.delete(requestId);
      }
    };
    this.worker.onerror = () => {
      this.pending.forEach(({ resolve }) => resolve({ error: "The local market Worker stopped. Reload to restart it." }));
      this.pending.clear();
    };
    return this.worker;
  }

  subscribe(listener: (snapshot: GatewaySnapshot) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private call(type: string, payload: Record<string, unknown> = {}): Promise<GatewayResponse> {
    const requestId = crypto.randomUUID();
    const response = new Promise<GatewayResponse>((resolve) => {
      this.pending.set(requestId, { resolve });
      setTimeout(() => {
        if (this.pending.has(requestId)) {
          this.pending.delete(requestId);
          resolve({ error: "The local market did not respond in time." });
        }
      }, 5000);
    });
    this.ensureWorker().postMessage({ type, requestId, payload } satisfies WorkerMessage);
    return response;
  }

  preview(playerName = "You") { return this.call("preview", { playerName }); }
  createRoom(playerName: string, roomName: string) {
    const code = Array.from(crypto.getRandomValues(new Uint8Array(6)), (value) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[value % 32]).join("");
    return this.call("createRoom", { playerName, roomName, code });
  }
  joinRoom(playerName: string, code: string) { return this.call("joinRoom", { playerName, code }); }
  setReady(ready: boolean) { return this.call("setReady", { ready }); }
  startMatch() { return this.call("startMatch"); }
  submitOrder(input: OrderInput) { return this.call("submitOrder", input as unknown as Record<string, unknown>); }
  cancelOrder(orderId: string) { return this.call("cancelOrder", { orderId }); }
  triggerMeltdown() { return this.call("triggerMeltdown"); }
  finishMatch() { return this.call("finishMatch"); }
  resetMatch() { return this.call("resetMatch"); }
  dispose() {
    this.worker?.terminate();
    this.worker = null;
    this.pending.clear();
    this.listeners.clear();
  }
}
