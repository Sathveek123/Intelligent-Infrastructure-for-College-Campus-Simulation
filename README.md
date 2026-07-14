# Intelligent Infrastructure Simulation Framework for College Campus Management

## 1. Project Overview

This project is a digital simulation system designed to model, monitor, and analyze college infrastructure in real-time.

It allows administrators to:

- Monitor building utilization
- Track classroom occupancy
- Simulate infrastructure load
- Analyze energy consumption
- Predict maintenance needs
- Optimize campus resource allocation

Think of it like a mini digital twin of a college campus.

Traditional campus management is manual and reactive.
This system makes it data-driven and predictive.

## 2. Objective

- Build a structured infrastructure simulation model
- Provide real-time visualization of campus assets
- Simulate infrastructure load & resource consumption
- Support decision-making using analytics
- Reduce operational cost through optimization

## 3. Real-World Usage

- Classroom allocation planning
- Event space management
- Electricity usage monitoring
- Hostel occupancy tracking
- Infrastructure expansion planning
- Emergency evacuation simulation

## 4. Impact & Benefits

### Operational Efficiency

Better space utilization = less wastage.

### Cost Optimization

Energy & maintenance cost reduction.

### Predictive Maintenance

Detect high-usage infrastructure before failure.

### Smarter Campus Planning

Data-driven decisions for new buildings or renovation.

### Scalable Model

Can expand into a full Digital Twin in future.

---

## Documentation

Full documentation is available in:

- `docs/README.md`

Recommended reading order:

- `docs/01-quickstart.md`
- `docs/02-architecture-overview.md`
- `docs/03-offline-data-and-storage-keys.md`
- `docs/04-phase-8-virtual-campus-clock.md`
- `docs/05-phases-9-12-advanced-systems.md`
- `docs/06-gmrit-live-map-leaflet.md`
- `docs/07-ultimate-intelligence-layer.md`
- `docs/08-troubleshooting.md`

## How to Run (Frontend)

### Prerequisites

- Node.js 18+

### Install & start

From `frontend/`:

```bash
npm install
npm run dev
```

### Build

```bash
npm run build
```

## Offline / Local Data Mode

The frontend is designed to work offline using a local `db.json` seed and `localStorage` as the primary data layer.

## Demo Credentials (Local)

- Admin: `admin@gmrit.edu.in` / `admin123`
- Staff: `staff@gmrit.edu.in` / `staff123`
