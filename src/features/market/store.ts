"use client";

import { create } from "zustand";
import type { OrderInput } from "../../../packages/engine/index";
import type { GatewaySnapshot, MarketGateway } from "./gateway";
import { LocalGateway } from "./local-gateway";

interface MarketStore {
  gateway: MarketGateway | null;
  snapshot: GatewaySnapshot | null;
  busy: boolean;
  error: string | null;
  notice: string | null;
  initialise: () => void;
  act: (action: (gateway: MarketGateway) => Promise<{ error?: string }>, success?: string) => Promise<boolean>;
  clearFeedback: () => void;
  createRoom: (playerName: string, roomName: string) => Promise<boolean>;
  joinRoom: (playerName: string, code: string) => Promise<boolean>;
  setReady: (ready: boolean) => Promise<boolean>;
  startMatch: () => Promise<boolean>;
  submitOrder: (input: OrderInput) => Promise<boolean>;
  cancelOrder: (orderId: string) => Promise<boolean>;
  triggerMeltdown: () => Promise<boolean>;
  finishMatch: () => Promise<boolean>;
  resetMatch: () => Promise<boolean>;
}

export const useMarketStore = create<MarketStore>((set, get) => ({
  gateway: null,
  snapshot: null,
  busy: false,
  error: null,
  notice: null,
  initialise: () => {
    if (get().gateway) return;
    const gateway = new LocalGateway();
    const unsubscribe = gateway.subscribe((snapshot) => set({ snapshot }));
    set({ gateway });
    gateway.preview("You").then((response) => {
      if (response.error) set({ error: response.error });
    });
    if (typeof window !== "undefined") window.addEventListener("pagehide", () => {
      unsubscribe();
      gateway.dispose();
    }, { once: true });
  },
  act: async (action, success) => {
    const gateway = get().gateway;
    if (!gateway) return false;
    set({ busy: true, error: null, notice: null });
    const response = await action(gateway);
    set({ busy: false, error: response.error ?? null, notice: response.error ? null : success ?? null });
    return !response.error;
  },
  clearFeedback: () => set({ error: null, notice: null }),
  createRoom: (playerName, roomName) => get().act((gateway) => gateway.createRoom(playerName, roomName), "Table created. The bots are already seated."),
  joinRoom: (playerName, code) => get().act((gateway) => gateway.joinRoom(playerName, code), "Joined the local demo table."),
  setReady: (ready) => get().act((gateway) => gateway.setReady(ready), ready ? "You are ready." : "Ready status cleared."),
  startMatch: () => get().act((gateway) => gateway.startMatch(), "The market is open. Your financial stability is not."),
  submitOrder: (input) => get().act((gateway) => gateway.submitOrder(input), "Order accepted by the dealer."),
  cancelOrder: (orderId) => get().act((gateway) => gateway.cancelOrder(orderId), "Order cancelled and reservation released."),
  triggerMeltdown: () => get().act((gateway) => gateway.triggerMeltdown(), "VEGAS JUST CRASHED."),
  finishMatch: () => get().act((gateway) => gateway.finishMatch(), "No more bets. Trading closed."),
  resetMatch: () => get().act((gateway) => gateway.resetMatch(), "A fresh shoe. A clean ledger."),
}));
