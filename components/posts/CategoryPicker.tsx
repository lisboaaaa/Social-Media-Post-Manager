"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
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
  const { categories, addCategory, deleteCategory } = useStore();
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

  const removeCategory = (id: string, name: string) => {
    if (!confirm(`Delete the "${name}" category? It'll be removed from every post that has it — this can't be undone.`)) return;
    deleteCategory(id);
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {categories.map((category) => (
        <div key={category.id} className="group flex items-center gap-1 text-sm">
          <label className="flex items-center gap-1.5">
            <Checkbox
              checked={selectedIds.includes(category.id)}
              onCheckedChange={(checked) => toggle(category.id, checked === true)}
              disabled={disabled}
            />
            {category.name}
          </label>
          {!disabled && (
            <button
              type="button"
              onClick={() => removeCategory(category.id, category.name)}
              aria-label={`Delete category ${category.name}`}
              title={`Delete "${category.name}"`}
              className="rounded text-muted-foreground opacity-0 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
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
