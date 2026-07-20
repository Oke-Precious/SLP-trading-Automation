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
import { useSLPAnalysis }      from '../../hooks/useSLPAnalysis'

export default function DashboardPage() {
  const { selectedPair, selectedTimeframe } = useMarketStore()
  const { setPOIs } = usePOIStore()
  const { setBias } = useBiasStore()

  // Load real candle data
  const { candles, isLoading, isConnected } = useRealtimeCandles(selectedPair, selectedTimeframe)

  // Run full SLP pipeline analysis
  const slpAnalysis = useSLPAnalysis(candles, selectedTimeframe, selectedPair)

  // Auto-detect POIs from candles using our strict SLP Pipeline
  useEffect(() => {
    if (!slpAnalysis || slpAnalysis.validPOIs.length === 0) {
      setPOIs([]);
      return;
    }
    const mappedPOIs = slpAnalysis.validPOIs.map((slp) => ({
      id: slp.id,
      name: `${slp.direction === 'BULLISH' ? 'Bullish' : 'Bearish'} ${slp.type === 'ORDER_BLOCK' ? 'Order Block' : 'Breaker Block'}`,
      type: (slp.type === 'ORDER_BLOCK' ? 'OB' : 'BB') as 'OB' | 'BB',
      priceRange: `$${slp.zoneBottom.toFixed(2)} - $${slp.zoneTop.toFixed(2)}`,
      priceMin: slp.zoneBottom,
      priceMax: slp.zoneTop,
      status: 'Active' as const,
      timeframe: selectedTimeframe,
      pair: selectedPair,
      userId: 'auto',
      notes: 'Auto-detected via strict 4-rule SLP Pipeline validation',
    }));
    setPOIs(mappedPOIs);
  }, [slpAnalysis, selectedPair, selectedTimeframe, setPOIs]);

  // Update bias store
  useEffect(() => {
    if (!slpAnalysis) return
    const storeBias = slpAnalysis.bias.bias === 'NEUTRAL' ? 'RANGING' : slpAnalysis.bias.bias;
    setBias(selectedPair, selectedTimeframe, storeBias)
  }, [slpAnalysis, selectedPair, selectedTimeframe, setBias])

  const biasResult = slpAnalysis ? slpAnalysis.bias : null;

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
          <TradingPlanPanel biasResult={biasResult} slpAnalysis={slpAnalysis} />
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

