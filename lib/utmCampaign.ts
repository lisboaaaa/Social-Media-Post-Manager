// Pulls the utm_campaign value back out of a description's tagged link (see
// lib/utm.ts, which is what puts it there in the first place) — this is the
// key used to match a post+platform against GA4's sessionCampaignName.
const UTM_CAMPAIGN_REGEX = /[?&]utm_campaign=([^&\s]+)/i;

export function extractUtmCampaign(text: string): string | null {
  const match = text.match(UTM_CAMPAIGN_REGEX);
  return match ? decodeURIComponent(match[1]) : null;
}
