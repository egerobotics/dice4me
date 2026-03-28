import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { triggerPiRoll } from "@/lib/pi";

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY!;

// POST /api/roll - Trigger a new dice roll
export async function POST(req: NextRequest) {
  // Verify Turnstile token
  const body = await req.json().catch(() => ({}));
  const { token } = body as { token?: string };

  if (!token) {
    return NextResponse.json({ error: "Verification required." }, { status: 400 });
  }

  const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `secret=${TURNSTILE_SECRET}&response=${token}`,
  });
  const verify = await verifyRes.json() as { success: boolean };

  if (!verify.success) {
    return NextResponse.json({ error: "Verification failed." }, { status: 403 });
  }

  // Rate limit: check if there's an active roll
  const activeRoll = await prisma.roll.findFirst({
    where: {
      status: { in: ["pending", "rolling"] },
      createdAt: { gte: new Date(Date.now() - 30000) },
    },
  });

  if (activeRoll) {
    return NextResponse.json(
      { error: "Dice is currently rolling, please wait." },
      { status: 429 }
    );
  }

  const roll = await prisma.roll.create({
    data: { triggeredBy: "web" },
  });

  // Build callback URL
  const host = req.headers.get("host") || "dice4.me";
  const protocol = req.headers.get("x-forwarded-proto") || "https";
  const callbackUrl = `${protocol}://${host}/api/roll/callback`;

  // Trigger Pi (fire and forget - don't block the response)
  triggerPiRoll(roll.id, callbackUrl).catch(async (err) => {
    console.error("Pi trigger error:", err);
    await prisma.roll.update({
      where: { id: roll.id },
      data: { status: "failed", errorMessage: String(err) },
    });
  });

  return NextResponse.json({ rollId: roll.id, rollNumber: roll.rollNumber });
}

// GET /api/roll - Get recent rolls (for history)
export async function GET(req: NextRequest) {
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10");

  const rolls = await prisma.roll.findMany({
    where: { status: "completed" },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 50),
    select: {
      id: true,
      rollNumber: true,
      photoUrl: true,
      triggeredBy: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ rolls });
}
