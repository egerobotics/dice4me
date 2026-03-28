import { spawn, ChildProcess } from "child_process";
import { config } from "./config.js";

let ffmpegProcess: ChildProcess | null = null;
const clients: Set<(chunk: Buffer) => void> = new Set();
let latestFrame: Buffer | null = null;
let started = false;
let paused = false;

export function startStream() {
  if (ffmpegProcess || paused) return;

  ffmpegProcess = spawn("ffmpeg", [
    "-f", "v4l2",
    "-framerate", "30",
    "-video_size", "1280x720",
    "-i", config.streamCam,
    "-f", "mjpeg",
    "-q:v", "3",
    "-r", "15",
    "pipe:1",
  ], { stdio: ["ignore", "pipe", "ignore"] });

  let buffer = Buffer.alloc(0);

  ffmpegProcess.stdout!.on("data", (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (true) {
      const start = buffer.indexOf(Buffer.from([0xff, 0xd8]));
      if (start === -1) break;

      const end = buffer.indexOf(Buffer.from([0xff, 0xd9]), start + 2);
      if (end === -1) break;

      const frame = buffer.subarray(start, end + 2);
      buffer = buffer.subarray(end + 2);

      latestFrame = frame;
      for (const cb of clients) {
        cb(frame);
      }
    }
  });

  ffmpegProcess.on("close", () => {
    ffmpegProcess = null;
    if (!paused) {
      setTimeout(startStream, 2000);
    }
  });

  if (!started) {
    console.log(`Stream started from ${config.streamCam}`);
    started = true;
  }
}

// Pause stream to free the camera for photo capture
export function pauseStream(): Promise<void> {
  return new Promise((resolve) => {
    paused = true;
    if (!ffmpegProcess) {
      resolve();
      return;
    }
    ffmpegProcess.on("close", () => resolve());
    ffmpegProcess.kill("SIGTERM");
  });
}

// Resume stream after photo capture
export function resumeStream() {
  paused = false;
  startStream();
}

export function getLatestFrame(): Buffer | null {
  return latestFrame;
}

export function addClient(cb: (chunk: Buffer) => void) {
  clients.add(cb);
  return () => clients.delete(cb);
}
