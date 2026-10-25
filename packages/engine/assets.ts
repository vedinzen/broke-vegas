import type { AssetConfig, Symbol } from "./types";

export const ASSETS: Record<Symbol, AssetConfig> = {
  NEON: { symbol: "NEON", name: "Neon Holdings", basePrice: 42_000, drift: 0.00008, vol: 0.0068, beta: 1.55, tickSize: 5, character: "High voltage. Higher variance." },
  CHIP: { symbol: "CHIP", name: "Chipwright Semis", basePrice: 28_500, drift: 0.00006, vol: 0.0042, beta: 1.2, tickSize: 5, character: "Silicon with a casino habit." },
  ACES: { symbol: "ACES", name: "Aces Logistics", basePrice: 16_000, drift: 0.00003, vol: 0.0017, beta: 0.65, tickSize: 5, character: "Slow trucks. Steady books." },
  DICE: { symbol: "DICE", name: "Dice Mobility", basePrice: 9_250, drift: 0.00002, vol: 0.0037, beta: 1.05, tickSize: 5, character: "Every route is a gamble." },
  LUCK: { symbol: "LUCK", name: "Lucky Staples", basePrice: 12_750, drift: 0.000025, vol: 0.0013, beta: 0.35, tickSize: 5, character: "Defensive, until it is not." },
  JKPT: { symbol: "JKPT", name: "Jackpot Energy", basePrice: 52_500, drift: 0.00004, vol: 0.0051, beta: 1.4, tickSize: 5, character: "Megawatts and mood swings." },
};
