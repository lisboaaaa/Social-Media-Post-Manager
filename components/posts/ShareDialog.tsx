"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ShareDialog({
  open,
  defaultMessage,
  link,
  onCancel,
  onCopy,
}: {
  open: boolean;
  defaultMessage: string;
  link: string;
  onCancel: () => void;
  onCopy: (message: string) => void;
}) {
  const [message, setMessage] = useState(defaultMessage);

  // Re-seed the editable text with the fresh default every time the dialog
  // opens (it stays mounted, so state wouldn't otherwise reset per-post).
  useEffect(() => {
    // Resetting on open (not fetch-then-set) — a legitimate sync-with-props case.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setMessage(defaultMessage);
  }, [open, defaultMessage]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Share this post</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Edit the message if you want, then copy it wherever you need.</p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="share-message">Message</Label>
          <Textarea id="share-message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} autoFocus />
        </div>
        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={() => onCopy(link)}>
            Copy link only
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button disabled={!message.trim()} onClick={() => message.trim() && onCopy(message.trim())}>
              Copy
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
