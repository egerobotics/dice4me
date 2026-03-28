import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeFile } from "fs/promises";
import { join } from "path";
import sharp from "sharp";

const API_KEY = process.env.DICE4ME_API_KEY!;

// POST /api/roll/callback - Pi sends result here
export async function POST(req: NextRequest) {
  // Validate API key
  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { rollId, photo } = body as {
    rollId: string;
    photo: string | null; // base64 encoded JPEG
  };

  if (!rollId) {
    return NextResponse.json({ error: "rollId required" }, { status: 400 });
  }

  const roll = await prisma.roll.findUnique({ where: { id: rollId } });
  if (!roll) {
    return NextResponse.json({ error: "Roll not found" }, { status: 404 });
  }

  // Save photo to disk with roll number overlay
  let photoUrl: string | null = null;
  if (photo) {
    const buffer = Buffer.from(photo, "base64");
    // Build label: roll number + source info
    const numberLabel = `#${roll.rollNumber}`;
    const sourceLabel = roll.triggeredBy === "twitter" && roll.twitterUser
      ? `𝕏 ${roll.twitterUser}`
      : null;

    // Create SVG text overlay
    const metadata = await sharp(buffer).metadata();
    const width = metadata.width || 1280;
    const height = metadata.height || 720;
    const fontSize = Math.round(height * 0.06);
    const padding = Math.round(fontSize * 0.5);

    const numberWidth = padding * 2 + fontSize * numberLabel.length * 0.6;
    const sourceWidth = sourceLabel ? padding * 2 + fontSize * sourceLabel.length * 0.55 : 0;

    let svgContent = `
      <rect x="${width - numberWidth}" y="${height - fontSize - padding * 2}"
            width="${numberWidth}" height="${fontSize + padding * 2}"
            rx="8" fill="rgba(0,0,0,0.7)"/>
      <text x="${width - padding}" y="${height - padding}"
            font-family="monospace" font-size="${fontSize}" font-weight="bold"
            fill="white" text-anchor="end">${numberLabel}</text>
    `;

    if (sourceLabel) {
      svgContent += `
        <rect x="${width - sourceWidth}" y="${height - (fontSize + padding * 2) * 2 - 4}"
              width="${sourceWidth}" height="${fontSize + padding * 2}"
              rx="8" fill="rgba(0,0,0,0.7)"/>
        <text x="${width - padding}" y="${height - (fontSize + padding * 2) - 4 - padding}"
              font-family="monospace" font-size="${fontSize}" font-weight="bold"
              fill="white" text-anchor="end">${sourceLabel}</text>
      `;
    }

    const svgOverlay = Buffer.from(`
      <svg width="${width}" height="${height}">
        ${svgContent}
      </svg>
    `);

    const processed = await sharp(buffer)
      .composite([{ input: svgOverlay, top: 0, left: 0 }])
      .jpeg({ quality: 90 })
      .toBuffer();

    const filename = `${rollId}.jpg`;
    const filepath = join(process.cwd(), "data", "rolls", filename);
    await writeFile(filepath, processed);
    photoUrl = `/api/rolls/${filename}`;
  }

  // Update roll record
  await prisma.roll.update({
    where: { id: rollId },
    data: {
      status: "completed",
      photoUrl,
      completedAt: new Date(),
    },
  });

  // If triggered by Twitter, post reply
  if (roll.triggeredBy === "twitter" && roll.twitterTweetId) {
    try {
      const { postTwitterReply } = await import("@/lib/twitter");
      await postTwitterReply(
        roll.twitterTweetId,
        photoUrl,
        rollId
      );
    } catch (err) {
      console.error("Twitter reply error:", err);
    }
  }

  // If triggered by web, post result as a new tweet
  if (roll.triggeredBy === "web" && photoUrl) {
    try {
      const { postWebRollTweet } = await import("@/lib/twitter");
      await postWebRollTweet(roll.rollNumber, photoUrl);
    } catch (err) {
      console.error("Web roll tweet error:", err);
    }
  }

  return NextResponse.json({ success: true });
}
