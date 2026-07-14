# Phase 8 — Virtual Campus Clock (Time-Aware Simulation)

## Purpose

Phase 8 introduces a **virtual campus clock** and time multipliers so simulation output matches real-world campus patterns.

## What it includes

- **VirtualTime model**
  - Tracks current date/time, time slot, day type, campus mode, academic week.

- **Campus modes**
  - `regular`, `exam`, `event`, `vacation`, `maintenance`

- **Time slots**
  - `morning`, `afternoon`, `evening`, `night`

- **Multipliers**
  - occupancy multiplier
  - energy multiplier
  - AC load multiplier
  - lab usage multiplier

## Key files

- Types
  - `frontend/src/types/timeModel.ts`

- Engine
  - `frontend/src/services/timeEngine.ts`

- Time-aware simulation helpers
  - `frontend/src/services/timeAwareSimulation.ts`

- UI widgets
  - `frontend/src/components/time/CampusModeControl.tsx`
  - `frontend/src/components/time/HourlyLoadChart.tsx`

## How the UI uses it

- The dashboard widgets display the current virtual time and let admins:
  - change campus mode
  - advance time
  - view multiplier effects in charts

## How simulations use it

- Simulation services fetch multipliers from `timeEngine` and adjust:
  - estimated occupancy
  - estimated energy

This makes simulation runs time-contextual and realistic.
