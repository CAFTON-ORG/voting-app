"use client";

import { useState } from "react";
import { CalendarIcon, ClockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { cn } from "cn";

const pad = (n: number) => String(n).padStart(2, "0");

// A defensive guard, not just a type check: `value` is a plain Date built
// up from user interaction (calendar pick + time pick, merged via
// setHours), and an "Invalid Date" (e.g. from a stray NaN slipping into
// setHours) still passes `instanceof Date` — its own toLocaleDateString()
// literally renders the string "Invalid Date" into the button, which is
// exactly the kind of input error this guards against everywhere `value`
// is read below, rather than trusting it's always well-formed.
function isValidDate(d: Date | undefined): d is Date {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

// 15-minute increments is the standard step for this kind of scheduling
// picker (matches Google Calendar/most booking UIs) - fine-grained enough
// for a voting window's open/close time, without a 96-option list turning
// into two full 24/60 dropdowns' worth of scrolling.
const TIME_STEP_MINUTES = 15;
const TIME_OPTIONS = Array.from({ length: (24 * 60) / TIME_STEP_MINUTES }, (_, i) => {
  const totalMinutes = i * TIME_STEP_MINUTES;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = hours < 12 ? "AM" : "PM";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return { value: `${pad(hours)}:${pad(minutes)}`, label: `${displayHour}:${pad(minutes)} ${period}` };
});

/** Calendar picks the date; a searchable time combobox (15-minute steps)
 * supplies the time-of-day — a plain Select with 96 options renders every
 * one of them into the page at once, which is what was pushing the
 * dropdown to the full height of the screen. The standard fix for a long
 * option list like this is a searchable combobox (Popover + Command,
 * shadcn's own recipe for exactly this case) instead of a longer native
 * Select: CommandList caps itself at a fixed scrollable height regardless
 * of item count, and typing narrows it (e.g. "2:00" or "pm"). */
export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick a date and time",
  invalid = false,
}: {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  invalid?: boolean;
}) {
  const [dateOpen, setDateOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);

  const validValue = isValidDate(value) ? value : undefined;

  function handleDateSelect(date: Date | undefined) {
    if (!date || Number.isNaN(date.getTime())) {
      onChange(undefined);
      return;
    }
    const merged = new Date(date);
    if (validValue) {
      merged.setHours(validValue.getHours(), validValue.getMinutes());
    }
    onChange(merged);
  }

  function handleTimeChange(timeStr: string) {
    const [hours, minutes] = timeStr.split(":").map(Number);
    // TIME_OPTIONS only ever produces well-formed "HH:mm" strings, but
    // guard anyway rather than trust a string handed to a public function
    // - a malformed value here would otherwise silently produce an
    // Invalid Date that renders as the literal text "Invalid Date".
    if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return;
    }
    const merged = new Date(validValue ?? new Date());
    merged.setHours(hours, minutes, 0, 0);
    onChange(merged);
  }

  const currentTimeValue = validValue ? `${pad(validValue.getHours())}:${pad(validValue.getMinutes())}` : null;
  const currentTimeLabel = TIME_OPTIONS.find((t) => t.value === currentTimeValue)?.label;

  return (
    <div className="flex flex-wrap gap-2">
      <Popover open={dateOpen} onOpenChange={setDateOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "min-w-0 flex-1 basis-40 justify-start overflow-hidden text-left font-normal",
              !validValue && "text-muted-foreground",
              invalid && "border-destructive ring-3 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40"
            )}
          >
            <CalendarIcon className="size-4 shrink-0" />
            <span className="truncate">{validValue ? validValue.toLocaleDateString() : placeholder}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={validValue}
            onSelect={(date) => {
              handleDateSelect(date);
              setDateOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      <Popover open={timeOpen} onOpenChange={setTimeOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={!validValue}
            aria-label="Time"
            className={cn(
              "w-28 justify-start overflow-hidden text-left font-normal",
              !currentTimeLabel && "text-muted-foreground",
              invalid && "border-destructive ring-3 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40"
            )}
          >
            <ClockIcon className="size-4 shrink-0" />
            <span className="truncate">{currentTimeLabel ?? "Time"}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-40 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search time…" />
            <CommandList>
              <CommandEmpty>No matching time.</CommandEmpty>
              <CommandGroup>
                {TIME_OPTIONS.map((t) => (
                  <CommandItem
                    key={t.value}
                    value={t.label}
                    data-checked={t.value === currentTimeValue}
                    onSelect={() => {
                      handleTimeChange(t.value);
                      setTimeOpen(false);
                    }}
                  >
                    {t.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
