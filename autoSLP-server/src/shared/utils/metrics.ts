import client from 'prom-client';

// Explicitly register default metrics collects for Prometheus scraping
client.collectDefaultMetrics({
  prefix: 'autoslp_'
});

// Custody metric declarations
export const candlesIngestedTotal = new client.Counter({
  name: 'autoSLP_candles_ingested_total',
  help: 'Total volume of physical market candles ingested by the platform',
  labelNames: ['pair', 'tf']
});

export const signalsGeneratedTotal = new client.Counter({
  name: 'autoSLP_signals_generated_total',
  help: 'Total algorithmic Smart Money Concept signals plotted to the board',
  labelNames: ['pair', 'direction']
});

export const wsConnectionsActive = new client.Gauge({
  name: 'autoSLP_ws_connections_active',
  help: 'Total active high-speed live connection sockets tracked'
});

export const apiRequestDurationSeconds = new client.Histogram({
  name: 'autoSLP_api_request_duration_seconds',
  help: 'Liveness of REST endpoints with execution latency spectrums',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
});

export const analysisDurationSeconds = new client.Histogram({
  name: 'autoSLP_analysis_duration_seconds',
  help: 'Core algorithmic market execution and analysis cycles runtime metrics',
  labelNames: ['algorithm'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]
});

export const register = client.register;
