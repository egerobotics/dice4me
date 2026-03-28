"use client";

import { useState, useEffect, useCallback } from "react";

type Props = {
  status: "idle" | "rolling" | "completed" | "failed";
  onRoll: (token: string) => void;
};

const COOLDOWN = 30;
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

declare global {
  interface Window {
    turnstile?: {
      render: (el: string | HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id: string) => void;
    };
  }
}

export default function RollButton({ status, onRoll }: Props) {
  const [cooldown, setCooldown] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [widgetId, setWidgetId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Load Turnstile script
  useEffect(() => {
    if (!SITE_KEY) { setReady(true); return; }
    if (document.getElementById("cf-turnstile-script")) return;

    const script = document.createElement("script");
    script.id = "cf-turnstile-script";
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit";
    script.async = true;

    (window as unknown as Record<string, unknown>).onTurnstileLoad = () => {
      const id = window.turnstile!.render("#turnstile-container", {
        sitekey: SITE_KEY,
        theme: "dark",
        size: "compact",
        callback: (t: string) => setToken(t),
        "error-callback": () => setReady(true),
        "expired-callback": () => setToken(null),
      });
      setWidgetId(id);
      setReady(true);
    };

    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => c - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (cooldown === 0 && widgetId && window.turnstile) {
      window.turnstile.reset(widgetId);
    }
  }, [cooldown, widgetId]);

  const handleClick = useCallback(() => {
    if (cooldown > 0 || status === "rolling" || !token) return;
    setCooldown(COOLDOWN);
    onRoll(token);
    setToken(null);
  }, [cooldown, status, onRoll, token]);

  const isDisabled = status === "rolling" || cooldown > 0 || (!token && ready);

  return (
    <div className="space-y-4">
      <button
        onClick={handleClick}
        disabled={isDisabled}
        className={`
          w-full py-5 px-8 rounded-2xl text-2xl font-bold
          transition-all duration-200 cursor-pointer
          ${
            isDisabled
              ? "bg-gray-700 text-gray-500 cursor-not-allowed"
              : "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white hover:scale-[1.02] active:scale-[0.98]"
          }
        `}
      >
        {status === "rolling"
          ? "Rolling Dice..."
          : cooldown > 0
            ? `⏳ ${cooldown}s`
            : !token && !ready
              ? "Loading..."
              : !token
                ? "Verifying..."
                : "🎲 Roll Dice!"}
      </button>
      <div id="turnstile-container" className="flex justify-center" />
    </div>
  );
}
