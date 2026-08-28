import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const backendUrl = process.env.BACKEND_API_URL || "https://vayux.onrender.com";
    const endpoint = backendUrl.endsWith("/") ? backendUrl.slice(0, -1) : backendUrl;

    const v_scale = body.vehicular_scale ?? body.vehicular_multiplier ?? body.vehicular ?? 1.0;
    const s_scale = body.stubble_scale ?? body.stubble_multiplier ?? body.stubble ?? 1.0;
    const base_aqi = body.baseline_aqi ?? 340;
    const base_pm25 = body.baseline_pm25 ?? (base_aqi * 0.7);
    const ind_scale = body.industrial_scale ?? body.industrial ?? 1.0;
    const dust_scale = body.dust_scale ?? body.dust ?? 1.0;

    // THE FIX: We build a URL Query String because FastAPI expects them in the URL!
    const queryParams = new URLSearchParams({
      baseline_aqi: base_aqi.toString(),
      baseline_pm25: base_pm25.toString(),
      vehicular_scale: v_scale.toString(),
      stubble_scale: s_scale.toString(),
      industrial_scale: ind_scale.toString(),
      dust_scale: dust_scale.toString(),
    }).toString();

    // We send BOTH the query string (for FastAPI) and the body just to be safe
    let response = await fetch(`${endpoint}/api/v1/policy/simulate?${queryParams}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.status === 404) {
      response = await fetch(`${endpoint}/simulate?${queryParams}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    if (!response.ok) {
      throw new Error(`Python backend failed with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("Simulation Proxy Error:", error);
    return NextResponse.json(
      { error: "Simulation engine failed to compute." },
      { status: 500 }
    );
  }
}