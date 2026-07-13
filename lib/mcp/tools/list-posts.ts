import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { mapPostRow, POST_SELECT } from "@/lib/supabase/mappers";
import { PLATFORMS } from "@/lib/types";

export const listPostsSchema = z.object({
  status: z.string().optional().describe("A stage id — call list_stages first to see current valid ids/labels"),
  platform: z.enum(PLATFORMS as [string, ...string[]]).optional(),
  categoryName: z.string().optional(),
  dateFrom: z.string().date().optional().describe("ISO date, inclusive lower bound on targetDate"),
  dateTo: z.string().date().optional().describe("ISO date, inclusive upper bound on targetDate"),
  limit: z.number().int().min(1).max(100).default(25),
});

export type ListPostsInput = z.infer<typeof listPostsSchema>;

export async function listPostsTool(input: ListPostsInput, supabase: SupabaseClient) {
  let query = supabase
    .from("posts")
    .select(POST_SELECT)
    .is("deleted_at", null)
    .order("post_number", { ascending: true })
    .limit(input.limit);
  if (input.status) query = query.eq("status", input.status);
  if (input.dateFrom) query = query.gte("target_date", input.dateFrom);
  if (input.dateTo) query = query.lte("target_date", input.dateTo);

  const { data, error } = await query;
  if (error) throw new Error(`Couldn't list posts: ${error.message}`);

  let posts = (data ?? []).map(mapPostRow);
  if (input.platform) posts = posts.filter((p) => p.platforms.includes(input.platform as (typeof PLATFORMS)[number]));

  if (input.categoryName) {
    const { data: category } = await supabase.from("categories").select("id").ilike("name", input.categoryName).single();
    posts = category ? posts.filter((p) => p.categoryIds.includes(category.id)) : [];
  }

  return posts.map((p) => ({
    postNumber: p.postNumber,
    title: p.title,
    status: p.status,
    platforms: p.platforms,
    targetDate: p.targetDate,
    assigneeId: p.assigneeId,
  }));
}
