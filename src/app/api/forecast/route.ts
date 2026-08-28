import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const backendUrl = process.env.BACKEND_API_URL || "https://vayux.onrender.com";
  const endpoint = backendUrl.endsWith("/") ? backendUrl.slice(0, -1) : backendUrl;

  try {
    let response = await fetch(`${endpoint}/api/v1/forecast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: body.latitude ?? 28.6139,
        longitude: body.longitude ?? 77.2090,
        history_pm25: body.history_pm25 ?? [120, 135, 140, 155, 160, 150, 145],
        fire_hotspots: body.fire_hotspots ?? [],
      }),
      signal: AbortSignal.timeout(4000),
    });

    if (response.status === 404) {
      response = await fetch(`${endpoint}/forecast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: body.latitude ?? 28.6139,
          longitude: body.longitude ?? 77.2090,
          history_pm25: body.history_pm25 ?? [120, 135, 140, 155, 160, 150, 145],
          fire_hotspots: body.fire_hotspots ?? [],
        }),
        signal: AbortSignal.timeout(4000),
      });
    }

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }
  } catch {
    // Fall through to phase-aligned physics fallback
  }

  const horizon = 72;
  const baseAqi = typeof body.baseline_aqi === "number" && body.baseline_aqi > 0
    ? body.baseline_aqi
    : Array.isArray(body.history_pm25) && body.history_pm25.length > 0
      ? Math.round(body.history_pm25[body.history_pm25.length - 1] / 0.75)
      : 260;

  const now = new Date();
  const currentHourOfDay = now.getHours();
  const basePhase = ((currentHourOfDay - 9) * Math.PI) / 12;
  const baseSin = Math.sin(basePhase);

  const aqi_p50 = Array.from({ length: horizon }, (_, idx) => {
    const forecastHourOffset = idx + 1;
    const hourOfDay = (currentHourOfDay + forecastHourOffset) % 24;
    const hourPhase = ((hourOfDay - 9) * Math.PI) / 12;
    const diurnalDiff = Math.sin(hourPhase) - baseSin;
    const diurnalMultiplier = 1.0 + 0.20 * diurnalDiff - (forecastHourOffset / 250);
    return Math.max(20, Math.min(500, Math.round(baseAqi * diurnalMultiplier)));
  });

  return NextResponse.json({
    status: "FALLBACK_CALCULATED",
    execution_time_ms: 10.0,
    horizon_hours: horizon,
    aqi_p50,
    pm25_p50: aqi_p50.map((a) => Math.round(a * 0.75)),
  });
}
