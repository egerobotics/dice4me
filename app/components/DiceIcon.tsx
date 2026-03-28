"use client";

type Props = {
  size?: number;
  className?: string;
};

export default function DiceIcon({ size = 48, className = "" }: Props) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <rect x="4" y="4" width="40" height="40" rx="8" fill="#e63946" />
        <circle cx="16" cy="16" r="3.5" fill="white" />
        <circle cx="32" cy="16" r="3.5" fill="white" />
        <circle cx="24" cy="24" r="3.5" fill="white" />
        <circle cx="16" cy="32" r="3.5" fill="white" />
        <circle cx="32" cy="32" r="3.5" fill="white" />
      </svg>
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <rect x="4" y="4" width="40" height="40" rx="8" fill="#2d936c" />
        <circle cx="16" cy="16" r="3.5" fill="white" />
        <circle cx="32" cy="32" r="3.5" fill="white" />
        <circle cx="24" cy="24" r="3.5" fill="white" />
        <circle cx="32" cy="16" r="3.5" fill="white" />
        <circle cx="16" cy="32" r="3.5" fill="white" />
      </svg>
    </span>
  );
}
