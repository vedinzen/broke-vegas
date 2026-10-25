"use client";

import { useEffect } from "react";
import { useMarketStore } from "./store";

export function MarketBridge() {
  const initialise = useMarketStore((state) => state.initialise);
  useEffect(() => {
    initialise();
    // Marks the point where the client store and event handlers are live.
    document.documentElement.dataset.hydrated = "true";
  }, [initialise]);
  return null;
}
