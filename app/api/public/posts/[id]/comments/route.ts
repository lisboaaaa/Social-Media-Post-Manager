import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { SHARED_LINK_PROFILE_ID } from "@/lib/sharedLinkProfile";

// Same no-auth-on-purpose reasoning as the sibling routes — every query here
// is pinned to the single :id in the URL, and a comment posted through this
// route always carries the shared-link pseudo-profile as its author_id,
// never a real one.

const postSchema = z.object({ body: z.string().min(1), guestName: z.string().optional() });

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = createServiceClient();

  const { data: post } = await supabase.from("posts").select("id").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const { data: rows, error } = await supabase
    .from("comments")
    .select("id, author_id, body, guest_name, created_at")
    .eq("post_id", id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const authorIds = [...new Set((rows ?? []).map((r) => r.author_id))];
  const { data: authors } = authorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", authorIds)
    : { data: [] };
  const nameById = new Map((authors ?? []).map((a) => [a.id, a.full_name]));

  const comments = (rows ?? []).map((r) => ({
    id: r.id,
    body: r.body,
    createdAt: r.created_at,
    authorName: r.guest_name ? `${r.guest_name} (shared link)` : nameById.get(r.author_id) ?? "Unknown",
  }));

  return NextResponse.json({ comments });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = createServiceClient();

  const { data: post } = await supabase.from("posts").select("id").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const parsed = postSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { error } = await supabase.from("comments").insert({
    post_id: id,
    author_id: SHARED_LINK_PROFILE_ID,
    body: parsed.data.body.trim(),
    guest_name: parsed.data.guestName?.trim() || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ added: true });
}
