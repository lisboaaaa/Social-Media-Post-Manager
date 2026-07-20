import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { mapPostAnalyticsGeoRow, mapPostAnalyticsRow } from "@/lib/supabase/mappers";
import { weightedAverage } from "@/lib/postAnalyticsMath";
import type { PostAnalytics, PostAnalyticsGeo } from "@/lib/types";
import { fetchPostByNumberOrId, McpToolError } from "./shared";

export const getPostAnalyticsSchema = z.object({
  postNumber: z.number().int(),
});

export type GetPostAnalyticsInput = z.infer<typeof getPostAnalyticsSchema>;

// Same weighting rule the Post Analytics panel in the UI uses — sessions
// weight the rate metrics so a 1-session 100%-engagement day doesn't count
// the same as a 1,000-session 50% day.
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

// "" means no utm_content was set — the plain link in the caption itself.
function contentLabel(content: string): string {
  return content ? content.replace(/_/g, " ") : "Caption link";
}

function summarizeGeo(rows: PostAnalyticsGeo[]) {
  return { sessions: rows.reduce((sum, r) => sum + r.sessions, 0), users: rows.reduce((sum, r) => sum + r.users, 0) };
}

function pushTo<K>(map: Map<K, PostAnalyticsGeo[]>, key: K, row: PostAnalyticsGeo) {
  const list = map.get(key);
  if (list) list.push(row);
  else map.set(key, [row]);
}

export async function getPostAnalyticsTool(input: GetPostAnalyticsInput, supabase: SupabaseClient) {
  const post = await fetchPostByNumberOrId(supabase, { postNumber: input.postNumber });

  const [{ data, error }, { data: geoData, error: geoError }] = await Promise.all([
    supabase.from("post_analytics").select("*").eq("post_id", post.id),
    supabase.from("post_analytics_geo").select("*").eq("post_id", post.id),
  ]);
  if (error) throw new McpToolError(`Couldn't load analytics for #${input.postNumber}: ${error.message}`);
  if (geoError) throw new McpToolError(`Couldn't load device/country breakdown for #${input.postNumber}: ${geoError.message}`);

  const rows = (data ?? []).map(mapPostAnalyticsRow);
  if (rows.length === 0) {
    return { postNumber: post.postNumber, hasData: false, message: "No GA4 data synced for this post yet." };
  }

  const geoRows = (geoData ?? []).map(mapPostAnalyticsGeoRow);

  const byPlatform = post.platforms
    .map((platform) => {
      const platformRows = rows.filter((r) => r.platform === platform);
      if (platformRows.length === 0) return null;

      const byContent = new Map<string, PostAnalytics[]>();
      for (const row of platformRows) {
        const list = byContent.get(row.content) ?? [];
        list.push(row);
        byContent.set(row.content, list);
      }
      const byPlacement = [...byContent.entries()]
        .map(([content, contentRows]) => ({ placement: contentLabel(content), ...summarize(contentRows) }))
        .sort((a, b) => b.sessions - a.sessions);

      const platformGeoRows = geoRows.filter((r) => r.platform === platform);
      const byDevice = new Map<string, PostAnalyticsGeo[]>();
      const byCountry = new Map<string, PostAnalyticsGeo[]>();
      for (const row of platformGeoRows) {
        pushTo(byDevice, row.deviceCategory, row);
        pushTo(byCountry, row.country, row);
      }

      return {
        platform,
        ...summarize(platformRows),
        byPlacement: byPlacement.length > 1 ? byPlacement : undefined,
        byDevice:
          byDevice.size > 0
            ? [...byDevice.entries()].map(([device, r]) => ({ device, ...summarizeGeo(r) })).sort((a, b) => b.sessions - a.sessions)
            : undefined,
        byCountry:
          byCountry.size > 0
            ? [...byCountry.entries()].map(([country, r]) => ({ country, ...summarizeGeo(r) })).sort((a, b) => b.sessions - a.sessions)
            : undefined,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  return { postNumber: post.postNumber, hasData: true, byPlatform };
}
