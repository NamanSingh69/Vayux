# VayuX (वायुX): Domain Context & Architecture Specification

**Domain**: Air Pollution–Weather Coupled Forecasting System (Delhi NCR Focus)  
**Hackathon**: Smart India Hackathon 2026 (Ministry of Environment, Forest and Climate Change)  
**Repository**: https://github.com/sadSanta-07/Vayux

---

## 1. Domain Terminology & Invariants

- **CAAQMS**: Continuous Ambient Air Quality Monitoring Stations (105+ official stations across Delhi NCR monitored by CPCB, DPCC, HSPCB, and UPPCB).
- **CPCB AQI Standard**: Indian National Air Quality Index calculation using sub-index piecewise linear interpolation for PM2.5, PM10, NO2, SO2, CO, O3, NH3.
- **Atmospheric Boundary Layer (PBLH)**: Planetary Boundary Layer Height. During winter inversion episodes, PBLH collapses from ~1500m down to <350m, creating an airtight trapping ceiling over the capital.
- **Two-Way Weather–Chemistry Coupling**:
  - *Chemistry -> Meteorology*: Aerosol optical depth blocks incoming solar radiation via the Beer-Lambert law (I(z)=I_0 e^{-\\alpha \\cdot \\text{PM}_{2.5}}), suppressing surface heating by up to -66.7%.
  - *Meteorology -> Chemistry*: Surface cooling intensifies the temperature inversion lid, compressing the mixing volume and dramatically escalating ground particulate concentrations.
- **Foundation Forecaster**: Zero-shot time-series forecasting powered by amazon/chronos-bolt-tiny coupled with a physical residual adapter estimating p10, p50, p90 predictive quantiles across a 72-hour future horizon.
- **VayuVani (वायुवाणी)**: Multimodal ambient voice co-pilot streaming bidirectional 16kHz audio over WebSockets using Google's gemini-2.5-flash-native-audio-latest engine.

---

## 2. Key Code Locations

- **Data Normalization & Ingestion**: src/lib/aqi/data-gov.ts, src/lib/aqi/normalize.ts, src/lib/aqi/cpcb.ts
- **Map & UI Component**: src/components/map/delhi-aqi-map.tsx, src/components/map/map.module.css
- **Station Deep-Dive Drawer**: src/components/map/station-detail-drawer.tsx
- **72h Forecast Timeline Scrubber**: src/components/map/forecast-timeline.tsx, src/app/api/forecast/route.ts
- **Policy Sandbox**: src/components/map/policy-sandbox.tsx, ackend/policy.py
- **Voice AI (VayuVani)**: ackend/jarvis/live_session.py, src/hooks/useJarvisVoice.ts
