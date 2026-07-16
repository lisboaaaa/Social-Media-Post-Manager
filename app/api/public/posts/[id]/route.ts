import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { mapPostRow, POST_SELECT } from "@/lib/supabase/mappers";
import { fetchHistoryContext, logHistory, summarizePostChanges, syncPostChildren } from "@/lib/mcp/tools/shared";
import { SHARED_LINK_PROFILE_ID } from "@/lib/sharedLinkProfile";
import { PLATFORMS, type Post } from "@/lib/types";

// No auth on this route on purpose (see proxy.ts) — it's the public,
// no-login post link. The one thing keeping this safe is scope: every query
// below is pinned to the single :id in the URL, and only the fields listed
// in patchSchema can ever be touched — status, assignee, published links,
// and delete all stay out of reach here regardless of what a request sends.

const patchSchema = z.object({
  title: z.string(),
  targetDate: z.string().date().nullable(),
  platforms: z.enum(PLATFORMS as [string, ...string[]]).array().min(1),
  descriptions: z.record(z.string(), z.string()),
  categoryIds: z.array(z.string()),
  images: z.array(z.object({ imageUrl: z.string().url(), mediaType: z.enum(["image", "video"]) })),
});

async function fetchLivePost(id: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("posts").select(POST_SELECT).eq("id", id).is("deleted_at", null).single();
  if (error || !data) return null;
  return mapPostRow(data);
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const post = await fetchLivePost(id);
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const supabase = createServiceClient();
  const { data: categories } = await supabase.from("categories").select("id, name");

  return NextResponse.json({
    post: {
      title: post.title,
      platforms: post.platforms,
      descriptions: post.descriptions,
      categoryIds: post.categoryIds,
      targetDate: post.targetDate,
      images: post.images,
    },
    categories: categories ?? [],
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const current = await fetchLivePost(id);
  if (!current) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const body = parsed.data;

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("posts")
    .update({ title: body.title, target_date: body.targetDate, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await syncPostChildren(supabase, id, {
    platforms: body.platforms as Post["platforms"],
    descriptions: body.descriptions,
    // Preserved as-is — this route never touches published links.
    publishedUrls: current.publishedUrls,
    images: body.images,
    categoryIds: body.categoryIds,
  });

  const patch: Partial<Post> = {
    title: body.title,
    targetDate: body.targetDate,
    platforms: body.platforms as Post["platforms"],
    descriptions: body.descriptions as Post["descriptions"],
    categoryIds: body.categoryIds,
    images: body.images.map((img, i) => ({ id: "", postId: id, position: i, ...img })),
  };
  const historyContext = await fetchHistoryContext(supabase);
  await logHistory(supabase, id, SHARED_LINK_PROFILE_ID, summarizePostChanges(current, patch, historyContext));

  return NextResponse.json({ updated: true });
}
