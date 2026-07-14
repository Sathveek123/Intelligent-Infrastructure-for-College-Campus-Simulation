# Troubleshooting

## Map issues

### Map is blank

- Ensure Leaflet CSS is imported:
  - `frontend/src/main.tsx` → `import 'leaflet/dist/leaflet.css'`
- Ensure dependencies installed:

```bash
cd frontend
npm install
```

### Map is slow

- It is lazy-loaded and prefetched.
- If your machine/network is slow, increase the prefetch margin in:
  - `frontend/src/components/map/GmritLiveMapCard.tsx` (`rootMargin`)

## TypeScript build errors

Run from `frontend/`:

```bash
npm run build
```

If you see missing module types:

- ensure `npm install` was run

## LocalStorage reset

If data becomes inconsistent:

- DevTools → Application → Local Storage
- Clear keys beginning with `i2sf_`
- Reload the page
