# Offline Data & Storage Keys

## Offline-first design

The frontend is designed to work without a backend. It uses:

- A local seed initializer (`mockData.ts`) to ensure baseline entities exist.
- `localStorage` as the authoritative persistence layer.

## Core local DB keys

- `i2sf_buildings_v1`
- `i2sf_rooms_v1`
- `i2sf_users_v1`
- `i2sf_maintenance_v1`
- `i2sf_seed_source_v1`

## Simulation keys

- `i2sf_simulation_runs_v1`

## Phase 8 keys

- `i2sf_virtual_time_v1`
- `i2sf_campus_mode_v1`

## Advanced systems keys (Phases 9–12)

- `i2sf_campus_events_v1`
- `i2sf_building_aging_v1`
- `i2sf_power_grid_v1`
- `i2sf_grid_alerts_v1`
- `i2sf_building_dependencies_v1`
- `i2sf_overflow_history_v1`

## Intelligence layer keys

- `i2sf_recommendations_v1`

## Other app keys

- Auth:
  - `i2sf_token`
  - `i2sf_user`
  - `i2sf_refresh_token`

- Settings:
  - `i2sf_system_settings_v1`

- Dashboard theme:
  - `i2sf_dashboard_theme_v1`

## Reset instructions

To hard-reset local state during development:

- Open browser DevTools
- Application → Local Storage
- Remove keys (or clear site data)

Then reload the app.
