'use client'

import React, { useEffect, useState } from 'react'
import { useAlertStore } from '../../store/useAlertStore'
import { alertEngine, Alert, AlertCondition } from '../../lib/alerts/alertEngine'
import { ALL_INSTRUMENTS } from '../../lib/market/marketDataService'
import toast from 'react-hot-toast'
import { Bell, BellOff, Trash2, Plus, Volume2, Globe, Play, Sparkles } from 'lucide-react'

export default function AlertsPage() {
  const { alerts, addAlert, updateAlert, deleteAlert, disableAlert, reenableAlert } = useAlertStore()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    pair: 'BTCUSDT', 
    condition: 'PRICE_ABOVE' as AlertCondition,
    value: '', 
    value2: '', 
    label: '',
    channels: { inApp: true, browser: true, sound: true },
  })

  // Start monitoring on mount
  useEffect(() => {
    alertEngine.startMonitoring(alerts, alerts, updateAlert)
    const unsub = alertEngine.onTrigger((alert) => {
      toast.custom(() => (
        <div className="bg-[#1E2433] border-2 border-[#26A69A] rounded-xl p-4 shadow-2xl flex gap-3 max-w-sm font-sans animate-bounce">
          <span className="text-2xl pt-1">🔔</span>
          <div>
            <div className="font-extrabold text-[#E0E3EB] uppercase tracking-wider text-xs">
              {alert.pair} Alert Triggered
            </div>
            <div className="text-[#9AA3B2] text-xs font-mono mt-1">{alert.label}</div>
          </div>
        </div>
      ), { duration: 8000 })
    })
    return () => { alertEngine.stopAll(); unsub() }
  }, [alerts, updateAlert])

  const handleCreate = () => {
    if (!form.value || !form.pair) return
    addAlert({
      pair:       form.pair,
      condition:  form.condition,
      value:      parseFloat(form.value),
      value2:     form.value2 ? parseFloat(form.value2) : undefined,
      label:      form.label || `${form.pair} ${form.condition} ${form.value}`,
      channels:   form.channels,
    })
    setShowModal(false)
    toast.success('Alert configured!')
  }

  const triggerSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 600
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.3)
    } catch {}
    toast.success('Test sound played!')
  }

  return (
    <div className="p-6 bg-[#131722] min-h-screen text-[#E0E3EB] font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display uppercase tracking-wider text-[#CAAA98]">Price Point Alerts</h1>
          <p className="text-[#9AA3B2] text-xs font-mono mt-1">
            {alerts.filter(a => a.status === 'ACTIVE').length} active · {' '}
            {alerts.filter(a => a.status === 'TRIGGERED').length} triggered
          </p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={triggerSound}
            className="bg-[#1E2433] hover:bg-[#2A2E39] border border-[#2A2E39] text-[#CAAA98] px-3.5 py-2 rounded-lg font-mono text-xs uppercase tracking-wider transition-all duration-300 flex items-center space-x-1"
          >
            <Volume2 size={14} />
            <span>Test Sound</span>
          </button>

          <button 
            onClick={() => setShowModal(true)}
            className="bg-[#CAAA98] text-[#131722] hover:bg-[#9A8678] px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all duration-300 flex items-center space-x-1"
          >
            <Plus size={14} className="stroke-[3]" />
            <span>New Alert</span>
          </button>
        </div>
      </div>

      {/* Alerts Table/Card container */}
      <div className="bg-[#1E2433] rounded-xl border border-[#2A2E39] overflow-hidden shadow-xl">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <BellOff className="text-[#9AA3B2]" size={48} />
            <div className="text-center">
              <span className="text-sm font-bold text-[#E0E3EB] uppercase tracking-wider block">No alerts configured</span>
              <span className="text-xs text-[#9AA3B2] font-mono mt-0.5 block">Alarms trigger when prices cross target boundaries.</span>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="border-b border-[#2A2E39] text-[#9AA3B2] text-[10px] uppercase font-mono tracking-wider bg-[#131722]/50">
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Label</th>
                  <th className="px-5 py-4">Asset Pair</th>
                  <th className="px-5 py-4">Target Condition</th>
                  <th className="px-5 py-4">Levels</th>
                  <th className="px-5 py-4">Channels</th>
                  <th className="px-5 py-4">Datetime</th>
                  <th className="px-5 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2E39]/30">
                {alerts.map(alert => (
                  <tr key={alert.id} className="hover:bg-[#131722]/40 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full inline-block ${
                          alert.status === 'ACTIVE' ? 'bg-[#26A69A] animate-pulse shadow-[0_0_8px_#26A69A]'
                          : alert.status === 'TRIGGERED' ? 'bg-[#9AA3B2]'
                          : 'bg-red-500/60'
                        }`} />
                        <span className="font-mono text-[10px] uppercase font-bold tracking-wider">{alert.status}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-[#E0E3EB] max-w-[180px] truncate">{alert.label}</td>
                    <td className="px-5 py-3.5 font-mono text-[#CAAA98] font-bold">{alert.pair}</td>
                    <td className="px-5 py-3.5">
                      <span className="bg-[#131722] border border-[#2A2E39]/80 px-2 py-0.5 rounded text-[10px] font-mono font-medium text-[#9AA3B2] uppercase">
                        {alert.condition.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-[#E0E3EB]">
                      {alert.value.toLocaleString()}
                      {alert.value2 ? ` – ${alert.value2.toLocaleString()}` : ''}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center space-x-2 text-base">
                        {alert.channels.inApp && <span title="App Toast" className="cursor-help">📱</span>}
                        {alert.channels.browser && <span title="Web Push Notification" className="cursor-help">🔔</span>}
                        {alert.channels.sound && <span title="Synth Sound Alert" className="cursor-help">🔊</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[#9AA3B2] font-mono text-[10px]">
                      {new Date(alert.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                      <div className="flex gap-3 justify-center text-[10px] font-mono">
                        {alert.status === 'DISABLED' ? (
                          <button 
                            onClick={() => reenableAlert(alert.id)}
                            className="text-[#26A69A] hover:underline uppercase tracking-wider font-extrabold focus:outline-none"
                          >
                            Enable
                          </button>
                        ) : (
                          <button 
                            onClick={() => disableAlert(alert.id)}
                            className="text-[#9AA3B2] hover:underline uppercase tracking-wider focus:outline-none"
                          >
                            Disable
                          </button>
                        )}
                        <button 
                          onClick={() => deleteAlert(alert.id)}
                          className="text-[#EF5350] hover:text-red-400 focus:outline-none transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Alert Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1E2433] border border-[#2A2E39] rounded-xl p-6 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-2 mb-4 border-b border-[#2A2E39]/50 pb-3">
              <Sparkles className="text-[#CAAA98]" size={16} />
              <h2 className="text-md font-bold text-white uppercase tracking-wider font-display">Configure Security Alarm</h2>
            </div>
            
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-mono text-[#9AA3B2] uppercase tracking-wider mb-1 block">Instrument</label>
                <select 
                  value={form.pair} 
                  onChange={e => setForm(f => ({...f, pair: e.target.value}))}
                  className="w-full bg-[#131722] border border-[#2A2E39] rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[#CAAA98] focus:outline-none text-[#E0E3EB]"
                >
                  {ALL_INSTRUMENTS.map(i => (
                    <option key={i.symbol} value={i.symbol} className="bg-[#191D29]">{i.symbol} — {i.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono text-[#9AA3B2] uppercase tracking-wider mb-1 block">Cross Condition</label>
                <select 
                  value={form.condition}
                  onChange={e => setForm(f => ({...f, condition: e.target.value as AlertCondition}))}
                  className="w-full bg-[#131722] border border-[#2A2E39] rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[#CAAA98] focus:outline-none text-[#E0E3EB]"
                >
                  <option value="PRICE_ABOVE" className="bg-[#191D29]">Price Crosses Above Level</option>
                  <option value="PRICE_BELOW" className="bg-[#191D29]">Price Crosses Below Level</option>
                  <option value="PRICE_ENTERS_POI" className="bg-[#191D29]">Price Enters POI Zone</option>
                  <option value="PCT_MOVE" className="bg-[#191D29]">Price Moves % standard deviation</option>
                </select>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] font-mono text-[#9AA3B2] uppercase tracking-wider mb-1 block">
                    {form.condition === 'PCT_MOVE' ? 'Multiplier %' : 'Level From'}
                  </label>
                  <input 
                    type="number" 
                    value={form.value}
                    onChange={e => setForm(f => ({...f, value: e.target.value}))}
                    placeholder="e.g. 67500"
                    step="any"
                    className="w-full bg-[#131722] border border-[#2A2E39] rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[#CAAA98] focus:outline-none font-mono text-white" 
                  />
                </div>
                {form.condition === 'PRICE_ENTERS_POI' && (
                  <div className="flex-1">
                    <label className="text-[10px] font-mono text-[#9AA3B2] uppercase tracking-wider mb-1 block">Zone To</label>
                    <input 
                      type="number" 
                      value={form.value2}
                      onChange={e => setForm(f => ({...f, value2: e.target.value}))}
                      placeholder="e.g. 68500"
                      step="any"
                      className="w-full bg-[#131722] border border-[#2A2E39] rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[#CAAA98] focus:outline-none font-mono text-white" 
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-mono text-[#9AA3B2] uppercase tracking-wider mb-1 block">Label (optional)</label>
                <input 
                  value={form.label}
                  onChange={e => setForm(f => ({...f, label: e.target.value}))}
                  placeholder="e.g. Daily OB breach"
                  className="w-full bg-[#131722] border border-[#2A2E39] rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[#CAAA98] focus:outline-none text-white" 
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-[#9AA3B2] uppercase tracking-wider mb-2 block">Alert Channels</label>
                <div className="flex gap-4">
                  {(['inApp','browser','sound'] as const).map(ch => (
                    <label key={ch} className="flex items-center gap-2 cursor-pointer text-xs font-mono text-[#E0E3EB] select-none">
                      <input 
                        type="checkbox"
                        checked={form.channels[ch]}
                        onChange={e => setForm(f => ({...f, channels: {...f.channels, [ch]: e.target.checked}}))}
                        className="accent-[#CAAA98] rounded cursor-pointer scale-110" 
                      />
                      <span className="capitalize">{ch === 'inApp' ? 'In-App' : ch}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[#2A2E39]/50">
                <button 
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 rounded-lg border border-[#2A2E39] text-[#9AA3B2] font-mono text-xs uppercase tracking-wider hover:bg-[#131722]/50 transition-all focus:outline-none"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreate}
                  className="flex-1 py-2 rounded-lg bg-[#CAAA98] text-[#131722] font-mono text-xs font-bold uppercase tracking-wider hover:bg-[#9A8678] transition-all focus:outline-none"
                >
                  Deploy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
