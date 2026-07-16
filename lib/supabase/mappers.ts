import type { Category, Comment, CommentReaction, Platform, Post, PostHistoryEntry, PostImage, Profile, Stage, Suggestion } from "@/lib/types";

// Shapes coming back from Supabase are snake_case and (for posts) nest their
// related rows via PostgREST's embedded-resource syntax — these turn that
// into the camelCase app types the rest of the codebase already expects.

interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  initials: string;
  last_read_team_notes_at: string | null;
  last_read_suggestions_at: string | null;
  is_marketing: boolean;
}

interface SuggestionRow {
  id: string;
  submitted_by: string;
  description: string;
  image_url: string | null;
  status: Suggestion["status"];
  reviewed_by: string | null;
  reviewed_at: string | null;
  resulting_post_id: string | null;
  created_at: string;
}

interface CategoryRow {
  id: string;
  name: string;
}

interface StageRow {
  id: string;
  label: string;
  position: number;
  requires_target_date: boolean;
  requires_published_url: boolean;
  blocks_delete: boolean;
  counts_for_media_purge: boolean;
  is_review_stage: boolean;
  is_archive_stage: boolean;
  locks_editing: boolean;
  is_default_new_post_stage: boolean;
}

interface CommentRow {
  id: string;
  post_id: string | null;
  author_id: string;
  body: string;
  parent_id: string | null;
  guest_name: string | null;
  created_at: string;
}

interface CommentReactionRow {
  id: string;
  comment_id: string;
  author_id: string;
  emoji: string;
  created_at: string;
}

interface PostHistoryRow {
  id: string;
  post_id: string;
  actor_id: string;
  summary: string;
  created_at: string;
}

interface PostPlatformRow {
  platform: Platform;
  description: string | null;
  published_url: string | null;
}

interface PostImageRow {
  id: string;
  image_url: string;
  position: number;
  media_type: PostImage["mediaType"] | null;
}

interface PostCategoryRow {
  category_id: string;
}

interface PostRow {
  id: string;
  post_number: number;
  title: string;
  status: Post["status"];
  target_date: string | null;
  needs_changes: boolean;
  keep_media: boolean;
  assignee_id: string | null;
  requested_by_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
  delete_reason: string | null;
  post_platforms?: PostPlatformRow[];
  post_images?: PostImageRow[];
  post_categories?: PostCategoryRow[];
}

export function mapProfileRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    initials: row.initials,
    lastReadTeamNotesAt: row.last_read_team_notes_at,
    lastReadSuggestionsAt: row.last_read_suggestions_at,
    isMarketing: row.is_marketing,
  };
}

export function mapSuggestionRow(row: SuggestionRow): Suggestion {
  return {
    id: row.id,
    submittedBy: row.submitted_by,
    description: row.description,
    imageUrl: row.image_url,
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    resultingPostId: row.resulting_post_id,
    createdAt: row.created_at,
  };
}

export function mapCategoryRow(row: CategoryRow): Category {
  return { id: row.id, name: row.name };
}

export function mapStageRow(row: StageRow): Stage {
  return {
    id: row.id,
    label: row.label,
    position: row.position,
    requiresTargetDate: row.requires_target_date,
    requiresPublishedUrl: row.requires_published_url,
    blocksDelete: row.blocks_delete,
    countsForMediaPurge: row.counts_for_media_purge,
    isReviewStage: row.is_review_stage,
    isArchiveStage: row.is_archive_stage,
    locksEditing: row.locks_editing,
    isDefaultNewPostStage: row.is_default_new_post_stage,
  };
}

export function mapCommentRow(row: CommentRow): Comment {
  return {
    id: row.id,
    postId: row.post_id,
    authorId: row.author_id,
    body: row.body,
    parentId: row.parent_id,
    guestName: row.guest_name,
    createdAt: row.created_at,
  };
}

export function mapCommentReactionRow(row: CommentReactionRow): CommentReaction {
  return { id: row.id, commentId: row.comment_id, authorId: row.author_id, emoji: row.emoji, createdAt: row.created_at };
}

export function mapPostHistoryRow(row: PostHistoryRow): PostHistoryEntry {
  return { id: row.id, postId: row.post_id, actorId: row.actor_id, summary: row.summary, createdAt: row.created_at };
}

export function mapPostRow(row: PostRow): Post {
  const descriptions: Record<Platform, string> = { linkedin: "", instagram: "", x: "" };
  const publishedUrls: Record<Platform, string | null> = { linkedin: null, instagram: null, x: null };
  const platforms: Platform[] = [];
  for (const p of row.post_platforms ?? []) {
    platforms.push(p.platform);
    descriptions[p.platform] = p.description ?? "";
    publishedUrls[p.platform] = p.published_url ?? null;
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

  const categoryIds: string[] = (row.post_categories ?? []).map((pc) => pc.category_id);

  return {
    id: row.id,
    postNumber: row.post_number,
    platforms,
    title: row.title,
    descriptions,
    status: row.status,
    targetDate: row.target_date,
    needsChanges: row.needs_changes,
    keepMedia: row.keep_media,
    publishedUrls,
    assigneeId: row.assignee_id,
    requestedById: row.requested_by_id,
    createdBy: row.created_by,
    categoryIds,
    images,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    deletedBy: row.deleted_by,
    deleteReason: row.delete_reason,
  };
}

export const POST_SELECT = "*, post_platforms(platform, description, published_url), post_images(id, image_url, position, media_type), post_categories(category_id)";
