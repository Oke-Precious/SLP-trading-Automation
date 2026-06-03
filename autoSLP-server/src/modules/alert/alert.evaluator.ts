export enum AlertType {
  PRICE_ENTERS_POI = 'PRICE_ENTERS_POI',
  BIAS_CHANGE = 'BIAS_CHANGE',
  MSS_DETECTED = 'MSS_DETECTED',
  PRICE_LEVEL_ABOVE = 'PRICE_LEVEL_ABOVE',
  PRICE_LEVEL_BELOW = 'PRICE_LEVEL_BELOW',
  SIGNAL_CREATED = 'SIGNAL_CREATED',
  PERCENTAGE_MOVE = 'PERCENTAGE_MOVE'
}

export enum AlertStatus {
  ACTIVE = 'ACTIVE',
  TRIGGERED = 'TRIGGERED',
  DISABLED = 'DISABLED',
  EXPIRED = 'EXPIRED'
}

export interface EvaluatableAlert {
  id: string;
  pair: string;
  condition: any;
  value: any; // { price?: number, poiFrom?: number, poiTo?: number, level?: number }
  status: AlertStatus;
  channels: any;
}

export interface TriggeredAlertResult {
  alertId: string;
  triggered: boolean;
  message: string;
}

export function evaluateAlertConditions(
  latestPrice: number,
  newBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL',
  storedBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL',
  alert: EvaluatableAlert,
  newSignalCreatedForPair: boolean
): TriggeredAlertResult {
  const result: TriggeredAlertResult = {
    alertId: alert.id,
    triggered: false,
    message: ''
  };

  if (alert.status !== 'ACTIVE') {
    return result;
  }

  switch (alert.condition as any) {
    case 'PRICE_ENTERS_POI': {
      const from = parseFloat(alert.value?.poiFrom || '0');
      const to = parseFloat(alert.value?.poiTo || '0');
      if (from > 0 && to > 0 && latestPrice >= from && latestPrice <= to) {
        result.triggered = true;
        result.message = `Price enters POI zone [${from} - ${to}]. Custom alert triggered.`;
      }
      break;
    }

    case 'BIAS_CHANGE': {
      if (newBias !== storedBias) {
        result.triggered = true;
        result.message = `Structural market trend changed from ${storedBias} to ${newBias} on currency pair ${alert.pair}.`;
      }
      break;
    }

    case 'MSS_DETECTED': {
      if (newSignalCreatedForPair) {
        result.triggered = true;
        result.message = `A fresh Market Structure Shift (MSS) signal was identified on pair ${alert.pair}.`;
      }
      break;
    }

    case 'PRICE_LEVEL': {
      const targetLevel = parseFloat(alert.value?.level || '0');
      const crossedUp = latestPrice >= targetLevel; // Standard target crossing check
      if (targetLevel > 0 && crossedUp) {
        result.triggered = true;
        result.message = `Price crossed custom level target of ${targetLevel} at ${latestPrice}.`;
      }
      break;
    }
  }

  return result;
}
