import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MarketSummaryCard } from '../components/dashboard/MarketSummaryCard';
import { useMarketStore } from '../store/useMarketStore';
import { useBiasStore } from '../store/useBiasStore';

describe('MarketSummaryCard Component', () => {
  it('shows correct bias from store when BULLISH', () => {
    useMarketStore.setState({ selectedPair: 'BTCUSDT', selectedTimeframe: '4H', appStateMode: 'healthy' });
    const mockTfBias = {
      '1D': 'BULLISH' as const,
      '4H': 'BULLISH' as const,
      '1H': 'BULLISH' as const,
      '30m': 'BULLISH' as const,
      '15m': 'BULLISH' as const,
      '5m': 'BULLISH' as const,
    };
    useBiasStore.setState({
      biasMap: {
        'BTCUSDT': mockTfBias,
        'ETHUSDT': mockTfBias,
        'EURUSD': mockTfBias,
        'GBPUSD': mockTfBias,
      },
    });

    const mockBiasResult = {
      pair: 'BTCUSDT',
      timeframe: '4H', 
      bias: 'BULLISH' as const,
      strength: 90,
      structure: 'BOS' as any,
      phase: 'Expansion' as any,
      nextMove: 'Ascending'
    } as any;

    render(<MarketSummaryCard biasResult={mockBiasResult} isLoading={false} />);
    expect(screen.getByTestId('operational-bias-text')).toHaveTextContent('BULLISH');
    expect(screen.getByTestId('trend-strength-dot')).toHaveClass('bg-bullish');
  });

  it('shows correct bias from store when BEARISH', () => {
    useMarketStore.setState({ selectedPair: 'BTCUSDT', selectedTimeframe: '4H', appStateMode: 'healthy' });
    const mockTfBias = {
      '1D': 'BEARISH' as const,
      '4H': 'BEARISH' as const,
      '1H': 'BEARISH' as const,
      '30m': 'BEARISH' as const,
      '15m': 'BEARISH' as const,
      '5m': 'BEARISH' as const,
    };
    useBiasStore.setState({
      biasMap: {
        'BTCUSDT': mockTfBias,
        'ETHUSDT': mockTfBias,
        'EURUSD': mockTfBias,
        'GBPUSD': mockTfBias,
      },
    });

    const mockBiasResult = {
      pair: 'BTCUSDT',
      timeframe: '4H', 
      bias: 'BEARISH' as const,
      strength: 90,
      structure: 'CHOCH' as any,
      phase: 'Distribution' as any,
      nextMove: 'Declining'
    } as any;

    render(<MarketSummaryCard biasResult={mockBiasResult} isLoading={false} />);
    expect(screen.getByTestId('operational-bias-text')).toHaveTextContent('BEARISH');
    expect(screen.getByTestId('trend-strength-dot')).toHaveClass('bg-bearish');
  });

  it('loading state renders skeleton', () => {
    useMarketStore.setState({ appStateMode: 'loading' });
    render(<MarketSummaryCard biasResult={null} isLoading={true} />);
    expect(screen.getByTestId('summary-skeleton')).toBeInTheDocument();
  });
});
