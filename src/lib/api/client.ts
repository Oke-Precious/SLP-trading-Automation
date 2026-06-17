import axios from 'axios';
import { useAuthStore } from '../../store/useAuthStore';

// Get base URL dynamically and robustly across Vite / Node environments
const NEXT_PUBLIC_API_BASE_URL = 
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_BASE_URL) ||
  (import.meta as any).env?.NEXT_PUBLIC_API_BASE_URL ||
  (import.meta as any).env?.VITE_API_BASE_URL ||
  '/api/v1';

export const apiClient = axios.create({
  baseURL: NEXT_PUBLIC_API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request and inject Twelve Data API keys for Twelve Data endpoints
apiClient.interceptors.request.use((config) => {
  // 1. Attach standard autoSLP JWT Bearer token if present
  const token = useAuthStore.getState().accessToken;
  if (token && !config.url?.includes('twelvedata.com')) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // 2. Identify if this is a Twelve Data endpoint request and inject permission keys robustly
  const isTwelveData = config.url && (config.url.includes('twelvedata.com') || config.url.includes('api.twelvedata.com'));
  if (isTwelveData) {
    // Correct base URL verification logic
    if (config.url.startsWith('http:') && config.url.includes('twelvedata.com')) {
      config.url = config.url.replace('http:', 'https:');
    }
    
    const twelveKey = 
      (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_TWELVE_DATA_KEY) ||
      (import.meta as any).env?.NEXT_PUBLIC_TWELVE_DATA_KEY ||
      (import.meta as any).env?.VITE_TWELVE_DATA_KEY ||
      '';

    if (twelveKey) {
      config.headers['apikey'] = twelveKey;
      config.headers['Authorization'] = `apikey ${twelveKey}`;
    }
  }

  return config;
});

// Handle 401: refresh and retry once
let isRefreshing = false;
let failedQueue: any[] = [];

apiClient.interceptors.response.use(
  res => res,
  async err => {
    const orig = err.config;
    if (err.response?.status !== 401 || orig._retry) {
      return Promise.reject(err);
    }
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(token => {
        if (orig.headers) {
          orig.headers.Authorization = `Bearer ${token}`;
        }
        return apiClient(orig);
      });
    }

    orig._retry = true;
    isRefreshing = true;
    const refresh = localStorage.getItem('refreshToken');

    try {
      const res = await axios.post(
        `${NEXT_PUBLIC_API_BASE_URL}/auth/refresh`,
        { refreshToken: refresh }
      );
      const { accessToken, refreshToken } = res.data.data || res.data;
      useAuthStore.getState().setToken(accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      failedQueue.forEach(q => q.resolve(accessToken));
      failedQueue = [];
      if (orig.headers) {
        orig.headers.Authorization = `Bearer ${accessToken}`;
      }
      return apiClient(orig);
    } catch {
      failedQueue.forEach(q => q.reject(err));
      failedQueue = [];
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);
