"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "cn";

/** Calendar picks the date, a plain time input supplies the time-of-day —
 * react-day-picker has no time UI of its own, and this combination is the
 * standard shadcn pattern for a full date+time value rather than
 * reaching for a separate heavier library. */
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

  function handleTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const [hours, minutes] = e.target.value.split(":").map(Number);
    const base = value ?? new Date();
    const merged = new Date(base);
    merged.setHours(hours ?? 0, minutes ?? 0);
    onChange(merged);
  }

  const timeValue = value
    ? `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`
    : "";

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn("flex-1 justify-start text-left font-normal", !value && "text-muted-foreground")}
          >
            <CalendarIcon className="size-4" />
            {value ? value.toLocaleDateString() : placeholder}
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
      <Input type="time" value={timeValue} onChange={handleTimeChange} className="w-28" disabled={!value} />
    </div>
  );
}
