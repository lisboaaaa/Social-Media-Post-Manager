"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  CURRENT_USER_ID,
  INITIAL_CATEGORIES,
  INITIAL_COMMENTS,
  INITIAL_POSTS,
  INITIAL_PROFILES,
} from "./mock-data";
import type { Category, Comment, Platform, Post, PostStatus, Profile } from "./types";

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
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [comments, setComments] = useState<Comment[]>(INITIAL_COMMENTS);
  const [lastReadTeamNotesAt, setLastReadTeamNotesAt] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<Filters>(EMPTY_FILTERS);
  const [previewPostId, setPreviewPostId] = useState<string | null>(null);

  const profiles = INITIAL_PROFILES;
  const currentUser = profiles.find((p) => p.id === CURRENT_USER_ID)!;

  const setFilters = (patch: Partial<Filters>) =>
    setFiltersState((prev) => ({ ...prev, ...patch }));
  const clearFilters = () => setFiltersState(EMPTY_FILTERS);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (filters.platform !== "all" && post.platform !== filters.platform) return false;
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
    return post;
  };

  const updatePost = (id: string, patch: Partial<Post>) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p)),
    );
  };

  // Posts for every column live in one flat array. Plain updatePost() keeps a
  // post at its existing array index when its status changes, so it lands
  // wherever it happens to sit relative to that column's other posts —
  // not where it was actually dropped. This reinserts it at destIndex among
  // that destination column's posts so the board position matches the drop.
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
      if (!anchorId) {
        const lastId = destColumnIds[destColumnIds.length - 1];
        if (!lastId) return [...rest, updatedMoving];
        const lastIdx = rest.findIndex((p) => p.id === lastId);
        return [...rest.slice(0, lastIdx + 1), updatedMoving, ...rest.slice(lastIdx + 1)];
      }
      const anchorIdx = rest.findIndex((p) => p.id === anchorId);
      return [...rest.slice(0, anchorIdx), updatedMoving, ...rest.slice(anchorIdx)];
    });
  };

  const deletePost = (id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setComments((prev) => prev.filter((c) => c.postId !== id));
  };

  const addCategory = (name: string): Category => {
    const trimmed = name.trim();
    const existing = categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing;
    const category: Category = { id: crypto.randomUUID(), name: trimmed };
    setCategories((prev) => [...prev, category]);
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
  };

  const hasUnreadTeamNotes = useMemo(
    () => comments.some((c) => isCommentUnread(c, currentUser.id, lastReadTeamNotesAt)),
    [comments, currentUser.id, lastReadTeamNotesAt],
  );

  const markTeamNotesRead = () => setLastReadTeamNotesAt(new Date().toISOString());

  const value: StoreValue = {
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

export function isCommentUnread(comment: Comment, currentUserId: string, unreadSince: string | null): boolean {
  if (comment.authorId === currentUserId) return false;
  return !unreadSince || comment.createdAt > unreadSince;
}
