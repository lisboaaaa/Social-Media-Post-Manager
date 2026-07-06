"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";

interface ManageCategoriesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageCategoriesModal({ open, onOpenChange }: ManageCategoriesModalProps) {
  const { categories, addCategory, updateCategory, deleteCategory } = useStore();
  const [newName, setNewName] = useState("");
  // Drafts hold in-progress edits so typing doesn't write to Supabase on
  // every keystroke — the rename only commits on blur or Enter.
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const createCategory = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    addCategory(trimmed);
    setNewName("");
  };

  const commitRename = (id: string, original: string) => {
    const draft = drafts[id];
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (draft === undefined) return;
    const trimmed = draft.trim();
    if (!trimmed || trimmed === original) return;
    updateCategory(id, trimmed);
  };

  const removeCategory = (id: string, name: string) => {
    if (!confirm(`Delete the "${name}" category? It'll be removed from every post that has it — this can't be undone.`)) return;
    deleteCategory(id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Manage categories</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {categories.length === 0 && <p className="text-sm text-muted-foreground">No categories yet.</p>}
          {categories.map((category) => (
            <div key={category.id} className="flex items-center gap-2">
              <Input
                value={drafts[category.id] ?? category.name}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [category.id]: e.target.value }))}
                onBlur={() => commitRename(category.id, category.name)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                className="h-8"
              />
              <button
                type="button"
                onClick={() => removeCategory(category.id, category.name)}
                aria-label={`Delete category ${category.name}`}
                title={`Delete "${category.name}"`}
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 border-t pt-3">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New category…"
            className="h-8"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                createCategory();
              }
            }}
          />
          <Button type="button" size="sm" onClick={createCategory} disabled={!newName.trim()}>
            <Plus className="size-3.5" />
            Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
