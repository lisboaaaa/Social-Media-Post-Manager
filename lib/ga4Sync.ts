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

// Pulls GA4 session counts for every post+platform that has a tagged link
// (one that carries a utm_campaign) sitting in its description, and caches
// them in post_analytics. Called from the daily cron route and from the dev
// tools panel's manual "Sync now" button — same shape as purgeOldMedia.
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

  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) return { postsChecked, campaignsQueried: campaigns.length, updated: 0, errors: ["GA4_PROPERTY_ID isn't set"] };

  let accessToken: string;
  try {
    accessToken = await getGoogleAccessToken();
  } catch (e) {
    return { postsChecked, campaignsQueried: campaigns.length, updated: 0, errors: [e instanceof Error ? e.message : "Couldn't get a Google access token"] };
  }

  const reportRes = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      dateRanges: [{ startDate: "90daysAgo", endDate: "today" }],
      dimensions: [{ name: "sessionCampaignName" }],
      metrics: [{ name: "sessions" }],
      dimensionFilter: { filter: { fieldName: "sessionCampaignName", inListFilter: { values: campaigns } } },
      limit: campaigns.length,
    }),
  });

  if (!reportRes.ok) {
    errors.push(`GA4 report request failed: ${await reportRes.text()}`);
    return { postsChecked, campaignsQueried: campaigns.length, updated: 0, errors };
  }

  const report = await reportRes.json();
  const sessionsByCampaign = new Map<string, number>();
  for (const row of report.rows ?? []) {
    const campaign = row.dimensionValues?.[0]?.value;
    const sessions = Number(row.metricValues?.[0]?.value ?? 0);
    if (campaign) sessionsByCampaign.set(campaign, sessions);
  }

  let updated = 0;
  for (const [campaign, targets] of targetsByCampaign) {
    const sessions = sessionsByCampaign.get(campaign) ?? 0;
    for (const { postId, platform } of targets) {
      const { error: upsertError } = await supabase
        .from("post_analytics")
        .upsert({ post_id: postId, platform, sessions, updated_at: new Date().toISOString() }, { onConflict: "post_id,platform" });
      if (upsertError) errors.push(`post ${postId}/${platform}: ${upsertError.message}`);
      else updated++;
    }
  }

  return { postsChecked, campaignsQueried: campaigns.length, updated, errors };
}
