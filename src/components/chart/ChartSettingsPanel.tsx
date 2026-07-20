import React, { useState, useEffect, useRef } from 'react';
import { useChartSettingsStore, PRESETS, ChartSettings } from '../../store/useChartSettingsStore';
import { X, Settings2 } from 'lucide-react';

interface ColorInputProps {
  label: string;
  settingKey: keyof ChartSettings;
  settings: ChartSettings;
  updateSetting: <K extends keyof ChartSettings>(key: K, value: ChartSettings[K]) => void;
}

const ColorInput = React.memo(({ label, settingKey, settings, updateSetting }: ColorInputProps) => {
  const storeValue = settings[settingKey] as string;
  const [localValue, setLocalValue] = useState(storeValue);
  const updateTimeoutRef = useRef<any>(null);

  useEffect(() => {
    setLocalValue(storeValue);
  }, [storeValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setLocalValue(newVal);

    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    updateTimeoutRef.current = setTimeout(() => {
      updateSetting(settingKey, newVal as any);
    }, 150);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    updateSetting(settingKey, e.target.value as any);
  };

  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-xs text-gray-400">{label}</span>
      <input
        type="color"
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        style={{
          width: 32,
          height: 24,
          padding: 0,
          border: '1px solid #2A2E39',
          borderRadius: 4,
          cursor: 'pointer',
          background: 'none',
        }}
      />
    </div>
  );
});
ColorInput.displayName = 'ColorInput';

interface ToggleInputProps {
  label: string;
  settingKey: keyof ChartSettings;
  settings: ChartSettings;
  updateSetting: <K extends keyof ChartSettings>(key: K, value: ChartSettings[K]) => void;
}

const ToggleInput = ({ label, settingKey, settings, updateSetting }: ToggleInputProps) => (
  <div className="flex justify-between items-center py-1">
    <span className="text-xs text-gray-400">{label}</span>
    <button
      onClick={() => updateSetting(settingKey, !settings[settingKey] as any)}
      className={`w-8 h-4 rounded-full relative transition-colors ${
        settings[settingKey] ? 'bg-[#26A69A]' : 'bg-[#2A2E39]'
      }`}
    >
      <span 
        className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${
          settings[settingKey] ? 'left-4' : 'left-0.5'
        }`}
      />
    </button>
  </div>
);

const ChartSettingsPanel = React.memo(function ChartSettingsPanel({ onClose }: { onClose: () => void }) {
  const { settings, updateSetting, applyPreset, resetToDefaults } = useChartSettingsStore();

  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-[#151A23] border-l border-[#2A2E39] shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-[#2A2E39]">
        <div className="flex items-center space-x-2">
          <Settings2 className="w-4 h-4 text-[#CAAA98]" />
          <h2 className="text-sm font-bold text-gray-200">Chart Settings</h2>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* SECTION 1 — Presets */}
        <div>
          <h3 className="text-[10px] uppercase font-bold text-gray-500 mb-2">Presets</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.keys(PRESETS).map((preset) => (
               <button
                 key={preset}
                 onClick={() => applyPreset(preset)}
                 className={`text-xs py-1.5 rounded border transition-colors capitalize ${
                   settings.preset === preset 
                     ? 'bg-[#26A69A]/20 border-[#26A69A] text-[#26A69A]' 
                     : 'bg-[#1A1F2C] border-[#2A2E39] text-gray-400 hover:text-white'
                 }`}
               >
                 {preset.replace('-', ' ')}
               </button>
            ))}
          </div>
        </div>

        {/* SECTION 2 — Background & Grid */}
        <div>
          <h3 className="text-[10px] uppercase font-bold text-gray-500 mb-2">Appearance</h3>
          <div className="space-y-1">
            <ColorInput label="Background" settingKey="backgroundColor" settings={settings} updateSetting={updateSetting} />
            <ColorInput label="Grid Lines" settingKey="gridColor" settings={settings} updateSetting={updateSetting} />
          </div>
        </div>

        {/* SECTION 3 — Candles */}
        <div>
          <h3 className="text-[10px] uppercase font-bold text-gray-500 mb-2">Candles</h3>
          <div className="space-y-1">
            <ColorInput label="Bullish Body" settingKey="upCandleColor" settings={settings} updateSetting={updateSetting} />
            <ColorInput label="Bullish Wick" settingKey="upWickColor" settings={settings} updateSetting={updateSetting} />
            <ColorInput label="Bearish Body" settingKey="downCandleColor" settings={settings} updateSetting={updateSetting} />
            <ColorInput label="Bearish Wick" settingKey="downWickColor" settings={settings} updateSetting={updateSetting} />
          </div>
        </div>

        {/* SECTION 4 — SLP Overlay Colors */}
        <div>
          <h3 className="text-[10px] uppercase font-bold text-gray-500 mb-2">SLP Colors</h3>
          <div className="space-y-1">
            <ColorInput label="BOS / Break (Up)" settingKey="bosUpColor" settings={settings} updateSetting={updateSetting} />
            <ColorInput label="BOS / Break (Down)" settingKey="bosDownColor" settings={settings} updateSetting={updateSetting} />
            <ColorInput label="MSS" settingKey="mssColor" settings={settings} updateSetting={updateSetting} />
            <br/>
            <ColorInput label="Bullish OB" settingKey="bullOBColor" settings={settings} updateSetting={updateSetting} />
            <ColorInput label="Bearish OB" settingKey="bearOBColor" settings={settings} updateSetting={updateSetting} />
            <ColorInput label="Breaker Block" settingKey="breakerColor" settings={settings} updateSetting={updateSetting} />
            <br/>
            <ColorInput label="Trendline Liq" settingKey="trendlineLiqColor" settings={settings} updateSetting={updateSetting} />
            <ColorInput label="Equal Highs/Lows Liq" settingKey="eqLiqColor" settings={settings} updateSetting={updateSetting} />
            <ColorInput label="Inducement Liq" settingKey="inducementLiqColor" settings={settings} updateSetting={updateSetting} />
          </div>
        </div>

        {/* SECTION 5 — Visibility Toggles */}
        <div>
          <h3 className="text-[10px] uppercase font-bold text-gray-500 mb-2">Visibility</h3>
          <div className="space-y-1">
            <ToggleInput label="Show BOS" settingKey="showBOS" settings={settings} updateSetting={updateSetting} />
            <ToggleInput label="Show MSS" settingKey="showMSS" settings={settings} updateSetting={updateSetting} />
            <ToggleInput label="Show Order Blocks" settingKey="showOrderBlocks" settings={settings} updateSetting={updateSetting} />
            <ToggleInput label="Show Breaker Blocks" settingKey="showBreakerBlocks" settings={settings} updateSetting={updateSetting} />
            <ToggleInput label="Show Liquidity Levels" settingKey="showLiquidity" settings={settings} updateSetting={updateSetting} />
            <ToggleInput label="Show Volume" settingKey="showVolume" settings={settings} updateSetting={updateSetting} />
            <ToggleInput label="Show Failed POIs" settingKey="showFailedPOIs" settings={settings} updateSetting={updateSetting} />
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-[#2A2E39] flex space-x-2">
        <button 
          onClick={resetToDefaults}
          className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs py-2 rounded transition-colors"
        >
          Reset to Default
        </button>
        <button 
          onClick={onClose}
          className="flex-1 bg-[#26A69A]/20 hover:bg-[#26A69A]/30 text-[#26A69A] border border-[#26A69A]/50 text-xs py-2 rounded transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
});

export default ChartSettingsPanel;
