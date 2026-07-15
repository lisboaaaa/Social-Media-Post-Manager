"use client";

import { useEffect, useState } from "react";
import { Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildTaggedUrl } from "@/lib/utm";
import type { Platform } from "@/lib/types";

export function LinkTagHint({ url, platform, campaign }: { url: string; platform: Platform; campaign: string }) {
  const [editableUrl, setEditableUrl] = useState(url);
  const [taggedUrl, setTaggedUrl] = useState<string | null>(null);

  // Re-seed when the description's detected link changes — but a freshly
  // detected link means any previous "transformed" result is now stale.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEditableUrl(url);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTaggedUrl(null);
  }, [url]);

  const handleTransform = () => {
    const result = buildTaggedUrl(editableUrl, platform, campaign);
    if (!result) {
      toast.error("That doesn't look like a valid link.");
      return;
    }
    setTaggedUrl(result);
  };

  const handleCopy = () => {
    if (!taggedUrl) return;
    navigator.clipboard.writeText(taggedUrl);
    toast.success("Copied! Paste it wherever the link needs to go.");
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Link2 className="mt-0.5 size-3.5 shrink-0" />
        {platform === "instagram"
          ? "Links aren't clickable in Instagram captions — still want to generate a UTM-tagged version (e.g. for your bio link)?"
          : "Link detected — want to tag it for tracking before you publish?"}
      </p>
      <Input
        value={editableUrl}
        onChange={(e) => setEditableUrl(e.target.value)}
        className="font-mono text-xs"
      />
      {taggedUrl ? (
        <div className="flex flex-col gap-1.5">
          <Input readOnly value={taggedUrl} className="font-mono text-xs" />
          <Button type="button" size="sm" variant="outline" onClick={handleCopy}>
            Copy tagged link
          </Button>
        </div>
      ) : (
        <Button type="button" size="sm" variant="outline" onClick={handleTransform}>
          Transform with UTM tags
        </Button>
      )}
    </div>
  );
}
