"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  const id = setInterval(callback, 1000);
  return () => clearInterval(id);
}
function getSnapshot() {
  return Date.now();
}
// 0 is the "not mounted yet" sentinel — matches what the server rendered,
// so hydration never mismatches on the exact second of a live clock.
function getServerSnapshot() {
  return 0;
}

function splitDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Purely cosmetic — ticks toward `target` client-side for a sense of
 * urgency/reassurance only. Never the source of truth for whether voting
 * is actually open: cast_ballot() re-checks the server clock against the
 * event's real schedule on every submission regardless of what this shows. */
export function VotingCountdown({ target, label }: { target: Date; label: string }) {
  const now = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (now === 0 || target.getTime() <= now) return null;

  const { days, hours, minutes, seconds } = splitDuration(target.getTime() - now);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1.5 font-mono text-lg font-semibold tabular-nums">
        {days > 0 && <span>{days}d</span>}
        <span>{pad(hours)}</span>
        <span className="text-muted-foreground">:</span>
        <span>{pad(minutes)}</span>
        <span className="text-muted-foreground">:</span>
        <span>{pad(seconds)}</span>
      </div>
    </div>
  );
}
