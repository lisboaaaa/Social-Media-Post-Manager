import type { SupabaseClient } from "@supabase/supabase-js";
import { getGoogleAccessToken } from "./googleAnalyticsAuth";
import { extractUtmCampaign } from "./utmCampaign";
import type { Platform } from "./types";

export interface Ga4SyncResult {
  postsChecked: number;
  campaignsQueried: number;
  updated: number;
  errors: string[];
}

interface PostPlatformRow {
  platform: Platform;
  description: string | null;
}

interface DailyMetrics {
  sessions: number;
  users: number;
  pageViews: number;
  engagedSessions: number;
  engagementRate: number | null;
  avgEngagementTime: number | null;
  bounceRate: number | null;
}

// GA4 dates come back as "20260717" (yyyymmdd) — turn that into "2026-07-17"
// to match the date column's format.
function formatGa4Date(raw: string): string {
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

// Pulls day-by-day GA4 metrics for every post+platform that has a tagged
// link (one that carries a utm_campaign) sitting in its description, and
// caches them in post_analytics. Called from the daily cron route and from
// the dev tools panel's manual "Sync now" button — same shape as purgeOldMedia.
export async function syncGa4Analytics(supabase: SupabaseClient): Promise<Ga4SyncResult> {
  const errors: string[] = [];

  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("id, post_platforms(platform, description)")
    .is("deleted_at", null);
  if (postsError) return { postsChecked: 0, campaignsQueried: 0, updated: 0, errors: [postsError.message] };

  // One campaign slug can (in theory) map to more than one post+platform —
  // group so a single GA4 lookup covers every target it applies to.
  const targetsByCampaign = new Map<string, { postId: string; platform: Platform }[]>();
  for (const post of posts ?? []) {
    const platforms = (post.post_platforms ?? []) as PostPlatformRow[];
    for (const pp of platforms) {
      const campaign = extractUtmCampaign(pp.description ?? "");
      if (!campaign) continue;
      const list = targetsByCampaign.get(campaign) ?? [];
      list.push({ postId: post.id, platform: pp.platform });
      targetsByCampaign.set(campaign, list);
    }
  }

  const campaigns = [...targetsByCampaign.keys()];
  const postsChecked = posts?.length ?? 0;
  if (campaigns.length === 0) return { postsChecked, campaignsQueried: 0, updated: 0, errors };

  // Posts link out to more than one site (e.g. daredata.ai and GenOS's own
  // site), each tracked as its own GA4 property — a campaign could show up
  // in either, so every property gets queried and results merged per day.
  const propertyIds = (process.env.GA4_PROPERTY_IDS ?? "").split(",").map((id) => id.trim()).filter(Boolean);
  if (propertyIds.length === 0) return { postsChecked, campaignsQueried: campaigns.length, updated: 0, errors: ["GA4_PROPERTY_IDS isn't set"] };

  let accessToken: string;
  try {
    accessToken = await getGoogleAccessToken();
  } catch (e) {
    return { postsChecked, campaignsQueried: campaigns.length, updated: 0, errors: [e instanceof Error ? e.message : "Couldn't get a Google access token"] };
  }

  // keyed by "date|campaign"
  const metricsByDateCampaign = new Map<string, DailyMetrics>();

  for (const propertyId of propertyIds) {
    const reportRes = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        dateRanges: [{ startDate: "90daysAgo", endDate: "today" }],
        dimensions: [{ name: "date" }, { name: "sessionCampaignName" }],
        metrics: [
          { name: "sessions" },
          { name: "activeUsers" },
          { name: "screenPageViews" },
          { name: "engagedSessions" },
          { name: "engagementRate" },
          { name: "averageSessionDuration" },
          { name: "bounceRate" },
        ],
        dimensionFilter: { filter: { fieldName: "sessionCampaignName", inListFilter: { values: campaigns } } },
        limit: 100000,
      }),
    });

    if (!reportRes.ok) {
      errors.push(`GA4 report request failed for property ${propertyId}: ${await reportRes.text()}`);
      continue;
    }

    const report = await reportRes.json();
    for (const row of report.rows ?? []) {
      const rawDate = row.dimensionValues?.[0]?.value;
      const campaign = row.dimensionValues?.[1]?.value;
      if (!rawDate || !campaign) continue;
      const date = formatGa4Date(rawDate);
      const [sessions, users, pageViews, engagedSessions, engagementRate, avgEngagementTime, bounceRate] = (row.metricValues ?? []).map(
        (m: { value: string }) => Number(m.value ?? 0),
      );

      const key = `${date}|${campaign}`;
      const existing = metricsByDateCampaign.get(key);
      metricsByDateCampaign.set(key, {
        sessions: (existing?.sessions ?? 0) + (sessions || 0),
        users: (existing?.users ?? 0) + (users || 0),
        pageViews: (existing?.pageViews ?? 0) + (pageViews || 0),
        engagedSessions: (existing?.engagedSessions ?? 0) + (engagedSessions || 0),
        engagementRate: engagementRate ?? null,
        avgEngagementTime: avgEngagementTime ?? null,
        bounceRate: bounceRate ?? null,
      });
    }
  }

  let updated = 0;
  for (const [key, metrics] of metricsByDateCampaign) {
    const [date, campaign] = key.split("|");
    const targets = targetsByCampaign.get(campaign) ?? [];
    for (const { postId, platform } of targets) {
      const { error: upsertError } = await supabase.from("post_analytics").upsert(
        {
          post_id: postId,
          platform,
          date,
          sessions: metrics.sessions,
          users: metrics.users,
          page_views: metrics.pageViews,
          engaged_sessions: metrics.engagedSessions,
          engagement_rate: metrics.engagementRate,
          avg_engagement_time: metrics.avgEngagementTime,
          bounce_rate: metrics.bounceRate,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "post_id,platform,date" },
      );
      if (upsertError) errors.push(`post ${postId}/${platform}/${date}: ${upsertError.message}`);
      else updated++;
    }
  }

  return { postsChecked, campaignsQueried: campaigns.length, updated, errors };
}
