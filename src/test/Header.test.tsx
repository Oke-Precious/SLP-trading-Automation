import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Header } from '../components/layout/Header';
import { useMarketStore } from '../store/useMarketStore';
import { useBiasStore } from '../store/useBiasStore';

// Mock the WebSocket event listeners so they don't crash
vi.mock('../lib/websocket/client', () => ({
  onSignalCreated: vi.fn(() => vi.fn()),
  onAlertTriggered: vi.fn(() => vi.fn()),
  onPOIStatusChange: vi.fn(() => vi.fn()),
}));

describe('Header Component', () => {
  const onOpenSpecs = vi.fn();
  const onOpenSearch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders pair selector with default "BTCUSDT"', () => {
    // Set default value in store
    useMarketStore.setState({ selectedPair: 'BTCUSDT' });
    render(<Header onOpenSpecs={onOpenSpecs} onOpenSearch={onOpenSearch} />);
    expect(screen.getByText('BTCUSDT')).toBeInTheDocument();
  });

  it('timeframe toggle switches active TF in Zustand', () => {
    useMarketStore.setState({ selectedTimeframe: '1H' });
    render(<Header onOpenSpecs={onOpenSpecs} onOpenSearch={onOpenSearch} />);
    
    // Check elements
    const tf4H = screen.getByText('4H');
    fireEvent.click(tf4H);
    
    // Check if the store was updated
    expect(useMarketStore.getState().selectedTimeframe).toBe('4H');
  });

  it('bias badge shows "BULLISH BIAS" when bias is BULLISH', () => {
    useMarketStore.setState({ selectedPair: 'BTCUSDT', selectedTimeframe: '1H' });
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

    render(<Header onOpenSpecs={onOpenSpecs} onOpenSearch={onOpenSearch} />);
    expect(screen.getByText('BULLISH')).toBeInTheDocument();
  });

  it('bias badge shows "BEARISH BIAS" when bias is BEARISH', () => {
    useMarketStore.setState({ selectedPair: 'BTCUSDT', selectedTimeframe: '1H' });
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

    render(<Header onOpenSpecs={onOpenSpecs} onOpenSearch={onOpenSearch} />);
    expect(screen.getByText('BEARISH')).toBeInTheDocument();
  });

  it('notification bell shows correct unread count', () => {
    render(<Header onOpenSpecs={onOpenSpecs} onOpenSearch={onOpenSearch} />);
    const bellBtn = screen.getByRole('button', { name: /Notification Bell/i });
    expect(bellBtn).toBeInTheDocument();
    
    // Open notifications
    fireEvent.click(bellBtn);
    expect(screen.getByText('3 Active')).toBeInTheDocument();
  });
});
