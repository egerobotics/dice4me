"use client";

import { useEffect, useState } from "react";

type Roll = {
  id: string;
  rollNumber: number;
  photoUrl: string | null;
  triggeredBy: string;
  createdAt: string;
};

export default function RollHistory() {
  const [rolls, setRolls] = useState<Roll[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/roll?limit=50")
      .then((res) => res.json())
      .then((data) => {
        setRolls(data.rolls || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (rolls.length === 0) return null;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-gray-300">Recent Rolls</h2>
      <div className="max-h-[800px] overflow-y-auto pr-2 space-y-4">
        {rolls.map((roll) => (
          <div
            key={roll.id}
            className="rounded-xl overflow-hidden bg-[var(--card)] border border-[var(--card-border)]"
          >
            {roll.photoUrl ? (
              <img
                src={roll.photoUrl}
                alt={`Roll #${roll.rollNumber}`}
                className="w-full object-cover"
              />
            ) : (
              <div className="w-full aspect-video bg-gray-800 flex items-center justify-center">
                <span className="text-3xl">🟥🟩</span>
              </div>
            )}
            <div className="p-3 flex items-center justify-between text-sm text-gray-500">
              <span className="font-mono font-bold text-gray-300 text-lg">#{roll.rollNumber}</span>
              <span>{roll.triggeredBy === "twitter" ? "𝕏" : "🌐"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
