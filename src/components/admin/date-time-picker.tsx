"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "cn";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const pad = (n: number) => String(n).padStart(2, "0");

/** Calendar picks the date; hour/minute Select dropdowns supply the
 * time-of-day — kept as shadcn components throughout rather than a
 * native <input type="time">, which renders as an unstyled OS widget
 * that breaks the rest of the app's look. */
export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick a date and time",
}: {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  function handleDateSelect(date: Date | undefined) {
    if (!date) {
      onChange(undefined);
      return;
    }
    const merged = new Date(date);
    if (value) {
      merged.setHours(value.getHours(), value.getMinutes());
    }
    onChange(merged);
  }

  function handleHourChange(hourStr: string) {
    const merged = new Date(value ?? new Date());
    merged.setHours(Number(hourStr));
    onChange(merged);
  }

  function handleMinuteChange(minuteStr: string) {
    const merged = new Date(value ?? new Date());
    merged.setMinutes(Number(minuteStr));
    onChange(merged);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "min-w-0 flex-1 basis-40 justify-start overflow-hidden text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="size-4 shrink-0" />
            <span className="truncate">{value ? value.toLocaleDateString() : placeholder}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(date) => {
              handleDateSelect(date);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      <Select value={value ? pad(value.getHours()) : undefined} onValueChange={handleHourChange} disabled={!value}>
        <SelectTrigger className="w-18" aria-label="Hour">
          <SelectValue placeholder="HH" />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {HOURS.map((h) => (
            <SelectItem key={h} value={pad(h)}>
              {pad(h)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="flex items-center text-muted-foreground">:</span>
      <Select
        value={value ? pad(value.getMinutes()) : undefined}
        onValueChange={handleMinuteChange}
        disabled={!value}
      >
        <SelectTrigger className="w-18" aria-label="Minute">
          <SelectValue placeholder="MM" />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {MINUTES.map((m) => (
            <SelectItem key={m} value={pad(m)}>
              {pad(m)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
