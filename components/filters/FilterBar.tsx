"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { PLATFORMS, PLATFORM_LABELS, type Platform } from "@/lib/types";
import { DateRangeFilter } from "./DateRangeFilter";

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

export function FilterBar() {
  const { filters, setFilters, clearFilters, categories } = useStore();
  const active =
    filters.platform !== "all" || filters.categoryId !== "all" || Boolean(filters.dateFrom) || Boolean(filters.dateTo);

  return (
    <div className="flex flex-wrap items-end gap-2">
      <FilterGroup label="Platform">
        <Select
          value={filters.platform}
          onValueChange={(value) => setFilters({ platform: value as Platform | "all" })}
        >
          <SelectTrigger size="sm" className="w-36">
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

      <FilterGroup label="Category">
        <Select value={filters.categoryId} onValueChange={(value) => setFilters({ categoryId: value ?? "all" })}>
          <SelectTrigger size="sm" className="w-40">
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

      <FilterGroup label="Date">
        <DateRangeFilter />
      </FilterGroup>

      {active && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="size-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}
