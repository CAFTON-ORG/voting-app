/** Deterministic color from a string (name/email) via a simple hash, so
 * the same person always gets the same color and different people are
 * visually distinguishable instead of one flat gray chip everywhere. */
export function getAvatarColor(label: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return {
    bg: `oklch(0.9 0.05 ${hue})`,
    fg: `oklch(0.35 0.1 ${hue})`,
  };
}
