/**
 * @file analytics.ts
 * @description Privacy-first, EU-compliant, self-hosted analytics telemetry system (Umami / Plausible style).
 * No PII collected. No cross-site tracker cookies.
 */

export interface TrackedEvents {
  page_view: { path: string };
  pair_switched: { pair: string };
  timeframe_switched: { tf: string };
  poi_created: { type: 'ORDER_BLOCK' | 'BREAKER_BLOCK' };
  signal_viewed: { signalId: string };
  alert_created: { alertType: string };
  setup_executed: { pair: string; direction: 'LONG' | 'SHORT' };
  journal_opened: Record<string, never>;
  settings_changed: { section: string };
}

class PrivacyFirstAnalytics {
  private scriptUrl: string = '';
  private isInitialized: boolean = false;

  constructor() {
    // Dynamic endpoints for self-hosted Umami or Plausible instance
    this.scriptUrl = (import.meta as any).env?.VITE_ANALYTICS_URL || 'https://analytics.autoslp.com/script.js';
    this.initialize();
  }

  private initialize() {
    if (typeof window === 'undefined') return;
    
    console.log(`[ANALYTICS] Initializing Privacy-First Telemetry Engine...`);
    console.log(`[ANALYTICS] Pointing to self-hosted server: ${this.scriptUrl}`);
    
    // Set up standard window.umami / window.plausible micro queues if self-hosted scripts load
    (window as any).umami = (window as any).umami || function(...args: any[]) {
      ((window as any).umami.q = (window as any).umami.q || []).push(args);
    };

    this.isInitialized = true;
  }

  /**
   * Track an event with strong types and structural metadata.
   */
  public track<K extends keyof TrackedEvents>(eventName: K, props?: TrackedEvents[K]): void {
    if (typeof window === 'undefined') return;

    const timestamp = new Date().toISOString();
    const cleanProps = props || {};

    // 1. Log visually inside consolidated dev telemetry stream (zero PII)
    console.info(`[TELEMETRY EVENT] ${timestamp} - Name: "${eventName}"`, cleanProps);

    // 2. Dispatch to custom window.umami / self-hosted queue
    try {
      if ((window as any).umami && typeof (window as any).umami === 'function') {
        (window as any).umami(eventName, cleanProps);
      }
    } catch (err) {
      console.warn('[ANALYTICS] Self-hosted script queue error:', err);
    }

    // 3. Keep in local active session buffer for in-app debugging dashboards
    try {
      const bufferKey = 'autoslp_telemetry_events';
      const history = JSON.parse(localStorage.getItem(bufferKey) || '[]');
      history.push({ eventName, props: cleanProps, timestamp });
      
      // Limit to last 50 events to prevent localstorage expansion
      if (history.length > 50) {
        history.shift();
      }
      localStorage.setItem(bufferKey, JSON.stringify(history));
    } catch (err) {
      // Ignored
    }
  }
}

export const analytics = new PrivacyFirstAnalytics();
