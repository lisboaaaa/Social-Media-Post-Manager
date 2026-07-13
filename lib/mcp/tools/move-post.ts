import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchPostByNumberOrId, fetchStages, needsChangesPatch, McpToolError } from "./shared";

export const movePostSchema = z.object({
  postNumber: z.number().int(),
  status: z.string().min(1).describe("Target stage id — call list_stages first to see current valid ids/labels"),
  targetDate: z.string().date().optional().describe("Required if the target stage requires a target date and the post has no date yet"),
  publishedUrl: z.string().url().optional().describe("Required if the target stage requires a published link and the post has no link yet"),
});

export type MovePostInput = z.infer<typeof movePostSchema>;

// Mirrors the board's drag-and-drop rules (components/board/Board.tsx): a
// stage flagged requiresTargetDate/requiresPublishedUrl needs one supplied
// here too, since MCP calls skip the UI dialogs that would otherwise prompt.
export async function movePostTool(input: MovePostInput, supabase: SupabaseClient) {
  const current = await fetchPostByNumberOrId(supabase, { postNumber: input.postNumber });
  const stages = await fetchStages(supabase);
  const oldStage = stages.find((s) => s.id === current.status);
  const newStage = stages.find((s) => s.id === input.status);
  if (!newStage) {
    throw new McpToolError(
      `"${input.status}" isn't a known stage. Valid stages: ${stages.map((s) => `${s.id} (${s.label})`).join(", ")}.`,
    );
  }

  if (newStage.requiresTargetDate && !current.targetDate && !input.targetDate) {
    throw new McpToolError(`Post #${input.postNumber} needs a target date before it can move to ${newStage.label} — pass targetDate.`);
  }
  if (newStage.requiresPublishedUrl && !current.publishedUrl && !input.publishedUrl) {
    throw new McpToolError(`Post #${input.postNumber} needs a published link before it can move to ${newStage.label} — pass publishedUrl.`);
  }

  const changesPatch = oldStage ? needsChangesPatch(oldStage, newStage) : {};
  const columns: Record<string, unknown> = {
    status: input.status,
    updated_at: new Date().toISOString(),
  };
  if (changesPatch.needsChanges !== undefined) columns.needs_changes = changesPatch.needsChanges;
  if (input.targetDate) columns.target_date = input.targetDate;
  if (input.publishedUrl) columns.published_url = input.publishedUrl;

  const { error } = await supabase.from("posts").update(columns).eq("id", current.id);
  if (error) throw new McpToolError(`Couldn't move post #${input.postNumber}: ${error.message}`);

  return { postNumber: input.postNumber, status: input.status };
}
