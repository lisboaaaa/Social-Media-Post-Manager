import { format, isThisYear, isToday, isYesterday } from "date-fns";
import type { Comment } from "./types";

export interface CommentGroup<T> {
  label: string;
  items: T[];
}

// Threads are flattened to one level: a reply-to-a-reply still resolves to
// the original top-level comment, so callers never have to handle
// arbitrarily deep indentation.
export function findRootId(comment: Comment, byId: Map<string, Comment>): string {
  let current = comment;
  while (current.parentId) {
    const parent = byId.get(current.parentId);
    if (!parent) break;
    current = parent;
  }
  return current.id;
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, isThisYear(date) ? "MMM d" : "MMM d, yyyy");
}

// Buckets already-sorted items into consecutive same-day runs — a run breaks
// the moment the calendar day changes, so this only works on lists sorted by
// createdAt (ascending or descending, either is fine).
export function groupByDay<T extends { createdAt: string }>(items: T[]): CommentGroup<T>[] {
  const groups: CommentGroup<T>[] = [];

  for (const item of items) {
    const label = dayLabel(item.createdAt);
    const current = groups[groups.length - 1];
    if (current?.label === label) {
      current.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
  }

  return groups;
}
