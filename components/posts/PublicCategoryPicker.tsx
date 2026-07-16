"use client";

import { Checkbox } from "@/components/ui/checkbox";

// Toggle-only version of CategoryPicker for the public post link — a
// visitor with no account shouldn't be able to create or delete categories
// shared by the whole team, only pick among what already exists.
export function PublicCategoryPicker({
  categories,
  selectedIds,
  onChange,
}: {
  categories: { id: string; name: string }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string, checked: boolean) => {
    onChange(checked ? [...selectedIds, id] : selectedIds.filter((existing) => existing !== id));
  };

  if (categories.length === 0) {
    return <p className="text-sm text-muted-foreground">No categories yet.</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {categories.map((category) => (
        <label key={category.id} className="flex items-center gap-1.5 text-sm">
          <Checkbox
            checked={selectedIds.includes(category.id)}
            onCheckedChange={(checked) => toggle(category.id, checked === true)}
          />
          {category.name}
        </label>
      ))}
    </div>
  );
}
