"use client";

import { useEffect, useMemo, useState } from "react";
import { Brain, ShieldCheck } from "lucide-react";
import { PitBossPortrait } from "@/components/brand/pit-boss";
import type { EngineState } from "../../../packages/engine/index";
import { computeMetrics, deterministicReview, type AnalystOutput } from "./metrics";

export function PitBossReview({ state, playerId }: { state: EngineState; playerId: string }) {
  const metrics = useMemo(() => computeMetrics(state, playerId), [state, playerId]);
  const fallback = useMemo(() => deterministicReview(metrics), [metrics]);
  const requestKey = `${playerId}:${state.tick}`;
  // Loading and the displayed copy are derived, so the effect never writes state synchronously.
  const [result, setResult] = useState<{ key: string; output: AnalystOutput } | null>(null);
  const output = result?.key === requestKey ? result.output : fallback;
  const loading = result?.key !== requestKey;
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    fetch("/api/analyst", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(metrics), signal: controller.signal })
      .then((response) => response.ok ? response.json() : fallback)
      .then((data: AnalystOutput) => { if (active) setResult({ key: requestKey, output: data }); })
      .catch(() => { if (active) setResult({ key: requestKey, output: fallback }); });
    return () => { active = false; controller.abort(); };
  }, [requestKey, metrics, fallback]);
  return (
    <section className="pit-boss-review" aria-labelledby="pit-boss-review-title">
      <div className="pit-boss-card"><PitBossPortrait /><span><Brain size={14} /> THE PIT BOSS</span></div>
      <div className="pit-boss-analysis">
        <div className="analysis-mode"><ShieldCheck size={14} /> {loading ? "REVIEWING THE TAPE" : output.mode === "llm" ? "AI-ASSISTED · STRUCTURED METRICS ONLY" : "DETERMINISTIC ANALYSIS · NO CREDENTIALS REQUIRED"}</div>
        <h2 id="pit-boss-review-title">{output.headline}</h2>
        {output.review.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        <div className="analyst-metrics">
          <div><span>Return</span><strong className={metrics.returnPct >= 0 ? "gain" : "loss"}>{metrics.returnPct >= 0 ? "+" : ""}{metrics.returnPct.toFixed(2)}%</strong></div>
          <div><span>Max drawdown</span><strong>{metrics.maxDrawdownPct.toFixed(2)}%</strong></div>
          <div><span>Win rate</span><strong>{metrics.winRatePct.toFixed(0)}%</strong></div>
          <div><span>Top position</span><strong>{metrics.topPositionPct.toFixed(0)}%</strong></div>
          <div><span>Turnover</span><strong>{metrics.turnover.toFixed(2)}×</strong></div>
          <div><span>Crash exposure</span><strong>{metrics.exposureAtCrashPct.toFixed(0)}%</strong></div>
        </div>
        <div className="analyst-tip"><strong>THE PIT BOSS SAYS</strong><p>{output.tip}</p></div>
        <small>{output.disclaimer}</small>
      </div>
    </section>
  );
}
