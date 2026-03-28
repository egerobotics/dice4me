import { execFile } from "child_process";
import { promisify } from "util";
import { config } from "./config.js";

const execFileAsync = promisify(execFile);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function rollDice() {
  console.log("Rolling dice - moving servo...");

  const script = `
from gpiozero import Servo
from gpiozero.pins.lgpio import LGPIOFactory
from time import sleep

factory = LGPIOFactory()
s = Servo(${config.servoPin}, pin_factory=factory, min_pulse_width=0.0005, max_pulse_width=0.0025)

for i in range(3):
    s.value = -0.5
    sleep(0.3)
    s.value = 0.5
    sleep(0.3)

s.value = 0
sleep(1)
s.close()
`;

  try {
    await execFileAsync("python3", ["-c", script], { timeout: 10000 });
  } catch (err) {
    console.error("Servo error:", err);
  }

  await sleep(2000);
  console.log("Dice settled.");
}
