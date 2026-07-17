"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useStore } from "@/lib/store";
import { weightedAverage } from "@/lib/postAnalyticsMath";
import { PLATFORM_LABELS, type Platform, type PostAnalytics } from "@/lib/types";
import { cn } from "@/lib/utils";

type Grouping = "day" | "week";

interface PeriodTotals {
  label: string;
  sessions: number;
  users: number;
  pageViews: number;
  engagementRate: number | null;
  avgEngagementTime: number | null;
  bounceRate: number | null;
}

// Monday of the week containing this date — used as the group label/key.
function weekStart(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  return date.toISOString().slice(0, 10);
}

function summarize(rows: PostAnalytics[], label: string): PeriodTotals {
  return {
    label,
    sessions: rows.reduce((sum, r) => sum + r.sessions, 0),
    users: rows.reduce((sum, r) => sum + r.users, 0),
    pageViews: rows.reduce((sum, r) => sum + r.pageViews, 0),
    engagementRate: weightedAverage(rows, (r) => r.sessions, (r) => r.engagementRate),
    avgEngagementTime: weightedAverage(rows, (r) => r.sessions, (r) => r.avgEngagementTime),
    bounceRate: weightedAverage(rows, (r) => r.sessions, (r) => r.bounceRate),
  };
}

// A date can now carry more than one row (one per utm_content placement) —
// this view is content-agnostic, so same-date rows are merged together; the
// "By placement" breakdown further down is where content is broken out.
function groupRows(rows: PostAnalytics[], grouping: Grouping): PeriodTotals[] {
  const keyFn = grouping === "day" ? (r: PostAnalytics) => r.date : (r: PostAnalytics) => weekStart(r.date);
  const byPeriod = new Map<string, PostAnalytics[]>();
  for (const row of rows) {
    const key = keyFn(row);
    const list = byPeriod.get(key) ?? [];
    list.push(row);
    byPeriod.set(key, list);
  }
  return [...byPeriod.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([period, periodRows]) => summarize(periodRows, grouping === "day" ? period : `Week of ${period}`));
}

// "" means no utm_content was set — the plain link in the caption itself.
function contentLabel(content: string): string {
  return content ? content.replace(/_/g, " ") : "Caption link";
}

function formatPercent(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function PostAnalyticsPanel({ postId, platforms }: { postId: string; platforms: Platform[] }) {
  const { postAnalytics } = useStore();
  const [expanded, setExpanded] = useState(false);
  const [grouping, setGrouping] = useState<Grouping>("day");

  const byPlatform = platforms
    .map((platform) => ({ platform, rows: postAnalytics.filter((a) => a.postId === postId && a.platform === platform) }))
    .filter((p) => p.rows.length > 0);

  if (byPlatform.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-fit items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
      >
        <ChevronDown className={cn("size-3.5 transition-transform", expanded && "-rotate-180")} />
        Analytics
      </button>

      {expanded && (
        <div className="flex flex-col gap-4">
          <div className="flex w-fit gap-1">
            {(["day", "week"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGrouping(g)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium capitalize",
                  grouping === g ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70",
                )}
              >
                {g}
              </button>
            ))}
          </div>

          {byPlatform.map(({ platform, rows }) => {
            const total = summarize(rows, "Total");
            const periods = groupRows(rows, grouping);

            const byContent = new Map<string, PostAnalytics[]>();
            for (const row of rows) {
              const list = byContent.get(row.content) ?? [];
              list.push(row);
              byContent.set(row.content, list);
            }
            const placements = [...byContent.entries()]
              .map(([content, contentRows]) => ({ content, total: summarize(contentRows, contentLabel(content)) }))
              .sort((a, b) => b.total.sessions - a.total.sessions);

            return (
              <div key={platform} className="flex flex-col gap-2">
                {byPlatform.length > 1 && <span className="text-sm font-medium">{PLATFORM_LABELS[platform]}</span>}

                <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-2 text-center">
                  <div>
                    <div className="text-sm font-semibold">{total.sessions}</div>
                    <div className="text-[10px] text-muted-foreground">Sessions</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{total.users}</div>
                    <div className="text-[10px] text-muted-foreground">Users</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{total.pageViews}</div>
                    <div className="text-[10px] text-muted-foreground">Page views</div>
                  </div>
                </div>

                {placements.length > 1 && (
                  <div className="flex flex-col gap-1 rounded-lg border p-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">By placement</span>
                    {placements.map(({ content, total: t }) => (
                      <div key={content} className="flex items-center justify-between text-xs">
                        <span className="capitalize">{t.label}</span>
                        <span className="font-medium tabular-nums">{t.sessions} sessions</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full whitespace-nowrap text-left text-xs">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="py-1 pr-2 font-normal">{grouping === "day" ? "Day" : "Week of"}</th>
                        <th className="px-2 py-1 font-normal">Sessions</th>
                        <th className="px-2 py-1 font-normal">Users</th>
                        <th className="px-2 py-1 font-normal">Views</th>
                        <th className="px-2 py-1 font-normal">Engagement</th>
                        <th className="px-2 py-1 font-normal">Avg. time</th>
                        <th className="py-1 pl-2 font-normal">Bounce</th>
                      </tr>
                    </thead>
                    <tbody>
                      {periods.map((p) => (
                        <tr key={p.label} className="border-t">
                          <td className="py-1 pr-2">{p.label}</td>
                          <td className="px-2 py-1">{p.sessions}</td>
                          <td className="px-2 py-1">{p.users}</td>
                          <td className="px-2 py-1">{p.pageViews}</td>
                          <td className="px-2 py-1">{formatPercent(p.engagementRate)}</td>
                          <td className="px-2 py-1">{formatDuration(p.avgEngagementTime)}</td>
                          <td className="py-1 pl-2">{formatPercent(p.bounceRate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
