"use client";

import { useEffect, useState } from "react";
import { Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildTaggedUrl } from "@/lib/utm";
import type { Platform } from "@/lib/types";

export function LinkTagHint({
  url,
  platform,
  campaign,
  description,
  onApply,
}: {
  url: string;
  platform: Platform;
  campaign: string;
  description: string;
  onApply: (newDescription: string) => void;
}) {
  const [editableUrl, setEditableUrl] = useState(url);

  // Re-seed when a freshly detected (still untagged) link shows up.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEditableUrl(url);
  }, [url]);

  const handleTransform = () => {
    const tagged = buildTaggedUrl(editableUrl, platform, campaign);
    if (!tagged) {
      toast.error("That doesn't look like a valid link.");
      return;
    }
    // Swaps the tagged link straight into the description — for LinkedIn/X
    // that's what actually gets published. Also copied to clipboard since on
    // Instagram the destination is the bio link, not the caption itself.
    onApply(description.replace(url, tagged));
    navigator.clipboard.writeText(tagged);
    toast.success("Link tagged — swapped into the description and copied to your clipboard.");
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Link2 className="mt-0.5 size-3.5 shrink-0" />
        {platform === "instagram"
          ? "Links aren't clickable in Instagram captions — still want to generate a UTM-tagged version (e.g. for your bio link)?"
          : "Link detected — want to tag it for tracking before you publish?"}
      </p>
      <Input value={editableUrl} onChange={(e) => setEditableUrl(e.target.value)} className="font-mono text-xs" />
      <Button type="button" size="sm" variant="outline" onClick={handleTransform}>
        Transform with UTM tags
      </Button>
    </div>
  );
}
