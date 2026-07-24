"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";

const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface PreferencesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Personal display preferences, not shared team data — same
// localStorage-backed values as the Board/List toggle in FilterBar, just
// grouped here since they're config rather than day-to-day board work.
export function PreferencesModal({ open, onOpenChange }: PreferencesModalProps) {
  const { weekStartsOn, setWeekStartsOn } = useStore();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Preferences</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="week-starts-on">Calendar week starts on</Label>
          <Select
            value={String(weekStartsOn)}
            onValueChange={(v) => setWeekStartsOn(Number(v) as 0 | 1 | 2 | 3 | 4 | 5 | 6)}
          >
            <SelectTrigger id="week-starts-on" size="sm" className="w-36">
              <SelectValue>{(value: string) => WEEKDAY_LABELS[Number(value)]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {WEEKDAY_LABELS.map((label, dow) => (
                <SelectItem key={dow} value={String(dow)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </DialogContent>
    </Dialog>
  );
}
