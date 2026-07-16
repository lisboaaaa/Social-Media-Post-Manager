import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { uploadPostMedia, McpToolError } from "@/lib/mcp/tools/shared";

const bodySchema = z.object({ base64: z.string(), filename: z.string() });

// Uploads through the service role (same reasoning as the sibling route.ts —
// storage RLS requires an authenticated session, which a public-link visitor
// never has) after confirming the post id is real and not deleted, so this
// can't be used to fill the bucket with media unrelated to any post.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = createServiceClient();

  const { data: post } = await supabase.from("posts").select("id").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    const result = await uploadPostMedia(supabase, parsed.data);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof McpToolError ? e.message : "Couldn't upload the file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
