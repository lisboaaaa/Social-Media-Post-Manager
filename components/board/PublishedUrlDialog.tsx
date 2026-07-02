"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PublishedUrlDialog({
  open,
  onCancel,
  onSkip,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onSkip: () => void;
  onConfirm: (url: string) => void;
}) {
  const [url, setUrl] = useState("");

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Paste the published link</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Got the link to the live post? Paste it now, or skip and add it later.
        </p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="published-url">Published URL</Label>
          <Input
            id="published-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={onSkip}>
            Skip for now
          </Button>
          <Button disabled={!url} onClick={() => url && onConfirm(url)}>
            Move to Published
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
