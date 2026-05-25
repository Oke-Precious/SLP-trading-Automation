# AutoSLP Backend System Architecture & Implementation Specifications

AutoSLP is an institutional-grade Smart Money Concepts (SMC) automation, POI plotting, and trailing-limit signaling engine. This document details the master topographical architecture, communication interfaces, and runtime decisions comprising the platform.

---

## 1. System Communication Topography

The complete service architecture handles real-time normalization of Binance OHLC candle feeds, cached pattern analysis, multi-tenant state replication, and distributed event ingestion.

```mermaid
graph TB
    subgraph External Dependencies
        BinanceWS[Binance WebSocket <br> kline/ticker stream]
        BinanceREST[Binance REST API <br> Historical candles / order sync]
        EmailClient[Resend / SendGrid <br> Email notifications]
        PushClient[Firebase Cloud Messaging <br> Push services]
    end

    subgraph Client Layer
        WebClient[AutoSLP React App]
    end

    subgraph Architecture Node Clusters
        %% Gateway
        AGW[API Gateway <br> Fastify / Reverse Proxy]
        
        %% Services
        AuthSvc[Auth Service <br> JWT / bcrypt]
        InSvc[Market Ingestion Service <br> Binance Stream Aggregator]
        AnalEngine[Analysis Engine <br> SMC Structural Analysers]
        SignalSvc[Signal Gen Service <br> Trigger Rules Checker]
        NotifSvc[Notification Service <br> FCM & Mailer Workers]
        UserSvc[User Management Service <br> Profile & Subs Manager]
        JournalSvc[Trade Journal Service <br> Metric Logs Analyzer]
        BackSvc[Backtesting Engine <br> Historical replay runner]
        AdminSvc[Admin Monitoring Service <br> Platform Health dashboard]

        %% Databases & Cache
        Postgres[(PostgreSQL 16 <br> Relational Core)]
        Timescale[(TimescaleDB Hypertable <br> Normalized Candle Store)]
        RedisCache[(Redis v7 Cache <br> In-memory OHLC / Sessions)]
        RedisPubSub((Redis Pub/Sub <br> High-speed Inter-service Bus))
        BullMQ[[BullMQ / Redis <br> Asynchronous Job Queue]]
    end

    %% Data flow lines
    WebClient <-->|HTTPS / REST| AGW
    WebClient <-->|WSS / Socket.io| InSvc

    AGW -->|gRPC / REST| AuthSvc
    AGW -->|gRPC / REST| UserSvc
    AGW -->|gRPC / REST| JournalSvc
    AGW -->|gRPC / REST| BackSvc
    AGW -->|gRPC / REST| AdminSvc

    %% Ingestion Flow
    BinanceWS -->|kline/ticker streams| InSvc
    InSvc -->|Publish Candle| RedisPubSub
    InSvc -->|Persistent Batch Write| Timescale

    %% Analysis Engine Flow
    RedisPubSub -->|Subscribe Raw Candle| AnalEngine
    BinanceREST -->|Catch-up historical queries| AnalEngine
    AnalEngine -->|Compute SMC Bias/MSS/OB| RedisCache
    AnalEngine -->|Save Analytic Results| Postgres
    AnalEngine -->|Publish SMC Events| RedisPubSub

    %% Signal Flow
    RedisPubSub -->|Subscribe SMCEvents/Candles| SignalSvc
    SignalSvc -->|Trigger Limit Setup| RedisPubSub
    SignalSvc -->|Log Active Signal| Postgres

    %% Notification Workers Flow
    RedisPubSub -->|Queue Alert Triggers| BullMQ
    BullMQ --> NotifSvc
    NotifSvc --> EmailClient
    NotifSvc --> PushClient

    %% Shared Databases & Storage
    AuthSvc & UserSvc & JournalSvc & SignalSvc & AdminSvc --> Postgres
    RedisCache -.->|Session Storage| AuthSvc
```

---

## 2. Shared Tech Stack & Component Justification

* **Runtime**: Node.js 20+ (LTS) with Assembly-Aided TypeScript. Low-memory heap footprint and dynamic assembly-level stripping for ultra-fast, single-thread task execution.
* **API Framework**: **Fastify**. High throughput JSON schema serialization, dynamic route maps compiling using `fast-json-stringify` and trie-based internal routers (`find-my-way`). High requests-per-second capability exceeding standard Express setups.
* **Persistent Layer**: PostgreSQL 16 core relational mapping coupled with the TimescaleDB extension. Leverages automated chronological time-series partitioning (*Hypertables*) to handle rapid candlestick inputs without page locking or index degradation.
* **Caching & IPC Plane**: Redis 7. Single-threaded in-memory store for high-frequency session buffers and high-volume raw candlestick pub/sub message propagation.
* **Async Job Worker Queue**: **BullMQ**. High-reliability task execution, built-in rate-limiting levels, automatic retry backoffs, and parent-child task relation logic.
* **ORM**: Prisma. Type-safe entity modeling and relation tracking, catching schema discrepancies at compile-time.
