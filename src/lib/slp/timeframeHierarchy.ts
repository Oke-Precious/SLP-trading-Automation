export const TIMEFRAME_ORDER = [
  '1w', '1d', '4h', '1h', '30m', '15m', '5m', '1m'
] as const;

export type Timeframe = typeof TIMEFRAME_ORDER[number];

export function isHigherTimeframe(tf1: Timeframe, tf2: Timeframe): boolean {
  return TIMEFRAME_ORDER.indexOf(tf1) < TIMEFRAME_ORDER.indexOf(tf2);
}

// Suggests sensible LTF options for a given HTF selection
export function getSuggestedLTFs(htf: Timeframe): Timeframe[] {
  const htfIndex = TIMEFRAME_ORDER.indexOf(htf);
  // Return the 2-3 timeframes immediately below the HTF
  return TIMEFRAME_ORDER.slice(htfIndex + 1, htfIndex + 4) as unknown as Timeframe[];
}

// Validates a user-selected HTF/LTF pair
export function isValidPairing(htf: Timeframe, ltf: Timeframe): boolean {
  return isHigherTimeframe(htf, ltf);
}

export interface TimeframePair {
  htf: Timeframe;   // where bias/zones are marked
  ltf: Timeframe;   // where entry confirmation happens
}
