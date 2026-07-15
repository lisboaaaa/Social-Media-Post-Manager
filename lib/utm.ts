import type { Platform } from "@/lib/types";

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Placeholder convention (source = platform name, medium = "social", campaign =
// slugified post title) until the team confirms how links are already tagged
// today — swap this out once that's known, so old and new links stay comparable
// in Google Analytics.
export function buildTaggedUrl(url: string, platform: Platform, campaign: string): string | null {
  try {
    const withScheme = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const tagged = new URL(withScheme);
    tagged.searchParams.set("utm_source", platform);
    tagged.searchParams.set("utm_medium", "social");
    tagged.searchParams.set("utm_campaign", slugify(campaign) || "post");
    return tagged.toString();
  } catch {
    return null;
  }
}
