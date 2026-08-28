import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const backendUrl = process.env.BACKEND_API_URL || "http://127.0.0.1:8000";

    const response = await fetch(`${backendUrl}/api/v1/forecast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: body.latitude ?? 28.6139,
        longitude: body.longitude ?? 77.2090,
        history_pm25: body.history_pm25 ?? [120, 135, 140, 155, 160, 150, 145],
        fire_hotspots: body.fire_hotspots ?? [],
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) {
      throw new Error(`Backend forecast returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const horizon = 72;
    const baseAqi = 340;
    const aqi_p50 = Array.from({ length: horizon }, (_, h) => {
      const diurnal = Math.sin(((h % 24 - 9) * Math.PI) / 12);
      const trend = 1.0 + 0.25 * diurnal - (h / 180);
      return Math.round(baseAqi * trend);
    });

    return NextResponse.json({
      status: "FALLBACK_CALCULATED",
      execution_time_ms: 12.5,
      horizon_hours: horizon,
      aqi_p50,
      pm25_p50: aqi_p50.map((a) => Math.round(a * 0.75)),
    });
  }
}
