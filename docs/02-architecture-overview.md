# Architecture Overview

## Goals

- **Offline-first**: works without backend connectivity.
- **Time-aware + event-driven simulation**: behavior changes based on a virtual clock and campus modes.
- **Advanced systems layer**: events, infrastructure aging, grid capacity, and dependencies.
- **Actionable intelligence**: generates human-readable recommendations + reports.

## High-Level Modules (Frontend)

### 1) Local Data Layer

- Seed data is initialized via `src/services/mockData.ts`.
- All core entities (buildings, rooms, maintenance, users) are persisted in `localStorage`.

### 2) Simulation Layer

- Simulation runs are generated and stored locally.
- Simulation services enrich results using **virtual time** multipliers.

Key file:
- `src/services/api/simulationService.ts`

### 3) Virtual Campus Clock (Phase 8)

- A virtual time model with:
  - `timeSlot` (morning/afternoon/evening/night)
  - `dayType` (weekday/weekend/holiday)
  - `campusMode` (regular/exam/event/vacation/maintenance)
- Multiplier output drives time-aware simulation behavior.

Key files:
- `src/types/timeModel.ts`
- `src/services/timeEngine.ts`

### 4) Advanced Systems (Phases 9–12)

- Event Engine (load multipliers)
- Aging Engine (degradation and efficiency loss)
- Grid Engine (transformer utilization + alerts)
- Dependency Engine (overflow + redistribution)

Key folder:
- `src/services/*Engine.ts`

### 5) AI Intelligence Layer (Options 1–4)

- Recommendations: rule-driven engine generating admin actions
- Forecasting: 24-hour load prediction using time + events
- Visual Twin: building risk overview
- Research layer: auto report + JSON/CSV export

Key files:
- `src/services/recommendationEngine.ts`
- `src/components/intelligence/*`
- `src/components/recommendations/*`

## Data Flow (Typical)

1. UI loads `buildings/rooms/maintenance` from local data layer.
2. `timeEngine` provides current virtual time and multipliers.
3. Advanced systems compute additional signals (grid utilization, aging impact, overflow).
4. Intelligence layer reads current context and:
   - produces recommendations,
   - produces forecasts,
   - produces digital twin views,
   - produces research exports.

## Theming

- Dashboard supports **dark/light** theme toggle (scoped).
- New dashboards accept `isLight` to ensure readable colors.
