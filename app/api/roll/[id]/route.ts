import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/roll/[id] - Poll roll status
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const roll = await prisma.roll.findUnique({
    where: { id },
    select: {
      id: true,
      rollNumber: true,
      status: true,
      photoUrl: true,
      createdAt: true,
    },
  });

  if (!roll) {
    return NextResponse.json({ error: "Roll not found" }, { status: 404 });
  }

  return NextResponse.json(roll);
}
