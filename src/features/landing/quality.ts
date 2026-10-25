"use client";

import { useEffect, useState } from "react";

export type QualityTier = "high" | "medium" | "low" | "none";

function webglAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch { return false; }
}

export function useQualityTier(): QualityTier {
  const [tier, setTier] = useState<QualityTier>("none");
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const reducedData = window.matchMedia("(prefers-reduced-data: reduce)").matches;
    // Default tier is already "none"; bailing out keeps the static poster without a state write.
    if (reducedMotion || reducedData || !webglAvailable()) return;
    let cancelled = false;
    import("detect-gpu").then(({ getGPUTier }) => getGPUTier({ failIfMajorPerformanceCaveat: true })).then((gpu) => {
      if (cancelled) return;
      const cores = navigator.hardwareConcurrency ?? 4;
      const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
      if (gpu.tier >= 3 && cores >= 8 && memory >= 8) setTier("high");
      else if (gpu.tier >= 2 && cores >= 4) setTier("medium");
      else setTier("low");
    }).catch(() => setTier("low"));
    return () => { cancelled = true; };
  }, []);
  return tier;
}
