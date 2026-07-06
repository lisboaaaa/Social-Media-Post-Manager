"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { createClient } from "./supabase/client";
import { mapCategoryRow, mapCommentReactionRow, mapCommentRow, mapPostRow, mapProfileRow, POST_SELECT } from "./supabase/mappers";
import type { Category, Comment, CommentReaction, Platform, Post, PostStatus, Profile } from "./types";

// Mirrors the SQL side (handle_new_user() in auth-setup.sql) — company
// emails are firstname.lastname@daredata.engineering. Used as a client-side
// fallback so a first-time sign-in never depends solely on the database
// trigger having run.
function deriveNameFromEmail(email: string): { fullName: string; initials: string } {
  const namePart = email.split("@")[0] ?? email;
  const [first, last] = namePart.split(".");
  const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : "");

  if (!last) {
    return { fullName: cap(first), initials: first.slice(0, 2).toUpperCase() };
  }
  return { fullName: `${cap(first)} ${cap(last)}`, initials: `${first[0]}${last[0]}`.toUpperCase() };
}

export interface Filters {
  platform: Platform | "all";
  categoryId: string | "all";
  assigneeId: string | "all";
  dateFrom: string | null; // ISO date, inclusive lower bound on targetDate
  dateTo: string | null; // ISO date, inclusive upper bound on targetDate
}

const EMPTY_FILTERS: Filters = { platform: "all", categoryId: "all", assigneeId: "all", dateFrom: null, dateTo: null };

type NewPostInput = Omit<Post, "id" | "createdAt" | "updatedAt" | "createdBy"> & {
  createdBy?: string;
};

interface StoreValue {
  loading: boolean;
  posts: Post[];
  categories: Category[];
  profiles: Profile[];
  comments: Comment[];
  commentReactions: CommentReaction[];
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
  updateCategory: (id: string, name: string) => void;
  deleteCategory: (id: string) => void;
  addComment: (postId: string | null, body: string, parentId?: string | null) => void;
  deleteComment: (id: string) => void;
  toggleReaction: (commentId: string, emoji: string) => void;
  hasUnreadTeamNotes: boolean;
  lastReadTeamNotesAt: string | null;
  markTeamNotesRead: () => void;
  previewPostId: string | null;
  openPreview: (postId: string) => void;
  closePreview: () => void;
  signOut: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentReactions, setCommentReactions] = useState<CommentReaction[]>([]);
  const [filters, setFiltersState] = useState<Filters>(EMPTY_FILTERS);
  const [previewPostId, setPreviewPostId] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [userRes, profilesRes, categoriesRes, postsRes, commentsRes, reactionsRes] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("profiles").select("*"),
        supabase.from("categories").select("*"),
        supabase.from("posts").select(POST_SELECT).order("created_at", { ascending: true }),
        supabase.from("comments").select("*").order("created_at", { ascending: true }),
        supabase.from("comment_reactions").select("*"),
      ]);

      if (cancelled) return;

      const firstError = profilesRes.error || categoriesRes.error || postsRes.error || commentsRes.error;
      if (firstError) {
        toast.error(`Couldn't load data from Supabase: ${firstError.message}`);
      }

      const email = userRes.data.user?.email ?? null;
      let loadedProfiles = (profilesRes.data ?? []).map(mapProfileRow);

      // A brand-new sign-in's profile is created by a database trigger, which
      // can lag a beat behind this fetch — retry a few times rather than
      // ever falling back to a different, unrelated profile.
      for (let attempt = 0; email && !loadedProfiles.some((p) => p.email === email) && attempt < 5; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 700));
        if (cancelled) return;
        const retryRes = await supabase.from("profiles").select("*");
        loadedProfiles = (retryRes.data ?? []).map(mapProfileRow);
      }

      // Still nothing after retrying — the trigger may never have run at
      // all. Rather than leave the sign-in stuck waiting forever, create the
      // profile from here as a fallback. If that's blocked (e.g. by row
      // security), surface a clear error instead of a silent, endless spinner.
      if (email && !loadedProfiles.some((p) => p.email === email)) {
        const { fullName, initials } = deriveNameFromEmail(email);
        const selfProvisioned: Profile = { id: crypto.randomUUID(), fullName, email, initials, lastReadTeamNotesAt: null };
        const { error: insertError } = await supabase.from("profiles").insert({
          id: selfProvisioned.id,
          full_name: selfProvisioned.fullName,
          email: selfProvisioned.email,
          initials: selfProvisioned.initials,
        });

        if (cancelled) return;

        if (insertError) {
          setProfileError(`Couldn't set up your profile automatically (${insertError.message}). Contact Laura for help.`);
        } else {
          loadedProfiles = [...loadedProfiles, selfProvisioned];
        }
      }

      if (cancelled) return;

      setUserEmail(email);
      setProfiles(loadedProfiles);
      setCategories((categoriesRes.data ?? []).map(mapCategoryRow));
      setPosts((postsRes.data ?? []).map(mapPostRow));
      setComments((commentsRes.data ?? []).map(mapCommentRow));
      setCommentReactions((reactionsRes.data ?? []).map(mapCommentReactionRow));
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // Live updates across the board — posts, categories, profiles, comments,
  // reactions — instead of only seeing someone else's change after a manual
  // refresh. Requires each table to be added to the supabase_realtime
  // publication (see enable-realtime-comments.sql) — otherwise these
  // subscriptions just sit idle and the app behaves as before.
  useEffect(() => {
    // Posts are assembled from three joined child tables (platforms, images,
    // categories), which a raw table-change payload doesn't include — so a
    // change to the post or any of its children just re-fetches that one
    // post fully assembled, rather than trying to patch it in piecemeal.
    const refetchPost = async (postId: string) => {
      const { data } = await supabase.from("posts").select(POST_SELECT).eq("id", postId).single();
      if (!data) return;
      const updated = mapPostRow(data);
      setPosts((prev) => (prev.some((p) => p.id === updated.id) ? prev.map((p) => (p.id === updated.id ? updated : p)) : [...prev, updated]));
    };

    const postIdFromChildRow = (payload: { new: object; old: object }) =>
      (payload.new as { post_id?: string }).post_id ?? (payload.old as { post_id?: string }).post_id;

    const channel = supabase
      .channel("app-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, (payload) => {
        if (payload.eventType === "DELETE") {
          const deletedId = (payload.old as { id: string }).id;
          setPosts((prev) => prev.filter((p) => p.id !== deletedId));
        } else {
          refetchPost((payload.new as { id: string }).id);
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "post_platforms" }, (payload) => {
        const postId = postIdFromChildRow(payload);
        if (postId) refetchPost(postId);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "post_images" }, (payload) => {
        const postId = postIdFromChildRow(payload);
        if (postId) refetchPost(postId);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "post_categories" }, (payload) => {
        const postId = postIdFromChildRow(payload);
        if (postId) refetchPost(postId);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "categories" }, (payload) => {
        const incoming = mapCategoryRow(payload.new as Parameters<typeof mapCategoryRow>[0]);
        setCategories((prev) => (prev.some((c) => c.id === incoming.id) ? prev : [...prev, incoming]));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "categories" }, (payload) => {
        const incoming = mapCategoryRow(payload.new as Parameters<typeof mapCategoryRow>[0]);
        setCategories((prev) => prev.map((c) => (c.id === incoming.id ? incoming : c)));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "categories" }, (payload) => {
        const deletedId = (payload.old as { id: string }).id;
        setCategories((prev) => prev.filter((c) => c.id !== deletedId));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, (payload) => {
        const incoming = mapProfileRow(payload.new as Parameters<typeof mapProfileRow>[0]);
        setProfiles((prev) => (prev.some((p) => p.id === incoming.id) ? prev : [...prev, incoming]));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, (payload) => {
        const incoming = mapProfileRow(payload.new as Parameters<typeof mapProfileRow>[0]);
        setProfiles((prev) => prev.map((p) => (p.id === incoming.id ? incoming : p)));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "profiles" }, (payload) => {
        const deletedId = (payload.old as { id: string }).id;
        setProfiles((prev) => prev.filter((p) => p.id !== deletedId));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments" }, (payload) => {
        const incoming = mapCommentRow(payload.new as Parameters<typeof mapCommentRow>[0]);
        setComments((prev) => (prev.some((c) => c.id === incoming.id) ? prev : [...prev, incoming]));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "comments" }, (payload) => {
        const deletedId = (payload.old as { id: string }).id;
        setComments((prev) => prev.filter((c) => c.id !== deletedId));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comment_reactions" }, (payload) => {
        const incoming = mapCommentReactionRow(payload.new as Parameters<typeof mapCommentReactionRow>[0]);
        setCommentReactions((prev) => (prev.some((r) => r.id === incoming.id) ? prev : [...prev, incoming]));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "comment_reactions" }, (payload) => {
        const deletedId = (payload.old as { id: string }).id;
        setCommentReactions((prev) => prev.filter((r) => r.id !== deletedId));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Never fall back to a different, unrelated profile — showing the wrong
  // person's name and history is far worse than a brief "no profile yet".
  const currentUser = useMemo(
    () => profiles.find((p) => p.email === userEmail),
    [profiles, userEmail],
  );

  const signOut = () => {
    supabase.auth.signOut().then(() => {
      window.location.href = "/login";
    });
  };

  const setFilters = (patch: Partial<Filters>) =>
    setFiltersState((prev) => ({ ...prev, ...patch }));
  const clearFilters = () => setFiltersState(EMPTY_FILTERS);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (filters.platform !== "all" && !post.platforms.includes(filters.platform)) return false;
      if (filters.categoryId !== "all" && !post.categoryIds.includes(filters.categoryId)) return false;
      if (filters.assigneeId !== "all" && post.assigneeId !== filters.assigneeId) return false;
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
      const rows = merged.images.map((img, i) => ({ post_id: postId, image_url: img.imageUrl, position: i, media_type: img.mediaType }));
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
      createdBy: input.createdBy ?? currentUser!.id,
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
    const current = posts.find((p) => p.id === id);
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setComments((prev) => prev.filter((c) => c.postId !== id));

    (async () => {
      // Published posts can't be deleted directly (database rule) — stepping
      // it off "published" first is how the explicit "Delete forever" action
      // in the Archive gets around that safety net on purpose.
      if (current?.status === "published") {
        await supabase.from("posts").update({ status: "backlog" }).eq("id", id);
      }
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

  const updateCategory = (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name: trimmed } : c)));

    (async () => {
      const { error } = await supabase.from("categories").update({ name: trimmed }).eq("id", id);
      if (error) toast.error(`Couldn't rename the category: ${error.message}`);
    })();
  };

  const deleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setPosts((prev) => prev.map((p) => (p.categoryIds.includes(id) ? { ...p, categoryIds: p.categoryIds.filter((c) => c !== id) } : p)));
    if (filters.categoryId === id) setFiltersState((prev) => ({ ...prev, categoryId: "all" }));

    (async () => {
      // post_categories rows reference this category, so they'd block the
      // delete via foreign key if not cleared first.
      await supabase.from("post_categories").delete().eq("category_id", id);
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) toast.error(`Couldn't delete the category: ${error.message}`);
    })();
  };

  const addComment = (postId: string | null, body: string, parentId: string | null = null) => {
    const comment: Comment = {
      id: crypto.randomUUID(),
      postId,
      authorId: currentUser!.id,
      body,
      parentId,
      createdAt: new Date().toISOString(),
    };
    setComments((prev) => [...prev, comment]);

    (async () => {
      const { error } = await supabase.from("comments").insert({
        id: comment.id,
        post_id: comment.postId,
        author_id: comment.authorId,
        body: comment.body,
        parent_id: comment.parentId,
        created_at: comment.createdAt,
      });
      if (error) toast.error(`Couldn't save the comment: ${error.message}`);
    })();
  };

  const deleteComment = (id: string) => {
    setComments((prev) => prev.filter((c) => c.id !== id));

    (async () => {
      const { error } = await supabase.from("comments").delete().eq("id", id);
      if (error) toast.error(`Couldn't delete the comment: ${error.message}`);
    })();
  };

  // Toggling mirrors most chat apps: picking an emoji you've already reacted
  // with removes it again, rather than stacking duplicate reactions.
  const toggleReaction = (commentId: string, emoji: string) => {
    const existing = commentReactions.find(
      (r) => r.commentId === commentId && r.authorId === currentUser!.id && r.emoji === emoji,
    );

    if (existing) {
      setCommentReactions((prev) => prev.filter((r) => r.id !== existing.id));
      (async () => {
        const { error } = await supabase.from("comment_reactions").delete().eq("id", existing.id);
        if (error) toast.error(`Couldn't remove the reaction: ${error.message}`);
      })();
      return;
    }

    const reaction: CommentReaction = {
      id: crypto.randomUUID(),
      commentId,
      authorId: currentUser!.id,
      emoji,
      createdAt: new Date().toISOString(),
    };
    setCommentReactions((prev) => [...prev, reaction]);

    (async () => {
      const { error } = await supabase.from("comment_reactions").insert({
        id: reaction.id,
        comment_id: reaction.commentId,
        author_id: reaction.authorId,
        emoji: reaction.emoji,
        created_at: reaction.createdAt,
      });
      if (error) toast.error(`Couldn't add the reaction: ${error.message}`);
    })();
  };

  const lastReadTeamNotesAt = currentUser?.lastReadTeamNotesAt ?? null;

  const hasUnreadTeamNotes = useMemo(
    () => comments.some((c) => isCommentUnread(c, currentUser?.id, lastReadTeamNotesAt)),
    [comments, currentUser, lastReadTeamNotesAt],
  );

  const markTeamNotesRead = () => {
    if (!currentUser) return;
    const now = new Date().toISOString();
    setProfiles((prev) => prev.map((p) => (p.id === currentUser.id ? { ...p, lastReadTeamNotesAt: now } : p)));

    (async () => {
      const { error } = await supabase.from("profiles").update({ last_read_team_notes_at: now }).eq("id", currentUser.id);
      if (error) toast.error(`Couldn't save read status: ${error.message}`);
    })();
  };

  const value: StoreValue = {
    loading,
    posts,
    categories,
    profiles,
    comments,
    commentReactions,
    currentUser: currentUser!,
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
    updateCategory,
    deleteCategory,
    addComment,
    deleteComment,
    toggleReaction,
    hasUnreadTeamNotes,
    lastReadTeamNotesAt,
    markTeamNotesRead,
    previewPostId,
    openPreview: setPreviewPostId,
    closePreview: () => setPreviewPostId(null),
    signOut,
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!currentUser) {
    if (userEmail) {
      // Signed in, but the profile still hasn't resolved (or failed to).
      return (
        <div className="flex min-h-screen items-center justify-center px-4 text-center text-sm text-muted-foreground">
          {profileError ?? "Setting up your account…"}
        </div>
      );
    }
    // Not signed in — this covers the public /login page, which doesn't
    // need anything from the store. Protected pages never reach this state:
    // the middleware already redirects signed-out visitors to /login before
    // the app renders.
    return <>{children}</>;
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
