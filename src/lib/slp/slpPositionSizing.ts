export type InstrumentCategory =
  | 'FOREX_USD' | 'FOREX_JPY' | 'COMMODITY' | 'CRYPTO' | 'INDEX'

export interface PositionSizeInput {
  accountBalance: number
  riskPercent:    number    // e.g. 1 for 1%
  entryPrice:     number
  stopLossPrice:  number
  symbol:         string
  category:       InstrumentCategory
}

export interface PositionSizeResult {
  riskAmountUSD:      number
  slDistance:         number   // raw price difference
  slPips:             number   // converted to pips/points per category
  pipValueConstant:   number   // 6.62 (JPY) or 10 (USD/commodity)
  lotSize:            number   // raw calculated value
  lotSizeRounded:     number   // rounded DOWN to nearest 0.01 lot (never round up risk)
  formula:            string   // human-readable formula with real numbers plugged in
  warning:            string | null
}

export interface TradeProjection {
  positionSize:        PositionSizeResult
  rrRatio:             number
  potentialLossUSD:    number
  potentialProfitUSD:  number
}

export function getInstrumentCategory(symbol: string): InstrumentCategory {
  const CRYPTO = ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','ADAUSDT','DOGEUSDT','AVAXUSDT']
  const JPY    = ['USDJPY','GBPJPY','EURJPY','AUDJPY','CHFJPY','CADJPY','NZDJPY']
  const COMMODITY = ['XAUUSD','XAGUSD','USOIL','UKOIL']
  const INDEX  = ['US30','SPX500','NAS100']

  const upperSymbol = symbol.toUpperCase()
  if (CRYPTO.includes(upperSymbol))     return 'CRYPTO'
  if (JPY.includes(upperSymbol))        return 'FOREX_JPY'
  if (COMMODITY.includes(upperSymbol))  return 'COMMODITY'
  if (INDEX.includes(upperSymbol))      return 'INDEX'
  return 'FOREX_USD'   // default: EURUSD, GBPUSD, AUDUSD, USDCAD, USDCHF, NZDUSD
}

function getPipSize(category: InstrumentCategory): number {
  switch (category) {
    case 'FOREX_JPY':  return 0.01
    case 'FOREX_USD':  return 0.0001
    default:           return 0.0001
  }
}

export function calculatePositionSize(
  input: PositionSizeInput
): PositionSizeResult {
  const { accountBalance, riskPercent, entryPrice, stopLossPrice, category } = input

  const riskAmountUSD = accountBalance * (riskPercent / 100)
  const slDistance     = Math.abs(entryPrice - stopLossPrice)

  let lotSize: number
  let formula: string
  let pipValueConstant: number
  let slPips: number

  if (category === 'FOREX_JPY') {
    slPips = slDistance / getPipSize('FOREX_JPY')
    pipValueConstant = 6.62
    lotSize = riskAmountUSD / pipValueConstant / (slPips || 0.00001)
    formula =
      `Lot Size = Risk(USD) ÷ 6.62 ÷ SL(pips) = ` +
      `${riskAmountUSD.toFixed(2)} ÷ 6.62 ÷ ${slPips.toFixed(1)} = ${lotSize.toFixed(4)}`
  }

  else if (category === 'FOREX_USD') {
    slPips = slDistance / getPipSize('FOREX_USD')
    pipValueConstant = 10
    lotSize = riskAmountUSD / pipValueConstant / (slPips || 0.00001)
    formula =
      `Lot Size = Risk(USD) ÷ 10 ÷ SL(pips) = ` +
      `${riskAmountUSD.toFixed(2)} ÷ 10 ÷ ${slPips.toFixed(1)} = ${lotSize.toFixed(4)}`
  }

  else if (category === 'COMMODITY') {
    const displayedSL = slDistance
    pipValueConstant = 10
    slPips = displayedSL * 10
    lotSize = riskAmountUSD / pipValueConstant / (slPips || 0.00001)
    formula =
      `Lot Size = Risk(USD) ÷ 10 ÷ (Displayed SL × 10) = ` +
      `${riskAmountUSD.toFixed(2)} ÷ 10 ÷ (${displayedSL.toFixed(2)} × 10) = ${lotSize.toFixed(4)}`
  }

  else {
    // CRYPTO / INDEX — not covered by the course's forex/commodity
    // formulas. Use a clearly-labeled generic risk-based sizing as
    // a fallback rather than silently applying a forex formula that
    // does not apply to this instrument type.
    slPips = slDistance
    pipValueConstant = 1
    lotSize = riskAmountUSD / (slDistance || 0.00001)
    formula =
      `[NOT COVERED BY SLP COURSE FORMULAS] Generic sizing: ` +
      `Risk(USD) ÷ SL(price distance) = ${riskAmountUSD.toFixed(2)} ÷ ${slDistance.toFixed(4)}`
  }

  // Round DOWN to the nearest 0.01 lot — never round up, since that
  // would risk more than the user specified.
  const lotSizeRounded = Math.floor(lotSize * 100) / 100

  let warning: string | null = null
  if (!isFinite(lotSize) || lotSizeRounded <= 0 || slDistance === 0) {
    warning =
      'Calculated lot size is zero or invalid. Check that entry and stop-loss ' +
      'prices are different, and that risk amount is greater than zero.'
  } else if (lotSizeRounded > 50) {
    warning =
      'Calculated lot size is unusually large. Double-check account balance ' +
      'and risk percentage — this may indicate an input error.'
  } else if (lotSizeRounded < 0.01 && lotSize > 0) {
    warning =
      'Calculated lot size rounds down to 0.00 lots at your broker\'s minimum ' +
      'increment. Consider reducing your stop-loss distance or increasing ' +
      'risk percentage, within your risk tolerance.'
  }

  return {
    riskAmountUSD, slDistance, slPips, pipValueConstant,
    lotSize, lotSizeRounded, formula, warning,
  }
}

export function calculatePositionSizeForSignal(
  accountBalance: number,
  riskPercent:    number,
  entryPrice:     number,
  stopLossPrice:  number,
  symbol:         string
): PositionSizeResult {
  const category = getInstrumentCategory(symbol)
  return calculatePositionSize({
    accountBalance, riskPercent, entryPrice, stopLossPrice, symbol, category,
  })
}

export function projectTradeOutcome(
  positionSize:    PositionSizeResult,
  entryPrice:      number,
  stopLossPrice:   number,
  takeProfitPrice: number
): TradeProjection {
  const riskDistance   = Math.abs(entryPrice - stopLossPrice)
  const rewardDistance = Math.abs(takeProfitPrice - entryPrice)
  const rrRatio = riskDistance > 0
    ? parseFloat((rewardDistance / riskDistance).toFixed(2))
    : 0

  return {
    positionSize,
    rrRatio,
    potentialLossUSD:   parseFloat(positionSize.riskAmountUSD.toFixed(2)),
    potentialProfitUSD: parseFloat((positionSize.riskAmountUSD * rrRatio).toFixed(2)),
  }
}
