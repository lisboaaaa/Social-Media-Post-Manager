import { POST_STATUSES, type Category, type Post, type PostStatus } from "./types";

export interface StatusBreakdown {
  status: PostStatus;
  label: string;
  count: number;
}

export interface CategoryBreakdown {
  id: string;
  name: string;
  count: number;
}

export interface WeeklyActivityPoint {
  weekStart: string; // ISO date
  label: string; // short display label, e.g. "Jun 9"
  count: number;
}

export interface PersonalStats {
  totalPosts: number;
  publishedPosts: number;
  needsChangesPosts: number;
  noDatePosts: number;
  avgPostsPerWeek: number;
  byStatus: StatusBreakdown[];
  topCategories: CategoryBreakdown[];
  weeklyActivity: WeeklyActivityPoint[];
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const TREND_WEEKS = 10;

// Personal stats are scoped to posts the user is the assignee on — that's
// "their work", distinct from posts they merely requested or created.
export function computePersonalStats(posts: Post[], categories: Category[], userId: string): PersonalStats {
  const mine = posts.filter((p) => p.assigneeId === userId);

  const byStatus: StatusBreakdown[] = POST_STATUSES.map(({ value, label }) => ({
    status: value,
    label,
    count: mine.filter((p) => p.status === value).length,
  }));

  const categoryCounts = new Map<string, number>();
  for (const post of mine) {
    for (const categoryId of post.categoryIds) {
      categoryCounts.set(categoryId, (categoryCounts.get(categoryId) ?? 0) + 1);
    }
  }
  const topCategories: CategoryBreakdown[] = categories
    .map((c) => ({ id: c.id, name: c.name, count: categoryCounts.get(c.id) ?? 0 }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const now = Date.now();
  // Published posts only, keyed by their target date — this tracks actual
  // output (what went out the door), not how many posts were merely added
  // to the tracker that week.
  const published = mine.filter((p) => p.status === "published" && p.targetDate);
  const weeklyActivity: WeeklyActivityPoint[] = Array.from({ length: TREND_WEEKS }, (_, i) => {
    const weeksAgo = TREND_WEEKS - 1 - i;
    const weekEnd = now - weeksAgo * WEEK_MS;
    const weekStart = weekEnd - WEEK_MS;
    const count = published.filter((p) => {
      // Appending a local time avoids the browser parsing the date-only
      // string as UTC midnight, which shifts it a day earlier in timezones
      // behind UTC.
      const publishedAt = new Date(`${p.targetDate}T00:00:00`).getTime();
      return publishedAt > weekStart && publishedAt <= weekEnd;
    }).length;
    return {
      weekStart: new Date(weekStart).toISOString().slice(0, 10),
      label: new Date(weekEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count,
    };
  });

  const earliestCreatedAt = mine.reduce<number | null>((min, p) => {
    const created = new Date(p.createdAt).getTime();
    return min === null || created < min ? created : min;
  }, null);
  const weeksActive = earliestCreatedAt ? Math.max(1, (now - earliestCreatedAt) / WEEK_MS) : 1;

  return {
    totalPosts: mine.length,
    publishedPosts: mine.filter((p) => p.status === "published").length,
    needsChangesPosts: mine.filter((p) => p.needsChanges).length,
    noDatePosts: mine.filter((p) => !p.targetDate).length,
    avgPostsPerWeek: mine.length ? mine.length / weeksActive : 0,
    byStatus,
    topCategories,
    weeklyActivity,
  };
}
