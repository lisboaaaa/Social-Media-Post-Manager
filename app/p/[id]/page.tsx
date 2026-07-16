"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { CalendarIcon, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { CharacterCounter } from "@/components/posts/CharacterCounter";
import { PlatformBadge } from "@/components/posts/PlatformBadge";
import { PublicCategoryPicker } from "@/components/posts/PublicCategoryPicker";
import { PublicImageUploader } from "@/components/posts/PublicImageUploader";
import { PlatformMockup } from "@/components/posts/mockups/PlatformMockup";
import { PLATFORMS, PLATFORM_LABELS, type Platform, type Post, type PostImage } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PublicPost {
  title: string;
  platforms: Platform[];
  descriptions: Record<Platform, string>;
  categoryIds: string[];
  targetDate: string | null;
  images: PostImage[];
}

export default function PublicPostPage() {
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [post, setPost] = useState<PublicPost | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/public/posts/${params.id}`);
      if (!res.ok) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setPost(data.post);
      setCategories(data.categories);
      setLoading(false);
    })();
  }, [params.id]);

  if (loading) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>;
  }

  if (notFound || !post) {
    return <p className="py-16 text-center text-sm text-muted-foreground">This post doesn&apos;t exist or was removed.</p>;
  }

  const togglePlatform = (platform: Platform, checked: boolean) => {
    setPost((prev) =>
      prev ? { ...prev, platforms: checked ? [...prev.platforms, platform] : prev.platforms.filter((p) => p !== platform) } : prev,
    );
  };

  const handleSave = async () => {
    if (post.platforms.length === 0) {
      toast.error("Pick at least one platform for this post.");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/public/posts/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: post.title,
        targetDate: post.targetDate,
        platforms: post.platforms,
        descriptions: post.descriptions,
        categoryIds: post.categoryIds,
        images: post.images.map((img) => ({ imageUrl: img.imageUrl, mediaType: img.mediaType })),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Couldn't save your changes — try again.");
      return;
    }
    toast.success("Saved");
  };

  // PlatformMockup expects a full Post — everything not editable here
  // (status, assignee, published links, etc.) gets an inert placeholder,
  // since the mockup never reads those fields.
  const previewPost: Post = {
    id: params.id,
    postNumber: 0,
    platforms: post.platforms,
    title: post.title,
    descriptions: post.descriptions,
    status: "",
    targetDate: post.targetDate,
    needsChanges: false,
    publishedUrls: { linkedin: null, instagram: null, x: null },
    assigneeId: null,
    requestedById: null,
    createdBy: "",
    categoryIds: post.categoryIds,
    images: post.images,
    keepMedia: false,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    deletedAt: null,
    deletedBy: null,
    deleteReason: null,
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit post</h1>
        <p className="text-sm text-muted-foreground">Shared link — no account needed to view or edit this post.</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-lg font-semibold">Platforms</Label>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {PLATFORMS.map((p) => (
            <label key={p} className="flex items-center gap-2">
              <Checkbox
                className="size-5"
                checked={post.platforms.includes(p)}
                onCheckedChange={(checked) => togglePlatform(p, checked === true)}
              />
              <PlatformBadge platform={p} className="px-2 py-1 text-xs" />
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="title" className="text-lg font-semibold">Title</Label>
        <Input
          id="title"
          value={post.title}
          onChange={(e) => setPost((prev) => (prev ? { ...prev, title: e.target.value } : prev))}
          placeholder="e.g. Q3 webinar announcement"
        />
      </div>

      {PLATFORMS.filter((p) => post.platforms.includes(p)).map((p) => (
        <div key={p} className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={`description-${p}`} className="text-lg font-semibold">
              {post.platforms.length > 1 ? `Description — ${PLATFORM_LABELS[p]}` : "Description"}
            </Label>
            <CharacterCounter platform={p} length={post.descriptions[p].length} />
          </div>
          <Textarea
            id={`description-${p}`}
            value={post.descriptions[p]}
            onChange={(e) =>
              setPost((prev) => (prev ? { ...prev, descriptions: { ...prev.descriptions, [p]: e.target.value } } : prev))
            }
            rows={6}
            placeholder="Write the post copy…"
          />
        </div>
      ))}

      <div className="flex flex-col gap-2">
        <Label className="text-lg font-semibold">Images / video</Label>
        <PublicImageUploader
          postId={params.id}
          images={post.images}
          onChange={(images) => setPost((prev) => (prev ? { ...prev, images } : prev))}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-lg font-semibold">Categories</Label>
        <PublicCategoryPicker
          categories={categories}
          selectedIds={post.categoryIds}
          onChange={(categoryIds) => setPost((prev) => (prev ? { ...prev, categoryIds } : prev))}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-lg font-semibold">Target date</Label>
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger
            render={<Button type="button" variant="outline" className="w-fit justify-start font-normal" />}
          >
            <CalendarIcon className="size-3.5" />
            {post.targetDate ? format(new Date(`${post.targetDate}T00:00:00`), "MMM d, yyyy") : "No date yet"}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={post.targetDate ? new Date(`${post.targetDate}T00:00:00`) : undefined}
              onSelect={(date) => {
                setPost((prev) => (prev ? { ...prev, targetDate: date ? format(date, "yyyy-MM-dd") : null } : prev));
                setDateOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex justify-end border-t pt-4">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>

      {post.platforms.length > 0 && (
        <>
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
              <p className="text-xs text-muted-foreground">Updates live as you edit — leave it open while you work.</p>
            </div>
            <div className="flex-1 p-4">
              <PlatformMockup post={previewPost} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
