// Pulls the utm_campaign value back out of a description's tagged link (see
// lib/utm.ts, which is what puts it there in the first place) — this is the
// key used to match a post+platform against GA4's sessionCampaignName.
const UTM_CAMPAIGN_REGEX = /[?&]utm_campaign=([^&\s]+)/i;

export function extractUtmCampaign(text: string): string | null {
  const match = text.match(UTM_CAMPAIGN_REGEX);
  return match ? decodeURIComponent(match[1]) : null;
}

export interface UtmInfo {
  url: string;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
}

const URL_REGEX = /https?:\/\/\S+/gi;

// Finds the first UTM-tagged link in free text (a post's caption) and reads
// back every utm_ param at once — used for the "see all tags" overview,
// where extractUtmCampaign alone (just the one param GA4 matching needs)
// isn't enough.
export function extractUtmInfo(text: string): UtmInfo | null {
  const matches = text.match(URL_REGEX);
  if (!matches) return null;
  for (const raw of matches) {
    try {
      const url = new URL(raw);
      if (!url.searchParams.has("utm_campaign") && !url.searchParams.has("utm_source")) continue;
      return {
        url: raw,
        source: url.searchParams.get("utm_source"),
        medium: url.searchParams.get("utm_medium"),
        campaign: url.searchParams.get("utm_campaign"),
        content: url.searchParams.get("utm_content"),
      };
    } catch {
      continue;
    }
  }
  return null;
}
