const URL_REGEX = /\bhttps?:\/\/[^\s<>"')\]]+|\bwww\.[^\s<>"')\]]+/i;
const URL_REGEX_GLOBAL = /\bhttps?:\/\/[^\s<>"')\]]+|\bwww\.[^\s<>"')\]]+/gi;

export function findFirstUrl(text: string): string | null {
  const match = text.match(URL_REGEX);
  return match ? match[0] : null;
}

// Same pattern, but every match (deduped) — a caption can have more than one
// link, and each one needs its own "tag this" prompt, not just the first.
export function findAllUrls(text: string): string[] {
  return [...new Set(text.match(URL_REGEX_GLOBAL) ?? [])];
}
