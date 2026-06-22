'use client'

import React, { useEffect } from 'react'
import CandlestickChart        from '../../components/chart/CandlestickChart'
import TimeframeSelector       from '../../components/chart/TimeframeSelector'
import MarketSummaryCard       from '../../components/dashboard/MarketSummaryCard'
import TradingPlanPanel        from '../../components/dashboard/TradingPlanPanel'
import POIMapPanel             from '../../components/dashboard/POIMapPanel'
import RecentSignalsPanel      from '../../components/dashboard/RecentSignalsPanel'
import { useMarketStore }      from '../../store/useMarketStore'
import { usePOIStore }         from '../../store/usePOIStore'
import { useBiasStore }        from '../../store/useBiasStore'
import { useRealtimeCandles }  from '../../hooks/useRealtimeCandles'
import { useBiasAnalysis }     from '../../hooks/useBiasAnalysis'
import { detectOrderBlocks }   from '../../lib/analysis/orderBlockEngine'

export default function DashboardPage() {
  const { selectedPair, selectedTimeframe } = useMarketStore()
  const { setPOIs } = usePOIStore()
  const { setBias } = useBiasStore()

  // Load real candle data
  const { candles, isLoading, isConnected } = useRealtimeCandles(selectedPair, selectedTimeframe)

  // Run bias analysis on candles
  const biasResult = useBiasAnalysis(candles)

  // Auto-detect POIs from candles
  useEffect(() => {
    if (candles.length < 30) return
    const detectedPOIs = detectOrderBlocks(candles, selectedTimeframe)
    setPOIs(detectedPOIs.map((p) => ({
      ...p,
      pair: selectedPair,
      userId: 'auto',
      notes: 'Auto-detected',
    } as any)))
  }, [candles, selectedPair, selectedTimeframe, setPOIs])

  // Update bias store
  useEffect(() => {
    if (!biasResult) return
    setBias(selectedPair, selectedTimeframe, biasResult.bias)
  }, [biasResult, selectedPair, selectedTimeframe, setBias])

  return (
    <div className="flex flex-col h-full gap-3 p-4 bg-[#131722]">

      {/* ── TOP ROW: Chart + Trading Plan ── */}
      <div className="flex flex-col xl:flex-row gap-3 min-h-[460px]">

        {/* Chart Area (65%) */}
        <div className="flex flex-col gap-2 flex-1 xl:flex-[0_0_65%] bg-[#131722] rounded-lg h-[460px]">
          <CandlestickChart height={460} />
        </div>

        {/* Trading Plan Panel (35%) */}
        <div className="flex flex-col flex-1 xl:flex-[0_0_35%]">
          <TradingPlanPanel biasResult={biasResult} />
        </div>
      </div>

      {/* ── BOTTOM ROW: Market Summary + POI Map + Signals ── */}
      <div className="flex flex-col lg:flex-row gap-3 min-h-[290px]">

        {/* Market Summary (28%) */}
        <div className="flex-1 lg:flex-[1_1_28%]">
          <MarketSummaryCard biasResult={biasResult} isLoading={isLoading} />
        </div>

        {/* HTF POI Map (42%) */}
        <div className="flex-1 lg:flex-[1_1_42%]">
          <POIMapPanel />
        </div>

        {/* Recent Signals (28%) */}
        <div className="flex-1 lg:flex-[1_1_28%]">
          <RecentSignalsPanel />
        </div>
      </div>
    </div>
  )
}
