const PI_TRIGGER_URL = process.env.PI_TRIGGER_URL!;
const API_KEY = process.env.DICE4ME_API_KEY!;

export async function triggerPiRoll(rollId: string, callbackUrl: string) {
  const res = await fetch(PI_TRIGGER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
    },
    body: JSON.stringify({ rollId, callbackUrl }),
  });

  if (!res.ok) {
    throw new Error(`Pi trigger failed: ${res.status}`);
  }

  return res;
}
