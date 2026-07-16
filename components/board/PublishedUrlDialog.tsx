"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PLATFORM_LABELS, type Platform } from "@/lib/types";

export function PublishedUrlDialog({
  open,
  platforms,
  initialUrls,
  onCancel,
  onSkip,
  onConfirm,
}: {
  open: boolean;
  platforms: Platform[];
  initialUrls: Partial<Record<Platform, string | null>>;
  onCancel: () => void;
  onSkip: () => void;
  onConfirm: (urls: Partial<Record<Platform, string>>) => void;
}) {
  const [urls, setUrls] = useState<Partial<Record<Platform, string>>>({});

  // Re-seed every time the dialog opens (it stays mounted across posts) with
  // whatever's already saved for each platform, so re-opening never loses it.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setUrls(Object.fromEntries(platforms.map((p) => [p, initialUrls[p] ?? ""])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const allFilled = platforms.every((p) => (urls[p] ?? "").trim());

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Paste the published link{platforms.length > 1 ? "s" : ""}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Got the link{platforms.length > 1 ? "s" : ""} to the live post? Paste {platforms.length > 1 ? "them" : "it"} now, or skip and add later.
        </p>
        <div className="flex flex-col gap-3">
          {platforms.map((p, i) => (
            <div key={p} className="flex flex-col gap-1.5">
              <Label htmlFor={`published-url-${p}`}>{platforms.length > 1 ? PLATFORM_LABELS[p] : "Published URL"}</Label>
              <Input
                id={`published-url-${p}`}
                type="url"
                value={urls[p] ?? ""}
                onChange={(e) => setUrls((prev) => ({ ...prev, [p]: e.target.value }))}
                placeholder="https://…"
                autoFocus={i === 0}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={onSkip}>
            Skip for now
          </Button>
          <Button
            disabled={!allFilled}
            onClick={() => {
              if (!allFilled) return;
              const trimmed = Object.fromEntries(platforms.map((p) => [p, (urls[p] ?? "").trim()])) as Partial<Record<Platform, string>>;
              onConfirm(trimmed);
            }}
          >
            Move to Published
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
