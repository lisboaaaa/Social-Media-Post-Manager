"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ScheduleDateDialog({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: (date: string) => void;
}) {
  const [date, setDate] = useState("");

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Pick a target date</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          This post doesn&apos;t have a date yet. Moving it to Scheduled requires one.
        </p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="schedule-date">Target date</Label>
          <Input id="schedule-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} autoFocus />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button disabled={!date} onClick={() => date && onConfirm(date)}>
            Move to Scheduled
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
