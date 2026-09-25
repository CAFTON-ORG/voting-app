import Link from "next/link";
import { Logo } from "@/components/shared/logo";

/** Sticky, matching the treatment CAFTON's own marketing site
 * (cafton-landing) uses for its navbar — stays visible while the voter
 * scrolls through a long candidate list instead of scrolling away. */
export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-14 max-w-4xl items-center gap-2 px-6">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <Logo size={24} aria-hidden="true" />
          <span className="text-sm font-bold tracking-tight uppercase">Cafton</span>
        </Link>
      </div>
    </header>
  );
}
