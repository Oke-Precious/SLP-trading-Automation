import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Notification API
class MockNotification {
  static permission = 'granted';
  static requestPermission = vi.fn().mockResolvedValue('granted');
  constructor() {}
}

Object.defineProperty(window, 'Notification', {
  value: MockNotification,
  writable: true,
});

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

Object.defineProperty(window, 'ResizeObserver', {
  value: MockResizeObserver,
  writable: true,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
