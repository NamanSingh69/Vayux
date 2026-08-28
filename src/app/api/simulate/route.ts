import { NextResponse } from "next/server";

const atmosphericEngineUrl =
  process.env.ATMOSPHERIC_ENGINE_URL?.replace(/\/$/, "") ??
  "http://localhost:8000";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const response = await fetch(
      `${atmosphericEngineUrl}/api/v1/policy/simulate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `Backend returned ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Proxy error calling atmospheric engine:", error);
    return NextResponse.json(
      { error: "Failed to connect to atmospheric physics engine" },
      { status: 500 }
    );
  }
}
