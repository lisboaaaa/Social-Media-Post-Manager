"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CategoryPicker } from "./CategoryPicker";
import { CharacterCounter } from "./CharacterCounter";
import { ImageUploader } from "./ImageUploader";
import { PlatformBadge } from "./PlatformBadge";
import { useStore } from "@/lib/store";
import {
  PLATFORMS,
  PLATFORM_IMAGE_LIMITS,
  PLATFORM_LABELS,
  POST_STATUSES,
  type Platform,
  type Post,
  type PostStatus,
} from "@/lib/types";

const NONE = "__none__";
const EMPTY_DESCRIPTIONS: Record<Platform, string> = { linkedin: "", instagram: "", x: "" };

export function PostForm({ post }: { post?: Post }) {
  const router = useRouter();
  const { profiles, addPost, updatePost, deletePost, currentUser } = useStore();

  const [platforms, setPlatforms] = useState<Platform[]>(post?.platforms ?? ["linkedin"]);
  const [title, setTitle] = useState(post?.title ?? "");
  const [descriptions, setDescriptions] = useState<Record<Platform, string>>(
    post?.descriptions ?? EMPTY_DESCRIPTIONS,
  );
  const [status, setStatus] = useState<PostStatus>(post?.status ?? "backlog");
  const [targetDate, setTargetDate] = useState(post?.targetDate ?? "");
  const [needsChanges, setNeedsChanges] = useState(post?.needsChanges ?? false);
  const [publishedUrl, setPublishedUrl] = useState(post?.publishedUrl ?? "");
  const [assigneeId, setAssigneeId] = useState(post?.assigneeId ?? NONE);
  const [requestedById, setRequestedById] = useState(post?.requestedById ?? NONE);
  const [categoryIds, setCategoryIds] = useState<string[]>(post?.categoryIds ?? []);
  const [images, setImages] = useState(post?.images ?? []);
  const targetDateRef = useRef<HTMLInputElement>(null);

  const needsDateForScheduled = status === "scheduled" && !targetDate;
  const imageLimit = platforms.length > 0 ? Math.min(...platforms.map((p) => PLATFORM_IMAGE_LIMITS[p])) : undefined;
  const overLimitPlatform = imageLimit !== undefined && images.length > imageLimit
    ? platforms.find((p) => PLATFORM_IMAGE_LIMITS[p] === imageLimit)
    : undefined;

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
      targetDateRef.current?.focus();
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

  const handleDelete = () => {
    if (!post) return;
    if (!confirm("Delete this post? This can't be undone.")) return;
    deletePost(post.id);
    toast.success("Post deleted");
    router.push("/board");
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link href="/board" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft className="size-3.5" />
          Back to board
        </Link>
        {post && (
          <Button type="button" variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        )}
      </div>

      <h1 className="text-lg font-semibold tracking-tight">{post ? "Edit post" : "New post"}</h1>

      <div className="flex flex-col gap-1.5">
        <Label>Platforms</Label>
        <p className="text-xs text-muted-foreground">
          Pick every platform this post is going out on — each gets its own copy below.
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {PLATFORMS.map((p) => (
            <label key={p} className="flex items-center gap-1.5">
              <Checkbox
                checked={platforms.includes(p)}
                onCheckedChange={(checked) => togglePlatform(p, checked === true)}
              />
              <PlatformBadge platform={p} />
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Title</Label>
        <p className="text-xs text-muted-foreground">
          Short internal label, just so the team can scan the board — never published.
        </p>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Q3 webinar announcement"
        />
      </div>

      {PLATFORMS.filter((p) => platforms.includes(p)).map((p) => (
        <div key={p} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor={`description-${p}`}>
              <PlatformBadge platform={p} /> copy
            </Label>
            <CharacterCounter platform={p} length={descriptions[p].length} />
          </div>
          <Textarea
            id={`description-${p}`}
            value={descriptions[p]}
            onChange={(e) => setDescriptions((prev) => ({ ...prev, [p]: e.target.value }))}
            rows={6}
            placeholder="Write the post copy — this is what actually gets published…"
          />
        </div>
      ))}

      <div className="flex flex-col gap-1.5">
        <Label>Images</Label>
        <p className="text-xs text-muted-foreground">Shared across every platform picked above.</p>
        <ImageUploader
          images={images}
          onChange={setImages}
          limitWarning={
            overLimitPlatform
              ? `${images.length} photos added — ${PLATFORM_LABELS[overLimitPlatform]} only shows the first ${imageLimit}.`
              : undefined
          }
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Categories</Label>
        <CategoryPicker selectedIds={categoryIds} onChange={setCategoryIds} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status">Status</Label>
          <Select value={status} onValueChange={(value) => setStatus(value as PostStatus)}>
            <SelectTrigger id="status" className="w-full">
              <SelectValue>
                {(value: PostStatus) => POST_STATUSES.find((s) => s.value === value)?.label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {POST_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="target-date">Target date</Label>
          <Input
            id="target-date"
            ref={targetDateRef}
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            aria-invalid={needsDateForScheduled}
          />
          {needsDateForScheduled && (
            <p className="text-xs text-destructive">Required to move this post to Scheduled.</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="assignee">Assignee</Label>
          <Select value={assigneeId} onValueChange={(value) => setAssigneeId(value ?? NONE)}>
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

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="requested-by">Requested by</Label>
          <Select value={requestedById} onValueChange={(value) => setRequestedById(value ?? NONE)}>
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
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <Label htmlFor="needs-changes">Needs changes</Label>
          <p className="text-xs text-muted-foreground">Flag this post for the assignee, independent of its column.</p>
        </div>
        <Switch id="needs-changes" checked={needsChanges} onCheckedChange={setNeedsChanges} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="published-url">Published URL</Label>
        <Input
          id="published-url"
          type="url"
          value={publishedUrl}
          onChange={(e) => setPublishedUrl(e.target.value)}
          placeholder="Paste the link once it's live…"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Link href="/board" className={buttonVariants({ variant: "outline" })}>
          Cancel
        </Link>
        <Button type="submit">{post ? "Save changes" : "Create post"}</Button>
      </div>
    </form>
  );
}
