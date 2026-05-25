# AutoSLP Technical Debt Log

This registry houses all known architectural shortcuts, performance concessions, and technical debt items across the AutoSLP frontend and backend layers.

We allocate **20% of every development sprint** to resolving items listed in this document, and the engineering team reprioritizes this log monthly during retrospectives.

---

## Active Tech Debt Core Matrix

| ID | Description | Impact | Effort | Priority | Added Date | Resolved Date |
|:---|:---|:---|:---|:---|:---|:---|
| **TD-001** | Chart uses polling fallback when WebSocket disconnects instead of Server-Sent Events (SSE). | **High** - High server I/O load during high-concurrency periods. | **Medium** - Needs Express SSE event stream pipeline setup. | **HIGH** | `2026-05-25` | *Pending* |
| **TD-002** | Bias algorithm has $O(n^2)$ time complexity for processing extremely long candle histories. | **Medium** - Increases execution latency on multi-year backtests. | **Medium** - Requires dynamic programming or sliding window optimization. | **MEDIUM** | `2026-05-25` | *Pending* |
| **TD-003** | Settings page reloads all user preferences on every single tab switch. | **Low** - Minor client-side processing overhead, tiny visual flicker. | **Low** - React State/Memoization or Context caching optimization. | **LOW** | `2026-05-25` | *Pending* |

---

## Technical Debt Detail Breakdown

### TD-001: Chart Polling Fallback (WebSocket Disconnects)
* **Description**: When the raw WebSocket connection drops (due to browser sleeps, rate protection triggers, or bad connectivity), the chart reverts to hitting `/api/v1/market/candles` in a 5-second polling loop.
* **Impact**: Sub-optimal. Under massive traffic, client polling hammers the Fastify gateways, increasing database connection pools usage. Transitioning to SSE keeps a unidirectional push channel active.
* **Effort**: Medium.
* **Priority**: HIGH.
* **Added Date**: May 25, 2026.
* **Resolved Date**: *Pending*

### TD-002: Bias Algorithm $O(n^2)$ Complexity
* **Description**: Multi-TF scoring iterates nested pivot boundaries on long arrays instead of performing standard linear memoized interval lookups.
* **Impact**: While 200 candle limits render immediately, computing 5000+ historical candles on custom back-tests causes noticeable thread blockages.
* **Effort**: Medium.
* **Priority**: MEDIUM.
* **Added Date**: May 25, 2026.
* **Resolved Date**: *Pending*

### TD-003: Settings Tab Cache Reload Thrashing
* **Description**: Toggling between "General", "Alerts", and "AI Model Weights" tabs in settings resets form components, re-fetching preferences JSON from storage/API on each click.
* **Impact**: Redundant API roundtrips and tiny layout shift.
* **Effort**: Low. Introduce hook memoization or client-side context buffer.
* **Priority**: LOW.
* **Added Date**: May 25, 2026.
* **Resolved Date**: *Pending*
