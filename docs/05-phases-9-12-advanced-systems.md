# Phases 9–12 — Advanced Systems Layer

## Goal

Phases 9–12 add a realistic, dynamic campus “systems layer” that modifies load and risk using:

- Events
- Aging
- Grid capacity
- Inter-building dependencies

All engines are **offline-first** and persist to `localStorage`.

---

## Phase 9 — Event-Based Load

### Purpose

Campus events increase or decrease occupancy and energy loads.

### Key files

- `frontend/src/types/eventModel.ts`
- `frontend/src/services/eventEngine.ts`

### Storage

- `i2sf_campus_events_v1`

---

## Phase 10 — Infrastructure Aging

### Purpose

Buildings degrade over time, reducing efficiency and increasing maintenance frequency.

### Key files

- `frontend/src/types/agingModel.ts`
- `frontend/src/services/agingEngine.ts`

### Storage

- `i2sf_building_aging_v1`

---

## Phase 11 — Grid Capacity & Transformers

### Purpose

Models campus power grid utilization, transformer capacities, and alerts.

### Key files

- `frontend/src/types/gridModel.ts`
- `frontend/src/services/gridEngine.ts`

### Storage

- `i2sf_power_grid_v1`
- `i2sf_grid_alerts_v1`

---

## Phase 12 — Inter-Building Dependencies

### Purpose

Models building overflow and load redistribution (e.g., students moved to alternate blocks).

### Key files

- `frontend/src/types/dependencyModel.ts`
- `frontend/src/services/dependencyEngine.ts`

### Storage

- `i2sf_building_dependencies_v1`
- `i2sf_overflow_history_v1`

---

## Dashboard Integration

Advanced Systems UI:

- `frontend/src/components/advanced/AdvancedSystemsPanel.tsx`
- Integrated in:
  - `frontend/src/pages/dashboard/DashboardPage.tsx`

The panel refreshes periodically and shows:

- active events
- aging summary
- grid utilization + transformer status
- dependency overflow history
