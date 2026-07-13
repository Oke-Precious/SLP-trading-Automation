'use client'

import React, { useState, useEffect } from 'react'
import { useJournalStore, JournalTrade } from '../../store/useJournalStore'
import { ALL_INSTRUMENTS, formatPrice } from '../../lib/market/marketDataService'
import { 
  BookOpen, Plus, Search, Trash2, Calendar, Target,
  Filter, TrendingUp, TrendingDown, Award, Clock, DollarSign, 
  Percent, Sparkles, AlertTriangle, Check, X, Edit, Layers
} from 'lucide-react'
import toast from 'react-hot-toast'
import { EmptyState } from '../../components/ui/EmptyState'

export default function JournalPage() {
  const { trades, addTrade, updateTrade, closeTrade, deleteTrade, getStats, clearTrades } = useJournalStore()
  
  // UI Tabs & state
  const [activeTab, setActiveTab] = useState<'LEDGER' | 'ANALYTICS'>('LEDGER')
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OPEN' | 'CLOSED' | 'STOPPED'>('ALL')
  const [filterPair, setFilterPair] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [showLogForm, setShowLogForm] = useState(false)

  // Edit states
  const [editingTradeId, setEditingTradeId] = useState<string | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [editTags, setEditTags] = useState('')

  // Close trade states
  const [closingTradeId, setClosingTradeId] = useState<string | null>(null)
  const [exitPriceInput, setExitPriceInput] = useState('')
  const [exitDateInput, setExitDateInput] = useState(new Date().toISOString().slice(0, 16))

  // New Trade Form Form State
  const [newTrade, setNewTrade] = useState({
    pair: 'BTCUSDT',
    direction: 'LONG' as 'LONG' | 'SHORT',
    entryPrice: '',
    stopLoss: '',
    target1: '',
    target2: '',
    size: '1',
    status: 'OPEN' as 'OPEN' | 'CLOSED' | 'STOPPED',
    exitPrice: '',
    session: 'LONDON' as 'LONDON' | 'NEW_YORK' | 'ASIA' | 'OVERLAP',
    setupType: 'OB_BOUNCE' as 'OB_BOUNCE' | 'BREAKER_RETEST' | 'BOS_RETEST' | 'LIQUIDITY_SWEEP' | 'OTHER',
    notes: '',
    tags: '',
    bias: 'BULLISH' as 'BULLISH' | 'BEARISH',
    timeframe: '1H',
    grade: 'A' as 'A' | 'B' | 'C' | 'D' | null,
  })

  // Get dynamic stats from the store
  const stats = getStats()

  // Handler for creating a trade
  const handleCreateTrade = (e: React.FormEvent) => {
    e.preventDefault()

    const entry = parseFloat(newTrade.entryPrice)
    const sl = parseFloat(newTrade.stopLoss)
    const t1 = parseFloat(newTrade.target1)
    const volume = parseFloat(newTrade.size)

    if (isNaN(entry) || isNaN(sl) || isNaN(t1) || isNaN(volume)) {
      toast.error('Please fill in default numeric metrics (Entry, Stop Loss, Target 1, Size)')
      return
    }

    if (newTrade.status !== 'OPEN' && !newTrade.exitPrice) {
      toast.error('Pre-closed trades require an Exit Price')
      return
    }

    const t2Val = newTrade.target2 ? parseFloat(newTrade.target2) : undefined
    const exitPVal = newTrade.exitPrice ? parseFloat(newTrade.exitPrice) : undefined

    let tradePnL: number | undefined = undefined
    let tradePnLPercent: number | undefined = undefined
    let achievedRR: number | undefined = undefined

    if (newTrade.status !== 'OPEN' && exitPVal !== undefined) {
      // Manual calculations for quick local check
      const diff = newTrade.direction === 'LONG'
        ? exitPVal - entry
        : entry - exitPVal
      tradePnL = diff * volume
      tradePnLPercent = ((exitPVal - entry) / entry) * (newTrade.direction === 'LONG' ? 100 : -100)
      
      const denom = Math.abs(entry - sl)
      if (denom > 0) {
        achievedRR = (exitPVal - entry) / (newTrade.direction === 'LONG' ? (entry - sl) : (sl - entry))
      }
    }

    addTrade({
      pair: newTrade.pair,
      direction: newTrade.direction,
      entryPrice: entry,
      exitPrice: exitPVal,
      size: volume,
      stopLoss: sl,
      target1: t1,
      target2: t2Val,
      status: newTrade.status as any,
      pnl: tradePnL,
      pnlPercent: tradePnLPercent,
      rrAchieved: achievedRR,
      entryDate: new Date().toISOString(),
      exitDate: newTrade.status !== 'OPEN' ? new Date().toISOString() : undefined,
      session: newTrade.session,
      setupType: newTrade.setupType,
      notes: newTrade.notes,
      tags: newTrade.tags ? newTrade.tags.split(',').map(t => t.trim()) : [],
      bias: newTrade.bias,
      timeframe: newTrade.timeframe,
      grade: newTrade.grade,
    })

    toast.success('Trade logged successfully!')
    setShowLogForm(false)
    // reset form state
    setNewTrade({
      pair: 'BTCUSDT',
      direction: 'LONG',
      entryPrice: '',
      stopLoss: '',
      target1: '',
      target2: '',
      size: '1',
      status: 'OPEN',
      exitPrice: '',
      session: 'LONDON',
      setupType: 'OB_BOUNCE',
      notes: '',
      tags: '',
      bias: 'BULLISH',
      timeframe: '1H',
      grade: 'A',
    })
  }

  // Handler for closing an active trade
  const handleCloseTradeSubmit = (id: string) => {
    const exitPrice = parseFloat(exitPriceInput)
    if (isNaN(exitPrice)) {
      toast.error('Specify a numeric exit price')
      return
    }

    closeTrade(id, exitPrice, new Date(exitDateInput).toISOString())
    toast.success('Trade position closed and P&L locked!')
    setClosingTradeId(null)
    setExitPriceInput('')
  }

  // Handler for saving inline changes
  const handleSaveInline = (id: string) => {
    updateTrade(id, {
      notes: editNotes,
      tags: editTags ? editTags.split(',').map(t => t.trim()) : []
    })
    toast.success('Notes and tags updated!')
    setEditingTradeId(null)
  }

  // Filter & Search computation
  const filteredTrades = trades.filter((t) => {
    // 1. Status Filter
    if (filterStatus !== 'ALL') {
      if (filterStatus === 'OPEN' && t.status !== 'OPEN') return false
      if (filterStatus === 'CLOSED' && t.status === 'OPEN') return false
      if (filterStatus === 'STOPPED' && t.status !== 'STOPPED') return false
    }

    // 2. Pair Filter
    if (filterPair !== 'ALL' && t.pair !== filterPair) return false

    // 3. Search text
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const notesMatch = t.notes.toLowerCase().includes(q)
      const pairMatch = t.pair.toLowerCase().includes(q)
      const setupMatch = t.setupType.toLowerCase().includes(q)
      const tagsMatch = t.tags.some(tag => tag.toLowerCase().includes(q))
      return notesMatch || pairMatch || setupMatch || tagsMatch
    }

    return true
  })

  // Set up values for analytics tab
  const setupCounts: Record<string, { total: number, win: number, loss: number, pnl: number }> = {}
  const sessionCounts: Record<string, { total: number, win: number, loss: number, pnl: number }> = {}
  const pairCounts: Record<string, { total: number, win: number, loss: number, pnl: number }> = {}

  trades.forEach(t => {
    const pnlVal = t.pnl ?? 0
    const isClosed = t.status !== 'OPEN'
    const isWin = pnlVal > 0

    // Setup Breakdown
    if (!setupCounts[t.setupType]) {
      setupCounts[t.setupType] = { total: 0, win: 0, loss: 0, pnl: 0 }
    }
    setupCounts[t.setupType].total++
    if (isClosed) {
      if (isWin) setupCounts[t.setupType].win++
      else setupCounts[t.setupType].loss++
      setupCounts[t.setupType].pnl += pnlVal
    }

    // Session Breakdown
    if (!sessionCounts[t.session]) {
      sessionCounts[t.session] = { total: 0, win: 0, loss: 0, pnl: 0 }
    }
    sessionCounts[t.session].total++
    if (isClosed) {
      if (isWin) sessionCounts[t.session].win++
      else sessionCounts[t.session].loss++
      sessionCounts[t.session].pnl += pnlVal
    }

    // Pair Breakdown
    if (!pairCounts[t.pair]) {
      pairCounts[t.pair] = { total: 0, win: 0, loss: 0, pnl: 0 }
    }
    pairCounts[t.pair].total++
    if (isClosed) {
      if (isWin) pairCounts[t.pair].win++
      else pairCounts[t.pair].loss++
      pairCounts[t.pair].pnl += pnlVal
    }
  })

  return (
    <div className="p-6 bg-[#131722] min-h-screen text-[#E0E3EB] font-sans pb-16">
      
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-[#2A2E39]/40 pb-4">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-wider text-[#CAAA98] font-display flex items-center gap-2">
            <BookOpen className="text-[#CAAA98]" size={24} />
            SLP Trade Journal
          </h1>
          <p className="text-xs text-[#9AA3B2] font-mono mt-1">
            Analyze, refine, and master high probability setup execution blocks and breaker models.
          </p>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('LEDGER')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-lg font-mono text-xs uppercase tracking-wider transition-all duration-300 border ${
              activeTab === 'LEDGER' 
                ? 'bg-[#1E2433] text-[#CAAA98] border-[#CAAA98]' 
                : 'bg-[#141822]/60 text-gray-400 border-transparent hover:text-white'
            }`}
          >
            Ledger & Diaries
          </button>
          
          <button
            onClick={() => setActiveTab('ANALYTICS')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-lg font-mono text-xs uppercase tracking-wider transition-all duration-300 border ${
              activeTab === 'ANALYTICS' 
                ? 'bg-[#1E2433] text-[#CAAA98] border-[#CAAA98]' 
                : 'bg-[#141822]/60 text-gray-400 border-transparent hover:text-white'
            }`}
          >
            Performance analytics
          </button>

          <button
            onClick={() => setShowLogForm(!showLogForm)}
            className="px-4 py-2 rounded-lg bg-[#CAAA98] hover:bg-[#9A8678] text-[#131722] text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1 shrink-0"
          >
            <Plus size={14} className="stroke-[3]" />
            <span>Log Trade</span>
          </button>

          {trades.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to clear your trade ledger? All trade entries and logs will be permanently deleted.")) {
                  clearTrades();
                  toast.success("Journal cleared!");
                }
              }}
              className="px-4 py-2 rounded-lg bg-red-950/40 hover:bg-red-900/40 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1 shrink-0"
              title="Delete all trade entries"
            >
              <Trash2 size={14} />
              <span>Clear Ledger</span>
            </button>
          )}
        </div>
      </div>

      {/* METRIC RIBBON */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
        
        {/* Net Profit card */}
        <div className="bg-[#1E2433] border border-[#2A2E39] p-4 rounded-xl flex flex-col justify-between hover:border-[#3A455E] transition-all">
          <div className="flex items-center justify-between text-gray-400 text-[10px] font-mono uppercase">
            <span>Net Performance</span>
            <DollarSign size={12} />
          </div>
          <div className="mt-2">
            <span className={`text-lg font-extrabold font-mono tracking-tight ${
              stats.totalPnL >= 0 ? 'text-[#26A69A]' : 'text-[#EF5350]'
            }`}>
              {stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-[9px] text-[#9AA3B2] font-mono mt-1">Closed positions</span>
        </div>

        {/* Win rate card */}
        <div className="bg-[#1E2433] border border-[#2A2E39] p-4 rounded-xl flex flex-col justify-between hover:border-[#3A455E] transition-all">
          <div className="flex items-center justify-between text-gray-400 text-[10px] font-mono uppercase">
            <span>Win Rate</span>
            <Percent size={12} />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl font-extrabold font-mono text-white">
              {stats.winRate.toFixed(1)}%
            </span>
            <span className="text-[10px] text-gray-400 font-mono">
              ({trades.filter(t => t.status !== 'OPEN' && (t.pnl ?? 0) > 0).length} wins)
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-1.5 w-full bg-[#131722] rounded-full h-1 overflow-hidden">
            <div 
              className="bg-[#26A69A] h-full" 
              style={{ width: `${stats.winRate}%` }} 
            />
          </div>
        </div>

        {/* Average Profit Factor card */}
        <div className="bg-[#1E2433] border border-[#2A2E39] p-4 rounded-xl flex flex-col justify-between hover:border-[#3A455E] transition-all">
          <div className="flex items-center justify-between text-gray-400 text-[10px] font-mono uppercase">
            <span>Profit Factor</span>
            <Layers size={12} />
          </div>
          <div className="mt-2 text-lg font-extrabold font-mono text-[#CAAA98]">
            {stats.profitFactor.toFixed(2)}
          </div>
          <span className="text-[9px] text-[#9AA3B2] font-mono mt-1">Gross Win / Gross Loss ratio</span>
        </div>

        {/* Average Risk Reward card */}
        <div className="bg-[#1E2433] border border-[#2A2E39] p-4 rounded-xl flex flex-col justify-between hover:border-[#3A455E] transition-all">
          <div className="flex items-center justify-between text-gray-400 text-[10px] font-mono uppercase">
            <span>Average R:R</span>
            <Target size={12} />
          </div>
          <div className="mt-2 text-lg font-extrabold font-mono text-zinc-100">
            1:{stats.avgRR.toFixed(2)}
          </div>
          <span className="text-[9px] text-[#9AA3B2] font-mono mt-1">SLP Risk allocation</span>
        </div>

        {/* Win/Loss Streak card */}
        <div className="bg-[#1E2433] border border-[#2A2E39] p-4 rounded-xl flex flex-col justify-between hover:border-[#3A455E] transition-all">
          <div className="flex items-center justify-between text-gray-400 text-[10px] font-mono uppercase">
            <span>Current Streak</span>
            <Clock size={12} />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className={`text-lg font-extrabold font-mono ${
              stats.streak.type === 'W' ? 'text-[#26A69A]' : stats.streak.type === 'L' ? 'text-[#EF5350]' : 'text-gray-400'
            }`}>
              {stats.streak.current} {stats.streak.type || '—'}
            </span>
            <span className="text-[9px] text-[#9AA3B2] font-mono">
              (Best: {stats.streak.best})
            </span>
          </div>
          <span className="text-[9px] text-[#9AA3B2] font-mono mt-1">Consecutive outcomes</span>
        </div>

        {/* Drawdown Metric card */}
        <div className="bg-[#1E2433] border border-[#2A2E39] p-4 rounded-xl flex flex-col justify-between hover:border-[#3A455E] transition-all">
          <div className="flex items-center justify-between text-gray-400 text-[10px] font-mono uppercase">
            <span>Max Drawdown</span>
            <AlertTriangle size={12} className="text-[#EF5350]" />
          </div>
          <div className="mt-2 text-lg font-extrabold font-mono text-[#EF5350]">
            -${stats.drawdown.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[9px] text-[#9AA3B2] font-mono mt-1">Cumulative peak drop</span>
        </div>

      </div>

      {/* LOG TRADE CONSOLE FORM (SLIDING/TOGGLE INLINE CONTAINER) */}
      {showLogForm && (
        <div className="mb-6 bg-[#1E2433] border border-[#CAAA98]/40 rounded-xl p-6 shadow-2xl relative animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-4 border-b border-[#2A2E39]/40 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="text-[#CAAA98]" size={16} />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Log Active/Historical Trade Setup</h3>
            </div>
            <button 
              onClick={() => setShowLogForm(false)}
              className="text-[#9AA3B2] hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleCreateTrade} className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
            {/* Asset Selection */}
            <div>
              <label className="text-[10px] text-[#9AA3B2] uppercase mb-1 block">Asset Pair</label>
              <select
                value={newTrade.pair}
                onChange={e => setNewTrade(prev => ({ ...prev, pair: e.target.value }))}
                className="w-full bg-[#131722] border border-[#2A2E39] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#CAAA98]"
              >
                {ALL_INSTRUMENTS.map((ins) => (
                  <option key={ins.symbol} value={ins.symbol} className="bg-[#1E2433]">
                    {ins.symbol} — {ins.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Direction */}
            <div>
              <label className="text-[10px] text-[#9AA3B2] uppercase mb-1 block">Direction</label>
              <div className="grid grid-cols-2 bg-[#131722] rounded-lg p-0.5 border border-[#2A2E39]">
                <button
                  type="button"
                  onClick={() => setNewTrade(prev => ({ ...prev, direction: 'LONG' }))}
                  className={`py-1.5 rounded-md font-bold text-center transition-all ${
                    newTrade.direction === 'LONG'
                      ? 'bg-[#26A69A]/15 text-[#26A69A] border border-[#26A69A]/30'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  LONG
                </button>
                <button
                  type="button"
                  onClick={() => setNewTrade(prev => ({ ...prev, direction: 'SHORT' }))}
                  className={`py-1.5 rounded-md font-bold text-center transition-all ${
                    newTrade.direction === 'SHORT'
                      ? 'bg-[#EF5350]/15 text-[#EF5350] border border-[#EF5350]/30'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  SHORT
                </button>
              </div>
            </div>

            {/* Position Size */}
            <div>
              <label className="text-[10px] text-[#9AA3B2] uppercase mb-1 block">Units / Lot Size</label>
              <input
                type="number"
                step="any"
                required
                placeholder="e.g. 0.5"
                value={newTrade.size}
                onChange={e => setNewTrade(prev => ({ ...prev, size: e.target.value }))}
                className="w-full bg-[#131722] border border-[#2A2E39] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#CAAA98]"
              />
            </div>

            {/* Execution Setup Status */}
            <div>
              <label className="text-[10px] text-[#9AA3B2] uppercase mb-1 block">Trade Status</label>
              <select
                value={newTrade.status}
                onChange={e => setNewTrade(prev => ({ ...prev, status: e.target.value as any }))}
                className="w-full bg-[#131722] border border-[#2A2E39] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#CAAA98]"
              >
                <option value="OPEN" className="bg-[#1E2433]">Running Open Trade</option>
                <option value="CLOSED" className="bg-[#1E2433]">Pre-Closed Winner</option>
                <option value="STOPPED" className="bg-[#1E2433]">Stopped Loss Triggered</option>
              </select>
            </div>

            {/* Pricing Parameters Grid */}
            <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-3 bg-[#131722]/50 p-3 rounded-lg border border-[#2A2E39]/30">
              <div>
                <label className="text-[9px] text-[#9AA3B2] uppercase mb-1 block">Entry Price</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 67300"
                  value={newTrade.entryPrice}
                  onChange={e => setNewTrade(prev => ({ ...prev, entryPrice: e.target.value }))}
                  className="w-full bg-[#1E2433] border border-[#2A2E39] rounded px-3 py-1.5 text-white font-bold"
                />
              </div>

              <div>
                <label className="text-[9px] text-[#9AA3B2] uppercase mb-1 block">Stop Loss</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 66500"
                  value={newTrade.stopLoss}
                  onChange={e => setNewTrade(prev => ({ ...prev, stopLoss: e.target.value }))}
                  className="w-full bg-[#1E2433] border border-[#2A2E39] rounded px-3 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-[9px] text-[#9AA3B2] uppercase mb-1 block">Target 1 (TP)</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 69500"
                  value={newTrade.target1}
                  onChange={e => setNewTrade(prev => ({ ...prev, target1: e.target.value }))}
                  className="w-full bg-[#1E2433] border border-[#2A2E39] rounded px-3 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-[9px] text-[#9AA3B2] uppercase mb-1 block">
                  {newTrade.status === 'OPEN' ? 'Target 2 (Optional)' : 'Exit Price'}
                </label>
                {newTrade.status === 'OPEN' ? (
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 71000"
                    value={newTrade.target2}
                    onChange={e => setNewTrade(prev => ({ ...prev, target2: e.target.value }))}
                    className="w-full bg-[#1E2433] border border-[#2A2E39] rounded px-3 py-1.5 text-white"
                  />
                ) : (
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="Lock Exit Price"
                    value={newTrade.exitPrice}
                    onChange={e => setNewTrade(prev => ({ ...prev, exitPrice: e.target.value }))}
                    className="w-full bg-[#26A69A]/10 border border-[#26A69A]/50 rounded px-3 py-1.5 text-white font-extrabold focus:outline-none"
                  />
                )}
              </div>
            </div>

            {/* SLP Structural metrics */}
            <div>
              <label className="text-[10px] text-[#9AA3B2] uppercase mb-1 block">Setup Model</label>
              <select
                value={newTrade.setupType}
                onChange={e => setNewTrade(prev => ({ ...prev, setupType: e.target.value as any }))}
                className="w-full bg-[#131722] border border-[#2A2E39] rounded-lg px-3 py-2 text-white focus:outline-none"
              >
                <option value="OB_BOUNCE">Order Block Bounce</option>
                <option value="BREAKER_RETEST">Breaker Block Retest</option>
                <option value="BOS_RETEST">MSS / BOS Retest</option>
                <option value="LIQUIDITY_SWEEP">Liquidity Sweep Trigger</option>
                <option value="OTHER">Other Custom Strategy</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-[#9AA3B2] uppercase mb-1 block">Execution Session</label>
              <select
                value={newTrade.session}
                onChange={e => setNewTrade(prev => ({ ...prev, session: e.target.value as any }))}
                className="w-full bg-[#131722] border border-[#2A2E39] rounded-lg px-3 py-2 text-white focus:outline-none"
              >
                <option value="LONDON">London (AM/Europe)</option>
                <option value="NEW_YORK">New York (AM/PM US)</option>
                <option value="ASIA">Asia (Tokyo/Sydney)</option>
                <option value="OVERLAP">London/NY Overlap</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-[#9AA3B2] uppercase mb-1 block">HTF Bias</label>
              <select
                value={newTrade.bias}
                onChange={e => setNewTrade(prev => ({ ...prev, bias: e.target.value as any }))}
                className="w-full bg-[#131722] border border-[#2A2E39] rounded-lg px-3 py-2 text-white focus:outline-none"
              >
                <option value="BULLISH">BULLISH Structure Aligned</option>
                <option value="BEARISH">BEARISH Structure Aligned</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-[#9AA3B2] uppercase mb-1 block">Grade / Execution Quality</label>
              <select
                value={newTrade.grade || ''}
                onChange={e => setNewTrade(prev => ({ ...prev, grade: (e.target.value as any) || null }))}
                className="w-full bg-[#131722] border border-[#2A2E39] rounded-lg px-3 py-2 text-white focus:outline-none"
              >
                <option value="A">Grade A (Follows 4+ Confluences)</option>
                <option value="B">Grade B (Follows 3 Confluences)</option>
                <option value="C">Grade C (Sub-optimal entry / FOMO)</option>
                <option value="D">Grade D (Counter-trend rule breaking)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-[10px] text-[#9AA3B2] uppercase mb-1 block">Custom Tags (Splited by Comma)</label>
              <input
                type="text"
                placeholder="SLP, unmitigated, 1H-Shift"
                value={newTrade.tags}
                onChange={e => setNewTrade(prev => ({ ...prev, tags: e.target.value }))}
                className="w-full bg-[#131722] border border-[#2A2E39] rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-[10px] text-[#9AA3B2] uppercase mb-1 block">Execution Timeframe</label>
              <select
                value={newTrade.timeframe}
                onChange={e => setNewTrade(prev => ({ ...prev, timeframe: e.target.value }))}
                className="w-full bg-[#131722] border border-[#2A2E39] rounded-lg px-3 py-2 text-white"
              >
                <option value="1D">Daily (1D)</option>
                <option value="4H">4-Hour (4H)</option>
                <option value="1H">1-Hour (1H)</option>
                <option value="15m">15-minute (15m)</option>
                <option value="5m">5-minute (5m)</option>
              </select>
            </div>

            <div className="md:col-span-4">
              <label className="text-[10px] text-[#9AA3B2] uppercase mb-1 block">Session Journal Diary (Confluences, Thoughts, Rejection details)</label>
              <textarea
                rows={3}
                placeholder="Define why you entered here, how did price react when hitting the unmitigated structure blocks..."
                value={newTrade.notes}
                onChange={e => setNewTrade(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full bg-[#131722] border border-[#2A2E39] rounded-lg p-3 text-white placeholder-gray-600 focus:outline-none"
              />
            </div>

            <div className="md:col-span-4 flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogForm(false)}
                className="px-5 py-2 rounded-lg border border-[#2A2E39] text-[#9AA3B2] font-semibold hover:bg-[#131722] transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-lg bg-[#CAAA98] hover:bg-[#9A8678] text-[#131722] font-bold uppercase tracking-wider transition-all"
              >
                Deploy Ledger Entry
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TABBED CONTENTS SPACE */}
      {activeTab === 'LEDGER' ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* LEDGER BAR & FILTER HEADER (LEFT col span 2) */}
          <div className="xl:col-span-2 space-y-4">
            
            {/* SEARCH AND FILTERS */}
            <div className="bg-[#1E2433] rounded-xl border border-[#2A2E39] p-4 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-md">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                <input
                  type="text"
                  placeholder="Search confluences, tags, notes..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[#131722] border border-[#2A2E39] rounded-lg pl-9 pr-4 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#CAAA98]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* Status Toggle buttons */}
                <div className="flex bg-[#131722] rounded-lg border border-[#2A2E39] p-0.5 text-[10px] uppercase font-mono">
                  {(['ALL', 'OPEN', 'CLOSED', 'STOPPED'] as const).map(st => (
                    <button
                      key={st}
                      onClick={() => setFilterStatus(st)}
                      className={`px-3 py-1 rounded transition-all ${
                        filterStatus === st 
                          ? 'bg-[#CAAA98] text-[#131722] font-bold shadow-sm' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                {/* Pair select */}
                <div className="flex items-center space-x-1.5 bg-[#131722] border border-[#2A2E39] rounded-lg px-2 py-1 select-none">
                  <Filter size={11} className="text-gray-500" />
                  <select
                    value={filterPair}
                    onChange={e => setFilterPair(e.target.value)}
                    className="bg-transparent text-xs text-gray-300 font-mono focus:outline-none pr-1"
                  >
                    <option value="ALL" className="bg-[#1E2433]">All Pairs</option>
                    <option value="BTCUSDT" className="bg-[#1E2433]">BTCUSDT</option>
                    <option value="ETHUSDT" className="bg-[#1E2433]">ETHUSDT</option>
                    <option value="EURUSD" className="bg-[#1E2433]">EURUSD</option>
                    <option value="GBPUSD" className="bg-[#1E2433]">GBPUSD</option>
                  </select>
                </div>
              </div>
            </div>

            {/* LIST OF TRADES */}
            <div className="space-y-3.5">
              {filteredTrades.length === 0 ? (
                <EmptyState 
                  icon="📒" 
                  title="No ledger entries filtered" 
                  message="Try relaxing filters or add your first masterclass trade above to populate your journal." 
                />
              ) : (
                filteredTrades.map((trade) => {
                  const isTradeOpen = trade.status === 'OPEN'
                  const isWin = (trade.pnl ?? 0) > 0
                  const isStopped = trade.status === 'STOPPED'

                  return (
                    <div 
                      key={trade.id} 
                      className={`bg-[#1E2433] rounded-xl border transition-all duration-300 shadow-lg ${
                        isTradeOpen 
                          ? 'border-blue-500/30 ring-1 ring-blue-500/10' 
                          : isWin 
                            ? 'border-[#26A69A]/30 hover:border-[#26A69A]/60' 
                            : 'border-[#EF5350]/30 hover:border-[#EF5350]/60'
                      }`}
                    >
                      {/* CARD BANNER HEADER */}
                      <div className="p-4 flex flex-wrap justify-between items-start gap-3 border-b border-[#2A2E39]/30">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wide ${
                            trade.direction === 'LONG' 
                              ? 'bg-[#26A69A]/15 text-[#26A69A] border border-[#26A69A]/30' 
                              : 'bg-[#EF5350]/15 text-[#EF5350] border border-[#EF5350]/30'
                          }`}>
                            {trade.direction}
                          </span>

                          <span className="text-sm font-bold text-white font-mono">{trade.pair}</span>
                          
                          <span className="text-gray-500 font-mono text-xs">@ {trade.timeframe}</span>

                          <span className="bg-[#131722] border border-[#2A2E39] text-[#9AA3B2] font-mono text-[9px] uppercase px-2 py-0.5 rounded tracking-wider">
                            {trade.setupType.replace('_', ' ')}
                          </span>

                          {trade.grade && (
                            <span className="bg-[#CAAA98]/10 text-[#CAAA98] border border-[#CAAA98]/30 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <Award size={10} />
                              <span>Grade {trade.grade}</span>
                            </span>
                          )}
                        </div>

                        {/* STATUS BADGE / OUTCOME ACTION */}
                        <div className="flex items-center space-x-2">
                          {isTradeOpen ? (
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#1565C0] animate-pulse shadow-[0_0_8px_#1565C0]" />
                              <span className="text-[10px] font-bold text-[#1565C0] font-mono uppercase mr-2">LIVE RUNNING</span>
                              
                              {closingTradeId === trade.id ? (
                                <div className="flex items-center gap-1.5 bg-[#131722] border border-[#2A2E39] p-1.5 rounded-lg text-[10px] font-mono shadow-inner animate-in fade-in">
                                  <input 
                                    type="number"
                                    step="any"
                                    placeholder="Exit Price"
                                    value={exitPriceInput}
                                    onChange={e => setExitPriceInput(e.target.value)}
                                    className="bg-transparent text-white w-20 border-b border-gray-700 outline-none pr-1"
                                  />
                                  <button 
                                    onClick={() => handleCloseTradeSubmit(trade.id)}
                                    className="bg-[#26A69A] hover:bg-[#1E8A7F] text-slate-950 font-bold px-2 py-0.5 rounded text-[9px]"
                                  >
                                    SAVE
                                  </button>
                                  <button 
                                    onClick={() => setClosingTradeId(null)}
                                    className="text-[#9AA3B2] hover:text-white"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setClosingTradeId(trade.id)
                                    setExitPriceInput('')
                                  }}
                                  className="bg-[#26A69A]/20 hover:bg-[#26A69A] border border-[#26A69A]/30 text-[#26A69A] hover:text-slate-950 px-2.5 py-1 rounded text-[10px] font-extrabold uppercase font-mono tracking-wider transition-all duration-300"
                                >
                                  Close Trade
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 font-mono text-xs">
                              {/* RR tag completed */}
                              {trade.rrAchieved !== undefined && (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  isWin ? 'bg-[#26A69A]/10 text-[#26A69A] border-[#26A69A]/20' : 'bg-[#EF5350]/10 text-[#EF5350] border-[#EF5350]/20'
                                }`}>
                                  R:R {trade.rrAchieved >= 0 ? '+' : ''}{trade.rrAchieved.toFixed(2)}
                                </span>
                              )}

                              {/* Locked PNL percent */}
                              <span className={`font-bold font-mono text-sm ${isWin ? 'text-[#26A69A]' : 'text-[#EF5350]'}`}>
                                {isWin ? '+' : ''}${trade.pnl?.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({trade.pnlPercent?.toFixed(2)}%)
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* STATS BREAKDOWN GRID */}
                      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#131722]/30 text-xs font-mono border-b border-[#2A2E39]/20">
                        <div>
                          <span className="text-[9px] text-[#9AA3B2] block leading-none">Entry Price</span>
                          <span className="font-bold text-gray-300 block mt-1">{formatPrice(trade.entryPrice, trade.pair)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-[#9AA3B2] block leading-none">Stop Loss</span>
                          <span className="text-[#EF5350] block mt-1">{formatPrice(trade.stopLoss, trade.pair)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-[#9AA3B2] block leading-none">Target 1 profit</span>
                          <span className="text-[#26A69A] block mt-1">{formatPrice(trade.target1, trade.pair)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-[#9AA3B2] block leading-none">
                            {isTradeOpen ? 'Execution session' : 'Locked exit Price'}
                          </span>
                          <span className="font-extrabold text-white block mt-1">
                            {isTradeOpen 
                              ? trade.session 
                              : formatPrice(trade.exitPrice ?? 0, trade.pair)
                            }
                          </span>
                        </div>
                      </div>

                      {/* DIARY/JOURNAL NOTES SECTION */}
                      <div className="p-4 text-xs">
                        {editingTradeId === trade.id ? (
                          <div className="space-y-2 font-mono text-xs">
                            <textarea
                              rows={2}
                              value={editNotes}
                              onChange={e => setEditNotes(e.target.value)}
                              className="w-full bg-[#131722] border border-[#CAAA98]/40 rounded p-2 text-white outline-none"
                            />
                            <div className="flex gap-2">
                              <input 
                                type="text"
                                placeholder="Splitted tags (eg: OB, Sweep)"
                                value={editTags}
                                onChange={e => setEditTags(e.target.value)}
                                className="flex-1 bg-[#131722] border border-[#2A2E39] rounded px-2 py-1 text-white"
                              />
                              <button 
                                onClick={() => handleSaveInline(trade.id)}
                                className="bg-[#CAAA98] hover:bg-[#9A8678] text-[#131722] px-3 py-1 rounded font-bold"
                              >
                                SAVE
                              </button>
                              <button 
                                onClick={() => setEditingTradeId(null)}
                                className="text-gray-400 hover:text-white"
                              >
                                CANCEL
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex justify-between items-start gap-4">
                              <p className="text-gray-300 font-sans leading-relaxed flex-1 italic">
                                "{trade.notes || 'No notes logged for this trading session.'}"
                              </p>
                              
                              <div className="flex gap-1.5 shrink-0">
                                <button
                                  onClick={() => {
                                    setEditingTradeId(trade.id)
                                    setEditNotes(trade.notes)
                                    setEditTags(trade.tags.join(', '))
                                  }}
                                  className="text-[#9AA3B2] hover:text-[#CAAA98] transition-colors p-1"
                                  title="Edit Entry Notes"
                                >
                                  <Edit size={13} />
                                </button>
                                <button
                                  onClick={() => {
                                    if(confirm('Are you sure you want to delete this ledger entry?')) {
                                      deleteTrade(trade.id)
                                      toast.success('Ledger trade removed.')
                                    }
                                  }}
                                  className="text-red-500/60 hover:text-[#EF5350] transition-colors p-1"
                                  title="Delete Ledger Trade"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>

                            {/* Tags section container */}
                            {trade.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-3">
                                {trade.tags.map((tg, idx) => (
                                  <span key={idx} className="bg-[#141822]/80 border border-[#2A2E39]/40 text-[#CAAA98] font-mono text-[9px] px-2 py-0.5 rounded-full uppercase">
                                    #{tg}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* BOTTOM FOOTER TIMES */}
                            <div className="mt-3 pt-2.5 border-t border-[#2A2E39]/15 flex justify-between items-center text-[10px] font-mono text-gray-500">
                              <div className="flex items-center gap-1">
                                <Clock size={11} />
                                <span className="uppercase">{trade.session} SESSION</span>
                              </div>

                              <div className="flex items-center gap-3">
                                <span>IN: {new Date(trade.entryDate).toLocaleDateString()} {new Date(trade.entryDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                {trade.exitDate && (
                                  <span>OUT: {new Date(trade.exitDate).toLocaleDateString()} {new Date(trade.exitDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  )
                })
              )}
            </div>

          </div>

          {/* SIDEBAR ANALYSIS CARDS (RIGHT COLUMN) */}
          <div className="space-y-4">
            
            {/* INSTRUCTIONS GUIDE CARD */}
            <div className="bg-[#1E2433] border border-[#CAAA98]/20 rounded-xl p-5 shadow-lg">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#CAAA98] mb-3 flex items-center gap-1.5">
                <Sparkles size={14} />
                Masterclass SMS Rules
              </h3>

              <div className="space-y-3.5 text-xs text-gray-300 leading-relaxed font-sans">
                <div className="flex gap-2">
                  <span className="text-[#CAAA98] font-mono font-bold">01.</span>
                  <p><strong>Establish high timeframe bias:</strong> Do not enter against the daily/4H trend order flow direction.</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-[#CAAA98] font-mono font-bold">02.</span>
                  <p><strong>Unmitigated zones:</strong> Prioritize order blocks that have of never been tapped by prior wick sweeps.</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-[#CAAA98] font-mono font-bold">03.</span>
                  <p><strong>LTF Confirmation:</strong> Shift of Market Structure (MSS) on lower timeframes must see a body close, not wick.</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-[#CAAA98] font-mono font-bold">04.</span>
                  <p><strong>Grade quality metrics:</strong> Honestly tag Counter-trend entries as Grade C/D to understand leak streaks.</p>
                </div>
              </div>
            </div>

            {/* PERFORMANCE PILLS OUTLINE */}
            <div className="bg-[#1E2433] border border-[#2A2E39] rounded-xl p-5 space-y-4 shadow-lg">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 mb-1">
                <Clock size={14} className="text-[#CAAA98]" />
                Best setups summary
              </h3>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center p-2 rounded bg-[#131722]/50 border border-gray-800">
                  <span className="text-gray-500 uppercase text-[9px] block">Best Pair Yields:</span>
                  <span className="font-extrabold text-[#CAAA98]">{stats.bestPair}</span>
                </div>

                <div className="flex justify-between items-center p-2 rounded bg-[#131722]/50 border border-gray-800">
                  <span className="text-gray-500 uppercase text-[9px] block">Best session block:</span>
                  <span className="font-extrabold text-[#CAAA98]">{stats.bestSession}</span>
                </div>

                <div className="flex justify-between items-center p-2 rounded bg-[#131722]/50 border border-gray-800">
                  <span className="text-gray-500 uppercase text-[9px] block">Best setup Type:</span>
                  <span className="font-extrabold text-[#CAAA98]">{stats.bestSetup.replace('_', ' ')}</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      ) : (
        
        // PERFORMANCE ANALYTICS TAB DESIGN
        <div className="space-y-6 animate-in fade-in duration-300">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* SETUP BREAKDOWN */}
            <div className="bg-[#1E2433] border border-[#2A2E39] rounded-xl p-5 shadow-lg">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#CAAA98] mb-4 flex items-center gap-1.5 border-b border-[#2A2E39]/40 pb-2">
                <Layers size={14} />
                Breakdown by Setup Type
              </h3>

              {Object.keys(setupCounts).length === 0 ? (
                <EmptyState 
                  icon="🔍" 
                  title="No closed trades" 
                  message="Metrics will be calculated as soon as you record closed trade setups in your ledger." 
                />
              ) : (
                <div className="space-y-4">
                  {Object.entries(setupCounts).map(([setup, info]) => {
                    const winPercent = info.total > 0 ? (info.win / info.total) * 100 : 0
                    const pnlColor = info.pnl >= 0 ? 'text-[#26A69A]' : 'text-[#EF5350]'
                    
                    return (
                      <div key={setup} className="space-y-1.5 font-mono text-xs">
                        <div className="flex justify-between font-bold text-gray-200">
                          <span>{setup.replace('_', ' ')}</span>
                          <span className={pnlColor}>{info.pnl >= 0 ? '+' : ''}${info.pnl.toLocaleString()}</span>
                        </div>
                        
                        <div className="flex justify-between text-[10px] text-gray-400">
                          <span>Total: {info.total} ({info.win}W - {info.loss}L)</span>
                          <span>Win Rate: {winPercent.toFixed(0)}%</span>
                        </div>

                        {/* Custom SVG/CSS Bar */}
                        <div className="w-full bg-[#131722] rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-[#26A69A] h-full" 
                            style={{ width: `${winPercent}%` }} 
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* SESSION BREAKDOWN */}
            <div className="bg-[#1E2433] border border-[#2A2E39] rounded-xl p-5 shadow-lg">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#CAAA98] mb-4 flex items-center gap-1.5 border-b border-[#2A2E39]/40 pb-2">
                <Clock size={14} />
                Breakdown by Trading Session
              </h3>

              {Object.keys(sessionCounts).length === 0 ? (
                <EmptyState 
                  icon="⏰" 
                  title="No session data" 
                  message="Hourly session distributions will appear once trade entries are finalized." 
                />
              ) : (
                <div className="space-y-4">
                  {Object.entries(sessionCounts).map(([sess, info]) => {
                    const winPercent = info.total > 0 ? (info.win / info.total) * 100 : 0
                    const pnlColor = info.pnl >= 0 ? 'text-[#26A69A]' : 'text-[#EF5350]'

                    return (
                      <div key={sess} className="space-y-1.5 font-mono text-xs">
                        <div className="flex justify-between font-bold text-gray-200">
                          <span>{sess} SESSION</span>
                          <span className={pnlColor}>{info.pnl >= 0 ? '+' : ''}${info.pnl.toLocaleString()}</span>
                        </div>
                        
                        <div className="flex justify-between text-[10px] text-gray-400">
                          <span>Total: {info.total} ({info.win}W - {info.loss}L)</span>
                          <span>Win Rate: {winPercent.toFixed(0)}%</span>
                        </div>

                        {/* Custom SVG/CSS Bar */}
                        <div className="w-full bg-[#131722] rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-[#EF5350] h-full" 
                            style={{ width: `${winPercent}%`, backgroundColor: '#26A69A' }} 
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* PAIR BREAKDOWN */}
            <div className="bg-[#1E2433] border border-[#2A2E39] rounded-xl p-5 shadow-lg">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#CAAA98] mb-4 flex items-center gap-1.5 border-b border-[#2A2E39]/40 pb-2">
                <Target size={14} />
                Breakdown by Asset Instrument
              </h3>

              {Object.keys(pairCounts).length === 0 ? (
                <EmptyState 
                  icon="📈" 
                  title="No asset analytics" 
                  message="Instrument-specific performance metrics will appear here once trades are registered." 
                />
              ) : (
                <div className="space-y-4">
                  {Object.entries(pairCounts).map(([pair, info]) => {
                    const winPercent = info.total > 0 ? (info.win / info.total) * 100 : 0
                    const pnlColor = info.pnl >= 0 ? 'text-[#26A69A]' : 'text-[#EF5350]'

                    return (
                      <div key={pair} className="space-y-1.5 font-mono text-xs">
                        <div className="flex justify-between font-bold text-gray-200">
                          <span>{pair}</span>
                          <span className={pnlColor}>{info.pnl >= 0 ? '+' : ''}${info.pnl.toLocaleString()}</span>
                        </div>
                        
                        <div className="flex justify-between text-[10px] text-gray-400">
                          <span>Total: {info.total} ({info.win}W - {info.loss}L)</span>
                          <span>Win Rate: {winPercent.toFixed(0)}%</span>
                        </div>

                        {/* Custom SVG/CSS Bar */}
                        <div className="w-full bg-[#131722] rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-[#26A69A] h-full" 
                            style={{ width: `${winPercent}%` }} 
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>

          {/* HISTORICAL P&L CHART ACCUMULATOR */}
          <div className="bg-[#1E2433] border border-[#2A2E39] rounded-xl p-5 shadow-lg">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-4 block">
              Cumulative Growth Curve Trend
            </h3>

            {/* Quick custom graphical vector display of closed performance stats */}
            <div className="bg-[#131722] rounded-lg p-6 border border-gray-800/60 flex flex-col md:flex-row gap-6 items-center justify-between font-mono">
              <div className="space-y-2">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Closed Profit Factor analysis:</span>
                <p className="text-xs text-[#E0E3EB]">
                  Your trading has generated <strong className="text-[#26A69A]">{trades.filter(t => t.status !== 'OPEN' && (t.pnl ?? 0) > 0).length} wins</strong> out of{' '}
                  <strong className="text-white">{trades.filter(t => t.status !== 'OPEN').length} total setup entries</strong>. 
                  The average profitable trade returned <strong className="text-[#26A69A]">${stats.avgWin.toFixed(2)}</strong> while average failure costed <strong className="text-[#EF5350]">${stats.avgLoss.toFixed(2)}</strong>.
                </p>
                <div className="flex gap-4 pt-2 text-[10px] text-[#9AA3B2]">
                  <div>Largest Win: <span className="text-[#26A69A] font-bold">+${stats.largestWin.toLocaleString()}</span></div>
                  <div>Largest Loss: <span className="text-[#EF5350] font-bold">-${Math.abs(stats.largestLoss).toLocaleString()}</span></div>
                </div>
              </div>

              {/* Graphic SVG Gauge representing performance */}
              <div className="w-32 h-32 relative shrink-0">
                <svg className="w-full h-full" viewBox="0 0 36 36">
                  {/* Background Circle */}
                  <path
                    className="text-[#1E2433]"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Filled Performance Circle */}
                  <path
                    className="text-[#26A69A]"
                    strokeDasharray={`${stats.winRate}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-sm font-extrabold text-white leading-none">{stats.winRate.toFixed(0)}%</span>
                  <span className="text-[8px] text-gray-500 uppercase font-bold mt-1">RATE</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

    </div>
  )
}
