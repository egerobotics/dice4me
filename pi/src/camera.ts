import { getLatestFrame } from "./stream.js";

// Capture photo from the latest stream frame - no need to open camera separately
export async function capturePhoto(): Promise<Buffer> {
  const frame = getLatestFrame();
  if (!frame) {
    throw new Error("No frame available from stream");
  }
  return frame;
}
