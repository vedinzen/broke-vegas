import { useMarketStore } from "@/features/market/store";

export function ModeBadge() {
  const mode = useMarketStore((state) => state.snapshot?.mode ?? "demo");
  return <span className={`mode-badge ${mode === "live" ? "live" : ""}`}>{mode === "live" ? "LIVE — SUPABASE" : "DEMO MODE — LOCAL SIMULATION"}</span>;
}
