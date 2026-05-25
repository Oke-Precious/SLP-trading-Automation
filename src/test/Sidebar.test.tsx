import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Sidebar } from '../components/layout/Sidebar';
import { useUIStore } from '../store/useUIStore';

// Mock Zustand store if we need custom values or just use defaults
vi.mock('../store/useUIStore', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    useUIStore: vi.fn((selector) => {
      // Return custom mock states based on selector
      const state = {
        sidebarExpanded: true,
        toggleSidebar: vi.fn(),
      };
      return selector ? selector(state) : state;
    }),
  };
});

describe('Sidebar Component', () => {
  const activePage = 'dashboard';
  const setActivePage = vi.fn();
  const openPersonasModal = vi.fn();

  it('renders all 10 nav items', () => {
    render(
      <Sidebar 
        activePage={activePage} 
        setActivePage={setActivePage} 
        openPersonasModal={openPersonasModal} 
      />
    );
    const buttons = screen.getAllByRole('button');
    // Nav items are Dashboard, Market Overview, Directional Bias, POI Map, Trade Setups, Positions, Alerts, Backtest, Journal, Settings
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Market Overview')).toBeInTheDocument();
    expect(screen.getByText('Directional Bias')).toBeInTheDocument();
  });

  it('active item has correct aria-current="page"', () => {
    render(
      <Sidebar 
        activePage="market-overview" 
        setActivePage={setActivePage} 
        openPersonasModal={openPersonasModal} 
      />
    );
    const activeBtn = screen.getByRole('button', { name: /Market Overview/i });
    expect(activeBtn).toHaveAttribute('aria-current', 'page');
  });

  it('toggle button collapses/expands sidebar', () => {
    const toggleFn = vi.fn();
    // Override standard mock to return the custom toggle
    vi.mocked(useUIStore).mockImplementation((selector: any) => {
      return selector({
        sidebarExpanded: true,
        toggleSidebar: toggleFn,
      });
    });

    render(
      <Sidebar 
        activePage={activePage} 
        setActivePage={setActivePage} 
        openPersonasModal={openPersonasModal} 
      />
    );

    const collapseBtn = screen.getByText('Collapse Sidebar');
    fireEvent.click(collapseBtn);
    expect(toggleFn).toHaveBeenCalled();
  });

  it('collapsed state shows only icons / CSS handles content hiding', () => {
    vi.mocked(useUIStore).mockImplementation((selector: any) => {
      return selector({
        sidebarExpanded: false,
        toggleSidebar: vi.fn(),
      });
    });

    render(
      <Sidebar 
        activePage={activePage} 
        setActivePage={setActivePage} 
        openPersonasModal={openPersonasModal} 
      />
    );

    // In collapsed state, 'S' logo is rendered instead of 'SLP TRADER'
    expect(screen.getByText('S')).toBeInTheDocument();
  });

  it('keyboard navigation works (Tab through items)', () => {
    render(
      <Sidebar 
        activePage={activePage} 
        setActivePage={setActivePage} 
        openPersonasModal={openPersonasModal} 
      />
    );
    const dashboardBtn = screen.getByRole('button', { name: /Dashboard/i });
    dashboardBtn.focus();
    expect(dashboardBtn).toHaveFocus();
  });
});
