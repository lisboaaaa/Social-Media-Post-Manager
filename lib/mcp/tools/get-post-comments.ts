import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchPostByNumberOrId, McpToolError } from "./shared";

export const getPostCommentsSchema = z.object({
  postNumber: z.number().int(),
});

export type GetPostCommentsInput = z.infer<typeof getPostCommentsSchema>;

export async function getPostCommentsTool(input: GetPostCommentsInput, supabase: SupabaseClient) {
  const post = await fetchPostByNumberOrId(supabase, { postNumber: input.postNumber });

  const { data, error } = await supabase
    .from("comments")
    .select("author_id, body, parent_id, guest_name, created_at")
    .eq("post_id", post.id)
    .order("created_at", { ascending: true });
  if (error) throw new McpToolError(`Couldn't load comments for #${input.postNumber}: ${error.message}`);

  const rows = data ?? [];
  const authorIds = [...new Set(rows.map((c: { author_id: string }) => c.author_id))];
  const { data: profileRows } = authorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", authorIds)
    : { data: [] };
  const nameById = new Map((profileRows ?? []).map((p: { id: string; full_name: string }) => [p.id, p.full_name]));

  return rows.map((c: { author_id: string; body: string; parent_id: string | null; guest_name: string | null; created_at: string }) => ({
    author: c.guest_name ?? nameById.get(c.author_id) ?? "Unknown",
    body: c.body,
    isReply: c.parent_id !== null,
    createdAt: c.created_at,
  }));
}
