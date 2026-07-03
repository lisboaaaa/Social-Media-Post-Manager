"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";

export function CategoryPicker({
  selectedIds,
  onChange,
  disabled = false,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const { categories, addCategory } = useStore();
  const [newName, setNewName] = useState("");

  const toggle = (id: string, checked: boolean) => {
    onChange(checked ? [...selectedIds, id] : selectedIds.filter((existing) => existing !== id));
  };

  const createCategory = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const category = addCategory(trimmed);
    if (!selectedIds.includes(category.id)) onChange([...selectedIds, category.id]);
    setNewName("");
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {categories.map((category) => (
        <label key={category.id} className="flex items-center gap-1.5 text-sm">
          <Checkbox
            checked={selectedIds.includes(category.id)}
            onCheckedChange={(checked) => toggle(category.id, checked === true)}
            disabled={disabled}
          />
          {category.name}
        </label>
      ))}
      {!disabled && (
        <div className="flex gap-1.5">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New category…"
            className="h-7 max-w-48 text-[0.8rem]"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                createCategory();
              }
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={createCategory} disabled={!newName.trim()}>
            <Plus className="size-3.5" />
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
