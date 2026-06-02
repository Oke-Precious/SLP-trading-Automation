import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { TradingPlanPanel } from '../components/dashboard/TradingPlanPanel';
import { useSignalStore } from '../store/useSignalStore';
import { usePOIStore } from '../store/usePOIStore';

describe('TradingPlanPanel Component', () => {
  beforeEach(() => {
    // Clear stores by default
    useSignalStore.setState({ activeSignal: null });
    usePOIStore.setState({ pois: [] });
  });

  it('renders all 6 steps in order', () => {
    render(<TradingPlanPanel biasResult={null} />);
    
    // Check titles/steps are rendered
    expect(screen.getByText(/Establish HTF Bias/i)).toBeInTheDocument();
    expect(screen.getByText(/Plot Unmitigated HTF POIs/i)).toBeInTheDocument();
    expect(screen.getByText(/Monitor Retracement to POI/i)).toBeInTheDocument();
    expect(screen.getByText(/Wait for Lower TF MSS/i)).toBeInTheDocument();
    expect(screen.getByText(/Place Limit Entry/i)).toBeInTheDocument();
    expect(screen.getByText(/Target Swing Bounds/i)).toBeInTheDocument();
  });

  it('active signal card shows when active POI exists', () => {
    usePOIStore.setState({
      pois: [
        { id: '1', name: 'Active POI', type: 'OB', priceRange: '$10-$20', priceMin: 10, priceMax: 20, status: 'Active', timeframe: '4H' }
      ]
    });
    useSignalStore.setState({
      activeSignal: { id: 'sig-test', date: '2026-05-25', pair: 'BTCUSDT', direction: 'Long', result: 'Active', pnl: '+$450', isWin: true },
    });

    render(<TradingPlanPanel biasResult={null} />);
    expect(screen.getByTestId('active-signal-card')).toBeInTheDocument();
  });

  it('no active signal card when no active POI exists', () => {
    render(<TradingPlanPanel biasResult={null} />);
    expect(screen.queryByTestId('active-signal-card')).not.toBeInTheDocument();
  });
});
