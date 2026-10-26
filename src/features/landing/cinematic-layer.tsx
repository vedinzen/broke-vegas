"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useQualityTier } from "./quality";
import { StaticPoster } from "./static-poster";

const Scene = dynamic(() => import("./scene"), {
  ssr: false,
  loading: () => <StaticPoster />,
});

export function CinematicLayer() {
  const tier = useQualityTier();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (tier === "none") return;
    let active = true;
    const reveal = () => { if (active) setMounted(true); };
    let cancel = () => {};
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(reveal, { timeout: 1800 });
      cancel = () => window.cancelIdleCallback(handle);
    } else {
      const handle = window.setTimeout(reveal, 600);
      cancel = () => window.clearTimeout(handle);
    }
    return () => { active = false; cancel(); };
  }, [tier]);
  // The poster must stay inside `.cinematic-layer`. Returned bare it becomes a
  // direct child of `.landing-page`, and the layout rule that lifts page content
  // above the backdrop (`position: relative; z-index: 2`) then turns it into an
  // in-flow block that covers the hero — a headline-free splash screen on every
  // device without WebGL, and on any device asking for reduced motion or data.
  if (tier === "none") {
    return (
      <div className="cinematic-layer" aria-hidden="true">
        <StaticPoster />
      </div>
    );
  }
  return (
    <div className={`cinematic-layer ${mounted ? "scene-ready" : ""}`}>
      <StaticPoster />
      {mounted && <div className="scene-canvas"><Scene tier={tier} /></div>}
    </div>
  );
}
