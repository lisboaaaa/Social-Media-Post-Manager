"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Lightbulb, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "@/components/posts/ImageUploader";
import { createClient } from "@/lib/supabase/client";
import type { PostImage } from "@/lib/types";

export default function SuggestPage() {
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<PostImage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  // Marketing folks can land here too (Dev Tools "Pages", an old bookmark…)
  // and otherwise have no way back to the board short of signing out.
  const [isMarketing, setIsMarketing] = useState(false);

  const loadIsMarketing = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return;
    const { data: profile } = await supabase.from("profiles").select("is_marketing").eq("email", user.email).maybeSingle();
    setIsMarketing(Boolean(profile?.is_marketing));
  };

  useEffect(() => {
    // Fetching-on-mount, not deriving from props/state — legitimate sync-with-server case.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadIsMarketing();
  }, []);

  const handleSubmit = async () => {
    const trimmed = description.trim();
    if (!trimmed) {
      toast.error("Describe your idea first.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from("suggestions").insert({
      description: trimmed,
      image_url: images[0]?.imageUrl ?? null,
    });
    setSubmitting(false);

    if (error) {
      toast.error(`Couldn't send your idea: ${error.message}`);
      return;
    }

    toast.success("Thanks! The marketing team will take a look.");
    setDescription("");
    setImages([]);
  };

  const handleSignOut = () => {
    if (!confirm("Sign out?")) return;
    const supabase = createClient();
    supabase.auth.signOut().then(() => {
      window.location.href = "/login";
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lightbulb className="size-4.5" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Got a post idea?</h1>
        </div>
        <div className="flex items-center gap-2">
          {isMarketing && (
            <Link
              href="/board"
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Back to board
            </Link>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Sign out"
            title="Sign out"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6 rounded-2xl border bg-background p-8 shadow-lg">
        <p className="text-base text-muted-foreground">
          Seen something worth posting about? Tell us — a customer win, a milestone, something funny that happened at the office. We&apos;ll take it from there.
        </p>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="idea" className="text-base">
            Your idea
          </Label>
          <Textarea
            id="idea"
            rows={5}
            className="text-base"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. We just hit 100 customers, could be a nice shoutout post"
          />
        </div>

        <div className="flex flex-col gap-1.5 border-t pt-6">
          <Label className="text-base">Photo (optional)</Label>
          <ImageUploader images={images} onChange={(next) => setImages(next.slice(-1))} />
        </div>

        <Button type="button" onClick={handleSubmit} disabled={submitting || !description.trim()}>
          {submitting ? "Sending…" : "Send idea"}
        </Button>
      </div>
    </div>
  );
}
