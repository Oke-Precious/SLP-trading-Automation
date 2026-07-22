import { useMemo } from 'react';
import {
  calculatePositionSizeForSignal, projectTradeOutcome, TradeProjection,
} from '../lib/slp/slpPositionSizing';
import { usePositionSizeSettings } from '../store/usePositionSizeSettings';

export interface DirectionalBiasResult {
  status: string;
  entryPrice: number | null;
  stopLoss: number | null;
  takeProfitLTF?: { targetPrice: number } | null;
}

export function usePositionSizeForSignal(
  biasResult: any,
  symbol:     string
): TradeProjection | null {
  const { accountBalance, riskPercent } = usePositionSizeSettings();

  return useMemo(() => {
    if (!biasResult) return null;

    // Support standard project-level SLPSetup structure
    if (biasResult.status === 'SETUP_VALID' && biasResult.signal) {
      const signal = biasResult.signal;
      const positionSize = calculatePositionSizeForSignal(
        accountBalance, riskPercent,
        signal.entryPrice, signal.stopLoss, symbol
      );
      return projectTradeOutcome(
        positionSize, signal.entryPrice, signal.stopLoss,
        signal.target1
      );
    }

    // Support prompt-specified DirectionalBiasResult/ENTRY_CONFIRMED structure
    if (biasResult.status === 'ENTRY_CONFIRMED') {
      const entryPrice = biasResult.entryPrice;
      const stopLoss = biasResult.stopLoss;
      
      // Handle either takeProfitLTF object or targetPrice directly
      const takeProfitPrice = biasResult.takeProfitLTF?.targetPrice || biasResult.takeProfitLTF || 0;

      if (entryPrice === null || stopLoss === null || !takeProfitPrice) return null;

      const positionSize = calculatePositionSizeForSignal(
        accountBalance, riskPercent,
        entryPrice, stopLoss, symbol
      );

      return projectTradeOutcome(
        positionSize, entryPrice, stopLoss,
        takeProfitPrice
      );
    }

    return null;
  }, [biasResult, symbol, accountBalance, riskPercent]);
}
