import Fastify from "fastify";
import { config } from "./config.js";
import { rollDice } from "./servo.js";
import { capturePhoto } from "./camera.js";
import { startStream, getLatestFrame } from "./stream.js";

const app = Fastify({ logger: { level: "info" } });

// Health check
app.get("/health", { logLevel: "silent" } as never, async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

// Single frame snapshot from camera (stream not supported on BBB)
app.get("/snapshot", { logLevel: "silent" } as never, async (_request, reply) => {
  const frame = await getLatestFrame();
  if (!frame) {
    return reply.code(503).send({ error: "Camera not ready" });
  }
  reply.header("Content-Type", "image/jpeg");
  reply.header("Access-Control-Allow-Origin", "*");
  return reply.send(frame);
});

// Trigger dice roll
app.post<{
  Body: { rollId: string; callbackUrl: string };
}>("/trigger", async (request, reply) => {
  // Validate API key
  const apiKey = request.headers["x-api-key"];
  if (apiKey !== config.apiKey) {
    return reply.code(401).send({ error: "Unauthorized" });
  }

  const { rollId, callbackUrl } = request.body;

  if (!rollId || !callbackUrl) {
    return reply.code(400).send({ error: "rollId and callbackUrl required" });
  }

  // Respond immediately, process in background
  reply.code(202).send({ accepted: true, rollId });

  // Background processing
  setImmediate(async () => {
    try {
      app.log.info(`Rolling dice for ${rollId}...`);

      // 1. Move servo to roll dice
      await rollDice();

      // 2. Capture photo from stream frame
      app.log.info("Capturing photo...");
      const photoBuffer = await capturePhoto();

      // 3. Send result back to VPS
      const res = await fetch(callbackUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.apiKey,
        },
        body: JSON.stringify({
          rollId,
          photo: photoBuffer.toString("base64"),
        }),
      });

      if (!res.ok) {
        app.log.error(`Callback failed: ${res.status}`);
      } else {
        app.log.info(`Roll ${rollId} completed successfully`);
      }
    } catch (err) {
      app.log.error(`Roll ${rollId} failed: ${err}`);

      // Try to notify VPS of failure
      try {
        await fetch(callbackUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": config.apiKey,
          },
          body: JSON.stringify({
            rollId,
            photo: null,
          }),
        });
      } catch {
        // ignore
      }
    }
  });
});

// Start stream and server
startStream();

app.listen({ port: config.port, host: "0.0.0.0" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`dice4me Pi server running on port ${config.port}`);
});
