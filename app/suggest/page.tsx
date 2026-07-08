"use client";

import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "@/components/posts/ImageUploader";
import { createClient } from "@/lib/supabase/client";
import { mapSuggestionRow } from "@/lib/supabase/mappers";
import type { PostImage, Suggestion } from "@/lib/types";

const STATUS_LABEL: Record<Suggestion["status"], string> = {
  new: "Waiting for review",
  accepted: "Turned into a post",
  dismissed: "Not moving forward",
};

export default function SuggestPage() {
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<PostImage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [mine, setMine] = useState<Suggestion[]>([]);

  const loadMine = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("suggestions").select("*").order("created_at", { ascending: false });
    setMine((data ?? []).map(mapSuggestionRow));
  };

  useEffect(() => {
    // Fetching-on-mount, not deriving from props/state — legitimate sync-with-server case.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMine();
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
    loadMine();
  };

  const handleSignOut = () => {
    const supabase = createClient();
    supabase.auth.signOut().then(() => {
      window.location.href = "/login";
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Got a post idea?</h1>
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

      <div className="flex flex-col gap-4 rounded-lg border bg-background p-5">
        <p className="text-sm text-muted-foreground">
          Tell the marketing team what you&apos;d like to see posted on social media. No need to write a caption or
          pick a platform — just the idea, and a photo if you have one.
        </p>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="idea">Your idea</Label>
          <Textarea
            id="idea"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. We just hit 100 customers, could be a nice shoutout post"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Photo (optional)</Label>
          <ImageUploader images={images} onChange={(next) => setImages(next.slice(-1))} />
        </div>

        <Button type="button" onClick={handleSubmit} disabled={submitting || !description.trim()}>
          {submitting ? "Sending…" : "Send idea"}
        </Button>
      </div>

      {mine.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your submitted ideas</h2>
          <div className="flex flex-col gap-1.5">
            {mine.map((s) => (
              <div key={s.id} className="rounded-md border bg-background p-3 text-sm">
                <p className="text-foreground/90">{s.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">{STATUS_LABEL[s.status]}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
