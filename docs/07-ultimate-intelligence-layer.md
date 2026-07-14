# Ultimate Intelligence Layer (Options 1–4 Combined)

This layer is designed to convert raw simulation/system signals into **human-readable decisions**, forecasts, and offline exports.

## UI Entry Point

- Dashboard → **AI Intelligence Layer** panel

Main wrapper:
- `frontend/src/components/intelligence/IntelligenceLayerPanel.tsx`

Tabs:

1. Recommendations
2. Forecast
3. Visual Twin
4. Research

---

## Option 1 — AI Recommendation Engine

### Purpose

Generate actionable recommendations that admins can accept, dismiss (with reason), or mark implemented.

### Files

- Types:
  - `frontend/src/types/recommendationModel.ts`

- Engine:
  - `frontend/src/services/recommendationEngine.ts`

- UI:
  - `frontend/src/components/recommendations/RecommendationsDashboard.tsx`
  - `frontend/src/components/recommendations/RecommendationCard.tsx`

### Storage

- `i2sf_recommendations_v1`

### Actions

- Generate: evaluates rule set against the current campus context.
- Accept: changes status to `accepted`.
- Dismiss: changes status to `dismissed` and records `dismissalReason`.
- Mark Implemented: changes status to `implemented`.

---

## Option 2 — Forecasting (24h)

### Purpose

Predict next 24 hours of occupancy and energy using:

- virtual time slots and campus mode (`timeEngine`)
- active event multipliers (`eventEngine`)
- baseline building values

### File

- `frontend/src/components/intelligence/ForecastDashboard.tsx`

---

## Option 3 — Visual Twin

### Purpose

Show a digital twin style risk overview across buildings.

- Ranks buildings by risk
- Displays per-building cards with computed risk score

### File

- `frontend/src/components/intelligence/VisualTwinDashboard.tsx`

---

## Option 4 — Research Layer

### Purpose

Auto-generate a short executive narrative and exportable artifacts.

Exports:

- JSON
- CSV

### File

- `frontend/src/components/intelligence/ResearchDashboard.tsx`
