import type { SupabaseClient } from "@supabase/supabase-js";
import { mapPostRow, POST_SELECT } from "@/lib/supabase/mappers";
import { storagePathFromPublicUrl } from "@/lib/supabase/storagePath";
import type { Platform, Post, PostStatus, Profile } from "@/lib/types";
import { POST_STATUSES } from "@/lib/types";

export const STATUS_ORDER: PostStatus[] = POST_STATUSES.map((s) => s.value);

export class McpToolError extends Error {}

// Board-touching tools are limited to the marketing team — everyone else's
// token can still reach submit_idea, which stays ungated.
export function assertMarketing(profile: Profile): void {
  if (!profile.isMarketing) {
    throw new McpToolError(
      "This action is limited to the marketing team. Everyone else can use submit_idea to send a post idea to marketing for review.",
    );
  }
}

export async function fetchPostByNumberOrId(
  supabase: SupabaseClient,
  { postNumber, id }: { postNumber?: number; id?: string },
): Promise<Post> {
  const query = supabase.from("posts").select(POST_SELECT);
  const { data, error } =
    postNumber != null ? await query.eq("post_number", postNumber).single() : await query.eq("id", id).single();

  if (error || !data) {
    throw new McpToolError(postNumber != null ? `No post found with number #${postNumber}.` : `No post found with id ${id}.`);
  }
  return mapPostRow(data);
}

// Mirrors addCategory's find-or-create in lib/store.tsx: a name that already
// exists (case-insensitively) is reused rather than duplicated.
export async function resolveCategoryIds(supabase: SupabaseClient, categoryNames: string[]): Promise<string[]> {
  if (categoryNames.length === 0) return [];

  const { data: existing } = await supabase.from("categories").select("id, name");
  const byLowerName = new Map((existing ?? []).map((c: { id: string; name: string }) => [c.name.toLowerCase(), c.id]));

  const ids: string[] = [];
  for (const rawName of categoryNames) {
    const name = rawName.trim();
    if (!name) continue;
    const existingId = byLowerName.get(name.toLowerCase());
    if (existingId) {
      ids.push(existingId);
      continue;
    }
    const { data, error } = await supabase.from("categories").insert({ name }).select("id").single();
    if (error || !data) throw new McpToolError(`Couldn't create category "${name}": ${error?.message}`);
    byLowerName.set(name.toLowerCase(), data.id);
    ids.push(data.id);
  }
  return ids;
}

export async function resolveProfileIdByEmail(supabase: SupabaseClient, email: string | null | undefined): Promise<string | null> {
  if (!email) return null;
  const { data, error } = await supabase.from("profiles").select("id").eq("email", email).single();
  if (error || !data) throw new McpToolError(`No team member found with email ${email}.`);
  return data.id;
}

// Mirrors syncPostChildren in lib/store.tsx: delete-then-reinsert per child
// table, only for the child-shaped fields actually present in the patch.
export async function syncPostChildren(
  supabase: SupabaseClient,
  postId: string,
  patch: {
    platforms?: Platform[];
    descriptions?: Record<Platform, string>;
    images?: { imageUrl: string; mediaType: "image" | "video" }[];
    categoryIds?: string[];
  },
): Promise<void> {
  if (patch.platforms || patch.descriptions) {
    await supabase.from("post_platforms").delete().eq("post_id", postId);
    const platforms = patch.platforms ?? [];
    const descriptions = patch.descriptions ?? ({} as Record<Platform, string>);
    const rows = platforms.map((p) => ({ post_id: postId, platform: p, description: descriptions[p] ?? "" }));
    if (rows.length) await supabase.from("post_platforms").insert(rows);
  }
  if (patch.images) {
    const { data: oldImages } = await supabase.from("post_images").select("image_url").eq("post_id", postId);
    await supabase.from("post_images").delete().eq("post_id", postId);

    // A removed image's file only gets deleted from storage once nothing
    // else references it — duplicated posts and promoted suggestions can
    // share the exact same URL as another row.
    const keptUrls = new Set(patch.images.map((img) => img.imageUrl));
    const removedUrls = (oldImages ?? []).map((row: { image_url: string }) => row.image_url).filter((url) => !keptUrls.has(url));
    for (const url of removedUrls) {
      const [{ count: postRefs }, { count: suggestionRefs }] = await Promise.all([
        supabase.from("post_images").select("id", { count: "exact", head: true }).eq("image_url", url),
        supabase.from("suggestions").select("id", { count: "exact", head: true }).eq("image_url", url),
      ]);
      if ((postRefs ?? 0) > 0 || (suggestionRefs ?? 0) > 0) continue;
      const path = storagePathFromPublicUrl(url);
      if (path) await supabase.storage.from("post-media").remove([path]);
    }

    const rows = patch.images.map((img, i) => ({ post_id: postId, image_url: img.imageUrl, position: i, media_type: img.mediaType }));
    if (rows.length) await supabase.from("post_images").insert(rows);
  }
  if (patch.categoryIds) {
    await supabase.from("post_categories").delete().eq("post_id", postId);
    const rows = patch.categoryIds.map((categoryId) => ({ post_id: postId, category_id: categoryId }));
    if (rows.length) await supabase.from("post_categories").insert(rows);
  }
}

// Downloads (or decodes) an image/video and uploads it to the same
// `post-media` bucket the browser's ImageUploader writes to, using the same
// `${rowId}-${filename}` path convention.
export async function uploadPostMedia(
  supabase: SupabaseClient,
  input: { url: string } | { base64: string; filename: string },
): Promise<{ imageUrl: string; mediaType: "image" | "video" }> {
  const rowId = crypto.randomUUID();
  let buffer: Buffer;
  let filename: string;
  let contentType: string | undefined;

  if ("url" in input) {
    const res = await fetch(input.url);
    if (!res.ok) throw new McpToolError(`Couldn't download image from ${input.url} (HTTP ${res.status}).`);
    buffer = Buffer.from(await res.arrayBuffer());
    contentType = res.headers.get("content-type") ?? undefined;
    filename = decodeURIComponent(new URL(input.url).pathname.split("/").pop() || "image");
  } else {
    buffer = Buffer.from(input.base64, "base64");
    filename = input.filename;
  }

  const path = `${rowId}-${filename}`;
  const { error } = await supabase.storage.from("post-media").upload(path, buffer, contentType ? { contentType } : undefined);
  if (error) throw new McpToolError(`Couldn't upload media: ${error.message}`);

  const { data } = supabase.storage.from("post-media").getPublicUrl(path);
  const mediaType: "image" | "video" = (contentType ?? filename).includes("video") ? "video" : "image";
  return { imageUrl: data.publicUrl, mediaType };
}

// Same rule the board enforces when dragging a card back from In Review
// (components/board/Board.tsx) — flags a post as needing changes, cleared
// once it moves forward again.
export function needsChangesPatch(oldStatus: PostStatus, newStatus: PostStatus): { needsChanges?: boolean } {
  const oldIndex = STATUS_ORDER.indexOf(oldStatus);
  const newIndex = STATUS_ORDER.indexOf(newStatus);
  if (oldStatus === "in_review" && newIndex < oldIndex) return { needsChanges: true };
  if (newIndex > oldIndex) return { needsChanges: false };
  return {};
}
