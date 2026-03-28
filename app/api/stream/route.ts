import { NextResponse } from "next/server";

const PI_BASE = process.env.PI_TRIGGER_URL?.replace("/trigger", "") || "http://85.105.194.210:3001";

// GET /api/stream - Proxy snapshot from Pi
export async function GET() {
  try {
    const res = await fetch(`${PI_BASE}/snapshot`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Stream unavailable" }, { status: 503 });
    }

    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch {
    return NextResponse.json({ error: "Stream unavailable" }, { status: 503 });
  }
}
