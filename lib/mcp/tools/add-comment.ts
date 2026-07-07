import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";
import { fetchPostByNumberOrId, McpToolError } from "./shared";

export const addCommentSchema = z.object({
  postNumber: z.number().int().nullable().describe("The post to comment on, or null for a general team note"),
  body: z.string().min(1),
});

export type AddCommentInput = z.infer<typeof addCommentSchema>;

export async function addCommentTool(input: AddCommentInput, profile: Profile, supabase: SupabaseClient) {
  const postId = input.postNumber != null ? (await fetchPostByNumberOrId(supabase, { postNumber: input.postNumber })).id : null;

  const { error } = await supabase.from("comments").insert({
    post_id: postId,
    author_id: profile.id,
    body: input.body,
    created_at: new Date().toISOString(),
  });
  if (error) throw new McpToolError(`Couldn't add the comment: ${error.message}`);

  return { added: true };
}
