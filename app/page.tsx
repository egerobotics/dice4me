"use client";

import { useState } from "react";
import RollButton from "./components/RollButton";
import RollResult from "./components/RollResult";
import RollHistory from "./components/RollHistory";
import DiceIcon from "./components/DiceIcon";

type RollData = {
  id: string;
  rollNumber: number;
  status: string;
  photoUrl: string | null;
  createdAt: string;
};

export default function Home() {
  const [currentRoll, setCurrentRoll] = useState<RollData | null>(null);
  const [status, setStatus] = useState<"idle" | "rolling" | "completed" | "failed">("idle");
  const [historyKey, setHistoryKey] = useState(0);
  const [rollNumber, setRollNumber] = useState<number | null>(null);

  const handleRoll = async (token: string) => {
    setStatus("rolling");
    setCurrentRoll(null);
    setRollNumber(null);

    try {
      const res = await fetch("/api/roll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to roll dice");
      }
      const { rollId, rollNumber: rn } = await res.json();
      setRollNumber(rn);

      // Poll for result
      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/roll/${rollId}`);
          const roll: RollData = await pollRes.json();

          if (roll.status === "completed") {
            clearInterval(pollInterval);
            setCurrentRoll(roll);
            setStatus("completed");
            setHistoryKey((k) => k + 1);
          } else if (roll.status === "failed") {
            clearInterval(pollInterval);
            setStatus("failed");
          }
        } catch {
          clearInterval(pollInterval);
          setStatus("failed");
        }
      }, 1500);

      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(pollInterval);
        if (status === "rolling") setStatus("failed");
      }, 30000);
    } catch {
      setStatus("failed");
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-3 flex items-center justify-center gap-3">
          <DiceIcon size={48} /> dice4<span className="text-[var(--accent)]">.me</span>
        </h1>
        <p className="text-lg text-gray-400">
          Roll real dice remotely, see the result on camera!
        </p>
        <p className="text-sm text-gray-600 mt-2">
          You can also roll dice by mentioning{" "}
          <a href="https://x.com/intent/tweet?text=@dice4me%20roll" target="_blank" className="text-[var(--accent)] hover:underline">
            @dice4me
          </a>
          {" "}on X.com!
        </p>
      </div>

      {/* Roll Area */}
      <div className="w-full max-w-md">
        <RollButton status={status} onRoll={handleRoll} />

        {status === "rolling" && (
          <div className="mt-8 text-center">
            <div className="animate-shake inline-block"><DiceIcon size={64} /></div>
            <p className="mt-4 text-gray-400 animate-pulse">Rolling dice... #{rollNumber}</p>
          </div>
        )}

        {status === "completed" && currentRoll && (
          <RollResult roll={currentRoll} />
        )}

        {status === "failed" && (
          <div className="mt-8 text-center p-6 rounded-xl bg-red-900/20 border border-red-800">
            <p className="text-red-400">Something went wrong. Please try again.</p>
          </div>
        )}
      </div>

      {/* History */}
      <div className="w-full max-w-lg mt-16">
        <RollHistory key={historyKey} />
      </div>

      {/* Footer */}
      <footer className="mt-16 text-center text-sm text-gray-600">
        <p>dice4.me</p>
      </footer>
    </main>
  );
}
