"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CrosshairMode,
  LineStyle,
  Time,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  createSeriesMarkers,
} from "lightweight-charts";
import { useRealtimeCandles } from "../../hooks/useRealtimeCandles";
import { useMarketStore } from "../../store/useMarketStore";
import { usePOIStore } from "../../store/usePOIStore";
import { runSMCAnalysis } from "../../lib/analysis/smcEngine";
import { formatPrice } from "../../lib/market/marketDataService";
import LoadingSpinner from "../ui/LoadingSpinner";

interface Props {
  height?: number;
}

export default function CandlestickChart({ height = 480 }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartApi = useRef<IChartApi | null>(null);
  const candleSeries = useRef<any>(null);
  const volumeSeries = useRef<any>(null);
  const poiSeriesRefs = useRef<any[]>([]);
  const markersPluginRef = useRef<any>(null);

  const { selectedPair, selectedTimeframe } = useMarketStore();
  const { pois } = usePOIStore();
  const [chartInitialized, setChartInitialized] = useState(0);
  const { candles, isLoading, isConnected, error, refetch } =
    useRealtimeCandles(selectedPair, selectedTimeframe);

  // ── Initialize chart once ──────────────────────────────
  useEffect(() => {
    if (!chartRef.current) return;

    chartApi.current = createChart(chartRef.current, {
      width: chartRef.current.clientWidth || 300,
      height: Math.floor(height * 0.8),
      layout: {
        background: { color: "#131722" },
        textColor: "#9AA3B2",
        fontSize: 12,
        fontFamily: "JetBrains Mono, monospace",
      },
      grid: {
        vertLines: { color: "#1E2433", style: LineStyle.Dotted },
        horzLines: { color: "#1E2433", style: LineStyle.Dotted },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "#CAAA98", labelBackgroundColor: "#202940" },
        horzLine: { color: "#CAAA98", labelBackgroundColor: "#202940" },
      },
      rightPriceScale: {
        borderColor: "#2A2E39",
        textColor: "#9AA3B2",
      },
      timeScale: {
        borderColor: "#2A2E39",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
      },
      handleScroll: true,
      handleScale: true,
    });

    // Candlestick series
    candleSeries.current = chartApi.current.addSeries(CandlestickSeries, {
      upColor: "#26A69A",
      downColor: "#EF5350",
      borderUpColor: "#26A69A",
      borderDownColor: "#EF5350",
      wickUpColor: "#26A69A",
      wickDownColor: "#EF5350",
    });

    // Markers Plugin
    markersPluginRef.current = createSeriesMarkers(candleSeries.current, []);

    // Volume series (20% height at bottom)
    volumeSeries.current = chartApi.current.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    chartApi.current.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    // Mark as initialized
    setChartInitialized((prev) => prev + 1);

    // Responsive resize
    const ro = new ResizeObserver(() => {
      if (chartRef.current && chartApi.current) {
        chartApi.current.resize(
          chartRef.current.clientWidth,
          Math.floor(height * 0.8),
        );
      }
    });
    ro.observe(chartRef.current);

    return () => {
      ro.disconnect();
      chartApi.current?.remove();
    };
  }, [height]);

  // ── Update candle data when pair/timeframe changes ─────
  useEffect(() => {
    if (!candleSeries.current || !volumeSeries.current || candles.length === 0)
      return;

    candleSeries.current.setData(
      candles.map((c) => ({
        time: c.time as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    );

    volumeSeries.current.setData(
      candles.map((c) => ({
        time: c.time as Time,
        value: c.volume,
        color:
          c.close >= c.open ? "rgba(38,166,154,0.5)" : "rgba(239,83,80,0.5)",
      })),
    );

    chartApi.current?.timeScale().fitContent();
  }, [candles, chartInitialized]);

  // ── Render POI zones as price lines ───────────────────
  useEffect(() => {
    if (!candleSeries.current) return;

    // Remove old POI lines
    poiSeriesRefs.current.forEach((line) => {
      try {
        candleSeries.current?.removePriceLine(line);
      } catch {}
    });
    poiSeriesRefs.current = [];

    pois.forEach((poi) => {
      if (poi.status?.toUpperCase() === "MITIGATED") return;

      const isOrderBlock =
        (poi.type as string) === "OB" || (poi.type as string) === "ORDER_BLOCK";
      const color = isOrderBlock ? "#26A69A" : "#1565C0";
      const priceMax = poi.priceMax ?? (poi as any).priceTo;
      const priceMin = poi.priceMin ?? (poi as any).priceFrom;

      if (priceMax === undefined || priceMin === undefined) return;

      const topLine = candleSeries.current?.createPriceLine({
        price: priceMax,
        color,
        lineWidth: 1,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: `${poi.name} ▲`,
      });
      const botLine = candleSeries.current?.createPriceLine({
        price: priceMin,
        color,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: false,
        title: `${poi.name} ▼`,
      });
      if (topLine) poiSeriesRefs.current.push(topLine);
      if (botLine) poiSeriesRefs.current.push(botLine);
    });
  }, [pois, chartInitialized]);

  // ── HH/HL markers from structure analysis ─────────────
  const smcResult = React.useMemo(() => {
    if (candles.length === 0) return null;
    return runSMCAnalysis(candles);
  }, [candles]);

  const smcOverlayRefs = useRef<{
    pricelines: any[];
    seriesList: any[];
    markers: any[];
  }>({ pricelines: [], seriesList: [], markers: [] });

  function clearSMCOverlays() {
    smcOverlayRefs.current.pricelines.forEach((pl) => {
      try {
        candleSeries.current?.removePriceLine(pl);
      } catch {}
    });
    smcOverlayRefs.current.seriesList.forEach((s) => {
      try {
        chartApi.current?.removeSeries(s);
      } catch {}
    });
    smcOverlayRefs.current.pricelines = [];
    smcOverlayRefs.current.seriesList = [];
  }

  useEffect(() => {
    if (!candleSeries.current || !smcResult) return;
    clearSMCOverlays();

    // Markers (BOS / Inducement / HH / HL from SMC Engine)
    const allMarkers: any[] = [];

    // BOS / CHoCH / MSS
    smcResult.bosEvents.forEach((bos) => {
      const color = bos.direction === "BULLISH" ? "#26A69A" : "#EF5350";
      const lineSeries = chartApi.current!.addSeries(LineSeries, {
        color,
        lineWidth: 1,
        lineStyle: LineStyle.Solid,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      lineSeries.setData([
        { time: bos.swingTime as Time, value: bos.price },
        { time: bos.breakTime as Time, value: bos.price },
      ]);
      allMarkers.push({
        time: bos.breakTime as Time,
        position: bos.direction === "BULLISH" ? "belowBar" : "aboveBar",
        color,
        shape: "circle",
        text: bos.type,
        size: 0.6,
      });
      smcOverlayRefs.current.seriesList.push(lineSeries);
    });

    // Order Blocks
    smcResult.orderBlocks.forEach((ob) => {
      const color =
        ob.type === "BULLISH" ? "rgba(38,166,154,0.12)" : "rgba(239,83,80,0.12)";
      const borderCol = ob.type === "BULLISH" ? "#26A69A" : "#EF5350";

      const obSeries = chartApi.current!.addSeries(HistogramSeries, {
        color,
        priceFormat: { type: "price" },
        priceScaleId: "right",
        priceLineVisible: false,
        lastValueVisible: false,
      });
      const obCandles = candles.filter(
        (c) => c.time >= ob.startTime && c.time <= ob.endTime
      );
      obSeries.setData(
        obCandles.map((c) => ({
          time: c.time as Time,
          value: ob.top,
          color,
        }))
      );

      const topLine = chartApi.current!.addSeries(LineSeries, {
        color: borderCol,
        lineWidth: 1,
        lineStyle: LineStyle.Solid,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      topLine.setData([
        { time: ob.startTime as Time, value: ob.top },
        { time: candles[candles.length - 1].time as Time, value: ob.top },
      ]);
      allMarkers.push({
        time: ob.startTime as Time,
        position: "aboveBar",
        color: borderCol,
        shape: "circle",
        text: ob.isBroken
          ? "BB"
          : ob.type === "BULLISH"
          ? "Bull OB"
          : "Bear OB",
        size: 0.5,
      });

      const botLine = chartApi.current!.addSeries(LineSeries, {
        color: borderCol,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      botLine.setData([
        { time: ob.startTime as Time, value: ob.bottom },
        { time: candles[candles.length - 1].time as Time, value: ob.bottom },
      ]);

      smcOverlayRefs.current.seriesList.push(obSeries, topLine, botLine);
    });

    // Liquidity Levels
    smcResult.liquidityLevels.forEach((liq) => {
      // @ts-ignore
      const color = liq.type === "BUY_SIDE" ? "#F0B90B" : "#9A8678";

      const liqLine = chartApi.current!.addSeries(LineSeries, {
        color,
        lineWidth: liq.swept ? 1 : 2,
        lineStyle: LineStyle.Dotted,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      liqLine.setData([
        { time: liq.time as Time, value: liq.price },
        { time: candles[candles.length - 1].time as Time, value: liq.price },
      ]);
      allMarkers.push({
        time: liq.time as Time,
        // @ts-ignore
        position: liq.type === "BUY_SIDE" ? "aboveBar" : "belowBar",
        color,
        shape: "circle",
        // @ts-ignore
        text: liq.swept
          ? liq.type === "BUY_SIDE"
            ? "BSL ✓"
            : "SSL ✓"
          : liq.type === "BUY_SIDE"
          ? `BSL×${liq.strength}`
          : `SSL×${liq.strength}`,
        size: 0.5,
      });
      smcOverlayRefs.current.seriesList.push(liqLine);
    });

    // FVGs
    smcResult.fvgs.forEach((fvg) => {
      const color = fvg.type === "BULLISH" ? "#26A69A" : "#EF5350";

      const topLine = chartApi.current!.addSeries(LineSeries, {
        color,
        lineWidth: 1,
        lineStyle: LineStyle.Solid,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      topLine.setData([
        { time: fvg.time as Time, value: fvg.top },
        { time: candles[candles.length - 1].time as Time, value: fvg.top },
      ]);
      allMarkers.push({
        time: fvg.time as Time,
        position: "aboveBar",
        color,
        shape: "circle",
        text: fvg.type === "BULLISH" ? "FVG ↑" : "FVG ↓",
        size: 0.5,
      });

      const botLine = chartApi.current!.addSeries(LineSeries, {
        color,
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      botLine.setData([
        { time: fvg.time as Time, value: fvg.bottom },
        { time: candles[candles.length - 1].time as Time, value: fvg.bottom },
      ]);
      smcOverlayRefs.current.seriesList.push(topLine, botLine);
    });

    // Convert swingHighs and swingLows directly to HH/HL markers like before
    // We already have them from smcResult if we wanted to
    smcResult.swingHighs.forEach((h) => {
      allMarkers.push({
        time: h.time as Time,
        position: "aboveBar",
        color: "#EF5350",
        shape: "arrowDown",
        text: "SH",
        size: 0.5,
      });
    });
    smcResult.swingLows.forEach((l) => {
      allMarkers.push({
        time: l.time as Time,
        position: "belowBar",
        color: "#26A69A",
        shape: "arrowUp",
        text: "SL",
        size: 0.5,
      });
    });

    smcResult.inducements.forEach((indu) => {
      allMarkers.push({
        time: indu.time as Time,
        position: indu.type === "BULLISH" ? "belowBar" : "aboveBar",
        color: "#9A8678",
        shape: "circle",
        text: "INDU",
        size: 0.8,
      });
    });

    allMarkers.sort((a, b) => (a.time as number) - (b.time as number));
    markersPluginRef.current?.setMarkers(allMarkers);
  }, [smcResult, chartInitialized]);

  // Live Price Line
  const livePriceLineRef = useRef<any>(null);
  useEffect(() => {
    if (!candleSeries.current || candles.length === 0) return;
    const currentLivePrice = candles[candles.length - 1].close;

    if (livePriceLineRef.current) {
      candleSeries.current.removePriceLine(livePriceLineRef.current);
    }
    livePriceLineRef.current = candleSeries.current.createPriceLine({
      price: currentLivePrice,
      color: "#CAAA98",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: "LIVE",
    });
  }, [candles, chartInitialized]);

  return (
    <div
      id="candlestick-chart-wrapper"
      className="relative bg-[#131722] rounded-lg overflow-hidden border border-[#2A2E39]"
      style={{ height }}
    >
      {/* Loading Overlay */}
      {isLoading && (
        <div
          id="candlestick-chart-loading-overlay"
          className="absolute inset-0 flex items-center justify-center bg-[#131722] z-50 rounded-lg"
        >
          <LoadingSpinner />
          <span className="ml-3 text-text-secondary text-sm">
            Loading {selectedPair} chart...
          </span>
        </div>
      )}

      {/* Error Overlay */}
      {error && !isLoading && (
        <div
          id="candlestick-chart-error-overlay"
          className="absolute inset-0 flex flex-col items-center justify-center bg-[#131722] z-50 rounded-lg gap-3"
        >
          <span className="text-bearish text-sm">{error}</span>
          <button
            id="candlestick-chart-retry-btn"
            onClick={refetch}
            className="text-xs text-light underline focus:outline-none cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Visual Live indicator */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 font-mono">
        <div
          className={`w-2 h-2 rounded-full ${
            isConnected ? "bg-[#26A69A] animate-pulse" : "bg-gray-500"
          }`}
        />
        <span className="text-[10px] text-gray-400 font-bold tracking-wider">
          {isConnected ? "LIVE DATAFEED ACTIVE" : "DELAYED DATAFEED ACTIVE"}
        </span>
      </div>
      <div className="absolute top-3 left-4 z-10 flex items-center space-x-2 font-mono text-xs text-light">
        <span className="font-bold uppercase text-white">{selectedPair}</span>
        <span className="bg-[#2A3245] px-1.5 py-0.5 rounded text-[10px] text-gray-400 font-semibold">
          {selectedTimeframe}
        </span>
      </div>

      {/* SMC Legend */}
      <div
        style={{
          position: "absolute",
          top: 32,
          left: 16,
          zIndex: 10,
          background: "rgba(19,23,34,0.85)",
          border: "1px solid #2A2E39",
          borderRadius: 6,
          padding: "6px 10px",
          pointerEvents: "none",
          fontSize: 10,
          lineHeight: "18px",
          fontFamily: "monospace",
        }}
      >
        <div>
          <span style={{ color: "#26A69A" }}>━━</span> BOS ↑{" "}
          <span style={{ color: "#EF5350" }}>━━</span> BOS ↓
        </div>
        <div>
          <span style={{ color: "#F0B90B" }}>╌╌</span> CHoCH{" "}
          <span style={{ color: "#CAAA98" }}>╌╌</span> MSS
        </div>
        <div>
          <span style={{ color: "#26A69A" }}>▬▬</span> Bullish OB{" "}
          <span style={{ color: "#EF5350" }}>▬▬</span> Bearish OB
        </div>
        <div>
          <span style={{ color: "#1565C0" }}>▬▬</span> Breaker Block (BB)
        </div>
        <div>
          <span style={{ color: "#F0B90B" }}>┄┄</span> BSL{" "}
          <span style={{ color: "#9A8678" }}>┄┄</span> SSL
        </div>
        <div>
          <span style={{ color: "#26A69A", opacity: 0.6 }}>░░</span> FVG ↑{" "}
          <span style={{ color: "#EF5350", opacity: 0.6 }}>░░</span> FVG ↓
        </div>
        <div>
          <span style={{ color: "#9A8678" }}>●</span> INDU
        </div>
      </div>

      <div
        id="candlestick-chart-container"
        ref={chartRef}
        style={{ width: "100%", height: Math.floor(height * 0.8) }}
      />

      {/* SMC Live Summary Panel */}
      {smcResult && (
        <div
          style={{ height: Math.ceil(height * 0.2) }}
          className="w-full bg-[#0D1117] border-t border-[#2A2E39] p-3 overflow-y-auto flex gap-4 text-xs font-mono scrollbar-thin scrollbar-thumb-[#2A3245] scrollbar-track-transparent"
        >
          <div className="flex-1 min-w-[200px]">
            <h4 className="text-gray-400 font-bold mb-1 border-b border-[#2A2E39] pb-1 uppercase text-[10px]">
              Structure
            </h4>
            <div className="text-[#9AA3B2]">
              Latest BOS:{" "}
              {smcResult.bosEvents.length > 0 ? (
                <span
                  className={
                    smcResult.bosEvents[smcResult.bosEvents.length - 1]
                      .direction === "BULLISH"
                      ? "text-bullish"
                      : "text-bearish"
                  }
                >
                  {smcResult.bosEvents[smcResult.bosEvents.length - 1].type} @{" "}
                  {formatPrice(
                    smcResult.bosEvents[smcResult.bosEvents.length - 1].price,
                    selectedPair,
                  )}
                </span>
              ) : (
                "None"
              )}
            </div>
          </div>

          <div className="flex-1 min-w-[200px]">
            <h4 className="text-gray-400 font-bold mb-1 border-b border-[#2A2E39] pb-1 uppercase text-[10px]">
              Order Blocks
            </h4>
            {smcResult.orderBlocks.slice(-2).map((ob: any, i: number) => (
              <div key={i} className="text-[#9AA3B2] truncate">
                <span
                  className={
                    ob.isBroken
                      ? "text-[#1565C0]"
                      : ob.type === "BULLISH"
                        ? "text-bullish"
                        : "text-bearish"
                  }
                >
                  ●
                </span>{" "}
                {ob.isBroken
                  ? "Breaker"
                  : ob.type === "BULLISH"
                    ? "Bullish OB"
                    : "Bearish OB"}
                : {formatPrice(ob.bottom, selectedPair)} -{" "}
                {formatPrice(ob.top, selectedPair)}
              </div>
            ))}
            {smcResult.orderBlocks.length === 0 && (
              <span className="text-gray-600">No active OBs</span>
            )}
          </div>

          <div className="flex-1 min-w-[200px]">
            <h4 className="text-gray-400 font-bold mb-1 border-b border-[#2A2E39] pb-1 uppercase text-[10px]">
              Liquidity
            </h4>
            {smcResult.liquidityLevels
              .filter((l: any) => !l.swept)
              .slice(-2)
              .map((l: any, i: number) => (
                <div key={i} className="text-[#9AA3B2] truncate">
                  <span
                    className={
                      l.type === "BUY_SIDE"
                        ? "text-[#F0B90B]"
                        : "text-[#9A8678]"
                    }
                  >
                    ●
                  </span>{" "}
                  {l.type === "BUY_SIDE" ? "BSL" : "SSL"} × {l.strength} @{" "}
                  {formatPrice(l.price, selectedPair)}
                </div>
              ))}
            {smcResult.liquidityLevels.filter((l: any) => !l.swept).length ===
              0 && <span className="text-gray-600">No unswept levels</span>}
          </div>

          <div className="flex-1 min-w-[200px]">
            <h4 className="text-gray-400 font-bold mb-1 border-b border-[#2A2E39] pb-1 uppercase text-[10px]">
              Imbalances & Inducements
            </h4>
            {smcResult.fvgs.slice(-1).map((fvg: any, i: number) => (
              <div key={`fvg-${i}`} className="text-[#9AA3B2] truncate">
                <span
                  className={
                    fvg.type === "BULLISH" ? "text-bullish" : "text-bearish"
                  }
                >
                  ░
                </span>{" "}
                FVG: {formatPrice(fvg.bottom, selectedPair)} -{" "}
                {formatPrice(fvg.top, selectedPair)}
              </div>
            ))}
            {smcResult.inducements.slice(-1).map((indu: any, i: number) => (
              <div key={`indu-${i}`} className="text-[#9A8678] truncate">
                <span className="text-[#9A8678]">●</span> INDU @{" "}
                {formatPrice(indu.price, selectedPair)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
