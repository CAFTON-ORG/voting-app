/** A red -> orange -> green scale by value, for any "how much of the
 * total is this" progress bar (vote share, completion, etc.) — low
 * shares read as red, mid as orange, high as green, instead of every
 * bar being the same flat color regardless of what it's showing. */
export function getPercentageColor(percent: number): string {
  if (percent >= 67) return "bg-green-500 dark:bg-green-400";
  if (percent >= 34) return "bg-orange-500 dark:bg-orange-400";
  return "bg-red-500 dark:bg-red-400";
}
