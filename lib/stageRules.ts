import type { Stage } from "./types";

// Sending a post backward from whichever stage is flagged isReviewStage
// (e.g. "In Review") is how "changes requested" happens on the board, since
// there's no dedicated column for it — flag it automatically. Moving forward
// again means the changes were addressed, so the flag clears once the post
// moves past wherever it was flagged. Keyed on each stage's stored `position`
// (not array order), so this survives stages being freely reordered — and on
// the isReviewStage flag rather than a hardcoded id, so it survives renames.
// Shared between the board's drag-and-drop (components/board/Board.tsx) and
// the MCP move_post tool (lib/mcp/tools/move-post.ts), which must agree.
export function needsChangesPatch(oldStage: Stage, newStage: Stage): { needsChanges: boolean } | Record<string, never> {
  if (oldStage.isReviewStage && newStage.position < oldStage.position) return { needsChanges: true };
  if (newStage.position > oldStage.position) return { needsChanges: false };
  return {};
}
