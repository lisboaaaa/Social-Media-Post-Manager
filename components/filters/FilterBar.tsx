"use client";

import { useState } from "react";
import { Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { PLATFORMS, PLATFORM_LABELS, type Platform } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DateRangeFilter } from "./DateRangeFilter";
import { ManageCategoriesModal } from "./ManageCategoriesModal";

const ACTIVE_TRIGGER_CLASS = "border-primary/40 bg-primary/5 text-primary";

function FilterGroup({
  label,
  action,
  children,
}: {
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

export function FilterBar() {
  const { filters, setFilters, clearFilters, categories, profiles } = useStore();
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);
  const active =
    filters.platform !== "all" ||
    filters.categoryId !== "all" ||
    filters.assigneeId !== "all" ||
    Boolean(filters.dateFrom) ||
    Boolean(filters.dateTo);

  return (
    <div className="flex flex-wrap items-end gap-2">
      <FilterGroup label="Platform">
        <Select
          value={filters.platform}
          onValueChange={(value) => setFilters({ platform: value as Platform | "all" })}
        >
          <SelectTrigger size="sm" className={cn("min-w-36", filters.platform !== "all" && ACTIVE_TRIGGER_CLASS)}>
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
      </FilterGroup>

      <FilterGroup
        label="Category"
        action={
          <button
            type="button"
            onClick={() => setManageCategoriesOpen(true)}
            aria-label="Manage categories"
            title="Manage categories"
            className="text-muted-foreground hover:text-foreground"
          >
            <Settings2 className="size-3" />
          </button>
        }
      >
        <Select value={filters.categoryId} onValueChange={(value) => setFilters({ categoryId: value ?? "all" })}>
          <SelectTrigger size="sm" className={cn("min-w-40", filters.categoryId !== "all" && ACTIVE_TRIGGER_CLASS)}>
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
      </FilterGroup>

      <FilterGroup label="Assignee">
        <Select value={filters.assigneeId} onValueChange={(value) => setFilters({ assigneeId: value ?? "all" })}>
          <SelectTrigger size="sm" className={cn("min-w-40", filters.assigneeId !== "all" && ACTIVE_TRIGGER_CLASS)}>
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
      </FilterGroup>

      <FilterGroup label="Date">
        <DateRangeFilter />
      </FilterGroup>

      {active && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="size-3.5" />
          Clear
        </Button>
      )}

      <ManageCategoriesModal open={manageCategoriesOpen} onOpenChange={setManageCategoriesOpen} />
    </div>
  );
}
