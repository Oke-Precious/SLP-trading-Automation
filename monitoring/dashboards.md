# AutoSLP Grafana Metrics Dashboards

This document outlines the structured Prometheus queries (PromQL) and panel arrangements required to provision high-fidelity observability dashboards in Grafana.

---

## 1. Platform Health Dashboard
Focused on golden site-reliability signals (latencies, volumes, and rate errors).

### Panel A: API Request Latency (Quantiles)
* **Visualization**: Time series line graph
* **PromQL Equations**:
  * **p50 Latency (Median)**:
    ```promql
    histogram_quantile(0.50, sum(rate(autoSLP_api_request_duration_seconds_bucket[5m])) by (le))
    ```
  * **p95 Latency (Tail)**:
    ```promql
    histogram_quantile(0.95, sum(rate(autoSLP_api_request_duration_seconds_bucket[5m])) by (le))
    ```
  * **p99 Latency (Critical)**:
    ```promql
    histogram_quantile(0.99, sum(rate(autoSLP_api_request_duration_seconds_bucket[5m])) by (le))
    ```

### Panel B: API Request Rates & Response Error Levels
* **Visualization**: Multi-stacked bar charts
* **PromQL Equations**:
  * **2xx Statuses**:
    ```promql
    sum(rate(autoSLP_api_request_duration_seconds_count{status=~"2.."}[1m])) by (route)
    ```
  * **4xx Statuses (Client Errors)**:
    ```promql
    sum(rate(autoSLP_api_request_duration_seconds_count{status=~"4.."}[1m])) by (route)
    ```
  * **5xx Statuses (Server Errors - Critical Alert indicator)**:
    ```promql
    sum(rate(autoSLP_api_request_duration_seconds_count{status=~"5.."}[1m])) by (route)
    ```

### Panel C: Platform Availability and Uptime Index
* **Visualization**: Single Status Stat Gauges
* **PromQL Equation**:
  ```promql
  avg(up{job="autoslp-backend"}) * 100
  ```

---

## 2. Platform Business Metrics Dashboard
Focused on user adoption, algorithmic performance, and analytical outputs.

### Panel A: Active Users Trend Lines
* **Visualization**: Bar timeline
* **PromQL Equation**:
  ```promql
  sum(rate(autoSLP_api_request_duration_seconds_count{route="/auth/me"}[24h]))
  ```

### Panel B: Real-Time Trading Signals Generated per Hour
* **Visualization**: Sparkline overlay charts
* **PromQL Equation**:
  ```promql
  sum(increase(autoSLP_signals_generated_total[1h])) by (pair, direction)
  ```

---

## 3. Infrastructure & Cluster Sizing Dashboard
Track resource boundaries of Node containers and general health.

### Panel A: Container Memory Footprints vs Limits
* **Visualization**: Gauge indicators
* **PromQL Equation**:
  ```promql
  sum(container_memory_working_set_bytes{namespace="autoslp"}) by (pod) / sum(kube_pod_container_resource_limits{resource="memory",namespace="autoslp"}) by (pod) * 100
  ```

### Panel B: Container CPU Usage Rates vs Limits
* **Visualization**: Graph area timelines
* **PromQL Equation**:
  ```promql
  sum(node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{namespace="autoslp"}) by (pod)
  ```

---

## 4. WebSocket Observability Dashboard
Understand live streaming connection states, message frequencies, and events.

### Panel A: Active High-Speed Socket Connections
* **Visualization**: Large number display card
* **PromQL Equation**:
  ```promql
  sum(autoSLP_ws_connections_active)
  ```

### Panel B: Messages Processed / Socket Ingestion Frequency
* **Visualization**: Sparkline chart
* **PromQL Equation**:
  ```promql
  sum(rate(autoSLP_candles_ingested_total[1m])) by (pair, tf)
  ```
