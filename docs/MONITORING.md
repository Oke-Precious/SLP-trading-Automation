# AutoSLP Automated Health Monitoring & Error Tracking

This specification defines the proactive telemetry architecture, error logging frameworks, SLIs/SLOs, and socket heartbeat protocols deployed to catch bugs before users spot them.

---

## ─── 1. UPTIME PROACTIVE MONITORING ───

AutoSLP leverages double-redundant uptime triggers (using Sentry/Better Uptime or UptimeRobot checks).

### SLA Constraints:
* **Uptime Target**: &ge; 99.9% monthly continuity.
* **Interval Rate**: Gateway pings execute every **60 seconds**.
* **Alert Latency**: Any service downstate lasting > 60 seconds triggers high-priority SMS notifications and Slack channel broadcasts to active DevOps engineers.

### Target Health Endpoints:
```
GET /health               ──► [API Gateway / Fastify System Status checks]
GET /                     ──► [Frontend web assets ping]
```

---

## ─── 2. SENTRY ERROR TRACKING PIPELINE ───

We utilize official Sentry SDK dependencies (`@sentry/nextjs` for the frontend and `@sentry/node` for the backend servers cluster).

### Error Ingestion Parameters:
* **Stacktrace Audits**: Automatically captures uncaught exceptions and full diagnostic traceback contexts.
* **Anonymized Telemetry**: In GDPR-regulated zones, Personal Identifiable Information (PII) is securely stripped, and users trace to tokenized anonymized identifiers.
* **Metadata Envelopes**: Every incident payload is enriched with:
  * Running binary release tag version (e.g. `1.1.0`)
  * Browser details & running Operating System versions
  * Breadcrumb history (capturing recent user clicks, active states, and navigation routes)
* **Real-Time Alert Dispatch**: Triggers automated Webhook posts to `#dev-errors-sentry` Slack workspace when new unique error sigils occur in production environments.

---

## ─── 3. PERFORMANCE & VITALS AUDITOR ───

Sentry Performance monitoring tracks client-side responsiveness metrics.

### Web Vitals Targets (SLA thresholds):
* **LCP (Largest Contentful Paint)**: &le; 2.5 seconds.
* **CLS (Cumulative Layout Shift)**: &le; 0.1 ratio bounds.
* **FID (First Input Delay)**: &le; 100 milliseconds.

We trigger alerts immediately if LCP scores exceed 2.5 seconds on any main dashboard rendering views.

---

## ─── 4. DATABASE METRICS & SLOW QUERY LOGS ───

Our TimescaleDB and Primary PostgreSQL pipelines emit telemetry queries when they exceed target latencies.

### Core Metrics:
* **Slow Query Log Threshold**: Any query exceeding **100 milliseconds** is automatically logged to the monitoring dashboard database.
* **Weekly Diagnostics Chore**: The DevOps cron compiles the Top 10 slowest executing queries, creating optimization tasks for index refactoring or sliding window checks.

---

## ─── 5. WEBSOCKET FEED CORRELATION & HEARTBEAT ───

To maintain stream connectivity with Binance WebSocket nodes, we run a low-overhead heartbeat protocol.

### Heartbeat Rules:
```
[Client/Server Hub] ──── Ping (every 30 seconds) ────► [Binance WS Node]
        ▲                                                      │
        │                                                      ▼
[Disconnect/Retry] ◄──── Close Socket (If No Pong > 5s) ◄───── [Pong Feed]
```

* **Heartbeat Ping Rate**: Dispatched every **30 seconds** from active backend cluster containers.
* **Tolerance Boundary**: If no validating pong matches under **5 seconds**, the websocket connections count as severed/disconnected.
* **Reconnection Engine**: Re-invokes fresh handshake handshaking attempts automatically using exponential retry intervals.
* **Hour Rate Alerts**: The metrics processor registers active reconnect volumes periodically. If disconnect frequencies exceed **5% of total clients per hour**, high-priority Slack notifications fire.
