import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { mapPostAnalyticsGeoRow, mapPostAnalyticsRow, mapPostRow, POST_SELECT } from "@/lib/supabase/mappers";
import { weightedAverage } from "@/lib/postAnalyticsMath";
import { PLATFORM_LABELS, type Platform, type PostAnalytics, type PostAnalyticsGeo } from "@/lib/types";
import { McpToolError } from "./shared";

export const getAnalyticsOverviewSchema = z.object({
  dateFrom: z.string().date().optional().describe("ISO date, inclusive lower bound on the analytics day (not the post's target date)"),
  dateTo: z.string().date().optional().describe("ISO date, inclusive upper bound"),
});

export type GetAnalyticsOverviewInput = z.infer<typeof getAnalyticsOverviewSchema>;

function summarize(rows: PostAnalytics[]) {
  return {
    sessions: rows.reduce((sum, r) => sum + r.sessions, 0),
    users: rows.reduce((sum, r) => sum + r.users, 0),
    newUsers: rows.reduce((sum, r) => sum + r.newUsers, 0),
    pageViews: rows.reduce((sum, r) => sum + r.pageViews, 0),
    engagementRate: weightedAverage(rows, (r) => r.sessions, (r) => r.engagementRate),
    bounceRate: weightedAverage(rows, (r) => r.sessions, (r) => r.bounceRate),
    conversions: rows.reduce((sum, r) => sum + r.conversions, 0),
  };
}

function pushTo<K, T>(map: Map<K, T[]>, key: K, row: T) {
  const list = map.get(key);
  if (list) list.push(row);
  else map.set(key, [row]);
}

function summarizeGeo(rows: PostAnalyticsGeo[]) {
  return { sessions: rows.reduce((sum, r) => sum + r.sessions, 0), users: rows.reduce((sum, r) => sum + r.users, 0) };
}

// The chat equivalent of the /analytics page — same totals/by-platform/
// by-category math (lib/postAnalyticsMath.ts), plus a top-posts ranking
// that page doesn't surface directly (it sorts the whole table instead).
export async function getAnalyticsOverviewTool(input: GetAnalyticsOverviewInput, supabase: SupabaseClient) {
  let query = supabase.from("post_analytics").select("*");
  if (input.dateFrom) query = query.gte("date", input.dateFrom);
  if (input.dateTo) query = query.lte("date", input.dateTo);
  const { data, error } = await query;
  if (error) throw new McpToolError(`Couldn't load analytics: ${error.message}`);

  const rows = (data ?? []).map(mapPostAnalyticsRow);
  if (rows.length === 0) return { hasData: false, message: "No GA4 data synced for this range." };

  let geoQuery = supabase.from("post_analytics_geo").select("*");
  if (input.dateFrom) geoQuery = geoQuery.gte("date", input.dateFrom);
  if (input.dateTo) geoQuery = geoQuery.lte("date", input.dateTo);
  const { data: geoData, error: geoError } = await geoQuery;
  if (geoError) throw new McpToolError(`Couldn't load device/country breakdown: ${geoError.message}`);
  const geoRows = (geoData ?? []).map(mapPostAnalyticsGeoRow);

  const postIds = [...new Set(rows.map((r) => r.postId))];
  const { data: postRows } = await supabase.from("posts").select(POST_SELECT).in("id", postIds);
  const posts = (postRows ?? []).map(mapPostRow);
  const postById = new Map(posts.map((p) => [p.id, p]));

  const { data: categoryRows } = await supabase.from("categories").select("id, name");
  const categoryNameById = new Map((categoryRows ?? []).map((c: { id: string; name: string }) => [c.id, c.name]));

  const byPlatform = new Map<Platform, PostAnalytics[]>();
  const byCategory = new Map<string, PostAnalytics[]>();
  const byPost = new Map<string, PostAnalytics[]>();
  for (const row of rows) {
    pushTo(byPlatform, row.platform, row);
    pushTo(byPost, row.postId, row);
    const post = postById.get(row.postId);
    const categoryIds = post && post.categoryIds.length > 0 ? post.categoryIds : ["__none__"];
    for (const catId of categoryIds) pushTo(byCategory, catId, row);
  }

  const platformBreakdown = [...byPlatform.entries()]
    .map(([platform, rs]) => ({ platform: PLATFORM_LABELS[platform], ...summarize(rs) }))
    .sort((a, b) => b.sessions - a.sessions);

  const categoryBreakdown = [...byCategory.entries()]
    .map(([id, rs]) => ({ category: id === "__none__" ? "No category" : (categoryNameById.get(id) ?? "Unknown"), ...summarize(rs) }))
    .sort((a, b) => b.sessions - a.sessions);

  const topPosts = [...byPost.entries()]
    .map(([postId, rs]) => ({
      postNumber: postById.get(postId)?.postNumber ?? null,
      title: postById.get(postId)?.title || "Untitled post",
      ...summarize(rs),
    }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 10);

  const byDevice = new Map<string, PostAnalyticsGeo[]>();
  const byCountry = new Map<string, PostAnalyticsGeo[]>();
  for (const row of geoRows) {
    pushTo(byDevice, row.deviceCategory, row);
    pushTo(byCountry, row.country, row);
  }
  const deviceBreakdown = [...byDevice.entries()].map(([device, rs]) => ({ device, ...summarizeGeo(rs) })).sort((a, b) => b.sessions - a.sessions);
  const countryBreakdown = [...byCountry.entries()].map(([country, rs]) => ({ country, ...summarizeGeo(rs) })).sort((a, b) => b.sessions - a.sessions);

  return {
    hasData: true,
    totals: summarize(rows),
    byPlatform: platformBreakdown,
    byCategory: categoryBreakdown,
    byDevice: deviceBreakdown.length > 0 ? deviceBreakdown : undefined,
    byCountry: countryBreakdown.length > 0 ? countryBreakdown : undefined,
    topPosts,
  };
}
