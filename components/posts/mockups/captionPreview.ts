// Character-based approximation of each platform's mobile feed truncation —
// deliberately not CSS line-clamp, since how many lines a caption wraps to
// depends on container width/font rendering, not just character count.
// These cutoffs are our best current read of each platform's real behavior,
// not something fetched live — platforms tweak this over time, so if it
// drifts from what you see in the real app, adjust the number here.
export const CAPTION_PREVIEW_LIMIT = {
  // LinkedIn's mobile feed clips a post at roughly 3 lines before "…see more".
  linkedin: 210,
  // Instagram's feed clips a caption at 2 lines before "… more".
  instagram: 125,
  // X posts are capped at 280 characters, which the timeline always shows in full.
  x: null,
} as const;

export function truncateCaption(text: string, limit: number | null): { shown: string; truncated: boolean } {
  if (limit === null || text.length <= limit) return { shown: text, truncated: false };
  return { shown: text.slice(0, limit).trimEnd(), truncated: true };
}
