"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowUpDown, ImageOff, Monitor, Smartphone, Tablet, Tag, HelpCircle } from "lucide-react";
import { PlatformBadge, PlatformBadgeGroup, PLATFORM_ACCENT_HEX } from "@/components/posts/PlatformBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { weightedAverage } from "@/lib/postAnalyticsMath";
import { cn } from "@/lib/utils";
import { PLATFORM_LABELS, type PostAnalytics } from "@/lib/types";
import { BarList } from "./BarList";
import { InfoTooltip } from "./InfoTooltip";
import { Sparkline } from "./Sparkline";
import { TrendChart } from "./TrendChart";
import { TrendIndicator } from "./TrendIndicator";
import { WorldMap } from "./WorldMap";

// Shared with PostAnalyticsPanel so the same term always gets the same
// explanation, wherever it shows up.
export const METRIC_EXPLANATIONS = {
  sessions: "A visit from this link. One person can rack up more than one session — e.g. leaving and coming back later.",
  users: "Distinct people who visited, no matter how many sessions each of them had.",
  pageViews: "Total pages loaded — higher than sessions if someone browsed further after landing.",
  engagementRate:
    "Share of sessions that lasted 10+ seconds, viewed a second page, or triggered a conversion — Google's bar for a \"real\" visit, not just a bounce.",
  bounceRate: "The opposite of engagement — sessions that left without doing any of that.",
  newUsers: "People visiting for the first time ever, out of the users above.",
  conversions:
    "Count of GA4 \"key events\" (what used to be called conversions) — form fills, sign-ups, whatever's configured on the property. Reads 0 if the site doesn't have any key events set up.",
  trend: "Daily sessions over the selected period, at a glance.",
  thisWeek: "This week's sessions compared with the 7 days before.",
};

interface Row {
  postId: string;
  platform: PostAnalytics["platform"];
  categoryIds: string[];
  title: string;
  coverImageUrl: string | null;
  sessions: number;
  users: number;
  newUsers: number;
  pageViews: number;
  engagementRate: number | null;
  bounceRate: number | null;
  conversions: number;
  currentWeekSessions: number;
  previousWeekSessions: number;
  currentWeekUsers: number;
  previousWeekUsers: number;
  currentWeekPageViews: number;
  previousWeekPageViews: number;
  currentWeekConversions: number;
  previousWeekConversions: number;
  dailySessions: number[];
}

interface GroupTotal {
  key: string;
  label: string;
  sessions: number;
  users: number;
  pageViews: number;
  color?: string;
}

const SORT_OPTIONS = [
  { value: "sessions", label: "Sessions" },
  { value: "users", label: "Users" },
  { value: "pageViews", label: "Page views" },
  { value: "conversions", label: "Conversions" },
] as const;
type SortKey = (typeof SORT_OPTIONS)[number]["value"];

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function formatPercent(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

// A small violet tick on each section header — the brand's accent, used
// sparingly for exactly this (a highlight, not a blanket interactive color).
function GroupTotalsCard({
  title,
  groups,
  iconFor,
}: {
  title: string;
  groups: GroupTotal[];
  iconFor?: (key: string) => ReactNode;
}) {
  if (groups.length === 0) return null;
  return (
    <div className="flex flex-1 flex-col gap-2 rounded-xl border p-3">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="h-3 w-0.5 rounded-full bg-[#6b4fff]" />
        {title}
      </h3>
      <BarList items={groups.map((g) => ({ key: g.key, label: g.label, value: g.sessions, color: g.color, icon: iconFor?.(g.key) }))} />
    </div>
  );
}

const DEVICE_ICONS: Record<string, ReactNode> = {
  desktop: <Monitor className="size-3.5" />,
  mobile: <Smartphone className="size-3.5" />,
  tablet: <Tablet className="size-3.5" />,
};
function deviceIcon(key: string): ReactNode {
  return DEVICE_ICONS[key.toLowerCase()] ?? <HelpCircle className="size-3.5" />;
}

// GA4 mostly returns lowercase device names ("mobile", "desktop") — just
// capitalize for display, no need for a full label lookup table like platforms.
function titleCase(value: string): string {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}

export function AnalyticsView() {
  const { filteredPosts, filters, categories, postAnalytics, postAnalyticsGeo, openPreview } = useStore();
  const [sortKey, setSortKey] = useState<SortKey>("sessions");

  const rows = useMemo<Row[]>(() => {
    const eligiblePostIds = new Set(filteredPosts.map((p) => p.id));

    const byPostPlatform = new Map<string, PostAnalytics[]>();
    for (const a of postAnalytics) {
      if (!eligiblePostIds.has(a.postId)) continue;
      if (filters.platform !== "all" && a.platform !== filters.platform) continue;
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
      const post = filteredPosts.find((p) => p.id === postId);
      if (!post) continue;

      const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
      const currentWeek = entries.filter((e) => e.date >= weekStart);
      const previousWeek = entries.filter((e) => e.date >= twoWeeksStart && e.date < weekStart);

      result.push({
        postId,
        platform,
        categoryIds: post.categoryIds,
        title: post.title || "Untitled post",
        coverImageUrl: post.images[0]?.imageUrl ?? null,
        sessions: entries.reduce((sum, e) => sum + e.sessions, 0),
        users: entries.reduce((sum, e) => sum + e.users, 0),
        newUsers: entries.reduce((sum, e) => sum + e.newUsers, 0),
        pageViews: entries.reduce((sum, e) => sum + e.pageViews, 0),
        engagementRate: weightedAverage(entries, (e) => e.sessions, (e) => e.engagementRate),
        bounceRate: weightedAverage(entries, (e) => e.sessions, (e) => e.bounceRate),
        conversions: entries.reduce((sum, e) => sum + e.conversions, 0),
        currentWeekSessions: currentWeek.reduce((sum, e) => sum + e.sessions, 0),
        previousWeekSessions: previousWeek.reduce((sum, e) => sum + e.sessions, 0),
        currentWeekUsers: currentWeek.reduce((sum, e) => sum + e.users, 0),
        previousWeekUsers: previousWeek.reduce((sum, e) => sum + e.users, 0),
        currentWeekPageViews: currentWeek.reduce((sum, e) => sum + e.pageViews, 0),
        previousWeekPageViews: previousWeek.reduce((sum, e) => sum + e.pageViews, 0),
        currentWeekConversions: currentWeek.reduce((sum, e) => sum + e.conversions, 0),
        previousWeekConversions: previousWeek.reduce((sum, e) => sum + e.conversions, 0),
        dailySessions: sorted.map((e) => e.sessions),
      });
    }

    return result.sort((a, b) => b[sortKey] - a[sortKey]);
  }, [filteredPosts, filters.platform, postAnalytics, sortKey]);

  const totals = useMemo(
    () => ({
      sessions: rows.reduce((sum, r) => sum + r.sessions, 0),
      users: rows.reduce((sum, r) => sum + r.users, 0),
      pageViews: rows.reduce((sum, r) => sum + r.pageViews, 0),
      conversions: rows.reduce((sum, r) => sum + r.conversions, 0),
      currentWeekSessions: rows.reduce((sum, r) => sum + r.currentWeekSessions, 0),
      previousWeekSessions: rows.reduce((sum, r) => sum + r.previousWeekSessions, 0),
      currentWeekUsers: rows.reduce((sum, r) => sum + r.currentWeekUsers, 0),
      previousWeekUsers: rows.reduce((sum, r) => sum + r.previousWeekUsers, 0),
      currentWeekPageViews: rows.reduce((sum, r) => sum + r.currentWeekPageViews, 0),
      previousWeekPageViews: rows.reduce((sum, r) => sum + r.previousWeekPageViews, 0),
      currentWeekConversions: rows.reduce((sum, r) => sum + r.currentWeekConversions, 0),
      previousWeekConversions: rows.reduce((sum, r) => sum + r.previousWeekConversions, 0),
    }),
    [rows],
  );

  const topPost = useMemo(() => {
    const byPost = new Map<string, { sessions: number; users: number }>();
    for (const row of rows) {
      const existing = byPost.get(row.postId) ?? { sessions: 0, users: 0 };
      existing.sessions += row.sessions;
      existing.users += row.users;
      byPost.set(row.postId, existing);
    }
    const [topId, topTotals] = [...byPost.entries()].sort((a, b) => b[1].sessions - a[1].sessions)[0] ?? [];
    if (!topId || topTotals.sessions === 0) return null;
    const post = filteredPosts.find((p) => p.id === topId);
    if (!post) return null;
    return { post, sessions: topTotals.sessions, users: topTotals.users };
  }, [rows, filteredPosts]);

  const byPlatform = useMemo<GroupTotal[]>(() => {
    const map = new Map<string, GroupTotal>();
    for (const row of rows) {
      const existing = map.get(row.platform) ?? {
        key: row.platform,
        label: PLATFORM_LABELS[row.platform],
        sessions: 0,
        users: 0,
        pageViews: 0,
        color: PLATFORM_ACCENT_HEX[row.platform],
      };
      existing.sessions += row.sessions;
      existing.users += row.users;
      existing.pageViews += row.pageViews;
      map.set(row.platform, existing);
    }
    return [...map.values()].sort((a, b) => b.sessions - a.sessions);
  }, [rows]);

  const dailyTotals = useMemo(() => {
    const eligiblePostIds = new Set(filteredPosts.map((p) => p.id));
    const byDate = new Map<string, number>();
    for (const a of postAnalytics) {
      if (!eligiblePostIds.has(a.postId)) continue;
      if (filters.platform !== "all" && a.platform !== filters.platform) continue;
      byDate.set(a.date, (byDate.get(a.date) ?? 0) + a.sessions);
    }
    return [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, value]) => ({ date, value }));
  }, [filteredPosts, filters.platform, postAnalytics]);

  const byCategory = useMemo<GroupTotal[]>(() => {
    const map = new Map<string, GroupTotal>();
    for (const row of rows) {
      const ids = row.categoryIds.length > 0 ? row.categoryIds : ["__none__"];
      for (const id of ids) {
        const label = id === "__none__" ? "No category" : (categories.find((c) => c.id === id)?.name ?? "Unknown");
        const existing = map.get(id) ?? { key: id, label, sessions: 0, users: 0, pageViews: 0 };
        existing.sessions += row.sessions;
        existing.users += row.users;
        existing.pageViews += row.pageViews;
        map.set(id, existing);
      }
    }
    return [...map.values()].sort((a, b) => b.sessions - a.sessions);
  }, [rows, categories]);

  // Device/country come from a separate, coarser sync (post_analytics_geo,
  // not broken out by placement) — see lib/ga4Sync.ts for why they're kept
  // apart from the per-content rows above.
  const byDevice = useMemo<GroupTotal[]>(() => {
    const eligiblePostIds = new Set(filteredPosts.map((p) => p.id));
    const map = new Map<string, GroupTotal>();
    for (const g of postAnalyticsGeo) {
      if (!eligiblePostIds.has(g.postId)) continue;
      if (filters.platform !== "all" && g.platform !== filters.platform) continue;
      const existing = map.get(g.deviceCategory) ?? { key: g.deviceCategory, label: titleCase(g.deviceCategory), sessions: 0, users: 0, pageViews: 0 };
      existing.sessions += g.sessions;
      existing.users += g.users;
      map.set(g.deviceCategory, existing);
    }
    return [...map.values()].sort((a, b) => b.sessions - a.sessions);
  }, [filteredPosts, filters.platform, postAnalyticsGeo]);

  const byCountry = useMemo<GroupTotal[]>(() => {
    const eligiblePostIds = new Set(filteredPosts.map((p) => p.id));
    const map = new Map<string, GroupTotal>();
    for (const g of postAnalyticsGeo) {
      if (!eligiblePostIds.has(g.postId)) continue;
      if (filters.platform !== "all" && g.platform !== filters.platform) continue;
      const existing = map.get(g.country) ?? { key: g.country, label: g.country, sessions: 0, users: 0, pageViews: 0 };
      existing.sessions += g.sessions;
      existing.users += g.users;
      map.set(g.country, existing);
    }
    return [...map.values()].sort((a, b) => b.sessions - a.sessions);
  }, [filteredPosts, filters.platform, postAnalyticsGeo]);

  if (rows.length === 0) {
    const hasAnyData = postAnalytics.length > 0;
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-2 py-16 text-center">
        <h2 className="text-lg font-semibold">{hasAnyData ? "No results for these filters" : "No analytics yet"}</h2>
        <p className="text-sm text-muted-foreground">
          {hasAnyData
            ? "There's analytics data, just none for the currently selected platform/category/date filters — try clearing them."
            : 'Tag a link in a post\'s description (the "Transform with UTM tags" hint) and run the GA4 sync from Dev Tools — numbers show up here once GA4 has data for it.'}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-background p-3 text-center">
          <div className="text-xl font-semibold">{totals.sessions}</div>
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            Sessions
            <InfoTooltip text={METRIC_EXPLANATIONS.sessions} />
          </div>
          <TrendIndicator current={totals.currentWeekSessions} previous={totals.previousWeekSessions} />
        </div>
        <div className="rounded-xl border bg-background p-3 text-center">
          <div className="text-xl font-semibold">{totals.users}</div>
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            Users
            <InfoTooltip text={METRIC_EXPLANATIONS.users} />
          </div>
          <TrendIndicator current={totals.currentWeekUsers} previous={totals.previousWeekUsers} />
        </div>
        <div className="rounded-xl border bg-background p-3 text-center">
          <div className="text-xl font-semibold">{totals.pageViews}</div>
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            Page views
            <InfoTooltip text={METRIC_EXPLANATIONS.pageViews} />
          </div>
          <TrendIndicator current={totals.currentWeekPageViews} previous={totals.previousWeekPageViews} />
        </div>
        <div className="rounded-xl border bg-background p-3 text-center">
          <div className="text-xl font-semibold">{totals.conversions}</div>
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            Conversions
            <InfoTooltip text={METRIC_EXPLANATIONS.conversions} />
          </div>
          <TrendIndicator current={totals.currentWeekConversions} previous={totals.previousWeekConversions} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {topPost && (
          <button
            type="button"
            onClick={() => openPreview(topPost.post.id)}
            className="flex flex-col overflow-hidden rounded-xl border bg-background text-left shadow-sm transition-shadow hover:shadow-md lg:col-span-1"
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
              {topPost.post.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={topPost.post.images[0].imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <ImageOff className="size-6" />
                </div>
              )}
              <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                Top post
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-2 p-3">
              <span className="line-clamp-2 text-sm font-medium">{topPost.post.title || "Untitled post"}</span>
              <PlatformBadgeGroup platforms={topPost.post.platforms} />
              <div className="mt-auto flex items-end justify-between pt-1">
                <div>
                  <div className="text-xl font-semibold">{topPost.sessions}</div>
                  <div className="text-[10px] text-muted-foreground">sessions</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{topPost.users}</div>
                  <div className="text-[10px] text-muted-foreground">users</div>
                </div>
              </div>
            </div>
          </button>
        )}

        <div className={cn("rounded-xl border p-3", topPost ? "lg:col-span-3" : "lg:col-span-4")}>
          <TrendChart points={dailyTotals} label="Sessions over time" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <WorldMap groups={byCountry} />
        <div className="flex flex-col gap-4">
          <GroupTotalsCard title="By platform" groups={byPlatform} />
          <GroupTotalsCard title="By category" groups={byCategory} iconFor={() => <Tag className="size-3.5" />} />
          <GroupTotalsCard title="By device" groups={byDevice} iconFor={deviceIcon} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full whitespace-nowrap text-left text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-normal">Post</th>
              <th className="px-3 py-2 font-normal">Platform</th>
              <th className="px-3 py-2 font-normal">
                <span className="inline-flex items-center gap-1">
                  Sessions
                  <InfoTooltip text={METRIC_EXPLANATIONS.sessions} />
                </span>
              </th>
              <th className="px-3 py-2 font-normal">
                <span className="inline-flex items-center gap-1">
                  Users
                  <InfoTooltip text={METRIC_EXPLANATIONS.users} />
                </span>
              </th>
              <th className="px-3 py-2 font-normal">
                <span className="inline-flex items-center gap-1">
                  New users
                  <InfoTooltip text={METRIC_EXPLANATIONS.newUsers} />
                </span>
              </th>
              <th className="px-3 py-2 font-normal">
                <span className="inline-flex items-center gap-1">
                  Page views
                  <InfoTooltip text={METRIC_EXPLANATIONS.pageViews} />
                </span>
              </th>
              <th className="px-3 py-2 font-normal">
                <span className="inline-flex items-center gap-1">
                  Engagement
                  <InfoTooltip text={METRIC_EXPLANATIONS.engagementRate} />
                </span>
              </th>
              <th className="px-3 py-2 font-normal">
                <span className="inline-flex items-center gap-1">
                  Bounce
                  <InfoTooltip text={METRIC_EXPLANATIONS.bounceRate} />
                </span>
              </th>
              <th className="px-3 py-2 font-normal">
                <span className="inline-flex items-center gap-1">
                  Conversions
                  <InfoTooltip text={METRIC_EXPLANATIONS.conversions} />
                </span>
              </th>
              <th className="px-3 py-2 font-normal">
                <span className="inline-flex items-center gap-1">
                  Trend
                  <InfoTooltip text={METRIC_EXPLANATIONS.trend} />
                </span>
              </th>
              <th className="px-3 py-2 font-normal">
                <span className="inline-flex items-center gap-1">
                  This week
                  <InfoTooltip text={METRIC_EXPLANATIONS.thisWeek} />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={`${row.postId}|${row.platform}`}
                onClick={() => openPreview(row.postId)}
                className="cursor-pointer border-t hover:bg-muted/30"
              >
                <td className="px-3 py-2">
                  <div className="flex max-w-56 items-center gap-2">
                    <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground">
                      {row.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.coverImageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ImageOff className="size-3" />
                      )}
                    </span>
                    <span className="truncate font-medium">{row.title}</span>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <PlatformBadge platform={row.platform} />
                </td>
                <td className="px-3 py-2">{row.sessions}</td>
                <td className="px-3 py-2">{row.users}</td>
                <td className="px-3 py-2">{row.newUsers}</td>
                <td className="px-3 py-2">{row.pageViews}</td>
                <td className="px-3 py-2">{formatPercent(row.engagementRate)}</td>
                <td className="px-3 py-2">{formatPercent(row.bounceRate)}</td>
                <td className="px-3 py-2">{row.conversions}</td>
                <td className="px-3 py-2">
                  <Sparkline values={row.dailySessions} />
                </td>
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
