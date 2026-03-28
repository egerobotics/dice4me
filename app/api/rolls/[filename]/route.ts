import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  // Sanitize filename
  if (!filename.match(/^[a-zA-Z0-9_-]+\.jpg$/)) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const filepath = join(process.cwd(), "data", "rolls", filename);

  try {
    const buffer = await readFile(filepath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
