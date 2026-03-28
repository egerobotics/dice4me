"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export default function LiveStream() {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const failCount = useRef(0);

  const loadNext = useCallback(() => {
    if (!imgRef.current) return;
    imgRef.current.src = `/api/stream?t=${Date.now()}`;
  }, []);

  useEffect(() => {
    if (error) return;

    loadNext();

    const interval = setInterval(() => {
      loadNext();
    }, 300);

    return () => clearInterval(interval);
  }, [error, loadNext]);

  const handleLoad = () => {
    failCount.current = 0;
    if (!loaded) setLoaded(true);
  };

  const handleError = () => {
    failCount.current++;
    if (failCount.current > 5) {
      setError(true);
    }
  };

  if (error) {
    return (
      <div className="w-full aspect-video rounded-xl bg-[var(--card)] border border-[var(--card-border)] flex items-center justify-center">
        <p className="text-gray-500">Live stream is currently offline</p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl overflow-hidden bg-[var(--card)] border border-[var(--card-border)]">
      <div className="relative">
        {!loaded && (
          <div className="w-full aspect-video flex items-center justify-center">
            <p className="text-gray-500 animate-pulse">Connecting to stream...</p>
          </div>
        )}
        <img
          ref={imgRef}
          alt="Live stream"
          className={`w-full aspect-video object-cover ${loaded ? "" : "hidden"}`}
          onLoad={handleLoad}
          onError={handleError}
        />
        {loaded && (
          <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-white font-medium">LIVE</span>
          </div>
        )}
      </div>
    </div>
  );
}
