"use client";

import React, { useEffect, useRef } from "react";

interface TradingViewWidgetProps {
  symbol: string;
  timeframe: string;
  height?: number;
}

function mapSymbolForTradingView(symbol: string): string {
  const clean = symbol.replace("/", "").toUpperCase();
  if (clean === "XAUUSD") return "OANDA:XAUUSD";
  if (clean === "XAGUSD") return "OANDA:XAGUSD";
  if (clean === "US30") return "FOREXCOM:DJI";
  if (clean === "SPX500") return "OANDA:SPX500USD";
  if (clean === "NAS100") return "OANDA:NAS100USD";
  if (clean.endsWith("USDT")) return `BINANCE:${clean}`;
  if (clean.length === 6) return `OANDA:${clean}`;
  return clean;
}

function mapTimeframeToTradingViewInterval(tf: string): string {
  const lower = tf.toLowerCase();
  if (lower === "1m") return "1";
  if (lower === "3m") return "3";
  if (lower === "5m") return "5";
  if (lower === "15m") return "15";
  if (lower === "30m") return "30";
  if (lower === "1h" || lower === "60m") return "60";
  if (lower === "2h") return "120";
  if (lower === "4h") return "240";
  if (lower === "1d" || lower === "d") return "D";
  if (lower === "1w" || lower === "w") return "W";
  if (lower === "1m" || lower === "m" || lower === "1mo") return "M";
  return "D";
}

export default function TradingViewWidget({ symbol, timeframe, height = 400 }: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear any previous widget DOM elements
    containerRef.current.innerHTML = "";

    // Create a new inner widget element
    const widgetDiv = document.createElement("div");
    widgetDiv.id = "tradingview-advanced-chart";
    widgetDiv.style.width = "100%";
    widgetDiv.style.height = "100%";
    containerRef.current.appendChild(widgetDiv);

    // Create the embed script
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;

    const tvSymbol = mapSymbolForTradingView(symbol);
    const tvInterval = mapTimeframeToTradingViewInterval(timeframe);

    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: tvInterval,
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      hide_side_toolbar: false,
      allow_symbol_change: true,
      calendar: false,
      studies: [
        "RSI@tv-basicstudies",
        "MASimple@tv-basicstudies"
      ],
      support_host: "https://www.tradingview.com"
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [symbol, timeframe]);

  return (
    <div 
      className="tradingview-widget-container border border-[#2A2E39] rounded-lg overflow-hidden bg-[#131722]" 
      ref={containerRef} 
      style={{ height: `${height}px`, width: "100%" }}
    >
      <div 
        className="tradingview-widget-container__widget" 
        style={{ height: "100%", width: "100%" }}
      />
    </div>
  );
}
