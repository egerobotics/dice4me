import "dotenv/config";

export const config = {
  port: parseInt(process.env.PORT || "3001"),
  apiKey: process.env.DICE4ME_API_KEY || "",
  // BeagleBone PWM pin name (e.g. P9_14, P9_16, P9_21)
  servoPin: process.env.SERVO_PIN || "P9_14",
  // USB cameras
  photoCam: process.env.PHOTO_CAM || "/dev/video0",
  streamCam: process.env.STREAM_CAM || "/dev/video0",
};
