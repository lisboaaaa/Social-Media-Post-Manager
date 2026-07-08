"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function DeleteReasonDialog({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete this post?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          It moves to Trash, not gone for good — but tell the team why you&apos;re deleting it.
        </p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="delete-reason">Reason</Label>
          <Textarea
            id="delete-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Duplicate of another post"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={!reason.trim()} onClick={() => reason.trim() && onConfirm(reason.trim())}>
            Delete post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
