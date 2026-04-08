import { execFile } from "child_process";
import { readFile, unlink } from "fs/promises";
import { promisify } from "util";
import { config } from "./config.js";

const execFileAsync = promisify(execFile);
const SNAPSHOT_PATH = "/tmp/dice4me_snap.jpg";

let capturing = false;

// Capture a fresh snapshot from the camera (on demand)
async function captureFresh(): Promise<Buffer | null> {
  if (capturing) return null;
  capturing = true;

  try {
    await execFileAsync("fswebcam", [
      "--no-banner",
      "-d", config.streamCam,
      "-r", "640x480",
      "-p", "MJPEG",
      "-D", "2",       // delay 2 seconds before capture (lets auto-exposure settle)
      "-S", "30",      // skip 30 frames
      "--no-shadow",
      SNAPSHOT_PATH,
    ], { timeout: 15000 });

    const buffer = await readFile(SNAPSHOT_PATH);
    await unlink(SNAPSHOT_PATH).catch(() => {});
    return buffer;
  } catch (err) {
    console.error("Capture error:", err);
    return null;
  } finally {
    capturing = false;
  }
}

let latestFrame: Buffer | null = null;
let lastCaptureTime = 0;

export function startStream() {
  console.log(`Camera: ${config.streamCam} (on-demand snapshot mode)`);
}

export async function getLatestFrame(): Promise<Buffer | null> {
  // Cache for 500ms to avoid hammering the camera
  if (latestFrame && Date.now() - lastCaptureTime < 500) {
    return latestFrame;
  }

  const fresh = await captureFresh();
  if (fresh) {
    latestFrame = fresh;
    lastCaptureTime = Date.now();
  }
  return latestFrame;
}

// No-op for compat with index.ts
export function addClient(_cb: (chunk: Buffer) => void) {
  return () => {};
}
