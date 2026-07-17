import type { ReactNode } from "react";

const URL_REGEX_GLOBAL = /\bhttps?:\/\/[^\s<>"')\]]+|\bwww\.[^\s<>"')\]]+/gi;

// Turns any URLs sitting in plain caption text into real, clickable links —
// matches how LinkedIn/X actually render a caption (unlike Instagram, whose
// caption links are never clickable, so this isn't used there).
export function renderLinkedText(text: string): ReactNode {
  const matches = [...text.matchAll(URL_REGEX_GLOBAL)];
  if (matches.length === 0) return text;

  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  matches.forEach((match, i) => {
    const start = match.index ?? 0;
    if (start > lastIndex) nodes.push(text.slice(lastIndex, start));
    const url = match[0];
    const href = url.startsWith("www.") ? `https://${url}` : url;
    nodes.push(
      <a
        key={`${start}-${i}`}
        href={href}
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-2"
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>,
    );
    lastIndex = start + url.length;
  });
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));

  return nodes;
}
