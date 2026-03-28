import "dotenv/config";

export const config = {
  port: parseInt(process.env.PORT || "3001"),
  apiKey: process.env.DICE4ME_API_KEY || "",
  servoPin: parseInt(process.env.SERVO_PIN || "18"),
  // Servo pulse widths in microseconds
  servoLeft: parseInt(process.env.SERVO_LEFT || "500"),
  servoRight: parseInt(process.env.SERVO_RIGHT || "2500"),
  servoCenter: parseInt(process.env.SERVO_CENTER || "1500"),
  // USB cameras - /dev/video0, /dev/video2, etc.
  photoCam: process.env.PHOTO_CAM || "/dev/video2",
  streamCam: process.env.STREAM_CAM || "/dev/video2",
};
