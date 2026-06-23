import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {Toaster} from 'react-hot-toast';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// Suppress benign ResizeObserver loop error notifications
if (typeof window !== 'undefined') {
  const resizeObserverErrorNames = [
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications.'
  ];
  window.addEventListener('error', (e) => {
    if (e.message && resizeObserverErrorNames.some(msg => e.message.includes(msg))) {
      e.stopImmediatePropagation();
    }
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" />
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>,
);

