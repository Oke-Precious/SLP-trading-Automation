import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POIMapPanel } from '../components/dashboard/POIMapPanel';
import { usePOIStore } from '../store/usePOIStore';
import { useAuthStore } from '../store/useAuthStore';

// Mock react-query useQuery hook and client
let mockPois: any[] = [];
const mockRefetch = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: mockPois,
    isLoading: false,
    refetch: mockRefetch,
  })),
}));

vi.mock('../lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(() => Promise.resolve({ data: { success: true } })),
  },
}));

describe('POIMapPanel Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPois = [];
  });

  it('renders mock POI list and highlights active POI', () => {
    mockPois = [
      { id: '1', name: 'POI One', type: 'OB', priceFrom: 10, priceTo: 20, status: 'Active', timeframe: '1D' },
      { id: '2', name: 'POI Two', type: 'BB', priceFrom: 30, priceTo: 40, status: 'Tested', timeframe: '4H' },
    ];

    usePOIStore.setState({
      activePOI: { id: '1', name: 'POI One', type: 'OB', priceRange: '$10-$20', priceMin: 10, priceMax: 20, status: 'Active', timeframe: '1D' },
    });

    render(<POIMapPanel />);

    expect(screen.getByText('POI One')).toBeInTheDocument();
    expect(screen.getByText('POI Two')).toBeInTheDocument();

    const rowOne = screen.getByTestId('poi-row-1');
    expect(rowOne).toHaveClass('border-[#CAAA98]'); // Highlighted class
  });

  it('verifies badge colors for Active, Mitigated, and Tested', () => {
    mockPois = [
      { id: 'active-poi', name: 'Active POI', type: 'OB', priceFrom: 10, priceTo: 20, status: 'Active', timeframe: '1D' },
      { id: 'tested-poi', name: 'Tested POI', type: 'OB', priceFrom: 10, priceTo: 20, status: 'Tested', timeframe: '1D' },
      { id: 'mitigated-poi', name: 'Mitigated POI', type: 'OB', priceFrom: 10, priceTo: 20, status: 'Mitigated', timeframe: '1D' },
    ];

    usePOIStore.setState({ activePOI: null });

    render(<POIMapPanel />);

    const activeBadge = screen.getByText('Active');
    const testedBadge = screen.getByText('Tested');
    const mitigatedBadge = screen.getByText('Mitigated');

    expect(activeBadge).toHaveClass('text-emerald-400');
    expect(testedBadge).toHaveClass('text-yellow-400');
    expect(mitigatedBadge).toHaveClass('text-gray-500');
  });

  it('add POI button opens modal, form submits and closes modal on success', async () => {
    mockPois = [];
    usePOIStore.setState({ activePOI: null });
    useAuthStore.setState({
      user: { uid: 'test-user', isSandbox: true } as any
    });

    render(<POIMapPanel />);

    // Click "+ Add POI" button
    const addBtn = screen.getByTestId('add-poi-btn');
    fireEvent.click(addBtn);

    // Modal should be open
    expect(screen.getByTestId('add-poi-modal')).toBeInTheDocument();

    // Fill form
    const nameInput = screen.getByTestId('poi-name-input');
    fireEvent.change(nameInput, { target: { value: 'New Test POI' } });

    const priceInput = screen.getByPlaceholderText('e.g. 61200 - 61800');
    fireEvent.change(priceInput, { target: { value: '61200 - 61800' } });

    // Submit form
    const form = screen.getByTestId('add-poi-modal').querySelector('form')!;
    fireEvent.submit(form);

    // After form submissions it awaits and then closes modal on success
    // Wait for async mock response of post
    await vi.waitFor(() => {
      expect(screen.queryByTestId('add-poi-modal')).not.toBeInTheDocument();
    });
  });
});
