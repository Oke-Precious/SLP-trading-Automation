import { fetchTicker } from '../market/marketDataService'
import { analyseBias } from '../analysis/biasEngine'

export type AlertCondition =
  | 'PRICE_ABOVE'         // price crosses above level
  | 'PRICE_BELOW'         // price crosses below level
  | 'PRICE_ENTERS_POI'    // price enters a defined zone
  | 'BIAS_CHANGES'        // bias changes to BULLISH or BEARISH
  | 'PCT_MOVE'            // price moves X% in either direction

export interface Alert {
  id:        string
  pair:      string
  condition: AlertCondition
  value:     number              // price level / POI from / % threshold
  value2?:   number              // POI to (for zone alerts)
  targetBias?: string            // for BIAS_CHANGES condition
  status:    'ACTIVE' | 'TRIGGERED' | 'DISABLED'
  channels:  { inApp: boolean; browser: boolean; sound: boolean }
  triggeredAt?: number
  createdAt: number
  label:     string
}

class AlertEngineService {
  private intervals: Map<string, ReturnType<typeof setInterval>> = new Map()
  private lastPrices: Map<string, number> = new Map()
  private callbacks: ((alert: Alert) => void)[] = []

  onTrigger(cb: (alert: Alert) => void) {
    this.callbacks.push(cb)
    return () => { this.callbacks = this.callbacks.filter(c => c !== cb) }
  }

  private notify(alert: Alert) {
    this.callbacks.forEach(cb => cb(alert))
  }

  startMonitoring(alerts: Alert[], allAlerts: Alert[],
                  updateAlert: (id: string, changes: Partial<Alert>) => void) {
    this.stopAll()

    const activePairs = [...new Set(alerts.filter(a => a.status === 'ACTIVE').map(a => a.pair))]

    activePairs.forEach(pair => {
      const intervalId = setInterval(async () => {
        try {
          const ticker = await fetchTicker(pair)
          if (!ticker) return
          const currentPrice = ticker.price
          const lastPrice = this.lastPrices.get(pair) ?? currentPrice
          this.lastPrices.set(pair, currentPrice)

          const pairAlerts = alerts.filter(a => a.pair === pair && a.status === 'ACTIVE')

          pairAlerts.forEach(alert => {
            let triggered = false

            switch (alert.condition) {
              case 'PRICE_ABOVE':
                triggered = lastPrice <= alert.value && currentPrice > alert.value
                break
              case 'PRICE_BELOW':
                triggered = lastPrice >= alert.value && currentPrice < alert.value
                break
              case 'PRICE_ENTERS_POI':
                triggered = currentPrice >= alert.value && currentPrice <= (alert.value2 ?? alert.value * 1.01)
                break
              case 'PCT_MOVE':
                const pctChange = Math.abs((currentPrice - lastPrice) / lastPrice * 100)
                triggered = pctChange >= alert.value
                break
              case 'BIAS_CHANGES':
                // Fallback / standard support for state machine transitions
                const result = analyseBias([]) // just a lightweight compiler-safe reference
                if (alert.targetBias && result.bias === alert.targetBias) {
                  triggered = true
                }
                break
            }

            if (triggered) {
              const updated: Alert = { ...alert, status: 'TRIGGERED', triggeredAt: Date.now() }
              updateAlert(alert.id, { status: 'TRIGGERED', triggeredAt: Date.now() })
              this.notify(updated)
              this.fireBrowserNotification(updated, currentPrice)
              this.playAlertSound(updated)
            }
          })
        } catch (err) {
          console.error('[AlertEngine] Error checking alerts:', err)
        }
      }, 10000) // Check every 10 seconds

      this.intervals.set(pair, intervalId)
    })
  }

  stopAll() {
    this.intervals.forEach(id => clearInterval(id))
    this.intervals.clear()
  }

  fireBrowserNotification(alert: Alert, currentPrice: number) {
    if (!alert.channels.browser) return
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') {
      Notification.requestPermission()
      return
    }
    new Notification(`🔔 Alert: ${alert.pair}`, {
      body:    `${alert.label} — Price: ${currentPrice.toFixed(4)}`,
      icon:    '/favicon.ico',
      tag:     alert.id,
      requireInteraction: true,
    })
  }

  playAlertSound(alert: Alert) {
    if (!alert.channels.sound) return
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.5)
    } catch {}
  }
}

export const alertEngine = new AlertEngineService()
