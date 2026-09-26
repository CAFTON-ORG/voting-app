"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "cn";

/** Allowed-voter-domains as removable chips instead of a raw comma-
 * separated string — type a domain, press Enter/comma/Tab (or blur) to
 * commit it, Backspace on an empty draft removes the last chip. Spreads
 * onto a plain div so it works as FormControl's single child (Radix Slot
 * injects id/aria-invalid/aria-describedby there, same as it would onto
 * a native input). */
export function DomainsInput({
  value,
  onChange,
  placeholder = "s.ubaguio.edu",
  disabled,
  className,
  ...props
}: {
  value: string[];
  onChange: (domains: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
} & React.ComponentProps<"div">) {
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    const domain = raw.trim().replace(/^@/, "").toLowerCase();
    setDraft("");
    if (!domain || value.includes(domain)) return;
    onChange([...value, domain]);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      if (draft.trim()) {
        e.preventDefault();
        commit(draft);
      }
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div
      data-slot="domains-input"
      className={cn(
        "flex min-h-8 w-full flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-2 py-1.5 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        disabled && "pointer-events-none opacity-50",
        className
      )}
      {...props}
    >
      {value.map((domain) => (
        <Badge key={domain} variant="secondary" className="gap-1 pr-1">
          {domain}
          <button
            type="button"
            onClick={() => onChange(value.filter((d) => d !== domain))}
            className="rounded-full p-0.5 hover:bg-foreground/10"
          >
            <X className="size-3" />
            <span className="sr-only">Remove {domain}</span>
          </button>
        </Badge>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => commit(draft)}
        placeholder={value.length === 0 ? placeholder : undefined}
        disabled={disabled}
        className="h-6 min-w-24 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-sm"
      />
    </div>
  );
}
