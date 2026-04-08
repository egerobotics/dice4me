import { writeFile } from "fs/promises";

// BeagleBone P9_14 = pwmchip5/pwm0 (ehrpwm1A)
const PWM_CHIP = "/sys/class/pwm/pwmchip5";
const PWM_PIN = `${PWM_CHIP}/pwm0`;
const PINMUX_STATE = "/sys/devices/platform/ocp/ocp:P9_14_pinmux/state";

// Servo at 50Hz: period = 20ms (20_000_000 ns)
// Pulse widths: 1ms (left) - 1.5ms (center) - 2ms (right)
const PERIOD_NS = 20_000_000;
const PULSE_LEFT_NS = 1_200_000;
const PULSE_CENTER_NS = 1_500_000;
const PULSE_RIGHT_NS = 1_800_000;

let setupDone = false;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tryWrite(path: string, value: string) {
  try {
    await writeFile(path, value);
  } catch {
    // ignore (already set or busy)
  }
}

async function setupPwm() {
  if (setupDone) return;

  // Set pin to PWM mode
  await tryWrite(PINMUX_STATE, "pwm");

  // Export channel 0
  await tryWrite(`${PWM_CHIP}/export`, "0");
  await sleep(100);

  // Set period (must be set before duty_cycle)
  await tryWrite(`${PWM_PIN}/period`, PERIOD_NS.toString());

  setupDone = true;
}

async function setPulse(ns: number) {
  await writeFile(`${PWM_PIN}/duty_cycle`, ns.toString());
  await tryWrite(`${PWM_PIN}/enable`, "1");
}

async function disablePwm() {
  await tryWrite(`${PWM_PIN}/enable`, "0");
}

export async function rollDice() {
  console.log("Rolling dice - moving servo...");

  try {
    await setupPwm();

    // Center first
    await setPulse(PULSE_CENTER_NS);
    await sleep(300);

    // Shake fast (smaller range, more iterations)
    for (let i = 0; i < 12; i++) {
      await setPulse(PULSE_LEFT_NS);
      await sleep(150);
      await setPulse(PULSE_RIGHT_NS);
      await sleep(150);
    }

    // Return to center
    await setPulse(PULSE_CENTER_NS);
    await sleep(1000);

    await disablePwm();
  } catch (err) {
    console.error("Servo error:", err);
  }

  await sleep(2000);
  console.log("Dice settled.");
}
