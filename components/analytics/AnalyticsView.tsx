"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { PlatformBadge } from "@/components/posts/PlatformBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import type { PostAnalytics } from "@/lib/types";
import { TrendIndicator } from "./TrendIndicator";

interface Row {
  postId: string;
  platform: PostAnalytics["platform"];
  title: string;
  sessions: number;
  users: number;
  pageViews: number;
  currentWeekSessions: number;
  previousWeekSessions: number;
}

const SORT_OPTIONS = [
  { value: "sessions", label: "Sessions" },
  { value: "users", label: "Users" },
  { value: "pageViews", label: "Page views" },
] as const;
type SortKey = (typeof SORT_OPTIONS)[number]["value"];

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function AnalyticsView() {
  const { posts, postAnalytics, openPreview } = useStore();
  const [sortKey, setSortKey] = useState<SortKey>("sessions");

  const rows = useMemo<Row[]>(() => {
    const byPostPlatform = new Map<string, PostAnalytics[]>();
    for (const a of postAnalytics) {
      const key = `${a.postId}|${a.platform}`;
      const list = byPostPlatform.get(key) ?? [];
      list.push(a);
      byPostPlatform.set(key, list);
    }

    const weekStart = daysAgo(7);
    const twoWeeksStart = daysAgo(14);

    const result: Row[] = [];
    for (const [key, entries] of byPostPlatform) {
      const [postId, platform] = key.split("|") as [string, PostAnalytics["platform"]];
      const post = posts.find((p) => p.id === postId);
      if (!post) continue;

      const currentWeek = entries.filter((e) => e.date >= weekStart);
      const previousWeek = entries.filter((e) => e.date >= twoWeeksStart && e.date < weekStart);

      result.push({
        postId,
        platform,
        title: post.title || "Untitled post",
        sessions: entries.reduce((sum, e) => sum + e.sessions, 0),
        users: entries.reduce((sum, e) => sum + e.users, 0),
        pageViews: entries.reduce((sum, e) => sum + e.pageViews, 0),
        currentWeekSessions: currentWeek.reduce((sum, e) => sum + e.sessions, 0),
        previousWeekSessions: previousWeek.reduce((sum, e) => sum + e.sessions, 0),
      });
    }

    return result.sort((a, b) => b[sortKey] - a[sortKey]);
  }, [posts, postAnalytics, sortKey]);

  const totals = useMemo(
    () => ({
      sessions: rows.reduce((sum, r) => sum + r.sessions, 0),
      users: rows.reduce((sum, r) => sum + r.users, 0),
      pageViews: rows.reduce((sum, r) => sum + r.pageViews, 0),
    }),
    [rows],
  );

  if (rows.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-2 py-16 text-center">
        <h2 className="text-lg font-semibold">No analytics yet</h2>
        <p className="text-sm text-muted-foreground">
          Tag a link in a post&apos;s description (the &quot;Transform with UTM tags&quot; hint) and run the GA4 sync from Dev Tools —
          numbers show up here once GA4 has data for it.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="size-3.5 text-muted-foreground" />
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger size="sm" className="min-w-40">
              <SelectValue>{(value: SortKey) => SORT_OPTIONS.find((o) => o.value === value)?.label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 rounded-xl bg-muted/40 p-4 text-center">
        <div>
          <div className="text-xl font-semibold">{totals.sessions}</div>
          <div className="text-xs text-muted-foreground">Sessions</div>
        </div>
        <div>
          <div className="text-xl font-semibold">{totals.users}</div>
          <div className="text-xs text-muted-foreground">Users</div>
        </div>
        <div>
          <div className="text-xl font-semibold">{totals.pageViews}</div>
          <div className="text-xs text-muted-foreground">Page views</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full whitespace-nowrap text-left text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-normal">Post</th>
              <th className="px-3 py-2 font-normal">Platform</th>
              <th className="px-3 py-2 font-normal">Sessions</th>
              <th className="px-3 py-2 font-normal">Users</th>
              <th className="px-3 py-2 font-normal">Page views</th>
              <th className="px-3 py-2 font-normal">This week</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={`${row.postId}|${row.platform}`}
                onClick={() => openPreview(row.postId)}
                className="cursor-pointer border-t hover:bg-muted/30"
              >
                <td className="max-w-64 truncate px-3 py-2 font-medium">{row.title}</td>
                <td className="px-3 py-2">
                  <PlatformBadge platform={row.platform} />
                </td>
                <td className="px-3 py-2">{row.sessions}</td>
                <td className="px-3 py-2">{row.users}</td>
                <td className="px-3 py-2">{row.pageViews}</td>
                <td className="px-3 py-2">
                  <TrendIndicator current={row.currentWeekSessions} previous={row.previousWeekSessions} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
