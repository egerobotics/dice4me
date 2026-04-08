import { getLatestFrame } from "./stream.js";

export async function capturePhoto(): Promise<Buffer> {
  const frame = await getLatestFrame();
  if (!frame) {
    throw new Error("No frame available from camera");
  }
  return frame;
}
