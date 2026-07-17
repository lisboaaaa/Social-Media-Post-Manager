"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { createClient } from "./supabase/client";
import { mentionsProfile } from "./mentions";
import { mapCategoryRow, mapCommentReactionRow, mapCommentRow, mapPostAnalyticsRow, mapPostHistoryRow, mapPostRow, mapProfileRow, mapStageRow, mapSuggestionRow, POST_SELECT } from "./supabase/mappers";
import { storagePathFromPublicUrl } from "./supabase/storagePath";
import { summarizePostChanges } from "./postHistory";
import type { Category, Comment, CommentReaction, Platform, Post, PostAnalytics, PostHistoryEntry, PostStatus, Profile, Stage, Suggestion } from "./types";

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

export type RealtimeStatus = "connecting" | "connected" | "error";

// A personal display preference (which layout /board renders), not shared
// team data — kept in this same context (not Supabase) so the Settings menu
// and the page content stay in sync instantly in the same tab, but persisted
// to localStorage so it survives a reload.
export type BoardViewMode = "board" | "list";
const BOARD_VIEW_MODE_KEY = "boardViewMode";

type NewPostInput = Omit<
  Post,
  "id" | "postNumber" | "createdAt" | "updatedAt" | "createdBy" | "deletedAt" | "deletedBy" | "deleteReason"
> & {
  createdBy?: string;
};

interface StoreValue {
  loading: boolean;
  realtimeStatus: RealtimeStatus;
  posts: Post[];
  stages: Stage[];
  categories: Category[];
  profiles: Profile[];
  comments: Comment[];
  commentReactions: CommentReaction[];
  postHistory: PostHistoryEntry[];
  postAnalytics: PostAnalytics[];
  suggestions: Suggestion[];
  currentUser: Profile;
  filters: Filters;
  setFilters: (filters: Partial<Filters>) => void;
  clearFilters: () => void;
  filteredPosts: Post[];
  getPostById: (id: string) => Post | undefined;
  addPost: (input: NewPostInput) => Post;
  updatePost: (id: string, patch: Partial<Post>) => void;
  movePost: (id: string, destStatus: PostStatus, destIndex: number, extraPatch?: Partial<Post>) => void;
  deletePost: (id: string, reason: string) => void;
  restorePost: (id: string) => void;
  addCategory: (name: string) => Category;
  updateCategory: (id: string, name: string) => void;
  deleteCategory: (id: string) => void;
  addStage: (label: string) => Stage;
  updateStage: (id: string, patch: Partial<Stage>) => void;
  deleteStage: (id: string, reassignTo?: string) => void;
  reorderStages: (orderedIds: string[]) => void;
  addComment: (postId: string | null, body: string, parentId?: string | null) => void;
  deleteComment: (id: string) => void;
  toggleReaction: (commentId: string, emoji: string) => void;
  promoteSuggestion: (suggestion: Suggestion) => Post;
  dismissSuggestion: (id: string) => void;
  hasUnreadTeamNotes: boolean;
  lastReadTeamNotesAt: string | null;
  markTeamNotesRead: () => void;
  lastReadSuggestionsAt: string | null;
  markSuggestionsRead: () => void;
  previewPostId: string | null;
  openPreview: (postId: string) => void;
  closePreview: () => void;
  signOut: () => void;
  boardViewMode: BoardViewMode;
  setBoardViewMode: (mode: BoardViewMode) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentReactions, setCommentReactions] = useState<CommentReaction[]>([]);
  const [postHistory, setPostHistory] = useState<PostHistoryEntry[]>([]);
  const [postAnalytics, setPostAnalytics] = useState<PostAnalytics[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [filters, setFiltersState] = useState<Filters>(EMPTY_FILTERS);
  const [previewPostId, setPreviewPostId] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("connecting");
  const [boardViewMode, setBoardViewModeState] = useState<BoardViewMode>("board");

  useEffect(() => {
    // Reading a saved preference on mount — legitimate sync-with-storage case.
    const saved = window.localStorage.getItem(BOARD_VIEW_MODE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === "board" || saved === "list") setBoardViewModeState(saved);
  }, []);

  const setBoardViewMode = (mode: BoardViewMode) => {
    setBoardViewModeState(mode);
    window.localStorage.setItem(BOARD_VIEW_MODE_KEY, mode);
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [userRes, profilesRes, categoriesRes, stagesRes, postsRes, commentsRes, reactionsRes, historyRes, analyticsRes, suggestionsRes] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("profiles").select("*"),
        supabase.from("categories").select("*"),
        supabase.from("board_stages").select("*").order("position", { ascending: true }),
        supabase.from("posts").select(POST_SELECT).order("created_at", { ascending: true }),
        supabase.from("comments").select("*").order("created_at", { ascending: true }),
        supabase.from("comment_reactions").select("*"),
        supabase.from("post_history").select("*").order("created_at", { ascending: true }),
        supabase.from("post_analytics").select("*"),
        supabase.from("suggestions").select("*").order("created_at", { ascending: false }),
      ]);

      if (cancelled) return;

      const firstError = profilesRes.error || categoriesRes.error || stagesRes.error || postsRes.error || commentsRes.error;
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
        const selfProvisioned: Profile = { id: crypto.randomUUID(), fullName, email, initials, lastReadTeamNotesAt: null, lastReadSuggestionsAt: null, isMarketing: false };
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
      setStages((stagesRes.data ?? []).map(mapStageRow));
      setPosts((postsRes.data ?? []).map(mapPostRow));
      setComments((commentsRes.data ?? []).map(mapCommentRow));
      setCommentReactions((reactionsRes.data ?? []).map(mapCommentReactionRow));
      setPostHistory((historyRes.data ?? []).map(mapPostHistoryRow));
      setPostAnalytics((analyticsRes.data ?? []).map(mapPostAnalyticsRow));
      setSuggestions((suggestionsRes.data ?? []).map(mapSuggestionRow));
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
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "board_stages" }, (payload) => {
        const incoming = mapStageRow(payload.new as Parameters<typeof mapStageRow>[0]);
        setStages((prev) => (prev.some((s) => s.id === incoming.id) ? prev : [...prev, incoming].sort((a, b) => a.position - b.position)));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "board_stages" }, (payload) => {
        const incoming = mapStageRow(payload.new as Parameters<typeof mapStageRow>[0]);
        setStages((prev) => prev.map((s) => (s.id === incoming.id ? incoming : s)).sort((a, b) => a.position - b.position));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "board_stages" }, (payload) => {
        const deletedId = (payload.old as { id: string }).id;
        setStages((prev) => prev.filter((s) => s.id !== deletedId));
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
      // Entries are append-only — inserted once by the app, never edited or
      // removed — so only INSERT needs handling here.
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "post_history" }, (payload) => {
        const incoming = mapPostHistoryRow(payload.new as Parameters<typeof mapPostHistoryRow>[0]);
        setPostHistory((prev) => (prev.some((h) => h.id === incoming.id) ? prev : [...prev, incoming]));
      })
      // No single id column here (post_id+platform+date+content is the
      // primary key), and the sync job upserts — match on all four to replace or append.
      .on("postgres_changes", { event: "*", schema: "public", table: "post_analytics" }, (payload) => {
        const sameRow = (
          a: { postId: string; platform: Platform; date: string; content: string },
          b: { post_id: string; platform: Platform; date: string; content: string },
        ) => a.postId === b.post_id && a.platform === b.platform && a.date === b.date && a.content === b.content;
        if (payload.eventType === "DELETE") {
          const removed = payload.old as { post_id: string; platform: Platform; date: string; content: string };
          setPostAnalytics((prev) => prev.filter((a) => !sameRow(a, removed)));
          return;
        }
        const incoming = mapPostAnalyticsRow(payload.new as Parameters<typeof mapPostAnalyticsRow>[0]);
        const incomingKey = { post_id: incoming.postId, platform: incoming.platform, date: incoming.date, content: incoming.content };
        setPostAnalytics((prev) => {
          const exists = prev.some((a) => sameRow(a, incomingKey));
          return exists ? prev.map((a) => (sameRow(a, incomingKey) ? incoming : a)) : [...prev, incoming];
        });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "suggestions" }, (payload) => {
        const incoming = mapSuggestionRow(payload.new as Parameters<typeof mapSuggestionRow>[0]);
        setSuggestions((prev) => (prev.some((s) => s.id === incoming.id) ? prev : [incoming, ...prev]));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "suggestions" }, (payload) => {
        const incoming = mapSuggestionRow(payload.new as Parameters<typeof mapSuggestionRow>[0]);
        setSuggestions((prev) => prev.map((s) => (s.id === incoming.id ? incoming : s)));
      })
      .subscribe((status) => {
        setRealtimeStatus(status === "SUBSCRIBED" ? "connected" : status === "CLOSED" ? "connecting" : "error");
      });

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

  // A separate, small subscription just for @mentions — kept apart from the
  // main realtime effect above so it can depend on currentUser directly
  // (re-subscribing only on actual sign-in, not on every comment), instead
  // of reaching for a ref to dodge a stale closure.
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel(`mentions-${currentUser.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments" }, async (payload) => {
        const incoming = mapCommentRow(payload.new as Parameters<typeof mapCommentRow>[0]);
        if (incoming.authorId === currentUser.id) return;
        if (!mentionsProfile(incoming.body, currentUser.fullName)) return;

        const { data } = await supabase.from("profiles").select("full_name").eq("id", incoming.authorId).single();
        toast.info(`${data?.full_name ?? "Someone"} mentioned you in a comment`);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, currentUser]);

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
      if (post.deletedAt) return false;
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

  const logHistory = async (postId: string, summaries: string[]) => {
    if (!summaries.length) return;
    // Generate the id/timestamp here (not left to the DB) so this can go
    // straight into local state — otherwise these entries would only ever
    // appear once the realtime echo comes back, unlike every other mutation
    // in this file.
    const createdAt = new Date().toISOString();
    const entries = summaries.map((summary) => ({
      id: crypto.randomUUID(),
      postId,
      actorId: currentUser!.id,
      summary,
      createdAt,
    }));
    setPostHistory((prev) => [...prev, ...entries]);

    const { error } = await supabase.from("post_history").insert(
      entries.map((e) => ({ id: e.id, post_id: e.postId, actor_id: e.actorId, summary: e.summary, created_at: e.createdAt })),
    );
    if (error) toast.error(`Couldn't save activity log: ${error.message}`);
  };

  const syncPostChildren = async (postId: string, patch: Partial<Post>, merged: Post) => {
    if ("platforms" in patch || "descriptions" in patch || "publishedUrls" in patch) {
      await supabase.from("post_platforms").delete().eq("post_id", postId);
      const rows = merged.platforms.map((p) => ({
        post_id: postId,
        platform: p,
        description: merged.descriptions[p] ?? "",
        published_url: merged.publishedUrls[p] ?? null,
      }));
      if (rows.length) await supabase.from("post_platforms").insert(rows);
    }
    if ("images" in patch) {
      const { data: oldImages } = await supabase.from("post_images").select("image_url").eq("post_id", postId);
      await supabase.from("post_images").delete().eq("post_id", postId);

      // A removed image's file only gets deleted from storage once nothing
      // else references it — duplicated posts and promoted suggestions can
      // share the exact same URL as another row.
      const keptUrls = new Set(merged.images.map((img) => img.imageUrl));
      const removedUrls = (oldImages ?? []).map((row) => row.image_url).filter((url) => !keptUrls.has(url));
      for (const url of removedUrls) {
        const [{ count: postRefs }, { count: suggestionRefs }] = await Promise.all([
          supabase.from("post_images").select("id", { count: "exact", head: true }).eq("image_url", url),
          supabase.from("suggestions").select("id", { count: "exact", head: true }).eq("image_url", url),
        ]);
        if ((postRefs ?? 0) > 0 || (suggestionRefs ?? 0) > 0) continue;
        const path = storagePathFromPublicUrl(url);
        if (path) await supabase.storage.from("post-media").remove([path]);
      }

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
      postNumber: 0, // placeholder — the database assigns the real number on insert; the realtime subscription refetches and fills it in moments later
      createdBy: input.createdBy ?? currentUser!.id,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
      deletedBy: null,
      deleteReason: null,
    };
    setPosts((prev) => [...prev, post]);

    (async () => {
      const { error } = await supabase.from("posts").insert({
        id: post.id,
        title: post.title,
        status: post.status,
        target_date: post.targetDate,
        needs_changes: post.needsChanges,
        keep_media: post.keepMedia,
        assignee_id: post.assigneeId,
        requested_by_id: post.requestedById,
        created_by: post.createdBy,
        created_at: post.createdAt,
        updated_at: post.updatedAt,
      });
      if (error) return toast.error(`Couldn't save the post: ${error.message}`);
      await syncPostChildren(post.id, { platforms: post.platforms, descriptions: post.descriptions, images: post.images, categoryIds: post.categoryIds }, post);
      await logHistory(post.id, ["post created"]);
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
    if ("keepMedia" in patch) columns.keep_media = patch.keepMedia;
    if ("assigneeId" in patch) columns.assignee_id = patch.assigneeId;
    if ("requestedById" in patch) columns.requested_by_id = patch.requestedById;

    const { error } = await supabase.from("posts").update(columns).eq("id", id);
    if (error) return toast.error(`Couldn't save changes: ${error.message}`);
    await syncPostChildren(id, patch, merged);
    await logHistory(id, summarizePostChanges(current, patch, { profiles, categories, stages }));
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

  // Soft delete: the post stays in the database (and its comments stay
  // attached) so it can show up in Trash with a reason and be restored —
  // never a hard `.delete()`, regardless of status.
  const deletePost = (id: string, reason: string) => {
    const now = new Date().toISOString();
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, deletedAt: now, deletedBy: currentUser!.id, deleteReason: reason } : p)),
    );

    (async () => {
      const { error } = await supabase
        .from("posts")
        .update({ deleted_at: now, deleted_by: currentUser!.id, delete_reason: reason })
        .eq("id", id);
      if (error) return toast.error(`Couldn't delete the post: ${error.message}`);
      await logHistory(id, [`moved to Trash: ${reason}`]);
    })();
  };

  const restorePost = (id: string) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, deletedAt: null, deletedBy: null, deleteReason: null } : p)));

    (async () => {
      const { error } = await supabase
        .from("posts")
        .update({ deleted_at: null, deleted_by: null, delete_reason: null })
        .eq("id", id);
      if (error) return toast.error(`Couldn't restore the post: ${error.message}`);
      await logHistory(id, ["restored from Trash"]);
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

  const slugifyStageLabel = (label: string) => {
    const base = label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "stage";
    let slug = base;
    let suffix = 2;
    while (stages.some((s) => s.id === slug)) {
      slug = `${base}_${suffix}`;
      suffix++;
    }
    return slug;
  };

  const addStage = (label: string): Stage => {
    const trimmed = label.trim();
    const stage: Stage = {
      id: slugifyStageLabel(trimmed),
      label: trimmed,
      position: stages.length ? Math.max(...stages.map((s) => s.position)) + 1 : 0,
      requiresTargetDate: false,
      requiresPublishedUrl: false,
      blocksDelete: false,
      countsForMediaPurge: false,
      isReviewStage: false,
      isArchiveStage: false,
      locksEditing: false,
      isDefaultNewPostStage: false,
    };
    setStages((prev) => [...prev, stage]);

    (async () => {
      const { error } = await supabase.from("board_stages").insert({
        id: stage.id,
        label: stage.label,
        position: stage.position,
      });
      if (error) toast.error(`Couldn't save the stage: ${error.message}`);
    })();

    return stage;
  };

  const updateStage = (id: string, patch: Partial<Stage>) => {
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

    (async () => {
      const columns: Record<string, unknown> = {};
      if ("label" in patch) columns.label = patch.label;
      if ("requiresTargetDate" in patch) columns.requires_target_date = patch.requiresTargetDate;
      if ("requiresPublishedUrl" in patch) columns.requires_published_url = patch.requiresPublishedUrl;
      if ("blocksDelete" in patch) columns.blocks_delete = patch.blocksDelete;
      if ("countsForMediaPurge" in patch) columns.counts_for_media_purge = patch.countsForMediaPurge;
      if ("isReviewStage" in patch) columns.is_review_stage = patch.isReviewStage;
      if ("isArchiveStage" in patch) columns.is_archive_stage = patch.isArchiveStage;
      if ("locksEditing" in patch) columns.locks_editing = patch.locksEditing;
      if ("isDefaultNewPostStage" in patch) columns.is_default_new_post_stage = patch.isDefaultNewPostStage;

      const { error } = await supabase.from("board_stages").update(columns).eq("id", id);
      if (error) toast.error(`Couldn't save the stage: ${error.message}`);
    })();
  };

  // Deleting a stage that still has posts in it requires an explicit
  // reassignment destination (reassignTo) rather than silently guessing a
  // fallback — the DB's FK (posts.status references board_stages) rejects
  // the delete outright if posts still point at it, as a backstop against
  // this check racing a concurrent edit from someone else.
  const deleteStage = (id: string, reassignTo?: string) => {
    const affectedIds = posts.filter((p) => p.status === id).map((p) => p.id);
    if (affectedIds.length > 0 && !reassignTo) {
      toast.error("Move the posts out of this stage first.");
      return;
    }

    const now = new Date().toISOString();
    if (affectedIds.length > 0 && reassignTo) {
      setPosts((prev) => prev.map((p) => (p.status === id ? { ...p, status: reassignTo, updatedAt: now } : p)));
    }
    setStages((prev) => prev.filter((s) => s.id !== id));

    (async () => {
      if (affectedIds.length > 0 && reassignTo) {
        const { error: reassignError } = await supabase
          .from("posts")
          .update({ status: reassignTo, updated_at: now })
          .eq("status", id);
        if (reassignError) {
          toast.error(`Couldn't move posts out of the stage: ${reassignError.message}`);
          return;
        }
      }
      const { error } = await supabase.from("board_stages").delete().eq("id", id);
      if (error) toast.error(`Couldn't delete the stage: ${error.message}`);
    })();
  };

  const reorderStages = (orderedIds: string[]) => {
    setStages((prev) => {
      const byId = new Map(prev.map((s) => [s.id, s]));
      return orderedIds.map((id, i) => ({ ...byId.get(id)!, position: i }));
    });

    (async () => {
      const results = await Promise.all(
        orderedIds.map((id, i) => supabase.from("board_stages").update({ position: i }).eq("id", id)),
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) toast.error(`Couldn't save the new order: ${failed.error.message}`);
    })();
  };

  const addComment = (postId: string | null, body: string, parentId: string | null = null) => {
    const comment: Comment = {
      id: crypto.randomUUID(),
      postId,
      authorId: currentUser!.id,
      body,
      parentId,
      guestName: null,
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

  const promoteSuggestion = (suggestion: Suggestion): Post => {
    const post = addPost({
      platforms: ["linkedin"],
      title: suggestion.description.slice(0, 60),
      descriptions: { linkedin: suggestion.description, instagram: "", x: "" },
      status: stages.find((s) => s.isDefaultNewPostStage)?.id ?? stages[0]?.id ?? "backlog",
      targetDate: null,
      needsChanges: false,
      keepMedia: false,
      publishedUrls: { linkedin: null, instagram: null, x: null },
      assigneeId: null,
      requestedById: suggestion.submittedBy,
      categoryIds: [],
      images: suggestion.imageUrl
        ? [{ id: crypto.randomUUID(), postId: "", imageUrl: suggestion.imageUrl, position: 0, mediaType: "image" }]
        : [],
    });

    const now = new Date().toISOString();
    setSuggestions((prev) =>
      prev.map((s) => (s.id === suggestion.id ? { ...s, status: "accepted", reviewedBy: currentUser!.id, reviewedAt: now, resultingPostId: post.id } : s)),
    );

    (async () => {
      const { error } = await supabase
        .from("suggestions")
        .update({ status: "accepted", reviewed_by: currentUser!.id, reviewed_at: now, resulting_post_id: post.id })
        .eq("id", suggestion.id);
      if (error) toast.error(`Couldn't update the suggestion: ${error.message}`);
    })();

    return post;
  };

  const dismissSuggestion = (id: string) => {
    const now = new Date().toISOString();
    setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, status: "dismissed", reviewedBy: currentUser!.id, reviewedAt: now } : s)));

    (async () => {
      const { error } = await supabase
        .from("suggestions")
        .update({ status: "dismissed", reviewed_by: currentUser!.id, reviewed_at: now })
        .eq("id", id);
      if (error) toast.error(`Couldn't dismiss the suggestion: ${error.message}`);
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

  const lastReadSuggestionsAt = currentUser?.lastReadSuggestionsAt ?? null;

  const markSuggestionsRead = () => {
    if (!currentUser) return;
    const now = new Date().toISOString();
    setProfiles((prev) => prev.map((p) => (p.id === currentUser.id ? { ...p, lastReadSuggestionsAt: now } : p)));

    (async () => {
      const { error } = await supabase.from("profiles").update({ last_read_suggestions_at: now }).eq("id", currentUser.id);
      if (error) toast.error(`Couldn't save read status: ${error.message}`);
    })();
  };

  const value: StoreValue = {
    loading,
    realtimeStatus,
    posts,
    stages,
    categories,
    profiles,
    comments,
    commentReactions,
    postHistory,
    postAnalytics,
    suggestions,
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
    restorePost,
    addCategory,
    updateCategory,
    deleteCategory,
    addStage,
    updateStage,
    deleteStage,
    reorderStages,
    addComment,
    deleteComment,
    toggleReaction,
    promoteSuggestion,
    dismissSuggestion,
    hasUnreadTeamNotes,
    lastReadTeamNotesAt,
    markTeamNotesRead,
    lastReadSuggestionsAt,
    markSuggestionsRead,
    previewPostId,
    openPreview: setPreviewPostId,
    closePreview: () => setPreviewPostId(null),
    signOut,
    boardViewMode,
    setBoardViewMode,
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
