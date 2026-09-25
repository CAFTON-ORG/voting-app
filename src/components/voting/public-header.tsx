import Link from "next/link";

export function PublicHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-4xl items-center gap-2 px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-foreground text-xs font-bold text-background">
            C
          </div>
          <span className="text-sm font-semibold tracking-tight">CAFTON</span>
        </Link>
      </div>
    </header>
  );
}
