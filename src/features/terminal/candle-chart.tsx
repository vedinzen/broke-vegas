"use client";

import { useEffect, useRef } from "react";
import {
  CandlestickSeries, HistogramSeries, createChart,
  type IChartApi, type ISeriesApi, type UTCTimestamp,
} from "lightweight-charts";
import type { AssetState } from "../../../packages/engine/index";

const BASE_TIME = 1_770_000_000;
const toTime = (tick: number) => (BASE_TIME + tick) as UTCTimestamp;

export function CandleChart({ asset, symbol }: { asset: AssetState; symbol: string }) {
  const container = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const candles = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volume = useRef<ISeriesApi<"Histogram"> | null>(null);
  const lastSymbol = useRef<string | null>(null);

  useEffect(() => {
    if (!container.current) return;
    const instance = createChart(container.current, {
      autoSize: true,
      layout: {
        background: { color: "transparent" },
        textColor: "#aaa2b3",
        fontFamily: "Geist Mono, monospace",
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "rgba(247,241,232,0.045)" },
        horzLines: { color: "rgba(247,241,232,0.045)" },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
      crosshair: {
        vertLine: { color: "#59dff5", labelBackgroundColor: "#171022" },
        horzLine: { color: "#59dff5", labelBackgroundColor: "#171022" },
      },
    });
    const candleSeries = instance.addSeries(CandlestickSeries, {
      upColor: "#27e59a", downColor: "#e73555",
      wickUpColor: "#27e59a", wickDownColor: "#e73555",
      borderVisible: false,
    });
    const volumeSeries = instance.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    instance.priceScale("volume").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    candleSeries.priceScale().applyOptions({ scaleMargins: { top: 0.08, bottom: 0.25 } });
    chart.current = instance;
    candles.current = candleSeries;
    volume.current = volumeSeries;
    return () => {
      instance.remove();
      chart.current = null;
      candles.current = null;
      volume.current = null;
    };
  }, []);

  useEffect(() => {
    if (!candles.current || !volume.current) return;
    const series = candles.current;
    const volumeSeries = volume.current;
    const candlePoints = asset.candles.map((candle) => ({
      time: toTime(candle.time), open: candle.open / 100, high: candle.high / 100,
      low: candle.low / 100, close: candle.close / 100,
    }));
    const volumePoints = asset.candles.map((candle) => ({
      time: toTime(candle.time), value: candle.volume,
      color: candle.close >= candle.open ? "rgba(39,229,154,0.28)" : "rgba(231,53,85,0.28)",
    }));
    if (lastSymbol.current !== symbol) {
      // Selecting a different asset replaces the whole series.
      series.setData(candlePoints);
      volumeSeries.setData(volumePoints);
      lastSymbol.current = symbol;
      chart.current?.timeScale().scrollToRealTime();
      return;
    }
    const candle = candlePoints[candlePoints.length - 1];
    const volumePoint = volumePoints[volumePoints.length - 1];
    if (candle && volumePoint) {
      series.update(candle);
      volumeSeries.update(volumePoint);
    }
  }, [asset, symbol]);

  return <div ref={container} className="h-full min-h-[280px] w-full" role="img" aria-label={`${symbol} candlestick and volume chart. Last price ${(asset.mid / 100).toFixed(2)} rupees.`} />;
}
