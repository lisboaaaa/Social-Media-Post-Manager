import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchPostByNumberOrId, McpToolError } from "./shared";

export const getPostHistorySchema = z.object({
  postNumber: z.number().int(),
});

export type GetPostHistoryInput = z.infer<typeof getPostHistorySchema>;

// The audit log (who changed what, when) — separate from get_post_comments,
// which is what people actually typed. History is app-written, never
// contains caption/description text itself, only that it changed.
export async function getPostHistoryTool(input: GetPostHistoryInput, supabase: SupabaseClient) {
  const post = await fetchPostByNumberOrId(supabase, { postNumber: input.postNumber });

  const { data, error } = await supabase
    .from("post_history")
    .select("actor_id, summary, created_at")
    .eq("post_id", post.id)
    .order("created_at", { ascending: false });
  if (error) throw new McpToolError(`Couldn't load history for #${input.postNumber}: ${error.message}`);

  const rows = data ?? [];
  const actorIds = [...new Set(rows.map((h: { actor_id: string }) => h.actor_id))];
  const { data: profileRows } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", actorIds)
    : { data: [] };
  const nameById = new Map((profileRows ?? []).map((p: { id: string; full_name: string }) => [p.id, p.full_name]));

  return rows.map((h: { actor_id: string; summary: string; created_at: string }) => ({
    actor: nameById.get(h.actor_id) ?? "Unknown",
    summary: h.summary,
    createdAt: h.created_at,
  }));
}
