import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PLATFORMS } from "@/lib/types";
import { fetchPostByNumberOrId, resolveCategoryIds, resolveProfileIdByEmail, syncPostChildren, McpToolError } from "./shared";

export const updatePostSchema = z.object({
  postNumber: z.number().int(),
  title: z.string().optional(),
  descriptions: z.record(z.string(), z.string()).optional(),
  platforms: z.enum(PLATFORMS as [string, ...string[]]).array().min(1).optional(),
  categoryNames: z.array(z.string()).optional(),
  targetDate: z.string().date().nullable().optional(),
  assigneeEmail: z.string().email().nullable().optional(),
  needsChanges: z.boolean().optional(),
  publishedUrl: z.string().url().nullable().optional(),
});

export type UpdatePostInput = z.infer<typeof updatePostSchema>;

// Deliberately excludes `status` — moving status is move_post's job, so the
// Scheduled-date business rule can't be bypassed through this generic patch.
export async function updatePostTool(input: UpdatePostInput, supabase: SupabaseClient) {
  const current = await fetchPostByNumberOrId(supabase, { postNumber: input.postNumber });

  const columns: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.title !== undefined) columns.title = input.title;
  if (input.targetDate !== undefined) columns.target_date = input.targetDate;
  if (input.needsChanges !== undefined) columns.needs_changes = input.needsChanges;
  if (input.publishedUrl !== undefined) columns.published_url = input.publishedUrl;
  if (input.assigneeEmail !== undefined) columns.assignee_id = await resolveProfileIdByEmail(supabase, input.assigneeEmail);

  const { error } = await supabase.from("posts").update(columns).eq("id", current.id);
  if (error) throw new McpToolError(`Couldn't update post #${input.postNumber}: ${error.message}`);

  const categoryIds = input.categoryNames ? await resolveCategoryIds(supabase, input.categoryNames) : undefined;

  // platforms and descriptions are stored together (one post_platforms row
  // per platform+its copy) — if only one of the two was patched, merge with
  // what's already there so the other doesn't get wiped out.
  const touchesPlatformRows = input.platforms !== undefined || input.descriptions !== undefined;
  await syncPostChildren(supabase, current.id, {
    platforms: touchesPlatformRows ? ((input.platforms as (typeof PLATFORMS)[number][] | undefined) ?? current.platforms) : undefined,
    descriptions: touchesPlatformRows
      ? ((input.descriptions as Record<(typeof PLATFORMS)[number], string> | undefined) ?? current.descriptions)
      : undefined,
    categoryIds,
  });

  return { postNumber: input.postNumber, updated: true };
}
