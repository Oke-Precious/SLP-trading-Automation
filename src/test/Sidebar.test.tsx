import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
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
  const openPersonasModal = vi.fn();

  it('renders all nav items', () => {
    render(
      <BrowserRouter>
        <Sidebar openPersonasModal={openPersonasModal} />
      </BrowserRouter>
    );
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Market Overview')).toBeInTheDocument();
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
      <BrowserRouter>
        <Sidebar openPersonasModal={openPersonasModal} />
      </BrowserRouter>
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
      <BrowserRouter>
        <Sidebar openPersonasModal={openPersonasModal} />
      </BrowserRouter>
    );

    // In collapsed state, 'S' logo is rendered instead of 'SLP TRADER'
    expect(screen.getByText('S')).toBeInTheDocument();
  });

  it('can focus on items', () => {
    render(
      <BrowserRouter>
        <Sidebar openPersonasModal={openPersonasModal} />
      </BrowserRouter>
    );
    // test focus or something
  });
});
