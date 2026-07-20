"use client";

import { Eye, Radio, Tag, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { PLATFORMS, PLATFORM_LABELS, type Platform } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DateRangeFilter } from "./DateRangeFilter";

// Chip style shared by every filter trigger — no border, sits as its own
// pill inside the tray instead of a bordered form-field-with-label-above.
const CHIP_CLASS = "shrink-0 gap-1.5 rounded-lg border-0 bg-background shadow-sm";
const ACTIVE_TRIGGER_CLASS = "bg-primary/10 text-primary";

export function FilterBar() {
  const { filters, setFilters, clearFilters, categories, profiles, boardViewMode, setBoardViewMode } = useStore();
  const active =
    filters.platform !== "all" ||
    filters.categoryId !== "all" ||
    filters.assigneeId !== "all" ||
    Boolean(filters.dateFrom) ||
    Boolean(filters.dateTo);

  return (
    <div className="scrollbar-hide flex flex-nowrap items-center gap-1.5 overflow-x-auto rounded-xl bg-muted/50 p-1.5 shadow-sm">
      <button
        type="button"
        aria-label={boardViewMode === "board" ? "Switch to List view" : "Switch to Board view"}
        title={boardViewMode === "board" ? "Switch to List view" : "Switch to Board view"}
        onClick={() => setBoardViewMode(boardViewMode === "board" ? "list" : "board")}
        className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-background hover:text-foreground"
      >
        <Eye className="size-3.5" />
      </button>

      <Select
        value={filters.platform}
        onValueChange={(value) => setFilters({ platform: value as Platform | "all" })}
      >
        <SelectTrigger size="sm" className={cn(CHIP_CLASS, "min-w-36", filters.platform !== "all" && ACTIVE_TRIGGER_CLASS)}>
          <Radio className="size-3.5 text-muted-foreground" />
          <SelectValue placeholder="Platform">
            {(value: Platform | "all") => (value === "all" ? "All platforms" : PLATFORM_LABELS[value])}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All platforms</SelectItem>
          {PLATFORMS.map((platform) => (
            <SelectItem key={platform} value={platform}>
              {PLATFORM_LABELS[platform]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.categoryId} onValueChange={(value) => setFilters({ categoryId: value ?? "all" })}>
        <SelectTrigger size="sm" className={cn(CHIP_CLASS, "min-w-40", filters.categoryId !== "all" && ACTIVE_TRIGGER_CLASS)}>
          <Tag className="size-3.5 text-muted-foreground" />
          <SelectValue placeholder="Category">
            {(value: string) =>
              value === "all" ? "All categories" : categories.find((c) => c.id === value)?.name
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.assigneeId} onValueChange={(value) => setFilters({ assigneeId: value ?? "all" })}>
        <SelectTrigger size="sm" className={cn(CHIP_CLASS, "min-w-40", filters.assigneeId !== "all" && ACTIVE_TRIGGER_CLASS)}>
          <UserRound className="size-3.5 text-muted-foreground" />
          <SelectValue placeholder="Assignee">
            {(value: string) =>
              value === "all" ? "Everyone" : profiles.find((p) => p.id === value)?.fullName
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Everyone</SelectItem>
          {profiles.map((profile) => (
            <SelectItem key={profile.id} value={profile.id}>
              {profile.fullName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <DateRangeFilter />

      {active && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0">
          <X className="size-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}
