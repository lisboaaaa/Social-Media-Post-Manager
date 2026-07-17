"use client";

import { useEffect, useState } from "react";
import { Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buildTaggedUrl } from "@/lib/utm";
import type { Platform } from "@/lib/types";

const CUSTOM = "__custom__";
const CONTENT_PRESETS = [
  { value: "comment_link", label: "Comment" },
  { value: "story_link", label: "Instagram Story" },
  { value: CUSTOM, label: "Custom…" },
];

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
  const [contentChoice, setContentChoice] = useState(CONTENT_PRESETS[0].value);
  const [customContent, setCustomContent] = useState("");

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

  // A separate tagged variant of the same destination, for wherever the link
  // actually goes when it's not in the caption itself — a comment dropped
  // under the post, or an Instagram Story swipe-up — so GA4 can tell those
  // placements apart via utm_content instead of lumping them together.
  const handleCopyVariant = () => {
    const content = contentChoice === CUSTOM ? customContent.trim() : contentChoice;
    if (!content) {
      toast.error("Give this placement a label first.");
      return;
    }
    const tagged = buildTaggedUrl(editableUrl, platform, campaign, content);
    if (!tagged) {
      toast.error("That doesn't look like a valid link.");
      return;
    }
    navigator.clipboard.writeText(tagged);
    toast.success(`Copied — tagged for "${content}".`);
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

      <div className="flex items-center gap-1.5 border-t pt-2">
        <span className="shrink-0 text-xs text-muted-foreground">Also posting this link in a:</span>
        <Select value={contentChoice} onValueChange={(v) => setContentChoice(v ?? CONTENT_PRESETS[0].value)}>
          <SelectTrigger size="sm" className="h-7 flex-1 text-xs">
            <SelectValue>{(v: string) => CONTENT_PRESETS.find((p) => p.value === v)?.label}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {CONTENT_PRESETS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {contentChoice === CUSTOM && (
          <Input
            value={customContent}
            onChange={(e) => setCustomContent(e.target.value)}
            placeholder="e.g. carousel_slide_3"
            className="h-7 flex-1 text-xs"
          />
        )}
        <Button type="button" size="sm" variant="outline" onClick={handleCopyVariant}>
          Copy
        </Button>
      </div>
    </div>
  );
}
