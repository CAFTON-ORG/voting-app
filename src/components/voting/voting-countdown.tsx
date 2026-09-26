"use client";

import { useSyncExternalStore } from "react";

// Cached at module scope and only advanced on each tick, not read live in
// getSnapshot — useSyncExternalStore calls getSnapshot repeatedly during
// render to check for tearing, and a value that changes on every single
// call (like a raw Date.now()) makes it look like the store never settles,
// which throws "The result of getSnapshot should be cached to avoid an
// infinite loop."
let cachedNow = Date.now();

function subscribe(callback: () => void) {
  const id = setInterval(() => {
    cachedNow = Date.now();
    callback();
  }, 1000);
  return () => clearInterval(id);
}
function getSnapshot() {
  return cachedNow;
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
 * event's real schedule on every submission regardless of what this shows.
 * Clamps at 00:00:00 once `target` has passed rather than disappearing —
 * an OPEN event can outlive its scheduled close time until an admin
 * actually closes it, and hiding the whole row there reads as a bug.
 * Rendered as individually-boxed units (days/hrs/min/sec) rather than a
 * plain "07:56:02" mono string, so it reads as a real countdown timer. */
export function VotingCountdown({ target, label }: { target: Date; label: string }) {
  const now = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (now === 0) return null;

  const { days, hours, minutes, seconds } = splitDuration(target.getTime() - now);
  const units = [
    ...(days > 0 ? [{ value: days, text: String(days), label: "days" }] : []),
    { value: hours, text: pad(hours), label: "hrs" },
    { value: minutes, text: pad(minutes), label: "min" },
    { value: seconds, text: pad(seconds), label: "sec" },
  ];

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <div className="flex items-center gap-1.5">
        {units.map((unit, i) => (
          <div key={unit.label} className="flex items-center gap-1.5">
            <div className="flex min-w-13 flex-col items-center gap-0.5 rounded-lg border bg-muted/40 px-2.5 py-1.5">
              <span className="font-mono text-lg leading-none font-semibold tabular-nums">{unit.text}</span>
              <span className="text-[9px] tracking-wide text-muted-foreground uppercase">{unit.label}</span>
            </div>
            {i < units.length - 1 && <span className="text-sm text-muted-foreground/40">:</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
