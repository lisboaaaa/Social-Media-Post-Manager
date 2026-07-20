import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { mapPostRow, POST_SELECT } from "@/lib/supabase/mappers";
import type { Profile } from "@/lib/types";
import { fetchPostByNumberOrId, fetchStages, logHistory, syncPostChildren, McpToolError } from "./shared";

export const duplicatePostSchema = z.object({
  postNumber: z.number().int(),
});

export type DuplicatePostInput = z.infer<typeof duplicatePostSchema>;

// Mirrors PostPreviewModal's "Duplicate" button: same platforms/copy/images/
// categories, but reset to the default stage with no date, assignee, or
// published links — a fresh draft to tweak, not a live re-publish.
export async function duplicatePostTool(input: DuplicatePostInput, profile: Profile, supabase: SupabaseClient) {
  const source = await fetchPostByNumberOrId(supabase, { postNumber: input.postNumber });
  const stages = await fetchStages(supabase);
  const defaultStageId = stages.find((s) => s.isDefaultNewPostStage)?.id ?? stages[0]?.id ?? "backlog";

  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const { error } = await supabase.from("posts").insert({
    id,
    title: source.title ? `${source.title} (copy)` : "",
    status: defaultStageId,
    target_date: null,
    needs_changes: false,
    keep_media: source.keepMedia,
    assignee_id: null,
    requested_by_id: null,
    created_by: profile.id,
    created_at: timestamp,
    updated_at: timestamp,
  });
  if (error) throw new McpToolError(`Couldn't duplicate post #${input.postNumber}: ${error.message}`);

  await syncPostChildren(supabase, id, {
    platforms: source.platforms,
    descriptions: source.descriptions,
    categoryIds: source.categoryIds,
    images: source.images.map((img) => ({ imageUrl: img.imageUrl, mediaType: img.mediaType })),
  });

  const { data } = await supabase.from("posts").select(POST_SELECT).eq("id", id).single();
  const post = mapPostRow(data);

  await logHistory(supabase, post.id, profile.id, [`duplicated from #${input.postNumber}`]);

  return { postNumber: post.postNumber, id: post.id, status: post.status, title: post.title };
}
