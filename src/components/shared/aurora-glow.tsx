/** A single soft, contained glow behind a hero — not a page-spanning
 * effect. Chart tokens in this theme are grayscale, and a big blurred
 * blob at meaningful opacity reads as a wash over everything below it
 * rather than atmosphere, so this stays small, low-opacity, and pinned
 * to the top of its section. Purely decorative, aria-hidden,
 * motion-safe-gated. */
export function AuroraGlow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] overflow-hidden">
      <div className="absolute top-[-12rem] left-1/2 size-[28rem] -translate-x-1/2 rounded-full bg-primary/[0.06] blur-3xl motion-safe:animate-[aurora_20s_ease-in-out_infinite] dark:bg-primary/10" />
    </div>
  );
}
