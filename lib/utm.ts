import type { Platform } from "@/lib/types";

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Convention: source = platform name, medium = "organic_social" (matches a
// real link the team already uses), campaign = slugified post title. `content`
// is optional — set it when the same destination is tagged more than once
// for a single post (e.g. the caption link vs. a link dropped in the first
// comment vs. one on an Instagram Story), so GA4's sessionManualAdContent can
// tell those placements apart.
export function buildTaggedUrl(url: string, platform: Platform, campaign: string, content?: string): string | null {
  try {
    const withScheme = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const tagged = new URL(withScheme);
    tagged.searchParams.set("utm_source", platform);
    tagged.searchParams.set("utm_medium", "organic_social");
    tagged.searchParams.set("utm_campaign", slugify(campaign) || "post");
    if (content) tagged.searchParams.set("utm_content", slugify(content));
    return tagged.toString();
  } catch {
    return null;
  }
}
