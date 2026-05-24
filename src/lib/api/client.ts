import axios from 'axios';
import { API_BASE_URL } from '../constants';
import { toast } from 'react-hot-toast';

// Get base URL dynamically and robustly
const NEXT_PUBLIC_API_BASE_URL = 
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_BASE_URL) ||
  (import.meta as any).env?.NEXT_PUBLIC_API_BASE_URL ||
  (import.meta as any).env?.VITE_API_BASE_URL ||
  API_BASE_URL;

export const apiClient = axios.create({
  baseURL: NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('autoslp_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if network error (no response)
    if (!error.response) {
      toast.error('Connection error. Retrying...', { id: 'network-connection-error' });
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (
        originalRequest.url?.includes('/auth/refresh') ||
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/register')
      ) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('autoslp_refresh_token');

      try {
        const response = await axios.post(`${NEXT_PUBLIC_API_BASE_URL}/auth/refresh`, {
          refreshToken,
        }, {
          withCredentials: true,
        });

        const dataResponse = response.data;
        const accessToken = dataResponse?.data?.accessToken || dataResponse?.accessToken;
        const newRefreshToken = dataResponse?.data?.refreshToken || dataResponse?.refreshToken;

        if (accessToken) {
          localStorage.setItem('autoslp_token', accessToken);
          if (newRefreshToken) {
            localStorage.setItem('autoslp_refresh_token', newRefreshToken);
          }
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;

          // Dispatch event to notify listeners (like real-time socket connections)
          window.dispatchEvent(new CustomEvent('autoslp_token_refreshed', { detail: accessToken }));

          processQueue(null, accessToken);
          isRefreshing = false;

          return apiClient(originalRequest);
        } else {
          throw new Error('Access token not found in refresh response');
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        localStorage.removeItem('autoslp_token');
        localStorage.removeItem('autoslp_refresh_token');
        
        // Dispatch custom logout event to trigger clean client state
        window.dispatchEvent(new CustomEvent('autoslp_unauthorized_logged_out'));
        
        if (typeof window !== 'undefined') {
          // Redirect to login if user session is expired
          // Use search parameter to prevent endless reload if already on login view
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

