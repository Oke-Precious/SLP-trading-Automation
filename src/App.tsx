import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/auth/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import AppInitializer from './components/AppInitializer';
import { useAuthStore } from './store/useAuthStore';
import { usePOIStore } from './store/usePOIStore';
import { useJournalStore } from './store/useJournalStore';
import { useAlertStore } from './store/useAlertStore';
import { useSettingsStore } from './store/useSettingsStore';
import { useBiasStore } from './store/useBiasStore';
import { useChartSettingsStore } from './store/useChartSettingsStore';
import LoginPage from './app/login/page';
import RegisterPage from './app/register/page';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db, getDocWithTimeout } from './lib/firebase/firebase';
import { doc } from 'firebase/firestore';
import { alertEngine } from './lib/alerts/alertEngine';
import toast from 'react-hot-toast';

import Dashboard from './app/dashboard/page';
import MarketOverview from './app/market-overview/page';
import DirectionalBias from './app/directional-bias/page';
import POIMap from './app/poi-map/page';
import TradeSetups from './app/trade-setups/page';
import Positions from './app/positions/page';
import Alerts from './app/alerts/page';
import Backtest from './app/backtest/page';
import Journal from './app/journal/page';
import Settings from './app/settings/page';
import NotFound from './pages/NotFound';

export default function App() {
  const { clearAuth, setAuth } = useAuthStore();
  const { alerts, updateAlert } = useAlertStore();

  useEffect(() => {
    alertEngine.startMonitoring(alerts, alerts, updateAlert);
  }, [alerts, updateAlert]);

  useEffect(() => {
    const unsub = alertEngine.onTrigger((alert) => {
      toast.success(`Alert Triggered: ${alert.label} on ${alert.pair}`);
    });
    return () => unsub();
  }, []);
  
  useEffect(() => {
    let syncUnsubscribes: (() => void)[] = [];

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      syncUnsubscribes.forEach(unsub => unsub());
      syncUnsubscribes = [];

      if (fbUser) {
        let userData: any = {
          id: fbUser.uid,
          email: fbUser.email,
          username: fbUser.displayName || fbUser.email?.split('@')[0] || 'Trader',
          plan: 'FREE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const userSnap = await getDocWithTimeout(userDocRef);
          if (userSnap && userSnap.exists()) {
            userData = userSnap.data();
          }
        } catch (error) {
          console.warn("⚠️ [Firebase] Could not fetch user profile from Firestore:", error);
        }
        
        try {
          const token = await fbUser.getIdToken();
          setAuth(userData, token);

          const unsubPOI = usePOIStore.getState().syncWithFirebase(fbUser.uid);
          const unsubJournal = useJournalStore.getState().syncWithFirebase(fbUser.uid);
          const unsubAlert = useAlertStore.getState().syncWithFirebase(fbUser.uid);
          const unsubSettings = useSettingsStore.getState().syncWithFirebase(fbUser.uid);
          const unsubBias = useBiasStore.getState().syncWithFirebase(fbUser.uid);
          const unsubChartSettings = useChartSettingsStore.getState().syncWithFirebase(fbUser.uid);
          syncUnsubscribes = [unsubPOI, unsubJournal, unsubAlert, unsubSettings, unsubBias, unsubChartSettings];
        } catch (tokenErr) {
          console.error("Failed to retrieve auth ID token:", tokenErr);
        }
      } else {
        clearAuth();
        usePOIStore.getState().clearUserPOIs();
        useJournalStore.getState().clearTrades();
        useAlertStore.getState().clearAlerts();
      }
    });

    return () => {
      unsubscribe();
      syncUnsubscribes.forEach(unsub => unsub());
    };
  }, [clearAuth, setAuth]);

  return (
    <>
      <AppInitializer />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/market-overview" element={<MarketOverview />} />
            <Route path="/directional-bias" element={<DirectionalBias />} />
            <Route path="/poi-map" element={<POIMap />} />
            <Route path="/trade-setups" element={<TradeSetups />} />
            <Route path="/positions" element={<Positions />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/backtest" element={<Backtest />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}
