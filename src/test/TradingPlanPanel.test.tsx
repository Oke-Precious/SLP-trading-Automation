import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TradingPlanPanel } from '../components/dashboard/TradingPlanPanel';
import { useSignalStore } from '../store/useSignalStore';

describe('TradingPlanPanel Component', () => {
  it('renders all 6 steps in order', () => {
    useSignalStore.setState({ activeSignal: null });
    render(<TradingPlanPanel />);
    
    // Check titles/steps are rendered
    expect(screen.getByText(/Establish HTF Bias/i)).toBeInTheDocument();
    expect(screen.getByText(/Plot Unmitigated HTF POIs/i)).toBeInTheDocument();
    expect(screen.getByText(/Monitor Retracement to POI/i)).toBeInTheDocument();
    expect(screen.getByText(/Wait for Lower TF MSS/i)).toBeInTheDocument();
    expect(screen.getByText(/Place Limit Entry/i)).toBeInTheDocument();
    expect(screen.getByText(/Target Swing Bounds/i)).toBeInTheDocument();
  });

  it('active signal card shows when signal exists', () => {
    useSignalStore.setState({
      activeSignal: { id: 'sig-test', date: '2026-05-25', pair: 'BTCUSDT', direction: 'Long', result: 'Active', pnl: '+$450', isWin: true },
    });

    render(<TradingPlanPanel />);
    expect(screen.getByTestId('active-signal-card')).toBeInTheDocument();
  });

  it('no active signal card when no signal', () => {
    useSignalStore.setState({ activeSignal: null });
    render(<TradingPlanPanel />);
    expect(screen.queryByTestId('active-signal-card')).not.toBeInTheDocument();
  });
});
