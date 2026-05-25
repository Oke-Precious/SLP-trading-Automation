# AutoSLP Platform Changelog

All notable changes to the AutoSLP platform are documented in this registry. The formatting complies fully with [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] — 2026-05-25

### Added
- Created complete DevOps issue tracking structures and labels standard matrix.
- Integrated GitHub issue templates (`.github/ISSUE_TEMPLATE/bug_report.yml`) to capture detailed debugging metadata.
- Generated system maintenance guidelines for dependencies, performance, error reporting, and security updates inside `docs/CONTRIBUTING.md`.
- Automated technical debt registry file inside `TECH_DEBT.md` to track compromises and algorithmic refactor limits.

---

## [1.0.2] — 2026-05-20

### Added
- Integrated **Privacy-First Telemetry Engine** mapping `pair_switched`, `timeframe_switched`, and `poi_created` events using a self-hosted instance without storing PII cookies.
- Developed an in-app **SMC Feedback Widget** with automatic Net Promoter Score (NPS) surveys.
- Implemented **Gemini SMC AI Pattern Recognizer** allowing users to query last-100 candles on active chart bounds and plot suggested model entries dynamically.
- Created local storage fallbacks preserving mock analyses when gateways undergo system offline connectivity sweeps.

### Fixed
- Rebuilt Fastify Fast-JSON serializers ensuring decimal precision matching on high-fraction currency quotes (#101).
- Corrected WebSocket listener bindings to safely reconnect under 5000 milliseconds when downstream sockets encounter connection drops (#123).

---

## [1.0.0] — 2026-05-10
- Initial production release.
- Real-time high-speed market charting using Canvas layouts.
- Dynamic SMC bias engines compute Order Blocks and Breaker Blocks.
- Fastify backend router coupled with PostgreSQL core and TimescaleDB partitions.
