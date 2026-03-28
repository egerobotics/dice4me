import { NextRequest, NextResponse } from "next/server";
import { checkMentions } from "@/lib/twitter";
import { prisma } from "@/lib/db";
import { triggerPiRoll } from "@/lib/pi";

const CRON_SECRET = process.env.CRON_SECRET!;

// GET /api/cron/twitter - Check Twitter mentions and trigger rolls
export async function GET(req: NextRequest) {
  // Validate cron secret
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check for new mentions
    const count = await checkMentions();

    // Trigger pending Twitter rolls
    const pendingRolls = await prisma.roll.findMany({
      where: {
        triggeredBy: "twitter",
        status: "pending",
      },
    });

    const host = req.headers.get("host") || "dice4.me";
    const protocol = req.headers.get("x-forwarded-proto") || "https";
    const callbackUrl = `${protocol}://${host}/api/roll/callback`;

    for (const roll of pendingRolls) {
      try {
        await triggerPiRoll(roll.id, callbackUrl);
        await prisma.roll.update({
          where: { id: roll.id },
          data: { status: "rolling" },
        });
        // Only trigger one roll at a time (physical constraint)
        break;
      } catch (err) {
        console.error(`Failed to trigger roll ${roll.id}:`, err);
        await prisma.roll.update({
          where: { id: roll.id },
          data: { status: "failed", errorMessage: String(err) },
        });
      }
    }

    return NextResponse.json({ mentionsFound: count, triggered: pendingRolls.length > 0 });
  } catch (err) {
    console.error("Twitter cron error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
