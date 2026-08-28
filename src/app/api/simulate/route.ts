import { NextResponse } from "next/server";
import { simulatePolicyImpact } from "@/lib/aqi/policy";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  
  const backendUrl = process.env.BACKEND_API_URL || "https://vayux.onrender.com";

  try {
    const response = await fetch(`${backendUrl}/api/v1/policy/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseline_aqi: body.baseline_aqi ?? 340,
        baseline_pm25: body.baseline_pm25 ?? 260.0,
        vehicular: body.vehicular ?? 1.0,
        stubble: body.stubble ?? 1.0,
        industrial: body.industrial ?? 1.0,
        dust: body.dust ?? 1.0,
      }),
      signal: AbortSignal.timeout(3000),
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error("Failed to reach Render API, falling back to local simulation", error);
  }

  const result = simulatePolicyImpact({
    baseline_aqi: body.baseline_aqi ?? 340,
    baseline_pm25: body.baseline_pm25 ?? 260.0,
    vehicular: body.vehicular ?? 1.0,
    stubble: body.stubble ?? 1.0,
    industrial: body.industrial ?? 1.0,
    dust: body.dust ?? 1.0,
  });

  return NextResponse.json(result);
}