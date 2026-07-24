"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore, type Theme } from "@/lib/store";

const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const THEME_LABELS: Record<Theme, string> = { light: "Light", dark: "Dark", system: "Match system" };

interface PreferencesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Personal display preferences, not shared team data — same
// localStorage-backed values as the Board/List toggle in FilterBar, just
// grouped here since they're config rather than day-to-day board work.
export function PreferencesModal({ open, onOpenChange }: PreferencesModalProps) {
  const { weekStartsOn, setWeekStartsOn, theme, setTheme } = useStore();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Preferences</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="theme">Theme</Label>
            <Select value={theme} onValueChange={(v) => setTheme(v as Theme)}>
              <SelectTrigger id="theme" size="sm" className="w-36">
                <SelectValue>{(value: Theme) => THEME_LABELS[value]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(THEME_LABELS) as Theme[]).map((value) => (
                  <SelectItem key={value} value={value}>
                    {THEME_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
