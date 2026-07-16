/**
 * @file page.tsx
 * @description System settings and safeguards profile page.
 */

'use client';

import React, { useState } from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useChartSettingsStore, PRESETS } from '../../store/useChartSettingsStore';
import { Save, RefreshCcw, Bell, Monitor, Palette, Clock, Terminal, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { apiClient } from '../../lib/api/client';

export default function SettingsPage() {
  const { 
    defaultPair, 
    defaultTimeframe, 
    twelveDataApiKey, 
    notificationsEnabled, 
    timeFormat,
    chartTheme,
    setSetting 
  } = useSettingsStore();

  const { settings: chartSettings, updateSetting: updateChartSetting, applyPreset } = useChartSettingsStore();

  const [activeTab, setActiveTab] = useState<'general' | 'chart'>('general');
  const [keyInput, setKeyInput] = useState(twelveDataApiKey || '');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ success: boolean; message: string } | null>(null);

  React.useEffect(() => {
    setKeyInput(twelveDataApiKey || '');
  }, [twelveDataApiKey]);

  const handleSaveApiKey = async () => {
    const trimmedKey = keyInput.trim();
    if (!trimmedKey) {
      setSetting('twelveDataApiKey', '');
      setValidationResult({ success: true, message: 'API Key removed successfully.' });
      return;
    }

    // Always save the API Key immediately so the user is never blocked!
    setSetting('twelveDataApiKey', trimmedKey);
    setIsValidating(true);
    setValidationResult(null);

    try {
      const { data } = await apiClient.get('/market/validate-key', {
        params: { apikey: trimmedKey }
      });

      if (data && data.success) {
        setValidationResult({ 
          success: true, 
          message: 'Twelve Data API key saved and validated successfully! Real-time streams are active.' 
        });
      } else {
        // Validation returned an issue, but key is saved
        setValidationResult({ 
          success: true, 
          message: `API Key saved! However, Twelve Data returned a validation status: "${data.error || 'Check key activation'}" (note: new free keys can take up to 15 minutes to activate, and calls from cloud hosting environments are sometimes restricted. The application will still use your saved key).` 
        });
      }
    } catch (err: any) {
      console.error('[Settings] API Key validation error:', err);
      const errMsg = err.response?.data?.error || err.message || 'The server could not verify the key with Twelve Data.';
      // Key is still saved successfully, let the user know!
      setValidationResult({ 
        success: true, 
        message: `API Key saved successfully! Note: Verification check returned: "${errMsg}" (note: new free keys can take up to 15 minutes to activate, and calls from cloud hosting environments are sometimes restricted. The application will still use your saved key).` 
      });
    } finally {
      setIsValidating(false);
    }
  };

  const pairs = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'EURUSD', 'GBPUSD'];
  const timeframes = ['1m', '5m', '15m', '30m', '1H', '4H', '1D'];

  return (
    <div className="p-6 h-full overflow-y-auto bg-[#0A0D14] text-gray-200">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2A2E39] pb-4">
          <div>
            <h1 className="text-2xl font-bold font-display uppercase tracking-wide text-white flex items-center gap-3">
              <Monitor className="text-[#CAAA98]" size={24} />
              System Settings
            </h1>
            <p className="text-sm text-gray-400 mt-1">Configure your preferred workspace defaults and rendering options.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-[#2A2E39]">
          <button
            onClick={() => setActiveTab('general')}
            className={`pb-3 px-2 text-sm font-semibold tracking-wide border-b-2 transition-colors ${
              activeTab === 'general' ? 'border-[#CAAA98] text-[#CAAA98]' : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            General Preferences
          </button>
          <button
            onClick={() => setActiveTab('chart')}
            className={`pb-3 px-2 text-sm font-semibold tracking-wide border-b-2 transition-colors ${
               activeTab === 'chart' ? 'border-[#CAAA98] text-[#CAAA98]' : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Chart Configuration
          </button>
        </div>

        <motion.div
           key={activeTab}
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.2 }}
        >
          {activeTab === 'general' ? (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Default Pair */}
                <div className="bg-[#131722] border border-[#2A2E39] rounded-xl p-5">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Default Trading Pair</label>
                  <select
                    value={defaultPair}
                    onChange={(e) => setSetting('defaultPair', e.target.value)}
                    className="w-full bg-[#0A0D14] border border-[#2A2E39] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#CAAA98]"
                  >
                    {pairs.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                {/* Default Timeframe */}
                <div className="bg-[#131722] border border-[#2A2E39] rounded-xl p-5">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Default Timeframe</label>
                  <select
                    value={defaultTimeframe}
                    onChange={(e) => setSetting('defaultTimeframe', e.target.value)}
                    className="w-full bg-[#0A0D14] border border-[#2A2E39] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#CAAA98]"
                  >
                    {timeframes.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* Time Format */}
                <div className="bg-[#131722] border border-[#2A2E39] rounded-xl p-5">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                     <Clock size={14} /> Time Format
                  </label>
                  <div className="flex gap-3">
                    {['12H', '24H'].map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setSetting('timeFormat', fmt as any)}
                        className={`flex-1 py-2 rounded-lg font-mono text-sm border transition-colors ${
                          timeFormat === fmt 
                            ? 'bg-[#CAAA98]/10 border-[#CAAA98] text-[#CAAA98]' 
                            : 'bg-[#0A0D14] border-[#2A2E39] text-gray-400 hover:text-white'
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notifications */}
                <div className="bg-[#131722] border border-[#2A2E39] rounded-xl p-5 flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                       <Bell size={14} /> Push Notifications
                    </label>
                    <span className="text-xs text-gray-500">Receive alerts for structural breaks</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={notificationsEnabled}
                      onChange={(e) => setSetting('notificationsEnabled', e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-[#2A2E39] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#26A69A]"></div>
                  </label>
                </div>
              </div>

              {/* Data Connections */}
              <div className="bg-[#131722] border border-[#2A2E39] rounded-xl p-5">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Terminal size={14} /> TwelveData API Key
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="password"
                    value={keyInput}
                    onChange={(e) => {
                      setKeyInput(e.target.value);
                      setValidationResult(null);
                    }}
                    placeholder="Enter your API key to enable live data integration"
                    className="flex-1 bg-[#0A0D14] border border-[#2A2E39] rounded-lg p-3 text-white focus:outline-none focus:border-[#CAAA98] font-mono text-sm"
                  />
                  <button
                    onClick={handleSaveApiKey}
                    disabled={isValidating}
                    className="px-5 py-3 sm:py-0 bg-[#CAAA98] hover:bg-[#bfa08e] text-black font-semibold text-sm rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isValidating ? (
                      <>
                        <Loader2 className="animate-spin animate-infinite shrink-0" size={16} />
                        Validating...
                      </>
                    ) : (
                      <>
                        <Save size={16} className="shrink-0" />
                        Save API Key
                      </>
                    )}
                  </button>
                </div>

                {validationResult && (
                  <div className={`mt-3 p-3 rounded-lg flex items-start gap-2.5 text-xs font-medium border ${
                    validationResult.success 
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' 
                      : 'bg-rose-950/20 border-rose-500/30 text-rose-400'
                  }`}>
                    {validationResult.success ? (
                      <CheckCircle className="shrink-0 mt-0.5" size={14} />
                    ) : (
                      <AlertCircle className="shrink-0 mt-0.5" size={14} />
                    )}
                    <span>{validationResult.message}</span>
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-2">Required for realtime accurate market data feeds on stocks and forex.</p>
              </div>

            </div>
          ) : (
            <div className="space-y-6">
               <div className="bg-[#131722] border border-[#2A2E39] rounded-xl p-5">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Palette size={14} /> Global Color Preset
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map((presetKey) => (
                      <button
                        key={presetKey}
                        onClick={() => applyPreset(presetKey)}
                        className={`py-3 px-4 rounded-lg font-bold uppercase text-xs tracking-wider border transition-colors ${
                          chartSettings.preset === presetKey 
                            ? 'bg-[#CAAA98]/10 border-[#CAAA98] text-[#CAAA98]' 
                            : 'bg-[#0A0D14] border-[#2A2E39] text-gray-400 hover:text-white'
                        }`}
                      >
                        {presetKey.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
               </div>

               <div className="bg-[#131722] border border-[#2A2E39] rounded-xl p-5">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">SLP Overlays Visibility</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     {[
                       { key: 'showBOS', label: 'BOS' },
                       { key: 'showMSS', label: 'MSS' },
                       { key: 'showOrderBlocks', label: 'Order Blocks' },
                       { key: 'showBreakerBlocks', label: 'Breaker Blocks' },
                       { key: 'showLiquidity', label: 'Liquidity Levels' },
                       { key: 'showVolume', label: 'Volume Histogram' },
                     ].map(({ key, label }) => (
                        <div key={key} className="flex items-center justify-between bg-[#0A0D14] border border-[#2A2E39] p-3 rounded-lg">
                           <span className="text-xs text-gray-300 font-semibold">{label}</span>
                           <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={(chartSettings as any)[key]}
                              onChange={(e) => updateChartSetting(key as keyof typeof chartSettings, e.target.checked as any)}
                            />
                            <div className="w-8 h-4 bg-[#2A2E39] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#CAAA98]"></div>
                          </label>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

