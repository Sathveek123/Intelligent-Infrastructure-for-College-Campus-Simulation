# GMRIT Live Map (Leaflet)

## Goal

Provide a **live street map** view for the GMRIT campus inside the Dashboard.

## Implementation

### Libraries

- `leaflet`
- `react-leaflet`

### Files

- `frontend/src/components/map/GmritLiveMapInner.tsx`
  - Leaflet map + tile layer + marker
  - Fixes Leaflet marker icons for Vite builds

- `frontend/src/components/map/GmritLiveMapCard.tsx`
  - Lazy loads `GmritLiveMapInner`
  - Prefetches the lazy chunk when near viewport

- `frontend/src/main.tsx`
  - Global import:
    - `leaflet/dist/leaflet.css`

### Coordinates

Default approximate campus pin:

- Latitude: `18.4629`
- Longitude: `83.6596`

## Performance & smoothness

Optimizations applied:

- Prefetch when near viewport via `IntersectionObserver`
- Prefetch in idle via `requestIdleCallback`
- Leaflet tuned:
  - `preferCanvas`
  - `zoomAnimation={false}`
  - `markerZoomAnimation={false}`
  - `fadeAnimation={false}`
  - `updateWhenIdle`
  - `updateWhenZooming={false}`

## Troubleshooting

If the map is blank:

- Verify Leaflet CSS is imported in `main.tsx`
- Verify you ran `npm install` inside `frontend/`
