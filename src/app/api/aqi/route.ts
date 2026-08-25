import { NextResponse } from "next/server";
import { getNcrAqi } from "@/lib/aqi";

export const revalidate = 900;
// Keep the hourly CPCB request cached in the adapter, but never cache a fully
// transformed API response across a code/data-shape correction.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await getNcrAqi();
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=900" },
    });
  } catch (error) {
    console.error("Unable to build Delhi NCR AQI response", error);
    return NextResponse.json({ error: "AQI data unavailable" }, { status: 503 });
  }
}
