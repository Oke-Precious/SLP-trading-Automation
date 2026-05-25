import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api/client';

const CACHE_KEY = 'autoslp_feature_flags';
const CACHE_TIME_KEY = 'autoslp_feature_flags_cached_at';
const ONE_HOUR = 3600000; // 1 hour in ms

export interface FeatureFlagsMap {
  ai_pattern_recognition: boolean;
  backtest_module: boolean;
  multi_exchange: boolean;
  social_trading: boolean;
  dark_mode_v2: boolean;
  advanced_charts: boolean;
  [key: string]: boolean;
}

const defaultFlags: FeatureFlagsMap = {
  ai_pattern_recognition: false,
  backtest_module: true,
  multi_exchange: false,
  social_trading: false,
  dark_mode_v2: true,
  advanced_charts: true
};

/**
 * Custom React hook to check feature flags with robust client-side caching (1 hour).
 */
export function useFeatureFlag(key: keyof FeatureFlagsMap | string): { enabled: boolean; loading: boolean } {
  const [flags, setFlags] = useState<Record<string, boolean>>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
      
      if (cached && cachedTime) {
        const parsedTime = Number(cachedTime);
        const now = Date.now();
        
        // Cache is valid
        if (now - parsedTime < ONE_HOUR) {
          return JSON.parse(cached);
        }
      }
    } catch {
      // Ignore reading error
    }
    return defaultFlags;
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function fetchFlags() {
      try {
        setLoading(true);
        // GET Features list from server
        const response = await apiClient.get('/features');
        const obtainedFlags = response.data?.flags;
        
        if (obtainedFlags && active) {
          setFlags(obtainedFlags);
          localStorage.setItem(CACHE_KEY, JSON.stringify(obtainedFlags));
          localStorage.setItem(CACHE_TIME_KEY, String(Date.now()));
        }
      } catch (err) {
        console.warn('Failed to fetch remote feature flags, falling back to cached or default values.', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
    const now = Date.now();
    const isStale = !cachedTime || (now - Number(cachedTime) >= ONE_HOUR);

    if (isStale) {
      fetchFlags();
    }

    // Connect to global refreshed / login listeners to refetch flags when user changes
    const handleRefresh = () => {
      fetchFlags();
    };

    window.addEventListener('autoslp_token_refreshed', handleRefresh);
    window.addEventListener('autoslp_token_loaded', handleRefresh);

    return () => {
      active = false;
      window.removeEventListener('autoslp_token_refreshed', handleRefresh);
      window.removeEventListener('autoslp_token_loaded', handleRefresh);
    };
  }, []);

  const isEnabled = flags[key] !== undefined ? flags[key] : false;

  return {
    enabled: isEnabled,
    loading
  };
}
export default useFeatureFlag;
