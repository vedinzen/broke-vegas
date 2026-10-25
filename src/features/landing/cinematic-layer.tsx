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
  if (tier === "none") return <StaticPoster />;
  return (
    <div className={`cinematic-layer ${mounted ? "scene-ready" : ""}`}>
      <StaticPoster />
      {mounted && <div className="scene-canvas"><Scene tier={tier} /></div>}
    </div>
  );
}
