import type { ReactNode } from "react";

const URL_REGEX_GLOBAL = /\bhttps?:\/\/[^\s<>"')\]]+|\bwww\.[^\s<>"')\]]+/gi;

function toHref(url: string): string {
  return url.startsWith("www.") ? `https://${url}` : url;
}

// Turns any URLs sitting in caption text into real, clickable links, and
// (unlike a plain string truncation) never lets a link's href end up cut
// short just because the visible text ran out — the underlying URL a click
// goes to is always the complete one, even when what's shown is clipped at
// `limit` characters to match a platform's real truncation behavior (see
// captionPreview.ts). Not used for Instagram, whose caption links are never
// clickable in the first place.
export function renderLinkedCaption(text: string, limit: number | null): { node: ReactNode; truncated: boolean } {
  const matches = [...text.matchAll(URL_REGEX_GLOBAL)];
  const noLimit = limit === null || text.length <= limit;

  if (noLimit) {
    if (matches.length === 0) return { node: text, truncated: false };
    const nodes: ReactNode[] = [];
    let lastIndex = 0;
    matches.forEach((match, i) => {
      const start = match.index ?? 0;
      if (start > lastIndex) nodes.push(text.slice(lastIndex, start));
      const url = match[0];
      nodes.push(
        <a key={`${start}-${i}`} href={toHref(url)} target="_blank" rel="noreferrer" className="underline underline-offset-2" onClick={(e) => e.stopPropagation()}>
          {url}
        </a>,
      );
      lastIndex = start + url.length;
    });
    if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
    return { node: nodes, truncated: false };
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const [i, match] of matches.entries()) {
    const start = match.index ?? 0;
    if (start >= limit) break;

    if (start > cursor) {
      const budget = limit - cursor;
      const chunk = text.slice(cursor, start);
      if (chunk.length <= budget) {
        nodes.push(chunk);
        cursor = start;
      } else {
        nodes.push(chunk.slice(0, budget));
        cursor = limit;
        break;
      }
    }

    const budget = limit - cursor;
    if (budget <= 0) break;
    const url = match[0];
    const shownUrl = url.length <= budget ? url : url.slice(0, budget);
    nodes.push(
      <a key={`${start}-${i}`} href={toHref(url)} target="_blank" rel="noreferrer" className="underline underline-offset-2" onClick={(e) => e.stopPropagation()}>
        {shownUrl}
      </a>,
    );
    cursor += shownUrl.length;
    if (shownUrl.length < url.length) {
      cursor = limit;
      break;
    }
  }

  if (cursor < limit && cursor < text.length) {
    nodes.push(text.slice(cursor, limit));
  }

  return { node: nodes, truncated: true };
}
