import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { POST_STATUSES } from "@/lib/types";
import { fetchPostByNumberOrId, needsChangesPatch, McpToolError } from "./shared";

const STATUS_VALUES = POST_STATUSES.map((s) => s.value) as [string, ...string[]];

export const movePostSchema = z.object({
  postNumber: z.number().int(),
  status: z.enum(STATUS_VALUES),
  targetDate: z.string().date().optional().describe("Required if moving to 'scheduled' and the post has no date yet"),
  publishedUrl: z.string().url().optional().describe("Required if moving to 'published' and the post has no link yet"),
});

export type MovePostInput = z.infer<typeof movePostSchema>;

// Mirrors the board's drag-and-drop rules (components/board/Board.tsx):
// Scheduled needs a target date, Published needs a link — both enforced here
// too since MCP calls skip the UI dialogs that would otherwise prompt for them.
export async function movePostTool(input: MovePostInput, supabase: SupabaseClient) {
  const current = await fetchPostByNumberOrId(supabase, { postNumber: input.postNumber });

  if (input.status === "scheduled" && !current.targetDate && !input.targetDate) {
    throw new McpToolError(`Post #${input.postNumber} needs a target date before it can move to Scheduled — pass targetDate.`);
  }
  if (input.status === "published" && !current.publishedUrl && !input.publishedUrl) {
    throw new McpToolError(`Post #${input.postNumber} needs a published link before it can move to Published — pass publishedUrl.`);
  }

  const changesPatch = needsChangesPatch(current.status, input.status as typeof current.status);
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
