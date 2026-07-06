import type { ReactNode } from "react";
import type { Profile } from "./types";

// A mention is stored as "@" + the person's name with spaces removed (e.g.
// "Guilherme Silva" -> "@GuilhermeSilva") — no-space keeps the token
// unambiguous to find again when rendering, without needing a separate
// structured mentions table for what's just a readability nicety.
export function mentionToken(fullName: string): string {
  return fullName.replace(/\s+/g, "");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function mentionsProfile(body: string, fullName: string): boolean {
  const token = mentionToken(fullName);
  if (!token) return false;
  return new RegExp(`@${escapeRegExp(token)}\\b`).test(body);
}

// Splits a comment body into plain strings and highlighted mention spans,
// for rendering — matches whichever known profiles' tokens actually appear.
export function renderWithMentions(body: string, profiles: Profile[]): ReactNode[] {
  const tokens = profiles.map((p) => mentionToken(p.fullName)).filter(Boolean);
  if (tokens.length === 0) return [body];

  const pattern = new RegExp(`@(${tokens.map(escapeRegExp).join("|")})\\b`, "g");
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(body))) {
    if (match.index > lastIndex) parts.push(body.slice(lastIndex, match.index));
    parts.push(
      <span key={key++} className="font-semibold text-primary">
        @{match[1]}
      </span>,
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < body.length) parts.push(body.slice(lastIndex));

  return parts;
}
