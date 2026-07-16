import { PLATFORM_LABELS, type Platform, type Post } from "./types";

// Turns a patch about to be applied to `current` into one human-readable
// line per changed field — the log entries actually written to post_history.
// Deliberately never includes description/caption text itself (just that it
// changed) — the point is a timeline of "who changed what", not a copy of
// everything ever written.

const sameSet = (a: string[], b: string[]) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

// Minimal shapes, not the full Profile/Category/Stage — callers (the client
// store and the MCP tools) already have these lying around in different
// forms, and only the name/label is needed here.
export interface HistoryContext {
  profiles: { id: string; fullName: string }[];
  categories: { id: string; name: string }[];
  stages: { id: string; label: string }[];
}

function profileName(id: string | null, profiles: HistoryContext["profiles"]): string {
  if (!id) return "Unassigned";
  return profiles.find((p) => p.id === id)?.fullName ?? "someone no longer on the team";
}

function stageLabel(id: string, stages: HistoryContext["stages"]): string {
  return stages.find((s) => s.id === id)?.label ?? id;
}

function categoryNames(ids: string[], categories: HistoryContext["categories"]): string {
  const names = ids.map((id) => categories.find((c) => c.id === id)?.name).filter((n): n is string => Boolean(n));
  return names.length ? names.join(", ") : "none";
}

export function summarizePostChanges(current: Post, patch: Partial<Post>, ctx: HistoryContext): string[] {
  const lines: string[] = [];

  if (patch.title !== undefined && patch.title !== current.title) {
    lines.push(`title changed to "${patch.title || "(untitled)"}"`);
  }

  if (patch.platforms !== undefined && !sameSet(patch.platforms, current.platforms)) {
    lines.push(`platforms changed to ${patch.platforms.map((p) => PLATFORM_LABELS[p]).join(", ") || "none"}`);
  }

  if (patch.descriptions !== undefined) {
    for (const platform of Object.keys(patch.descriptions) as Platform[]) {
      if (patch.descriptions[platform] !== current.descriptions[platform]) {
        lines.push(`${PLATFORM_LABELS[platform]} description changed`);
      }
    }
  }

  if (patch.status !== undefined && patch.status !== current.status) {
    lines.push(`moved from ${stageLabel(current.status, ctx.stages)} to ${stageLabel(patch.status, ctx.stages)}`);
  }

  if (patch.targetDate !== undefined && patch.targetDate !== current.targetDate) {
    lines.push(patch.targetDate ? `target date set to ${patch.targetDate}` : "target date cleared");
  }

  if (patch.publishedUrls !== undefined) {
    for (const platform of Object.keys(patch.publishedUrls) as Platform[]) {
      const next = patch.publishedUrls[platform];
      if (next && next !== current.publishedUrls[platform]) {
        lines.push(`${PLATFORM_LABELS[platform]} published URL set to ${next}`);
      }
    }
  }

  if (patch.assigneeId !== undefined && patch.assigneeId !== current.assigneeId) {
    lines.push(`assignee changed to ${profileName(patch.assigneeId, ctx.profiles)}`);
  }

  if (patch.requestedById !== undefined && patch.requestedById !== current.requestedById) {
    lines.push(`requested by changed to ${profileName(patch.requestedById, ctx.profiles)}`);
  }

  if (patch.categoryIds !== undefined && !sameSet(patch.categoryIds, current.categoryIds)) {
    lines.push(`categories changed to ${categoryNames(patch.categoryIds, ctx.categories)}`);
  }

  if (patch.images !== undefined && !sameSet(patch.images.map((i) => i.imageUrl), current.images.map((i) => i.imageUrl))) {
    lines.push("media updated");
  }

  if (patch.keepMedia !== undefined && patch.keepMedia !== current.keepMedia) {
    lines.push(patch.keepMedia ? "marked to keep media forever" : "keep-media flag removed");
  }

  return lines;
}
