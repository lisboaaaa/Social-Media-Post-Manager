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
  newUsers: number;
  pageViews: number;
  engagedSessions: number;
  engagementRate: number | null;
  avgEngagementTime: number | null;
  bounceRate: number | null;
  conversions: number;
  site: string;
}

// Which site each GA4 property tracks — informational only (see
// post-analytics-site.sql for why this isn't part of the row's key).
// An unlisted property id just falls back to itself as the label.
const PROPERTY_SITE_NAMES: Record<string, string> = {
  "502229642": "GenOS",
  "405362406": "Daredata",
};

interface GeoMetrics {
  sessions: number;
  users: number;
}

// GA4 dates come back as "20260717" (yyyymmdd) — turn that into "2026-07-17"
// to match the date column's format.
function formatGa4Date(raw: string): string {
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

// GA4 reports "(not set)" for a dimension no hit ever populated — that's the
// plain caption link (no utm_content set when it was tagged), matching the
// "" default in post_analytics.content.
function normalizeContent(raw: string | undefined): string {
  return !raw || raw === "(not set)" ? "" : raw;
}

// Pulls day-by-day GA4 metrics, broken out by utm_content (so a link in the
// caption, one dropped in a comment, and one on an Instagram Story — all the
// same campaign — show up as separate rows), for every post+platform that
// has a tagged link sitting in its description, and caches them in
// post_analytics. Called from the daily cron route and from the dev tools
// panel's manual "Sync now" button — same shape as purgeOldMedia.
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

  // keyed by "date|campaign|content"
  const metricsByKey = new Map<string, DailyMetrics>();
  // keyed by "date|campaign|device|country" (raw country, before top-5 capping)
  const geoByKey = new Map<string, GeoMetrics>();

  for (const propertyId of propertyIds) {
    const site = PROPERTY_SITE_NAMES[propertyId] ?? propertyId;
    const reportRes = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        dateRanges: [{ startDate: "90daysAgo", endDate: "today" }],
        dimensions: [{ name: "date" }, { name: "sessionCampaignName" }, { name: "sessionManualAdContent" }],
        metrics: [
          { name: "sessions" },
          { name: "activeUsers" },
          { name: "newUsers" },
          { name: "screenPageViews" },
          { name: "engagedSessions" },
          { name: "engagementRate" },
          { name: "averageSessionDuration" },
          { name: "bounceRate" },
          { name: "conversions" },
        ],
        dimensionFilter: { filter: { fieldName: "sessionCampaignName", inListFilter: { values: campaigns } } },
        limit: 100000,
      }),
    });

    if (!reportRes.ok) {
      errors.push(`GA4 report request failed for property ${propertyId}: ${await reportRes.text()}`);
    } else {
      const report = await reportRes.json();
      for (const row of report.rows ?? []) {
        const rawDate = row.dimensionValues?.[0]?.value;
        const campaign = row.dimensionValues?.[1]?.value;
        const content = normalizeContent(row.dimensionValues?.[2]?.value);
        if (!rawDate || !campaign) continue;
        const date = formatGa4Date(rawDate);
        const [sessions, users, newUsers, pageViews, engagedSessions, engagementRate, avgEngagementTime, bounceRate, conversions] = (
          row.metricValues ?? []
        ).map((m: { value: string }) => Number(m.value ?? 0));

        const key = `${date}|${campaign}|${content}`;
        const existing = metricsByKey.get(key);
        metricsByKey.set(key, {
          sessions: (existing?.sessions ?? 0) + (sessions || 0),
          users: (existing?.users ?? 0) + (users || 0),
          newUsers: (existing?.newUsers ?? 0) + (newUsers || 0),
          pageViews: (existing?.pageViews ?? 0) + (pageViews || 0),
          engagedSessions: (existing?.engagedSessions ?? 0) + (engagedSessions || 0),
          engagementRate: engagementRate ?? null,
          avgEngagementTime: avgEngagementTime ?? null,
          bounceRate: bounceRate ?? null,
          conversions: (existing?.conversions ?? 0) + (conversions || 0),
          // A tagged link only lives on one site in practice — this just
          // takes whichever property actually had traffic for it.
          site: sessions > 0 || !existing ? site : existing.site,
        });
      }
    }

    // Separate report: device/country instead of content — mixing all three
    // into one query would multiply rows by device x country x content, so
    // this is deliberately its own, coarser breakdown (see post-analytics-geo.sql).
    const geoRes = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        dateRanges: [{ startDate: "90daysAgo", endDate: "today" }],
        dimensions: [{ name: "date" }, { name: "sessionCampaignName" }, { name: "deviceCategory" }, { name: "country" }],
        metrics: [{ name: "sessions" }, { name: "activeUsers" }],
        dimensionFilter: { filter: { fieldName: "sessionCampaignName", inListFilter: { values: campaigns } } },
        limit: 100000,
      }),
    });

    if (!geoRes.ok) {
      errors.push(`GA4 geo report request failed for property ${propertyId}: ${await geoRes.text()}`);
      continue;
    }

    const geoReport = await geoRes.json();
    for (const row of geoReport.rows ?? []) {
      const rawDate = row.dimensionValues?.[0]?.value;
      const campaign = row.dimensionValues?.[1]?.value;
      const device = row.dimensionValues?.[2]?.value || "(not set)";
      const country = row.dimensionValues?.[3]?.value || "(not set)";
      if (!rawDate || !campaign) continue;
      const date = formatGa4Date(rawDate);
      const [sessions, users] = (row.metricValues ?? []).map((m: { value: string }) => Number(m.value ?? 0));

      const geoKey = `${date}|${campaign}|${device}|${country}`;
      const existingGeo = geoByKey.get(geoKey);
      geoByKey.set(geoKey, {
        sessions: (existingGeo?.sessions ?? 0) + (sessions || 0),
        users: (existingGeo?.users ?? 0) + (users || 0),
      });
    }
  }

  // A campaign GA4 never returned a single row for (no traffic recorded
  // yet, or still processing) would otherwise end up with zero rows in
  // post_analytics — the UI can't tell "not synced" from "synced, no
  // clicks yet" apart. Write an explicit zero row (dated today, no content
  // tag) so it can.
  const queriedCampaigns = new Set([...metricsByKey.keys()].map((key) => key.split("|")[1]));
  const today = new Date().toISOString().slice(0, 10);
  for (const campaign of campaigns) {
    if (queriedCampaigns.has(campaign)) continue;
    metricsByKey.set(`${today}|${campaign}|`, {
      sessions: 0,
      users: 0,
      newUsers: 0,
      pageViews: 0,
      engagedSessions: 0,
      engagementRate: null,
      avgEngagementTime: null,
      bounceRate: null,
      conversions: 0,
      site: "",
    });
  }

  let updated = 0;
  for (const [key, metrics] of metricsByKey) {
    const [date, campaign, content] = key.split("|");
    const targets = targetsByCampaign.get(campaign) ?? [];
    for (const { postId, platform } of targets) {
      const { error: upsertError } = await supabase.from("post_analytics").upsert(
        {
          post_id: postId,
          platform,
          date,
          content,
          site: metrics.site,
          sessions: metrics.sessions,
          users: metrics.users,
          new_users: metrics.newUsers,
          page_views: metrics.pageViews,
          engaged_sessions: metrics.engagedSessions,
          engagement_rate: metrics.engagementRate,
          avg_engagement_time: metrics.avgEngagementTime,
          bounce_rate: metrics.bounceRate,
          conversions: metrics.conversions,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "post_id,platform,date,content" },
      );
      if (upsertError) errors.push(`post ${postId}/${platform}/${date}/${content}: ${upsertError.message}`);
      else updated++;
    }
  }

  // Total sessions per campaign+country across the whole window, to find
  // each campaign's top 5 — an unbounded country list would grow
  // post_analytics_geo forever, most of it long-tail noise.
  const totalsByCampaignCountry = new Map<string, Map<string, number>>();
  for (const [key, metrics] of geoByKey) {
    const [, campaign, , country] = key.split("|");
    const countryTotals = totalsByCampaignCountry.get(campaign) ?? new Map<string, number>();
    countryTotals.set(country, (countryTotals.get(country) ?? 0) + metrics.sessions);
    totalsByCampaignCountry.set(campaign, countryTotals);
  }
  const topCountriesByCampaign = new Map<string, Set<string>>();
  for (const [campaign, countryTotals] of totalsByCampaignCountry) {
    const top = [...countryTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([country]) => country);
    topCountriesByCampaign.set(campaign, new Set(top));
  }

  // Re-key with any country outside its campaign's top 5 folded into "Other".
  const finalGeoByKey = new Map<string, GeoMetrics>();
  for (const [key, metrics] of geoByKey) {
    const [date, campaign, device, country] = key.split("|");
    const top = topCountriesByCampaign.get(campaign);
    const bucketed = top?.has(country) ? country : "Other";
    const finalKey = `${date}|${campaign}|${device}|${bucketed}`;
    const existing = finalGeoByKey.get(finalKey);
    finalGeoByKey.set(finalKey, {
      sessions: (existing?.sessions ?? 0) + metrics.sessions,
      users: (existing?.users ?? 0) + metrics.users,
    });
  }

  for (const [key, metrics] of finalGeoByKey) {
    const [date, campaign, device, country] = key.split("|");
    const targets = targetsByCampaign.get(campaign) ?? [];
    for (const { postId, platform } of targets) {
      const { error: upsertError } = await supabase.from("post_analytics_geo").upsert(
        {
          post_id: postId,
          platform,
          date,
          device_category: device,
          country,
          sessions: metrics.sessions,
          users: metrics.users,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "post_id,platform,date,device_category,country" },
      );
      if (upsertError) errors.push(`geo ${postId}/${platform}/${date}/${device}/${country}: ${upsertError.message}`);
      else updated++;
    }
  }

  return { postsChecked, campaignsQueried: campaigns.length, updated, errors };
}
