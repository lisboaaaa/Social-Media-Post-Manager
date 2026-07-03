import type { Category, Comment, Platform, Post, PostImage, Profile } from "@/lib/types";

// Shapes coming back from Supabase are snake_case and (for posts) nest their
// related rows via PostgREST's embedded-resource syntax — these turn that
// into the camelCase app types the rest of the codebase already expects.

export function mapProfileRow(row: any): Profile {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    initials: row.initials,
    lastReadTeamNotesAt: row.last_read_team_notes_at,
  };
}

export function mapCategoryRow(row: any): Category {
  return { id: row.id, name: row.name };
}

export function mapCommentRow(row: any): Comment {
  return { id: row.id, postId: row.post_id, authorId: row.author_id, body: row.body, createdAt: row.created_at };
}

export function mapPostRow(row: any): Post {
  const descriptions: Record<Platform, string> = { linkedin: "", instagram: "", x: "" };
  const platforms: Platform[] = [];
  for (const p of row.post_platforms ?? []) {
    platforms.push(p.platform);
    descriptions[p.platform as Platform] = p.description ?? "";
  }

  const images: PostImage[] = [...(row.post_images ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((img) => ({
      id: img.id,
      postId: row.id,
      imageUrl: img.image_url,
      position: img.position,
      mediaType: img.media_type ?? "image",
    }));

  const categoryIds: string[] = (row.post_categories ?? []).map((pc: any) => pc.category_id);

  return {
    id: row.id,
    platforms,
    title: row.title,
    descriptions,
    status: row.status,
    targetDate: row.target_date,
    needsChanges: row.needs_changes,
    publishedUrl: row.published_url,
    assigneeId: row.assignee_id,
    requestedById: row.requested_by_id,
    createdBy: row.created_by,
    categoryIds,
    images,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const POST_SELECT = "*, post_platforms(platform, description), post_images(id, image_url, position, media_type), post_categories(category_id)";
