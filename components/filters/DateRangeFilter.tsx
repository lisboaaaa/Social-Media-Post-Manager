"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

function parseIsoDate(value: string | null): Date | undefined {
  return value ? new Date(`${value}T00:00:00`) : undefined;
}

function toIsoDate(value: Date | undefined): string | null {
  return value ? format(value, "yyyy-MM-dd") : null;
}

export function DateRangeFilter() {
  const { filters, setFilters } = useStore();
  const [open, setOpen] = useState(false);
  // Tracked separately from the applied filter so react-day-picker's own
  // "is this range complete?" logic (which drives whether the next click
  // extends the range or starts a new one) isn't confused by us coercing a
  // single picked day into a same-day range for filtering purposes below.
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>({
    from: parseIsoDate(filters.dateFrom),
    to: parseIsoDate(filters.dateTo),
  });

  useEffect(() => {
    // Resetting local pending state when the filter was cleared elsewhere
    // (e.g. the "Clear" button) — a legitimate sync-with-props case.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!filters.dateFrom && !filters.dateTo) setPendingRange(undefined);
  }, [filters.dateFrom, filters.dateTo]);

  const label = pendingRange?.from
    ? pendingRange.to && pendingRange.to.getTime() !== pendingRange.from.getTime()
      ? `${format(pendingRange.from, "MMM d")} – ${format(pendingRange.to, "MMM d")}`
      : format(pendingRange.from, "MMM d, yyyy")
    : "Any date";
  const isActive = Boolean(filters.dateFrom || filters.dateTo);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "shrink-0 gap-1.5 rounded-lg border-0 bg-background shadow-sm",
              isActive && "bg-primary/10 text-primary",
            )}
          />
        }
      >
        <CalendarIcon className="size-3.5" />
        {label}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={pendingRange}
          onSelect={(next) => {
            setPendingRange(next);
            setFilters({
              dateFrom: toIsoDate(next?.from),
              dateTo: toIsoDate(next?.to ?? next?.from),
            });
          }}
        />
        {(filters.dateFrom || filters.dateTo) && (
          <div className="flex justify-end border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilters({ dateFrom: null, dateTo: null });
                setOpen(false);
              }}
            >
              <X className="size-3.5" />
              Clear dates
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
