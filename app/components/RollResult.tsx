"use client";

type Props = {
  roll: {
    rollNumber: number;
    photoUrl: string | null;
    createdAt: string;
  };
};

export default function RollResult({ roll }: Props) {
  return (
    <div className="mt-8 animate-bounce-in">
      <div className="rounded-xl overflow-hidden bg-[var(--card)] border border-[var(--card-border)]">
        {roll.photoUrl ? (
          <div className="relative w-full aspect-video">
            <img
              src={roll.photoUrl}
              alt="Dice result"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="p-12 text-center text-gray-400">
            Photo unavailable.
          </div>
        )}

        <div className="p-4 text-center">
          <p className="text-2xl font-bold text-[var(--accent)]">
            Roll #{roll.rollNumber}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            See the result in the photo
          </p>
        </div>
      </div>
    </div>
  );
}
