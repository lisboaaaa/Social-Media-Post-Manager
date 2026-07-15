"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, CalendarIcon, ChevronLeft, ShieldCheck, Trash2, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CategoryPicker } from "./CategoryPicker";
import { CharacterCounter } from "./CharacterCounter";
import { DeleteReasonDialog } from "./DeleteReasonDialog";
import { ImageUploader } from "./ImageUploader";
import { PlatformBadge } from "./PlatformBadge";
import { PlatformMockup } from "./mockups/PlatformMockup";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  PLATFORMS,
  PLATFORM_IMAGE_LIMITS,
  PLATFORM_LABELS,
  type Platform,
  type Post,
  type PostStatus,
} from "@/lib/types";

const NONE = "__none__";
const EMPTY_DESCRIPTIONS: Record<Platform, string> = { linkedin: "", instagram: "", x: "" };

export function PostForm({ post }: { post?: Post }) {
  const router = useRouter();
  const { profiles, stages, addPost, updatePost, deletePost, currentUser } = useStore();

  const [platforms, setPlatforms] = useState<Platform[]>(post?.platforms ?? ["linkedin"]);
  const [title, setTitle] = useState(post?.title ?? "");
  const [descriptions, setDescriptions] = useState<Record<Platform, string>>(
    post?.descriptions ?? EMPTY_DESCRIPTIONS,
  );
  const [status, setStatus] = useState<PostStatus>(
    post?.status ?? stages.find((s) => s.isDefaultNewPostStage)?.id ?? stages[0]?.id ?? "backlog",
  );
  const [targetDate, setTargetDate] = useState(post?.targetDate ?? "");
  // No longer user-editable here — preserved as-is; it's set automatically
  // when a post gets sent back from In Review (see Board's needsChangesPatch).
  const needsChanges = post?.needsChanges ?? false;
  const [publishedUrl, setPublishedUrl] = useState(post?.publishedUrl ?? "");
  const [assigneeId, setAssigneeId] = useState(post?.assigneeId ?? NONE);
  const [requestedById, setRequestedById] = useState(post?.requestedById ?? NONE);
  const [categoryIds, setCategoryIds] = useState<string[]>(post?.categoryIds ?? []);
  const [images, setImages] = useState(post?.images ?? []);
  const [keepMedia, setKeepMedia] = useState(post?.keepMedia ?? false);
  const [dateOpen, setDateOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const snapshot = JSON.stringify({
    platforms,
    title,
    descriptions,
    status,
    targetDate,
    publishedUrl,
    assigneeId,
    requestedById,
    categoryIds,
    images,
    keepMedia,
  });
  const [initialSnapshot] = useState(snapshot);
  const isDirty = snapshot !== initialSnapshot;

  // Covers closing the tab, refreshing, or typing a new URL — in-app
  // navigation (the Cancel/Back links) is guarded separately below since
  // beforeunload doesn't fire for client-side route changes.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const confirmDiscard = (e: React.MouseEvent) => {
    if (isDirty && !confirm("You have unsaved changes — discard them?")) {
      e.preventDefault();
    }
  };

  const currentStage = stages.find((s) => s.id === status);
  const needsDateForScheduled = Boolean(currentStage?.requiresTargetDate) && !targetDate;
  const imageLimit = platforms.length > 0 ? Math.min(...platforms.map((p) => PLATFORM_IMAGE_LIMITS[p])) : undefined;
  const overLimitPlatform = imageLimit !== undefined && images.length > imageLimit
    ? platforms.find((p) => PLATFORM_IMAGE_LIMITS[p] === imageLimit)
    : undefined;
  const hasVideo = images.some((img) => img.mediaType === "video");
  const hasMixedMedia = hasVideo && images.length > 1;
  const isArchived = Boolean(stages.find((s) => s.id === post?.status)?.locksEditing);
  // A live stand-in Post built from the form's own state — lets the preview
  // below update as you type instead of only showing what was last saved.
  const draftPost: Post = {
    id: post?.id ?? "draft",
    postNumber: post?.postNumber ?? 0,
    platforms,
    title,
    descriptions,
    status,
    targetDate: targetDate || null,
    needsChanges,
    publishedUrl: publishedUrl.trim() || null,
    assigneeId: assigneeId === NONE ? null : assigneeId,
    requestedById: requestedById === NONE ? null : requestedById,
    createdBy: post?.createdBy ?? currentUser.id,
    categoryIds,
    images,
    keepMedia,
    createdAt: post?.createdAt ?? new Date().toISOString(),
    updatedAt: post?.updatedAt ?? new Date().toISOString(),
    deletedAt: post?.deletedAt ?? null,
    deletedBy: post?.deletedBy ?? null,
    deleteReason: post?.deleteReason ?? null,
  };
  // Published URL only matters once a post is actually going out — hiding it
  // earlier keeps the sidebar focused on what's relevant right now.
  const showPublishedUrl = Boolean(currentStage?.requiresPublishedUrl || currentStage?.locksEditing);

  const togglePlatform = (platform: Platform, checked: boolean) => {
    setPlatforms((prev) => (checked ? [...prev, platform] : prev.filter((p) => p !== platform)));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (platforms.length === 0) {
      toast.error("Pick at least one platform for this post.");
      return;
    }

    if (needsDateForScheduled) {
      toast.error("Pick a target date before moving this post to Scheduled.");
      setDateOpen(true);
      return;
    }

    const payload = {
      platforms,
      title,
      descriptions,
      status,
      targetDate: targetDate || null,
      needsChanges,
      publishedUrl: publishedUrl.trim() || null,
      assigneeId: assigneeId === NONE ? null : assigneeId,
      requestedById: requestedById === NONE ? null : requestedById,
      categoryIds,
      images,
      keepMedia,
    };

    if (post) {
      updatePost(post.id, payload);
      toast.success("Post updated");
    } else {
      addPost({ ...payload, createdBy: currentUser.id });
      toast.success("Post created");
    }
    router.push("/board");
  };

  const handleDeleteConfirm = (reason: string) => {
    if (!post) return;
    deletePost(post.id, reason);
    setDeleteDialogOpen(false);
    toast.success("Post moved to Trash");
    router.push("/board");
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link href="/board" onClick={confirmDiscard} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft className="size-3.5" />
          Back to board
        </Link>
        {post && (
          <Button type="button" variant="destructive" size="lg" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="size-4" />
            Delete post
          </Button>
        )}
      </div>

      <DeleteReasonDialog open={deleteDialogOpen} onCancel={() => setDeleteDialogOpen(false)} onConfirm={handleDeleteConfirm} />

      <h1 className="text-2xl font-bold tracking-tight">{post ? "Edit post" : "New post"}</h1>

      {isArchived && (
        <p className="rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
          {"This post is locked as a historical record. You can still update the published URL below."}
        </p>
      )}

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_340px]">
        {/* Content — the writing and creative work */}
        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Label className="text-lg font-semibold">Platforms</Label>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {PLATFORMS.map((p) => (
                <label key={p} className="flex items-center gap-2">
                  <Checkbox
                    className="size-5"
                    checked={platforms.includes(p)}
                    onCheckedChange={(checked) => togglePlatform(p, checked === true)}
                    disabled={isArchived}
                  />
                  <PlatformBadge platform={p} className="px-2 py-1 text-xs" />
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-baseline gap-2">
              <Label htmlFor="title" className="text-lg font-semibold">Title</Label>
              <span className="text-xs text-muted-foreground">internal only, never published</span>
            </div>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q3 webinar announcement"
              disabled={isArchived}
            />
          </div>

          {PLATFORMS.filter((p) => platforms.includes(p)).map((p) => (
            <div key={p} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={`description-${p}`} className="text-lg font-semibold">
                  {platforms.length > 1 ? `Description — ${PLATFORM_LABELS[p]}` : "Description"}
                </Label>
                <CharacterCounter platform={p} length={descriptions[p].length} />
              </div>
              <Textarea
                id={`description-${p}`}
                value={descriptions[p]}
                onChange={(e) => setDescriptions((prev) => ({ ...prev, [p]: e.target.value }))}
                rows={6}
                placeholder="Write the post copy — this is what actually gets published…"
                disabled={isArchived}
              />
            </div>
          ))}

          <div className="flex flex-col gap-2">
            <div className="flex items-baseline gap-2">
              <Label className="text-lg font-semibold">Images / video</Label>
              <span className="text-xs text-muted-foreground">shared across every platform above</span>
            </div>
            <ImageUploader
              images={images}
              onChange={setImages}
              disabled={isArchived}
              limitWarning={
                hasMixedMedia
                  ? "Most platforms don't support mixing photos with video — only the video will be used."
                  : overLimitPlatform
                    ? `${images.length} photos added — ${PLATFORM_LABELS[overLimitPlatform]} only shows the first ${imageLimit}.`
                    : undefined
              }
            />
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Link href="/board" onClick={confirmDiscard} className={buttonVariants({ variant: "outline", size: "lg" })}>
              Cancel
            </Link>
            <Button type="submit" size="lg">{post ? "Save changes" : "Create post"}</Button>
          </div>
        </div>

        {/* Sidebar — workflow and metadata, stays put while you scroll the content */}
        <div className="flex flex-col gap-5 self-start rounded-xl bg-card p-4 ring-1 ring-foreground/10 lg:sticky lg:top-6">
          {post && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="status" className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as PostStatus)} disabled={isArchived}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue>
                    {(value: PostStatus) => stages.find((s) => s.id === value)?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">Target date</Label>
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isArchived}
                    className={cn(
                      "w-full justify-start font-normal",
                      !targetDate && "text-muted-foreground",
                      needsDateForScheduled && "border-destructive ring-3 ring-destructive/20",
                    )}
                  />
                }
              >
                <CalendarIcon className="size-3.5" />
                {targetDate ? format(new Date(`${targetDate}T00:00:00`), "MMM d, yyyy") : "No date yet"}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={targetDate ? new Date(`${targetDate}T00:00:00`) : undefined}
                  onSelect={(date) => {
                    setTargetDate(date ? format(date, "yyyy-MM-dd") : "");
                    setDateOpen(false);
                  }}
                />
                {targetDate && (
                  <div className="flex justify-end border-t p-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setTargetDate("");
                        setDateOpen(false);
                      }}
                    >
                      <X className="size-3.5" />
                      Clear date
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
            {needsDateForScheduled && (
              <p className="text-xs text-destructive">Required to move this post to Scheduled.</p>
            )}
            {post && <p className="font-mono text-[10.5px] text-muted-foreground">id: #{post.postNumber}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="assignee" className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">Assignee</Label>
            <Select value={assigneeId} onValueChange={(value) => setAssigneeId(value ?? NONE)} disabled={isArchived}>
              <SelectTrigger id="assignee" className="w-full">
                <SelectValue>
                  {(value: string) => (value === NONE ? "Unassigned" : profiles.find((p) => p.id === value)?.fullName)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Unassigned</SelectItem>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="requested-by" className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">Requested by</Label>
            <Select value={requestedById} onValueChange={(value) => setRequestedById(value ?? NONE)} disabled={isArchived}>
              <SelectTrigger id="requested-by" className="w-full">
                <SelectValue>
                  {(value: string) => (value === NONE ? "—" : profiles.find((p) => p.id === value)?.fullName)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>—</SelectItem>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">Categories</Label>
            <CategoryPicker selectedIds={categoryIds} onChange={setCategoryIds} disabled={isArchived} />
          </div>

          <div className="flex flex-col gap-2 border-t pt-4">
            <Label className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">Media retention</Label>
            <label className="flex items-start gap-2">
              <Checkbox
                className="mt-0.5"
                checked={keepMedia}
                onCheckedChange={(checked) => setKeepMedia(checked === true)}
              />
              <span className="flex flex-col gap-0.5">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <ShieldCheck className="size-3.5 text-muted-foreground" />
                  Keep this photo forever
                </span>
                <span className="text-xs text-muted-foreground">Skips the automatic 90-day media cleanup.</span>
              </span>
            </label>
          </div>

          {showPublishedUrl && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="published-url" className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">Published URL</Label>
              <Input
                id="published-url"
                type="url"
                value={publishedUrl}
                onChange={(e) => setPublishedUrl(e.target.value)}
                placeholder="Paste the link once it's live…"
              />
            </div>
          )}
        </div>
      </div>

      {platforms.length > 0 && (
        <>
          {/* Not a modal on purpose — Laura wants to keep writing the
              description with this open, so no backdrop/focus-trap that
              would block the rest of the form. */}
          <button
            type="button"
            onClick={() => setPreviewOpen((v) => !v)}
            aria-label={previewOpen ? "Hide preview" : "Show preview"}
            title={previewOpen ? "Hide preview" : "Show preview"}
            className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-2 rounded-l-xl bg-primary px-2 py-5 text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
          >
            <ChevronLeft className={cn("size-5 transition-transform", previewOpen && "rotate-180")} />
            <span className="text-xs font-semibold tracking-wide [writing-mode:vertical-rl]">Preview</span>
          </button>
          <div
            className={cn(
              "fixed right-0 top-0 z-30 flex h-screen w-[420px] max-w-[90vw] flex-col overflow-y-auto border-l bg-background shadow-2xl transition-transform duration-300 ease-out",
              previewOpen ? "translate-x-0" : "translate-x-full",
            )}
          >
            <div className="border-b px-5 py-4">
              <h3 className="text-lg font-semibold">Preview</h3>
              <p className="text-xs text-muted-foreground">Updates live as you type — leave it open while you write.</p>
            </div>
            <div className="flex-1 p-4">
              <PlatformMockup post={draftPost} />
            </div>
          </div>
        </>
      )}
    </form>
  );
}
