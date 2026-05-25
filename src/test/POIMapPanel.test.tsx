import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { POIMapPanel } from '../components/dashboard/POIMapPanel';
import { usePOIStore } from '../store/usePOIStore';

describe('POIMapPanel Component', () => {
  it('renders mock POI list and highlights active POI', () => {
    usePOIStore.setState({
      pois: [
        { id: '1', name: 'POI One', type: 'OB', priceRange: '$10-$20', priceMin: 10, priceMax: 20, status: 'Active', timeframe: '1D' },
        { id: '2', name: 'POI Two', type: 'BB', priceRange: '$30-$40', priceMin: 30, priceMax: 40, status: 'Tested', timeframe: '4H' },
      ],
      activePOI: { id: '1', name: 'POI One', type: 'OB', priceRange: '$10-$20', priceMin: 10, priceMax: 20, status: 'Active', timeframe: '1D' },
    });

    render(<POIMapPanel />);

    expect(screen.getByText('POI One')).toBeInTheDocument();
    expect(screen.getByText('POI Two')).toBeInTheDocument();

    // Check highlighted POI One
    const rowOne = screen.getByTestId('poi-row-1');
    expect(rowOne).toHaveClass('border-[#CAAA98]'); // Highlighted class
  });

  it('verifies badge colors for Active, Mitigated, and Tested', () => {
    usePOIStore.setState({
      pois: [
        { id: 'active-poi', name: 'Active POI', type: 'OB', priceRange: '$10-$20', priceMin: 10, priceMax: 20, status: 'Active', timeframe: '1D' },
        { id: 'tested-poi', name: 'Tested POI', type: 'OB', priceRange: '$10-$20', priceMin: 10, priceMax: 20, status: 'Tested', timeframe: '1D' },
        { id: 'mitigated-poi', name: 'Mitigated POI', type: 'OB', priceRange: '$10-$20', priceMin: 10, priceMax: 20, status: 'Mitigated', timeframe: '1D' },
      ],
      activePOI: null,
    });

    render(<POIMapPanel />);

    const activeBadge = screen.getByText('Active');
    const testedBadge = screen.getByText('Tested');
    const mitigatedBadge = screen.getByText('Mitigated');

    // Active=green, Tested=yellow, Mitigated=grey (neutral/800 or zinc)
    expect(activeBadge).toHaveClass('text-emerald-400');
    expect(testedBadge).toHaveClass('text-yellow-400');
    expect(mitigatedBadge).toHaveClass('text-gray-500');
  });

  it('add POI button opens modal, form submits and closes modal on success', () => {
    usePOIStore.setState({
      pois: [],
      activePOI: null,
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

    // Submit form
    const submitBtn = screen.getByTestId('submit-poi-btn');
    fireEvent.click(submitBtn);

    // Modal should be closed
    expect(screen.queryByTestId('add-poi-modal')).not.toBeInTheDocument();

    // New POI is in store
    const currentPois = usePOIStore.getState().pois;
    expect(currentPois.length).toBe(1);
    expect(currentPois[0].name).toBe('New Test POI');
  });
});
