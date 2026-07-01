export interface DocSection {
  id: string;
  title: string;
  content: string;
}

export interface DocCategory {
  id: string;
  title: string;
  sections: DocSection[];
}

export const USER_DOCUMENTATION: DocCategory[] = [
  {
    id: 'overview',
    title: 'Project Overview',
    sections: [
      {
        id: 'intro',
        title: 'Introduction to AutoSLP',
        content: `### 1.1 What is AutoSLP?
**AutoSLP** is a high-performance, real-time algorithmic trading workstation and dashboard designed specifically around **Structure, Liquidity & POI (SLP)** and institutional price action trading strategy. 

The name "AutoSLP" stands for **Automated Structure, Liquidity, and Points of Interest (POI) system**, as well as safeguarding capital via optimized stop-loss placements ("SLP").

### 1.2 Purpose of the Application
The primary goal of AutoSLP is to automate the tedious, manual drawing of institutional market structure (Market Structure Shifts, Break of Structures, Order Blocks, and Breaker Blocks) so traders can focus on pure execution, trade journaling, and systematic backtesting without the fatigue of charting on traditional tools.

### 1.3 The Core SLP Pillar Strategy
The application operates on three core pillars of professional-grade market execution:
1. **Structure (MS / MSS / BOS):** Dissecting high-timeframe swing points (HH/HL/LH/LL) to dictate directional bias.
2. **Liquidity (BSL / SSL):** Pinpointing Buy-Side and Sell-Side liquidity pools where retail stop-losses reside.
3. **Points of Interest (POIs):** Establishing price zones (Order Blocks, Breaker Blocks) representing high-probability supply and demand nodes.

### 1.4 Intended Users
- **Prop Firm Traders:** Who require mechanical rules and strict risk-to-reward ratios to pass evaluations and maintain funded status.
- **Systematic Retail Traders:** Looking to strip away emotional bias and adhere strictly to a verified rulebook.
- **Crypto & Forex Scalpers:** Benefiting from sub-millisecond POI alerts and real-time multi-timeframe directional dashboards.`
      },
      {
        id: 'problems-solved',
        title: 'Problems Solved',
        content: `### 1.5 Problems AutoSLP Solves
* **Cognitive Fatigue:** Manual drawing of 15-minute Order Blocks across 10 currency pairs causes severe fatigue and analysis paralysis. AutoSLP charts and lists these automatically in real-time.
* **Lack of Emotional Discipline:** Traders often enter trades "in the middle of nowhere" (premium zones with poor R:R). The interactive **Session Trading Plan** forces a mechanical, step-by-step confirmation.
* **Disjointed Workflow:** Typically, traders plan on TradingView, execute on MT4/MT5, and journal in a separate Excel spreadsheet. AutoSLP unifies the entire lifecycle into a single workspace.`
      }
    ]
  },
  {
    id: 'user_guide',
    title: 'User Documentation & Manual',
    sections: [
      {
        id: 'navigation',
        title: 'How to Navigate the Workstation',
        content: `### 2.1 Workspace Overview
AutoSLP features a persistent sidebar on the left and a supreme top control header. The app is divided into specialized modules:

1. **[Interactive Dashboard](/dashboard) (Home Icon):** Your core command center. It holds the interactive candlestick chart, the step-by-step trading plan, the active setup card, and market summaries.
2. **[Market Overview](/market-overview) (Grid Icon):** A birds-eye-view matrix heatmap of multi-pair structure and bias across various assets (Forex and Cryptocurrencies).
3. **[Directional Bias](/directional-bias) (Compass Icon):** Tracks higher-timeframe order flow and displays a consolidated bias matrix (Bullish/Bearish) for major pairs.
4. **[POI Map](/poi-map) (Layers Icon):** A dedicated interface to view, filter, and track all automatic high-timeframe Order Blocks and Breaker Blocks, classified by status (Active, Tested, or Mitigated).
5. **[Trade Setups](/trade-setups) (Target Icon):** A visual Kanban board of active trade ideas, mapping them from "Draft" through "Triggered" to "Completed".
6. **[Positions Portfolio](/positions) (Briefcase Icon):** Live and historical executions tracker, displaying open P&L, contract sizes, and precise execution metrics.
7. **[System Alerts](/alerts) (Bell Icon):** Your central alarm system. Set structural alerts that fire instantly when price breaches or tests a POI.
8. **[Historical Backtester](/backtest) (TrendingUp Icon):** A sandbox to run historical backtests of the mechanical SLP strategy to record expectancy.
9. **[Trading Journal Log](/journal) (BookOpen Icon):** Fully integrated trading log featuring calendars, performance metrics (Win Rate, Profit Factor), and daily review forms.
10. **[App Settings](/settings) (Settings Icon):** Where you configure your Twelve Data API keys, theme preferences, and toggle Sandbox Mode.`
      },
      {
        id: 'settings-influence',
        title: 'Configuring Settings & API Keys',
        content: `### 2.2 Customizing Your Console
To customize or feed real data into your AutoSLP workspace, navigate to the **[App Settings](/settings)** panel.

#### 2.2.1 Real-Time API Configuration
- **Twelve Data Api Key:** AutoSLP retrieves high-precision Forex and Metals data from Twelve Data. To secure your free 800-request-per-day key, register on [twelvedata.com](https://twelvedata.com), input your key in the Settings field, and click **Save Settings**.
- **Binance WebSocket Feed:** Cryptocurrency feeds (e.g., BTCUSDT) utilize Binance's public WebSocket stream and work out of the box without requiring API keys.

#### 2.2.2 User Preferences
- **Toggle Sandbox Mode:** If active, AutoSLP runs locally with simulated state persistence. Deactivating it utilizes the connected Firebase Cloud Firestore backend.
- **Default Chart Theme:** Toggle display overlays, volume bars, and swing indicators.`
      },
      {
        id: 'faqs',
        title: 'Frequently Asked Questions (FAQs)',
        content: `### 2.3 FAQs & Operational Guides

#### Q: Why is my Forex chart showing "No data" or lagging?
**A:** AutoSLP utilizes the Twelve Data API for Forex. Ensure you have set a valid API key in the **[App Settings](/settings)** panel. Standard free keys are limited to 800 requests per day; if exceeded, rate-limiting will occur until your daily limit resets.

#### Q: What is the difference between an Order Block (OB) and a Breaker Block (BB)?
**A:** An **Order Block** is the last down-close candle before a strong upward impulse (Bullish OB) or the last up-close candle before a downward impulse (Bearish OB). A **Breaker Block** is a failed Order Block that was broken through with high momentum; it is now flipped and acts as support/resistance.

#### Q: How does the "Trading Plan" checklist on the dashboard work?
**A:** It is a professional compliance tool. Before taking an active signal, click through the steps to confirm you have established the HTF bias, marked the POIs, waited for a retracement, and identified lower-timeframe structure shifts. This enforces iron discipline. Open the **[Interactive Dashboard](/dashboard)** to use it.`
      },
      {
        id: 'troubleshooting',
        title: 'Troubleshooting Guide',
        content: `### 2.4 Error Codes & Quick Fixes

| Issue | Root Cause | Immediate Resolution |
| :--- | :--- | :--- |
| **"Failed to fetch ticker for BTCUSDT"** or **Network Error** | Your local development browser is blocked by CORS or lacks a connection. | Verify internet connectivity. AutoSLP automatically attempts back-end proxy failover to keep your console alive. |
| **"WS Error on btcusdt@kline_4h"** | Binance WebSocket stream was briefly disconnected or choked. | The connection manager automatically disposes of stale sockets and launches a healthy connection within 3 seconds. |
| **Firestore persistence falling back to memory** | IndexedDB is disabled in your browser's private browsing mode. | Enable cookies/LocalStorage or run in standard browser windows to maintain local persistent caching. |`
      }
    ]
  },
  {
    id: 'beginner_trading',
    title: 'Beginner Trading Guide',
    sections: [
      {
        id: 'trading-basics',
        title: 'Trading Basics & Jargon',
        content: `### 2.5 Trading Basics & Essential Jargon
If you are brand new to financial markets and trading, don't worry! This guide will break down the essential terms step-by-step.

#### What is Trading?
Trading is the practice of buying and selling financial assets (like Bitcoin or Euro/US Dollar) to profit from price fluctuations.
* **Going Long (BUY):** You buy an asset expecting its price to rise, so you can sell it later at a higher price for a profit.
* **Going Short (SELL):** You sell an asset expecting its price to drop, allowing you to profit from the downward movement.

#### Core Jargon You Need to Know:
1. **Asset / Pair:** The instrument being traded. For example, **[BTCUSDT](/dashboard)** is Bitcoin priced in US Dollar Tether.
2. **Candlesticks:** The vertical bars on the chart. They represent price action during a specific period. Green bars mean price went up; red bars mean price went down.
3. **Timeframe:** The duration represented by each candlestick. A \`1H\` timeframe means each candle is 1 hour of market activity.
4. **Stop Loss (SL):** An automatic exit order that closes your trade at a small loss if the market goes against you. It is your shield!
5. **Take Profit (TP):** An automatic exit order that closes your trade at a target profit once the price reaches your desired level.`
      },
      {
        id: 'slp-explained',
        title: 'Structure, Liquidity & POI (SLP) Made Easy',
        content: `### 2.6 Understanding Structure, Liquidity & POI (SLP)
Retail traders often lose because they use basic retail patterns like "double bottoms" or "trend lines" that big banks easily exploit. **Structure, Liquidity & POI (SLP)** is a professional trading methodology that tracks the footprints of large institutional players (banks, central funds, market makers).

#### The 3 Core Pillars of SLP:

1. **Market Structure (BOS / MSS):**
   * **BOS (Break of Structure):** When a trend is healthy, price continues to break previous highs (in an uptrend) or previous lows (in a downtrend), creating new expansion legs.
   * **MSS / CHoCH (Market Structure Shift / Change of Character):** The first signal of a trend reversal. For example, in an uptrend, when the price breaks below the latest higher low, structure shifts from bullish to bearish.

2. **Liquidity Pools (BSL / SSL):**
   * Institutions need massive order volume to enter trades. They find this volume where retail traders place their stop-losses.
   * **BSL (Buy-Side Liquidity):** Stop-losses of short sellers, located above prominent highs.
   * **SSL (Sell-Side Liquidity):** Stop-losses of buyers, located below prominent lows.
   * Price will often spike to sweep these liquidity pools before reversing.

3. **Points of Interest (POIs) - Order Blocks & Breakers:**
   * **Order Block (OB):** A specific price zone where institutions placed massive buy or sell orders. When price returns to this zone, it is highly likely to bounce.
   * **Breaker Block (BB):** When an Order Block fails and price cuts straight through it, that failed zone flips and acts as the opposite support or resistance.
   * Check out the current points of interest on the **[Automatic POI Map](/poi-map)**.`
      },
      {
        id: 'beginner-step-by-step',
        title: 'Step-by-Step Practical Blueprint',
        content: `### 2.7 How to Execute Your First Trade Step-by-Step
Ready to apply what you've learned? Follow this exact mechanical, high-probability step-by-step checklist using the workstation:

#### Step 1: Establish High-Timeframe Directional Bias
Before taking any trade, you must know if the wind is blowing North or South.
* Go to the **[Directional Bias Matrix](/directional-bias)**.
* Look at the \`4H\` and \`1H\` columns for your chosen asset. If they are **BULLISH**, only look for Buy entries. If they are **BEARISH**, only look for Sell entries.

#### Step 2: Locate Active Points of Interest (POIs)
Never enter a trade "in the middle of nowhere." Wait for the price to reach an institutional zone.
* Open the **[POI Map Panel](/poi-map)**.
* Look for **Active** Order Blocks (\`OB\`) or Breaker Blocks (\`BB\`) that align with your HTF bias.
* These are your designated buy/sell trigger zones!

#### Step 3: Monitor Live Structure Shifts
Once the price touches an active POI, wait for lower-timeframe confirmation.
* Open the **[Interactive Dashboard](/dashboard)** and look at the real-time chart.
* Wait for a **Market Structure Shift (MSS)** to occur in your direction on the chart.

#### Step 4: Run the Compliance Checklist
Ensure your emotional mind doesn't override your trading plan.
* Use the **Session Trading Plan** checklist located right next to the chart on the **[Interactive Dashboard](/dashboard)**.
* Check off each condition as it is met. Once all conditions are green, you are fully cleared to execute!

#### Step 5: Log & Analyze
Every professional keeps records.
* After executing, review your trades in the **[Positions Portfolio](/positions)**.
* Finally, log your rules, emotional state, and screenshots in the **[Trading Journal Log](/journal)** to build consistency and confidence over time!`
      }
    ]
  }
];

export const DEVELOPER_DOCUMENTATION: DocCategory[] = [
  {
    id: 'get_started',
    title: 'Getting Started Guide',
    sections: [
      {
        id: 'installation',
        title: 'Local Installation & Scripts',
        content: `### 3.1 Quickstart Setup
To run the AutoSLP frontend and companion node server locally, follow these steps:

#### 3.1.1 Prerequisites
- Node.js version 18.x or 20.x installed.
- npm version 9.x or higher.

#### 3.1.2 Commands to Boot the Applet
\`\`\`bash
# 1. Clone the repository and enter workspace
cd autoSLP/

# 2. Install all core application dependencies
npm install

# 3. Spin up the development server on Port 3000
npm run dev
\`\`\`

#### 3.1.3 Available NPM Scripts
- \`npm run dev\`: Boots Vite environment binding to port 3000.
- \`npm run build\`: Generates a static production bundle of the React SPA in the \`/dist\` directory.
- \`npm run lint\`: Performs TypeScript syntax verification and ESLint compliance checks.
- \`npm run test\` / \`npx vitest\`: Fires the full unit test suite covering components, hooks, and core state managers.`
      },
      {
        id: 'env_setup',
        title: 'Environment Variables & Example',
        content: `### 3.2 Environment Configurations
Copy \`.env.example\` to \`.env\` in the project root to set up local environment secrets.

\`\`\`env
# .env
VITE_BINANCE_WS=wss://data-stream.binance.vision:9443/ws
VITE_BINANCE_REST=https://data-api.binance.vision/api/v3
VITE_TWELVE_DATA_REST=https://api.twelvedata.com
VITE_TWELVE_DATA_KEY=your_free_twelve_data_api_key_here
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
\`\`\`

*Note: Frontend keys are prefixed with \`VITE_\` to expose them to the client bundler.*`
      }
    ]
  },
  {
    id: 'architecture',
    title: 'System Architecture',
    sections: [
      {
        id: 'arch-flow',
        title: 'Request-Processing-Response Cycle',
        content: `### 4.1 System Flow Architecture
The diagram below illustrates how market data, user configurations, and state flow through the AutoSLP framework:

\`\`\`
  [Market Feed Origins]                  [Workspace UI]
 (Binance WS / Twelve REST)          (Dashboard, Charts, Inputs)
            │                                    │
            ▼                                    ▼
   [marketDataService] ───────► [useMarketStore / useAuthStore]
   [binanceWebSocket]                  (Zustand State Engines)
            │                                    │
            ▼                                    ▼
   [Local Database Cache]            [Firebase Cloud / Local DB]
  (Sub-millisecond State)           (User POIs, Journals, Alerts)
\`\`\`

### 4.2 Data Lifecycle Lifecycle
1. **Hydration Phase:** On app mount, \`AppInitializer.tsx\` fires, loading the current authenticated user's settings, POIs, alert thresholds, and journal history from either Firebase or LocalStorage.
2. **Streaming Phase:** The active symbol's candles are requested via HTTP. Simultaneously, a persistent WebSocket connection is opened with Binance to stream live candlestick wicks at sub-second intervals.
3. **SLP Calculation Phase:** Live prices feed into the calculation engine, which automatically evaluates swing pivots, checks for POI crossing, and triggers alert systems.
4. **Persistence Phase:** When a user creates a journal entry or adds a custom POI, the state is immediately updated in Zustand and persisted safely in the database.`
      },
      {
        id: 'folder-map',
        title: 'Folder Structure & Responsibilities',
        content: `### 4.3 Workspace Directory Tree
Below is the architectural map of the frontend application directories and file-level responsibilities:

\`\`\`
/src
├── app/                  # Next-generation route directories & layouts
├── components/           # Reusable UI component modules
│   ├── dashboard/        # Dashboard panels (POIMapPanel, MarketSummary, TradingPlan)
│   ├── layout/           # Sidebar, Header, and MasterLayout wrappers
│   └── ui/               # Lower-level atomic primitives (buttons, badges, inputs)
├── data/                 # Static data registries, specifications, and docs
├── hooks/                # Custom React lifecycle hooks (useRealtimeCandles, useQuery)
├── lib/                  # External services and API integration files
│   ├── api/              # API clients for auth, journals, and POIs
│   ├── firebase/         # Cloud Firestore initialization and authentication
│   └── market/           # Market data clients (Binance, Twelve Data, WebSockets)
├── store/                # Unified Zustand state slices
└── types.ts              # Global TypeScript types, interfaces, and enums
\`\`\`

### 4.4 File Responsibilities
- \`src/lib/market/binanceWebSocket.ts\`: Handles the persistent singleton connection, connection retries, and socket cleanup.
- \`src/hooks/useRealtimeCandles.ts\`: Bridges HTTP-based historical candles and real-time wicks, delivering a unified candle stream to components.
- \`src/store/usePOIStore.ts\`: Manages global POI lists, active POI selection, and creation logic.`
      }
    ]
  },
  {
    id: 'developer_docs',
    title: 'Developer Instructions',
    sections: [
      {
        id: 'coding-standards',
        title: 'Coding Standards & Conventions',
        content: `### 5.1 Rules for Contributions
To maintain code excellence and prevent regression errors, any new developer must adhere to these rules:

#### 5.1.1 Type Safety First
- **Strict TypeScript:** No implicit \`any\` is allowed in utility or store files. All models must be fully typed in \`types.ts\`.
- **Enums Over Union Types:** For persistent state constants (e.g. \`status\`, \`direction\`), use standard enums or typed unions declared cleanly.

#### 5.1.2 Styling Standards
- Use **Tailwind CSS** utility classes directly.
- Avoid creating custom CSS files. If a custom color or shadow is needed, declare it in \`tailwind.config.ts\` or use Tailwind's arbitrary bracket syntax (e.g. \`bg-[#111622]\`).
- Ensure visual rhythm by utilizing Tailwind's standard spacing scales (\`p-2\`, \`p-4\`, \`p-6\`).

#### 5.1.3 React Best Practices
- **useEffect Hygiene:** Ensure all \`useEffect\` hooks return cleanup functions (such as removing listeners, clearing timeouts, or aborting fetch requests). Avoid infinite re-renders by only putting primitive values in dependency arrays.`
      },
      {
        id: 'reusable-components',
        title: 'Reusable Primitives & Modules',
        content: `### 5.2 Key Core Primitives

* **DashboardChart.tsx:** The heavy-duty chart visualization rendering engine. It draws Japanese Candlesticks, volume histograms, automatic swing indicators (HH/HL/LH/LL), and overlays Order Blocks and Breaker Blocks using translucent canvases.
* **Header.tsx & Sidebar.tsx:** Structural workspace grids wrapping all pages. Supports collapsible menus, system time, search inputs, and bias pills.
* **FeedbackWidget.tsx:** Located on settings and dashboards, allows users to send structured feedback or bug reports.`
      },
      {
        id: 'database-schema',
        title: 'Database Schema & Persistence Slices',
        content: `### 5.3 Database Architecture (Firestore Collections)

AutoSLP is designed to support seamless cross-device synchronization via **Google Cloud Firestore**.

#### 5.3.1 Collection: \`users\`
\`\`\`typescript
interface UserDocument {
  uid: string;         // Unique user auth ID
  email: string;
  username: string;
  plan: 'PRO_PLAN' | 'ENTERPRISE' | 'FREE';
  twelveDataApiKey?: string;
  createdAt: string;
}
\`\`\`

#### 5.3.2 Collection: \`pois\`
\`\`\`typescript
interface POIDocument {
  id: string;
  userId: string;       // Owner relation
  name: string;
  type: 'OB' | 'BB';
  priceRange: string;
  priceMin: number;
  priceMax: number;
  status: 'Active' | 'Mitigated' | 'Tested';
  timeframe: string;
  pair: string;
  createdAt: string;
}
\`\`\`

#### 5.3.3 Collection: \`journals\`
\`\`\`typescript
interface JournalDocument {
  id: string;
  userId: string;
  date: string;
  pair: string;
  direction: 'Long' | 'Short';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  pnl: string;
  notes: string;
  isWin: boolean;
  setupType: string;
}
\`\`\``
      },
      {
        id: 'testing-workflow',
        title: 'Testing & Verification Workflow',
        content: `### 5.4 Unit Testing Suite
We utilize **Vitest** and **React Testing Library** for rigorous unit testing.

#### 5.4.1 Running Tests
\`\`\`bash
# Run tests in continuous watch mode
npm run test

# Run tests once and exit (for CI/CD pipelines)
npx vitest run
\`\`\`

#### 5.4.2 Adding a New Test
Create a \`*.test.tsx\` or \`*.test.ts\` file inside the \`src/test/\` directory. Always mock external database connections (Zustand state triggers and Firebase APIs) to ensure tests run completely isolated, lightning-fast, and independent of network connections.`
      }
    ]
  },
  {
    id: 'trading_logic',
    title: 'Chart & Trading Algos',
    sections: [
      {
        id: 'swing-logic',
        title: 'Automatic Swing & Structure Calculations',
        content: `### 6.1 Mechanical Algos Explained
AutoSLP automatically calculates swing points and market structure shifts using mathematical price action algorithms.

#### 6.1.1 Pivot Swings (HH / HL / LH / LL)
A swing high is identified when a candle's high is higher than the highs of $N$ candles before and after it.
- **Swing High (HH / LH):** $High_t > High_{t \pm i}$ for $i \in [1, N]$.
- **Swing Low (HL / LL):** $Low_t < Low_{t \pm i}$ for $i \in [1, N]$.
In AutoSLP, the parameter $N$ defaults to 5 candles to filter out low-level volatility noise while capturing high-probability institutional swings.

#### 6.1.2 Order Block (OB) Detection
- **Bullish Order Block:** The last down-close candle before a break of structure (BOS) or market structure shift (MSS) to the upside.
- **Bearish Order Block:** The last up-close candle before a BOS or MSS to the downside.

#### 6.1.3 Breaker Block (BB) Flip Logic
When price breaks through an active Order Block with high momentum (characterized by full candle bodies closing outside the block bounds), the Order Block is marked as \`Mitigated\`. It is then automatically flipped into a **Breaker Block (BB)**. The old supply zone becomes a new demand buffer (or vice versa), which often acts as support/resistance on corrective pullbacks.`
      },
      {
        id: 'signal-generation',
        title: 'SLP Signal Generation Model',
        content: `### 6.2 Algorithmic Signal Dispatcher
Signals are dispatched by monitoring live asset data against established high-timeframe zones:

1. **Alignment:** Establish the macro trend bias (e.g., Daily structure must be Bullish).
2. **Mitigation Watch:** If price retraces down into a Bullish Order Block, the algorithm is put on high alert.
3. **Trigger:** On lower timeframes (e.g., 15-minute), wait for a body close above the last Swing High (Market Structure Shift / MSS).
4. **Signal Dispatch:** Once MSS is validated, write an active signal containing:
   - **Entry:** Price at the immediate unmitigated LTF OB.
   - **Stop Loss:** Just below the swing low of the MSS trigger.
   - **Take Profit (TP1 / TP2):** Measured at the next high-timeframe liquidity pools (previous swing highs).`
      }
    ]
  },
  {
    id: 'api_connections',
    title: 'API & Connections Guide',
    sections: [
      {
        id: 'api-reference-endpoints',
        title: 'API Documentations & Endpoints',
        content: `### 7.1 AutoSLP API Reference Manual
This section provides a rigorous specification of the companion server REST API and external streaming connection interfaces.

#### 7.1.1 Authentication Endpoints
All companion server requests must be authenticated. The backend supports stateless JWT validation.

* **POST** \`/api/v1/auth/register\`
  * **Payload:** \`{ "email": "string", "password": "string", "username": "string" }\`
  * **Response:** \`{ "success": true, "token": "string", "user": { "uid": "string", "email": "string" } }\`

* **POST** \`/api/v1/auth/login\`
  * **Payload:** \`{ "email": "string", "password": "string" }\`
  * **Response:** \`{ "success": true, "token": "string" }\`

#### 7.1.2 POI (Points of Interest) Management
Allows developers to query, add, or mitigate institutional zones programmatically.

* **GET** \`/api/v1/poi/list\`
  * **Headers:** \`Authorization: Bearer <token>\`
  * **Query Parameters:** \`pair=BTCUSDT\`, \`status=Active\`
  * **Response:** \`{ "success": true, "pois": POIDocument[] }\`

* **POST** \`/api/v1/poi/create\`
  * **Headers:** \`Authorization: Bearer <token>\`
  * **Payload:** \`{ "name": "string", "type": "OB" | "BB", "priceMin": number, "priceMax": number, "pair": string, "timeframe": string }\`
  * **Response:** \`{ "success": true, "poi": POIDocument }\`

* **PUT** \`/api/v1/poi/mitigate/:id\`
  * **Headers:** \`Authorization: Bearer <token>\`
  * **Response:** \`{ "success": true, "poi": POIDocument }\`

#### 7.1.3 Signals & Alerts API
* **GET** \`/api/v1/signals/active\`
  * **Headers:** \`Authorization: Bearer <token>\`
  * **Response:** \`{ "success": true, "signals": SignalDocument[] }\`

* **POST** \`/api/v1/alerts/trigger\`
  * **Headers:** \`Authorization: Bearer <token>\`
  * **Payload:** \`{ "poiId": "string", "triggerPrice": number, "timestamp": string }\`
  * **Response:** \`{ "success": true, "alert": { "id": "string", "fired": true } }\`

#### 7.1.4 External Data Streams
* **Binance WebSocket API:** \`wss://data-stream.binance.vision:9443/ws\`
  * Subscribed Stream: \`<symbol>@kline_<timeframe>\` (e.g. \`btcusdt@kline_1m\`)
* **Twelve Data REST API:** \`https://api.twelvedata.com/time_series\`
  * Query parameters: \`symbol\`, \`interval\`, \`apikey\`, \`outputsize\``
      },
      {
        id: 'system-communication-guide',
        title: 'Cross-System Communication Blueprint',
        content: `### 7.2 System Components Connection Map
To understand how AutoSLP achieves real-time synchronization and high availability, developers must understand how different layers communicate:

\`\`\`
   ┌────────────────────────────────────────────────────────┐
   │                       BROWSER (Vite + React SPA)       │
   │                                                        │
   │  ┌───────────────────┐        ┌─────────────────────┐  │
   │  │  useMarketStore   │◄───────┤ binanceWebSocket.ts │  │
   │  │  (Zustand State)  │        │ (Stream real-time)  │  │
   │  └─────────┬─────────┘        └──────────▲──────────┘  │
   │            │                             │             │
   └────────────┼─────────────────────────────┼─────────────┘
                │                             │ WebSocket Stream
                │ API Request /               │ (Live tickers)
                │ Firestore Sync              │
   ┌────────────▼─────────────────────────────┴─────────────┐
   │                       BACKEND & CLOUD PLATFORM         │
   │                                                        │
   │  ┌───────────────────┐        ┌─────────────────────┐  │
   │  │  Express API      ├───────►│  Twelve Data REST   │  │
   │  │  (Node.js Server) │        │  (Historical DB)    │  │
   │  └─────────┬─────────┘        └─────────────────────┘  │
   │            │                                           │
   │  ┌─────────▼─────────┐                                 │
   │  │  Cloud Firestore  │                                 │
   │  │  (Durable Storage)│                                 │
   │  └───────────────────┘                                 │
   └────────────────────────────────────────────────────────┘
\`\`\`

#### 7.2.1 Component Flow Loops
1. **The Live-Price Loop (Binance WS -> Zustand):**
   * The \`binanceWebSocket.ts\` singleton initiates a stream connection to Binance's WebSocket server.
   * Whenever a trade event or candlestick close event occurs, Binance sends a payload down the pipe.
   * The WebSocket listener parses this event and directly invokes \`updateLivePrice()\` and \`addLiveWick()\` on \`useMarketStore.ts\`.
   * Any React chart or badge listening to \`useMarketStore\` instantly recalculates and re-renders at 60fps without triggering global page refreshes.

2. **The Persistent Data Loop (SPA -> Firestore -> Zustand):**
   * When a user changes settings (e.g., adding a Twelve Data key), \`useSettingsStore.ts\` saves it locally.
   * Simultaneously, if authenticated, the store calls \`firestoreService.ts\` which initiates a background write/set-doc operation to Google Cloud Firestore database.
   * Because we configure Firestore with active offline caches (IndexedDB) and optimistic UI updates, the change is applied to the UI instantly, and synchronized with the cloud backend asynchronously as soon as connectivity allows.

3. **The Algorithmic Alert Loop:**
   * Live tickers arrive via the Live-Price Loop.
   * In a custom hook, the active price is compared against the unmitigated price range bounds of POIs loaded from \`usePOIStore.ts\`.
   * If a match occurs, the system pushes a toast notification to the screen, sets the POI status to "Tested" or "Mitigated", and submits an API call to the server to record the execution event.`
      },
      {
        id: 'developer-connections',
        title: 'Guide to Using Connections Correctly',
        content: `### 7.3 Guidelines for Correct Connections Usage
As a developer adding features or integrating other services, follow these operational guidelines to guarantee network safety, low latency, and secure auth.

#### 7.3.1 Proper WebSocket Lifecycle Management
WebSockets are persistent connections. Improperly handling them causes memory leaks and server socket exhaustion.
- **Rule:** Never open multiple websocket instances for the same asset. Always utilize the shared connection singleton.
- **Rule:** When leaving a chart screen or switching active asset pairs, always ensure the previous channel subscription is cleaned up:
\`\`\`typescript
// Inside your custom React hook:
useEffect(() => {
  const socket = getBinanceSocketInstance();
  socket.subscribe(activePair, onMessageCallback);
  
  // CRITICAL: Always return a cleanup function to unsubscribe on unmount
  return () => {
    socket.unsubscribe(activePair, onMessageCallback);
  };
}, [activePair]);
\`\`\`

#### 7.3.2 Caching & Cautious API Request Patterns
To keep external API usage well under the Twelve Data free tier limit (800 requests/day):
- **Rule:** Never query historical candles inside frequent loops (e.g., on every ticket update).
- **Rule:** Cache historical query outputs in Zustand or LocalStorage. Only request historical data when changing timeframes or switching currency pairs.
- **Rule:** Wrap your network fetches in safety checks:
\`\`\`typescript
async function fetchChartData(symbol: string, interval: string) {
  const cached = getLocalCache(symbol, interval);
  if (cached && !isExpired(cached.timestamp)) {
    return cached.data; // Serve from zero-latency memory cache
  }
  
  // Only execute real network request if cache is stale or missing
  const fresh = await axios.get(\`/api/v1/market/series\`, { params: { symbol, interval } });
  saveToLocalCache(symbol, interval, fresh.data);
  return fresh.data;
}
\`\`\`

#### 7.3.3 Firestore Transactional Integrity
When editing active databases containing financial trades and journals:
- **Rule:** Never write overlapping updates to the same Firestore document. Always perform operations using unique identifiers.
- **Rule:** For operations that depend on previous states (such as updating trading account balances or total points), use Firestore's \`increment()Helper\` helper or run the action inside a \`runTransaction()\` block to prevent race conditions across parallel browser sessions.`
      }
    ]
  },
  {
    id: 'maintenance',
    title: 'Maintenance & Runbook',
    sections: [
      {
        id: 'common-problems',
        title: 'Common Dev Pitfalls & Resolutions',
        content: `### 8.1 Operator Runbook
 
#### 8.1.1 Resetting Dev Cache
If state desynchronizes or becomes corrupted during massive database migrations, run the clean script to flush LocalStorage state:
\`\`\`javascript
// Run in your browser inspector console to completely wipe local state:
localStorage.clear();
window.location.reload();
\`\`\`
 
#### 8.1.2 Troubleshooting Websocket Chokes
If you notice the live price ticker on the top bar stops moving, check the browser Console tab. If you see WebSocket reconnection loops:
1. Ensure the VITE_BINANCE_WS environment variable is correctly configured.
2. The Socket Manager singleton (\`binanceWebSocket.ts\`) will automatically close stale sockets and reconnect using an exponential backoff algorithm up to 5 times.
 
#### 8.1.3 Upgrading Dependencies Safely
Before upgrading React, Vite, or Firebase SDK dependencies:
1. Run \`npm run lint\` to verify standard type declarations.
2. Ensure you run \`npx vitest run\` to make sure there are no regression breaks in custom react-query or Zustand stores.`
      }
    ]
  }
];
