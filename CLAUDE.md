# VayuX project guide

## Purpose

VayuX is a map-first live AQI tracker for Delhi NCR. The current product scope is only the full-screen home-page map: a subdued basemap, interpolated AQI surface, actual CPCB stations, compact status, legend, and station popup.

Do not add dashboards, charts, authentication, forecasts, historical data, alerts, search, sidebars, pollutant selectors, or health recommendations unless the user explicitly expands the scope.

## Stack

- Next.js App Router, React, and TypeScript
- MapLibre GL JS with the OpenFreeMap Positron style
- GSAP for restrained interface and map-control motion
- CPCB records from data.gov.in through the server-only `/api/aqi` route
- Turf IDW interpolation performed server-side
- PostgreSQL and Drizzle for local persistence infrastructure

No Google Maps, Mapbox, MapTiler, WAQI, Leaflet, or paid map APIs.

## Code map

- `src/app/page.tsx`: map-only home route
- `src/app/api/aqi/route.ts`: browser-facing AQI endpoint
- `src/components/map/`: MapLibre rendering and overlays
- `src/lib/aqi/data-gov.ts`: server-only government adapter
- `src/lib/aqi/normalize.ts`: malformed-record filtering and station grouping
- `src/lib/aqi/cpcb.ts`: canonical CPCB breakpoints, categories, and colors
- `src/lib/aqi/interpolate.ts`: buffered Delhi NCR IDW grid
- `public/maplibre/`: explicit MapLibre worker files required by Turbopack
- `docker-compose.yml`: local PostgreSQL

## Invariants

- Keep `DATA_GOV_IN_API_KEY` server-side; never use a `NEXT_PUBLIC_` secret.
- Preserve the map-first, no-scroll layout and OpenStreetMap/OpenFreeMap attribution.
- Render stations and the interpolated field with MapLibre sources/layers, not React markers.
- Keep basemap symbol layers above the AQI surface and station circles above it.
- Refresh GeoJSON with `setData()`; do not recreate the map instance.
- A failed AQI request must leave the basemap usable.
- Keep CPCB thresholds and colors centralized in `src/lib/aqi/cpcb.ts`.
- Preserve user changes and avoid unrelated rewrites.

## Local workflow

Follow `README.md` for setup. Before handing off code changes, run:

```bash
npx tsc --noEmit
git diff --check
```

For map changes, also load `/` in a browser and verify the basemap, AQI surface, labels, station interaction, attribution, and mobile viewport behavior.
