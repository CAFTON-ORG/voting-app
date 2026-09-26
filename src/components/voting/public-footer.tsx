import { Building2 } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-6 py-10 text-center">
        {/* Placeholder for the school's/partner's own mark — swap for a
            real logo image once one is supplied; keeping the slot here
            now means adding it later is a one-line change, not a layout
            change. */}
        <div
          className="flex size-11 items-center justify-center rounded-xl border border-dashed text-muted-foreground"
          title="Partner logo placeholder"
        >
          <Building2 className="size-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">
            Voting Technology Partner — <span className="font-medium text-foreground">CAFTON</span>
          </p>
          <p className="text-xs text-muted-foreground">University of Baguio · School of Information Technology</p>
        </div>
      </div>
    </footer>
  );
}
