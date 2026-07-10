"use client";

import { useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PlatformBadge } from "@/components/posts/PlatformBadge";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarView() {
  const { filteredPosts, openPreview } = useStore();
  const [cursor, setCursor] = useState(() => new Date());

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const postsForDay = (day: Date) =>
    filteredPosts.filter(
      // Appending a local time avoids the browser parsing the date-only
      // string as UTC midnight, which shifts it a day earlier in timezones
      // behind UTC.
      (post) => post.targetDate && isSameDay(new Date(`${post.targetDate}T00:00:00`), day),
    );

  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <h2 className="text-3xl font-bold tracking-tight">{format(cursor, "MMMM yyyy")}</h2>
        <div className="flex gap-1.5">
          <Button variant="outline" size="icon-sm" aria-label="Previous month" onClick={() => setCursor((d) => subMonths(d, 1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="icon-sm" aria-label="Next month" onClick={() => setCursor((d) => addMonths(d, 1))}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b">
        {WEEKDAYS.map((day, i) => (
          <div
            key={day}
            className={cn(
              "px-2.5 py-2 font-mono text-[11px] uppercase tracking-wide text-muted-foreground",
              (i === 0 || i === 6) && "bg-slate-100",
            )}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayPosts = postsForDay(day);
          const inMonth = isSameMonth(day, cursor);
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "flex min-h-[118px] flex-col gap-1.5 border-b border-r p-2 last:border-r-0",
                !inMonth ? "bg-slate-100" : isWeekend && "bg-slate-50",
              )}
            >
              <span
                className={cn(
                  "font-mono text-xs text-muted-foreground",
                  !inMonth && "text-muted-foreground/50",
                  isToday(day) &&
                    "flex h-6 w-6 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground",
                )}
              >
                {format(day, "d")}
              </span>
              <div className="flex flex-col gap-1">
                {dayPosts.map((post) => (
                  <button
                    key={post.id}
                    onClick={() => openPreview(post.id)}
                    className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] hover:bg-muted"
                    title={post.title}
                  >
                    <PlatformBadge platform={post.platforms[0]} className="px-1 py-0 gap-1 shrink-0" />
                    {post.platforms.length > 1 && (
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground" title={`Also on ${post.platforms.length - 1} more platform${post.platforms.length > 2 ? "s" : ""}`}>
                        +{post.platforms.length - 1}
                      </span>
                    )}
                    {post.needsChanges && (
                      <span className="size-1.5 shrink-0 rounded-full bg-amber-500" title="Needs changes" />
                    )}
                    <span className="truncate">{post.title}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
