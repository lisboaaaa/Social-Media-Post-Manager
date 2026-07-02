"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { createClient } from "./supabase/client";
import { mapCategoryRow, mapCommentRow, mapPostRow, mapProfileRow, POST_SELECT } from "./supabase/mappers";
import type { Category, Comment, Platform, Post, PostStatus, Profile } from "./types";

const CURRENT_USER_EMAIL = "laura.lisboa@daredata.engineering";

export interface Filters {
  platform: Platform | "all";
  categoryId: string | "all";
  dateFrom: string | null; // ISO date, inclusive lower bound on targetDate
  dateTo: string | null; // ISO date, inclusive upper bound on targetDate
}

const EMPTY_FILTERS: Filters = { platform: "all", categoryId: "all", dateFrom: null, dateTo: null };

type NewPostInput = Omit<Post, "id" | "createdAt" | "updatedAt" | "createdBy"> & {
  createdBy?: string;
};

interface StoreValue {
  loading: boolean;
  posts: Post[];
  categories: Category[];
  profiles: Profile[];
  comments: Comment[];
  currentUser: Profile;
  filters: Filters;
  setFilters: (filters: Partial<Filters>) => void;
  clearFilters: () => void;
  filteredPosts: Post[];
  getPostById: (id: string) => Post | undefined;
  addPost: (input: NewPostInput) => Post;
  updatePost: (id: string, patch: Partial<Post>) => void;
  movePost: (id: string, destStatus: PostStatus, destIndex: number, extraPatch?: Partial<Post>) => void;
  deletePost: (id: string) => void;
  addCategory: (name: string) => Category;
  addComment: (postId: string | null, body: string) => void;
  hasUnreadTeamNotes: boolean;
  lastReadTeamNotesAt: string | null;
  markTeamNotesRead: () => void;
  previewPostId: string | null;
  openPreview: (postId: string) => void;
  closePreview: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [lastReadTeamNotesAt, setLastReadTeamNotesAt] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<Filters>(EMPTY_FILTERS);
  const [previewPostId, setPreviewPostId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [profilesRes, categoriesRes, postsRes, commentsRes] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("categories").select("*"),
        supabase.from("posts").select(POST_SELECT).order("created_at", { ascending: true }),
        supabase.from("comments").select("*").order("created_at", { ascending: true }),
      ]);

      if (cancelled) return;

      const firstError = profilesRes.error || categoriesRes.error || postsRes.error || commentsRes.error;
      if (firstError) {
        toast.error(`Couldn't load data from Supabase: ${firstError.message}`);
      }

      setProfiles((profilesRes.data ?? []).map(mapProfileRow));
      setCategories((categoriesRes.data ?? []).map(mapCategoryRow));
      setPosts((postsRes.data ?? []).map(mapPostRow));
      setComments((commentsRes.data ?? []).map(mapCommentRow));
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const currentUser = useMemo(
    () => profiles.find((p) => p.email === CURRENT_USER_EMAIL) ?? profiles[0],
    [profiles],
  );

  const setFilters = (patch: Partial<Filters>) =>
    setFiltersState((prev) => ({ ...prev, ...patch }));
  const clearFilters = () => setFiltersState(EMPTY_FILTERS);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (filters.platform !== "all" && !post.platforms.includes(filters.platform)) return false;
      if (filters.categoryId !== "all" && !post.categoryIds.includes(filters.categoryId)) return false;
      if (filters.dateFrom || filters.dateTo) {
        if (!post.targetDate) return false;
        if (filters.dateFrom && post.targetDate < filters.dateFrom) return false;
        if (filters.dateTo && post.targetDate > filters.dateTo) return false;
      }
      return true;
    });
  }, [posts, filters]);

  const getPostById = (id: string) => posts.find((p) => p.id === id);

  // Every mutation below updates local state immediately (so the UI never
  // waits on the network) and fires the matching Supabase write in the
  // background — a failure surfaces as a toast rather than blocking anything.

  const syncPostChildren = async (postId: string, patch: Partial<Post>, merged: Post) => {
    if ("platforms" in patch || "descriptions" in patch) {
      await supabase.from("post_platforms").delete().eq("post_id", postId);
      const rows = merged.platforms.map((p) => ({ post_id: postId, platform: p, description: merged.descriptions[p] ?? "" }));
      if (rows.length) await supabase.from("post_platforms").insert(rows);
    }
    if ("images" in patch) {
      await supabase.from("post_images").delete().eq("post_id", postId);
      const rows = merged.images.map((img, i) => ({ post_id: postId, image_url: img.imageUrl, position: i }));
      if (rows.length) await supabase.from("post_images").insert(rows);
    }
    if ("categoryIds" in patch) {
      await supabase.from("post_categories").delete().eq("post_id", postId);
      const rows = merged.categoryIds.map((categoryId) => ({ post_id: postId, category_id: categoryId }));
      if (rows.length) await supabase.from("post_categories").insert(rows);
    }
  };

  const addPost = (input: NewPostInput): Post => {
    const timestamp = new Date().toISOString();
    const post: Post = {
      ...input,
      id: crypto.randomUUID(),
      createdBy: input.createdBy ?? currentUser.id,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    setPosts((prev) => [...prev, post]);

    (async () => {
      const { error } = await supabase.from("posts").insert({
        id: post.id,
        title: post.title,
        status: post.status,
        target_date: post.targetDate,
        needs_changes: post.needsChanges,
        published_url: post.publishedUrl,
        assignee_id: post.assigneeId,
        requested_by_id: post.requestedById,
        created_by: post.createdBy,
        created_at: post.createdAt,
        updated_at: post.updatedAt,
      });
      if (error) return toast.error(`Couldn't save the post: ${error.message}`);
      await syncPostChildren(post.id, { platforms: post.platforms, descriptions: post.descriptions, images: post.images, categoryIds: post.categoryIds }, post);
    })();

    return post;
  };

  const writePostPatch = async (id: string, current: Post, patch: Partial<Post>, updatedAt: string) => {
    const merged: Post = { ...current, ...patch, updatedAt };
    const columns: Record<string, unknown> = { updated_at: updatedAt };
    if ("title" in patch) columns.title = patch.title;
    if ("status" in patch) columns.status = patch.status;
    if ("targetDate" in patch) columns.target_date = patch.targetDate;
    if ("needsChanges" in patch) columns.needs_changes = patch.needsChanges;
    if ("publishedUrl" in patch) columns.published_url = patch.publishedUrl;
    if ("assigneeId" in patch) columns.assignee_id = patch.assigneeId;
    if ("requestedById" in patch) columns.requested_by_id = patch.requestedById;

    const { error } = await supabase.from("posts").update(columns).eq("id", id);
    if (error) return toast.error(`Couldn't save changes: ${error.message}`);
    await syncPostChildren(id, patch, merged);
  };

  const updatePost = (id: string, patch: Partial<Post>) => {
    const current = posts.find((p) => p.id === id);
    if (!current) return;
    const updatedAt = new Date().toISOString();

    setPosts((prev) => prev.map((p) => (p.id === id ? { ...current, ...patch, updatedAt } : p)));
    writePostPatch(id, current, patch, updatedAt);
  };

  // Posts for every column live in one flat array. Plain updatePost() keeps a
  // post at its existing array index when its status changes, so it lands
  // wherever it happens to sit relative to that column's other posts —
  // not where it was actually dropped. This reinserts it at destIndex among
  // that destination column's posts so the board position matches the drop.
  // (Only the status persists to Supabase — manual card order within a
  // column is a local-session convenience for now, not saved yet.)
  const movePost = (id: string, destStatus: PostStatus, destIndex: number, extraPatch?: Partial<Post>) => {
    setPosts((prev) => {
      const moving = prev.find((p) => p.id === id);
      if (!moving) return prev;

      const rest = prev.filter((p) => p.id !== id);
      const destColumnIds = rest.filter((p) => p.status === destStatus).map((p) => p.id);
      const clampedIndex = Math.max(0, Math.min(destIndex, destColumnIds.length));
      const updatedMoving: Post = {
        ...moving,
        ...extraPatch,
        status: destStatus,
        updatedAt: new Date().toISOString(),
      };

      const anchorId = destColumnIds[clampedIndex];
      const next = (() => {
        if (!anchorId) {
          const lastId = destColumnIds[destColumnIds.length - 1];
          if (!lastId) return [...rest, updatedMoving];
          const lastIdx = rest.findIndex((p) => p.id === lastId);
          return [...rest.slice(0, lastIdx + 1), updatedMoving, ...rest.slice(lastIdx + 1)];
        }
        const anchorIdx = rest.findIndex((p) => p.id === anchorId);
        return [...rest.slice(0, anchorIdx), updatedMoving, ...rest.slice(anchorIdx)];
      })();

      return next;
    });

    const current = posts.find((p) => p.id === id);
    if (current) writePostPatch(id, current, { status: destStatus, ...extraPatch }, new Date().toISOString());
  };

  const deletePost = (id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setComments((prev) => prev.filter((c) => c.postId !== id));

    (async () => {
      const { error } = await supabase.from("posts").delete().eq("id", id);
      if (error) toast.error(`Couldn't delete the post: ${error.message}`);
    })();
  };

  const addCategory = (name: string): Category => {
    const trimmed = name.trim();
    const existing = categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing;

    const category: Category = { id: crypto.randomUUID(), name: trimmed };
    setCategories((prev) => [...prev, category]);

    (async () => {
      const { error } = await supabase.from("categories").insert({ id: category.id, name: category.name });
      if (error) toast.error(`Couldn't save the category: ${error.message}`);
    })();

    return category;
  };

  const addComment = (postId: string | null, body: string) => {
    const comment: Comment = {
      id: crypto.randomUUID(),
      postId,
      authorId: currentUser.id,
      body,
      createdAt: new Date().toISOString(),
    };
    setComments((prev) => [...prev, comment]);

    (async () => {
      const { error } = await supabase.from("comments").insert({
        id: comment.id,
        post_id: comment.postId,
        author_id: comment.authorId,
        body: comment.body,
        created_at: comment.createdAt,
      });
      if (error) toast.error(`Couldn't save the comment: ${error.message}`);
    })();
  };

  const hasUnreadTeamNotes = useMemo(
    () => comments.some((c) => isCommentUnread(c, currentUser?.id, lastReadTeamNotesAt)),
    [comments, currentUser, lastReadTeamNotesAt],
  );

  const markTeamNotesRead = () => setLastReadTeamNotesAt(new Date().toISOString());

  const value: StoreValue = {
    loading,
    posts,
    categories,
    profiles,
    comments,
    currentUser,
    filters,
    setFilters,
    clearFilters,
    filteredPosts,
    getPostById,
    addPost,
    updatePost,
    movePost,
    deletePost,
    addCategory,
    addComment,
    hasUnreadTeamNotes,
    lastReadTeamNotesAt,
    markTeamNotesRead,
    previewPostId,
    openPreview: setPreviewPostId,
    closePreview: () => setPreviewPostId(null),
  };

  if (loading || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within a StoreProvider");
  return ctx;
}

export function postsForStatus(posts: Post[], status: PostStatus): Post[] {
  return posts.filter((p) => p.status === status);
}

export function isCommentUnread(comment: Comment, currentUserId: string | undefined, unreadSince: string | null): boolean {
  if (!currentUserId || comment.authorId === currentUserId) return false;
  return !unreadSince || comment.createdAt > unreadSince;
}
