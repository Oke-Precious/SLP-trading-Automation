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
**AutoSLP** is a high-performance, real-time algorithmic trading workstation and dashboard designed specifically around **Smart Money Concepts (SMC)** and institutional price action trading strategy. 

The name "AutoSLP" stands for **Automated Structure, Liquidity, and Points of Interest (POI) system**, as well as safeguarding capital via optimized stop-loss placements ("SLP").

### 1.2 Purpose of the Application
The primary goal of AutoSLP is to automate the tedious, manual drawing of institutional market structure (Market Structure Shifts, Break of Structures, Order Blocks, and Breaker Blocks) so traders can focus on pure execution, trade journaling, and systematic backtesting without the fatigue of charting on traditional tools.

### 1.3 The Core SMC Pillar Strategy
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

1. **Dashboard (Home Icon):** Your core command center. It holds the interactive candlestick chart, the step-by-step trading plan, the active setup card, and market summaries.
2. **Market Overview (Grid Icon):** A birds-eye-view matrix heatmap of multi-pair structure and bias across various assets (Forex and Cryptocurrencies).
3. **Directional Bias (Compass Icon):** Tracks higher-timeframe order flow and displays a consolidated bias matrix (Bullish/Bearish) for major pairs.
4. **POI Map (Layers Icon):** A dedicated interface to view, filter, and track all automatic high-timeframe Order Blocks and Breaker Blocks, classified by status (Active, Tested, or Mitigated).
5. **Trade Setups (Target Icon):** A visual Kanban board of active trade ideas, mapping them from "Draft" through "Triggered" to "Completed".
6. **Positions (Briefcase Icon):** Live and historical executions tracker, displaying open P&L, contract sizes, and precise execution metrics.
7. **Alerts (Bell Icon):** Your central alarm system. Set structural alerts that fire instantly when price breaches or tests a POI.
8. **Backtester (TrendingUp Icon):** A sandbox to run historical backtests of the mechanical SLP strategy to record expectancy.
9. **Journal (BookOpen Icon):** Fully integrated trading log featuring calendars, performance metrics (Win Rate, Profit Factor), and daily review forms.`
      },
      {
        id: 'settings-influence',
        title: 'Configuring Settings & API Keys',
        content: `### 2.2 Customizing Your Console
To customize or feed real data into your AutoSLP workspace, navigate to the **Settings Panel** (bottom item on the sidebar).

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
**A:** AutoSLP utilizes the Twelve Data API for Forex. Ensure you have set a valid API key in the **Settings** panel. Standard free keys are limited to 800 requests per day; if exceeded, rate-limiting will occur until your daily limit resets.

#### Q: What is the difference between an Order Block (OB) and a Breaker Block (BB)?
**A:** An **Order Block** is the last down-close candle before a strong upward impulse (Bullish OB) or the last up-close candle before a downward impulse (Bearish OB). A **Breaker Block** is a failed Order Block that was broken through with high momentum; it is now flipped and acts as support/resistance.

#### Q: How does the "Trading Plan" checklist on the dashboard work?
**A:** It is a professional compliance tool. Before taking an active signal, click through the steps to confirm you have established the HTF bias, marked the POIs, waited for a retracement, and identified lower-timeframe structure shifts. This enforces iron discipline.`
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
VITE_BINANCE_WS=wss://stream.binance.com:9443/ws
VITE_BINANCE_REST=https://api.binance.com/api/v3
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
3. **SMC Calculation Phase:** Live prices feed into the calculation engine, which automatically evaluates swing pivots, checks for POI crossing, and triggers alert systems.
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
        title: 'SMC Signal Generation Model',
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
    id: 'maintenance',
    title: 'Maintenance & Runbook',
    sections: [
      {
        id: 'common-problems',
        title: 'Common Dev Pitfalls & Resolutions',
        content: `### 7.1 Operator Runbook

#### 7.1.1 Resetting Dev Cache
If state desynchronizes or becomes corrupted during massive database migrations, run the clean script to flush LocalStorage state:
\`\`\`javascript
// Run in your browser inspector console to completely wipe local state:
localStorage.clear();
window.location.reload();
\`\`\`

#### 7.1.2 Troubleshooting Websocket Chokes
If you notice the live price ticker on the top bar stops moving, check the browser Console tab. If you see WebSocket reconnection loops:
1. Ensure the VITE_BINANCE_WS environment variable is correctly configured.
2. The Socket Manager singleton (\`binanceWebSocket.ts\`) will automatically close stale sockets and reconnect using an exponential backoff algorithm up to 5 times.

#### 7.1.3 Upgrading Dependencies Safely
Before upgrading React, Vite, or Firebase SDK dependencies:
1. Run \`npm run lint\` to verify standard type declarations.
2. Ensure you run \`npx vitest run\` to make sure there are no regression breaks in custom react-query or Zustand stores.`
      }
    ]
  }
];
