# AutoSLP Technical Debt Log

> **NOTE:** This file points directly to the system-master `/TECH_DEBT.md` file maintained at the root of the repository.

Please refer to the root [TECH_DEBT.md](../TECH_DEBT.md) file for the full details of all active compromises, architectural shortcuts, and performance logs.

---

## Active Tech Debt Core Matrix

| ID | Description | Impact | Effort | Priority | Added Date | Resolved Date |
|:---|:---|:---|:---|:---|:---|:---|
| **TD-001** | Chart uses polling fallback when WebSocket disconnects instead of Server-Sent Events (SSE). | **High** - High server I/O load during high-concurrency periods. | **Medium** - Needs Express SSE event stream pipeline setup. | **HIGH** | `2026-05-25` | *Pending* |
| **TD-002** | Bias algorithm has $O(n^2)$ time complexity for processing extremely long candle histories. | **Medium** - Increases execution latency on multi-year backtests. | **Medium** - Requires dynamic programming or sliding window optimization. | **MEDIUM** | `2026-05-25` | *Pending* |
| **TD-003** | Settings page reloads all user preferences on every single tab switch. | **Low** - Minor client-side processing overhead, tiny visual flicker. | **Low** - React State/Memoization or Context caching optimization. | **LOW** | `2026-05-25` | *Pending* |
