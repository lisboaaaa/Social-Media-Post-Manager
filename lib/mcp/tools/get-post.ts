import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchPostByNumberOrId } from "./shared";

export const getPostSchema = z
  .object({
    postNumber: z.number().int().optional(),
    id: z.string().uuid().optional(),
  })
  .refine((v) => v.postNumber != null || v.id != null, { message: "Provide postNumber or id" });

export type GetPostInput = z.infer<typeof getPostSchema>;

export async function getPostTool(input: GetPostInput, supabase: SupabaseClient) {
  const post = await fetchPostByNumberOrId(supabase, input);

  const profileIds = [post.assigneeId, post.requestedById, post.createdBy].filter((id): id is string => Boolean(id));
  const { data: profileRows } = profileIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", profileIds)
    : { data: [] };
  const nameById = new Map((profileRows ?? []).map((p: { id: string; full_name: string }) => [p.id, p.full_name]));

  const { data: categoryRows } = post.categoryIds.length
    ? await supabase.from("categories").select("id, name").in("id", post.categoryIds)
    : { data: [] };

  return {
    postNumber: post.postNumber,
    id: post.id,
    title: post.title,
    status: post.status,
    platforms: post.platforms,
    descriptions: post.descriptions,
    targetDate: post.targetDate,
    needsChanges: post.needsChanges,
    publishedUrls: post.publishedUrls,
    assignee: post.assigneeId ? nameById.get(post.assigneeId) ?? null : null,
    requestedBy: post.requestedById ? nameById.get(post.requestedById) ?? null : null,
    createdBy: nameById.get(post.createdBy) ?? null,
    categories: (categoryRows ?? []).map((c: { name: string }) => c.name),
    images: post.images.map((img) => ({ url: img.imageUrl, mediaType: img.mediaType })),
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}
