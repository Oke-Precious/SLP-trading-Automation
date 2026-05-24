import { Persona } from '../types';

export const TRADER_PERSONAS: Persona[] = [
  {
    name: 'Marcus "SMC Pure" Vance',
    age: 32,
    experience: 'Professional Prop Trader (7+ Years)',
    markets: ['Forex (EURUSD, GBPUSD)', 'Gold (XAUUSD)', 'Indices (US30)'],
    workflow: [
      'Pre-Session (06:30 UTC): Conducts rigorous top-down analysis on Daily and 4H timeframes to establish high-timeframe order flow.',
      'Session Opening (London/NY Overlap): Wait for price to sweep Asian session high/low liquidity.',
      'Execution: Drops down to 1H and 15m to identify precise Order Blocks and Breaker Blocks. Enters long/short after Market Structure Shift (MSS).',
      'Post-Session: Logs performance metrics, reviews slip margins, and archives screenshots.'
    ],
    painPoints: [
      'Manual Drawing Overhead: Constantly drawing and refining 15m/1H OB/BB zones on TradingView leads to mental fatigue.',
      'Ancient Terminal UI: MetaTrader 4/5 lacks aesthetic cohesion and advanced multi-timeframe dashboard overlays.',
      'Alert Fragmentation: Third-party SMS/Webhook setups have latency, causing him to miss rapid sweeps of key liquidity.'
    ],
    keyFeatures: [
      'Automated Multi-Timeframe Directional Bias Matrix',
      'Sleek visual indicator overlays (HH/HL/LH/LL swings)',
      'Sub-millisecond POI crossing triggers via clean side panel alerts'
    ],
    device: '34" Alienware Ultra-Wide Monitor (3440 x 1440) + 16" Apple MacBook Pro M3 Max',
    literacy: 'Expert (Writes custom PineScript files, executes trades via API connectors)'
  },
  {
    name: 'Chloe "Crypto-Sniper" Chen',
    age: 25,
    experience: 'Semi-Professional Swing/Scalp Trader (3 Years)',
    markets: ['Crypto (BTCUSDT, ETHUSDT, SOLUSDT)', 'High-volume Altcoins'],
    workflow: [
      'Monitoring: Keeps a multi-pair heatmap open on second screen to spot immediate momentum shifts.',
      'Filtering: Filters out low-timeframe noise by ensuring 4H/1H structure is strictly bullish before snipy entries.',
      'Trade Execution: Wait for price to touch the custom-labeled "POI - 1" order block. Checks lower TF volume surge.',
      'Risk Management: Uses strict R:R targets (minimum 1:3). Relies heavily on push notifications to manage positions on-the-go.'
    ],
    painPoints: [
      'Mobile Desynchronization: Existing mobile charts are cramped and do not display critical POI structures clearly.',
      'FOMO & Over-trading: Tends to buy mid-range without confirmation because of the lack of a structured trading plan.',
      'Chart Lag: Too many custom indicators crash her mobile trading browser during high volatility events.'
    ],
    keyFeatures: [
      'Step-by-step interactive Trading Plan panel (visual guide checklist)',
      'Real-time heatmaps & Recent Signals tracker',
      'Ultra-responsive mobile layout with scrollable tabs'
    ],
    device: '12.9" iPad Pro (M2) with Apple Pencil + iPhone 15 Pro Max',
    literacy: 'Moderate (Active Discord/Telegram alpha reader, heavy user of browser extension wallets)'
  },
  {
    name: 'David "Systematic" Miller',
    age: 44,
    experience: 'Part-Time Corporate Executive & Swing Trader (12 Years)',
    markets: ['US Equities (AAPL, TSLA, MSFT)', 'Broad Market ETFs (SPY, QQQ)'],
    workflow: [
      'End of Day (21:30 UTC): Scans high timeframe daily/weekly charts to spot breaker blocks.',
      'Planning: Formulates trade plans for the following morning. Places passive limit/mitigation orders.',
      'Weekly Checklist: Performs systematic backtesting of SMC structural rules over the weekend to measure strategy expectancy.',
      'Reflecting: Evaluates trade journals to detect repeating psychological errors (e.g. cutting winners short).'
    ],
    painPoints: [
      'Discipline Pitfalls: Off-hours planning goes blank during market hours due to intense emotional swings.',
      'Disjointed Journaling: Uses spreadsheets separate from charting software, making trade tracking manual and annoying.',
      'Lack of Structure Tracking: Misses structural transitions (reversals) because he cannot constantly check charts.'
    ],
    keyFeatures: [
      'Deeply integrated Trade Journal with structural performance mapping',
      'Dedicated Backtesting strategy matrix utility',
      'HTF POI Map displaying Active, Tested, and Mitigated blocks'
    ],
    device: 'Dual 27" Dell Ultrasharp 4K Displays + Custom Windows Workstation',
    literacy: 'Low-to-Moderate (Excel-heavy expert, prefers fully codified visual interfaces that do not require script scripting)'
  }
];

export const DESIGN_SPECIFICATION_MARKDOWN = `# AutoSLP — Design & Architecture Specification
**Version 1.2 (Revised: May 2026)**
**Role:** Senior Product Designer & SMC Architectural Lead

---

## 1. Product Overview & Core Thesis
AutoSLP is a high-performance, algorithmic trading dashboard built around **Smart Money Concepts (SMC)**. The core thesis revolves around three pillars of professional-grade market execution:
1. **Structure (MS / MSS / BOS):** Dissecting high-timeframe swing points (HH/HL/LH/LL) to dictate directional bias.
2. **Liquidity (BSL / SSL):** Pinpointing buy-side and sell-side liquidity pools where retail stops reside.
3. **Points of Interest (POIs):** Establishing price zones (Order Blocks, Breaker Blocks) that present premier risk-to-reward entries.

---

## 2. Technical Typography & Color Palette
To maintain extreme cognitive focus and visual clarity during high-stress trading sessions, AutoSLP utilizes a specialized, low-brightness **Marine Dark Theme**:

### Color Palette Definitions
| Token Name | Hex Code | Usage | Tailwind Class |
| :--- | :--- | :--- | :--- |
| **Background Dark** | \`#111622\` | Primary workspace backplate | \`bg-[#111622]\` |
| **Panel Surface** | \`#1A1F2C\` | Quadrant containers, cards, dropdowns | \`bg-[#1A1F2C]\` |
| **Sidebar Navy** | \`#202940\` | Navigation rail background | \`bg-[#202940]\` |
| **Header Slate** | \`#1E2433\` | Sticky supreme top control bar | \`bg-[#1E2433]\` |
| **Cool Accent** | \`#CAAA98\` | Active lines, borders, fine typography details | \`text-[#CAAA98]\` |
| **Bullish Tint** | \`#26A69A\` | Buy structures, active OBs, long signals | \`text-[#26A69A]\` / \`bg-[#26A69A]\` |
| **Bearish Tint** | \`#EF5350\` | Sell structures, active BBs, short signals | \`text-[#EF5350]\` / \`bg-[#EF5350]\` |
| **Neutral Border**| \`#2A2E39\` | Horizontal rule borders, segment dividers | \`border-[#2A2E39]\` |

### Font Hierarchies
- **Primary Body Font:** *Inter* (\`font-sans\`). Highly readable at 11-13px, balanced kerning.
- **Display Typography:** *Space Grotesk* (\`font-display\`). Gives a tech-forward look for headers, titles, and stats.
- **Data & Numbers:** *JetBrains Mono* (\`font-mono\`). Strict mono-spacing for prices, logs, coordinates, and statistics.

---

## 3. Persistent Left Sidebar (Part B)
- **Widths:** Collapsed at \`64px\`, expanding to \`220px\` on hover (smooth \`200ms ease-in-out\` transition).
- **Page Ordering:**
  1. **Dashboard** (Home Icon) - Core 4-quadrant screen.
  2. **Market Overview** (Grid Icon) - Multi-pair liquidity/structural matrix heatmap.
  3. **Directional Bias** (Compass Icon) - HTF bias charts and matrices for major Forex/Crypto pairs.
  4. **POI Map** (Layers Icon) - Unified map and dashboard of active Breaker and Order Blocks.
  5. **Trade Setups** (Target Icon) - Active setups, entries, stop-loss ratios in Kanban board format.
  6. **Positions** (Briefcase Icon) - Historical orders and current active executions.
  7. **Alerts** (Bell Icon) - Configured structural limits and alarm thresholds.
  8. **Backtest** (Bar Chart Icon) - Historical rule backtesting matrices.
  9. **Journal** (Book Open Icon) - Trade performance stats, calendar views, diaries.
  10. **Settings** (Settings Icon) - API coordinates, subscription, preferences.
- **Aesthetic Elements:** Bottom displays a clean user card containing **Pro Plan Badge** and circular avatar.

---

## 4. Top Header Supreme (Part C)
Fixed at vertical height \`48px\`. Integrates:
- **Logo:** SLP TRADER with a sub-caption "Directional Bias System".
- **Selector Dropdown:** Shows current active asset with exchange origin (e.g., \`Binance: BTCUSDT\`).
- **Timeframe Selector:** Pill structure presenting \`1D\`, \`4H\`, \`1H\`, \`30m\`, \`15m\`.
- **System Clocks:** Shows UTC real-time display.
- **Bias Badge:** Displays a high-contrast pill showing \`BULLISH BIAS\` (\`#26A69A\`) or \`BEARISH BIAS\` (\`#EF5350\`).

---

## 5. Main Dashboard Layout — The 4 Quadrants (Part D)
Designed specifically for massive, multi-dimensional information retrieval:

### Quadrant 1 (Top Left, 65% Main Canvas)
**The Live Candlestick & Structural Chart Canvas:**
- Core candle body rendering.
- **Automated swing indicators:** Places green \`HH\`/\`HL\` nodes below bullish pivots and red \`LH\`/\`LL\` nodes above bearish pivots.
- **Zone Boundaries:** Overlaying order blocks as semi-transparent green boxes (\`#26A69A\` at \`15%\` opacity) and breaker blocks as blue boxes (\`#1565C0\` at \`15%\` opacity).
- **Volume Indicator:** Translucent bottom histogram aligned with standard candles.

### Quadrant 2 (Top Right, 35% Panel)
**Interactive Session Trading Plan:**
- Structured step checklist mapping from Top-Down Analysis down to lower timeframe executions.
- Underneath resides the **Active Signal Card** showing precise Entry, SL, TP1, and TP2 targets in monospace font with a large "View Setup" call to action.

### Quadrant 3 (Bottom Left, 45% Card)
**Market Summary Engine:**
- Outlines the trend strength, structural phases (Impulse vs. Correction), next major expected market structure shift, and structural legend nodes (OB/BB).

### Quadrant 4 (Bottom Right, 55% Card)
Split vertically into:
- **Left Panel:** HTF POI Map listing precise Active, Mitigated, and Tested blocks with prices.
- **Right Panel:** Recent Signals list with P&L performance.

---

## 6. Interactive State Matrix & Accessibility
- **Transitions:** Full CSS transition support on hover actions.
- **Keyboard Maps:** Supports \`cmd+K\` for immediate search overlay, and \`Escape\` to close any dialog or menu.
- **Skeletal Shimmers:** All widgets support custom glowing gradient shimmers during simulated data hydration.
- **Contrast Ratios:** Maintained above the strict WCAG gold rating of \`4.5:1\` to prevent visual fatigue under dark environments.

---

## 7. The Core SLP Strategy Blueprint (Video Masterclass Rules)
This masterclass section codifies the strict mechanical rules derived from our advanced strategy sessions:
1. **Market Structure Dynamics**: Price moves in three patterns: Uptrends (HH + HL series), Downtrends (LH + LL series), or Ranging.
2. **Reversals vs. Continuations**: Reversals are infrequent. AutoSLP prioritizes high-probability continuation setups aligned with the macro trend.
3. **Establish HTF Bias**: Derived once from Daily or 4H charts. Stay aligned with this bias for days/weeks until structurally invalidated.
4. **Mark HTF Points of Interest (POIs)**: Identify unmitigated Daily/4H Order Blocks (OB) and Breaker Blocks (BB) representing supply/demand bounds.
5. **Wait for Corrective Retracement**: Let price pull back into the HTF POI. Avoid early FOMO entries inside premium zones.
6. **Lower Timeframe (LTF) Reversal Confirmation**: Check H1, 30m, or 15m. Look for a Market Structure Shift (MSS) and a valid Inducement.
7. **Strict Inducement Rule**: Inducement is ONLY valid when there is a body close beyond the structure shift zone. A simple wick sweep is NO confirmation. Entry is placed at the closest unmitigated POI inside the LTF structure.
8. **DBOS Continuation scale-in**: Once the main reversal confirms and the trend starts, use Double Breaker Structures (DBOS) for continuation enters.
9. **Targeting Rule**: Take Profit is set at logical liquidity bounds—the next swing Higher High (HH) in uptrends, or Lower Low (LL) in downtrends.
`;
