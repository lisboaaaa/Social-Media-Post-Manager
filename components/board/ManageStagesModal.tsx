"use client";

import { useState } from "react";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import type { Stage } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ManageStagesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Grouped by what the flag is about, rather than one flat wall of 7
// checkboxes — makes it clearer what each one is actually for.
const FLAG_GROUPS: { title: string; items: { key: keyof Stage; label: string }[] }[] = [
  {
    title: "Requirements to move here",
    items: [
      { key: "requiresTargetDate", label: "Needs a target date" },
      { key: "requiresPublishedUrl", label: "Needs a published link" },
    ],
  },
  {
    title: "Automatic behavior",
    items: [
      { key: "countsForMediaPurge", label: "Delete photos/videos automatically 90 days after a post reaches this stage" },
      { key: "isArchiveStage", label: "Counts as finished — shows up in the Archive tab" },
      { key: "isReviewStage", label: "Sending a post backward from this stage marks it as needing changes" },
    ],
  },
  {
    title: "Protection",
    items: [
      { key: "blocksDelete", label: "Protect posts here from deletion" },
      { key: "locksEditing", label: "Lock editing once a post reaches here" },
    ],
  },
];

export function ManageStagesModal({ open, onOpenChange }: ManageStagesModalProps) {
  const { posts, stages, addStage, updateStage, deleteStage, reorderStages } = useStore();
  const [newLabel, setNewLabel] = useState("");
  // Drafts hold in-progress edits so typing doesn't write to Supabase on
  // every keystroke — the rename only commits on blur or Enter, same as
  // ManageCategoriesModal.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [reassigning, setReassigning] = useState<{ stageId: string; label: string; count: number } | null>(null);
  const [reassignTarget, setReassignTarget] = useState("");

  const createStage = () => {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    addStage(trimmed);
    setNewLabel("");
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
    updateStage(id, { label: trimmed });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const reordered = [...stages];
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    reorderStages(reordered.map((s) => s.id));
  };

  const handleSetDefault = (id: string) => {
    stages.filter((s) => s.isDefaultNewPostStage && s.id !== id).forEach((s) => updateStage(s.id, { isDefaultNewPostStage: false }));
    updateStage(id, { isDefaultNewPostStage: true });
  };

  const handleDeleteClick = (stage: Stage) => {
    const count = posts.filter((p) => p.status === stage.id).length;
    if (count === 0) {
      if (confirm(`Delete the "${stage.label}" stage?`)) deleteStage(stage.id);
      return;
    }
    setReassigning({ stageId: stage.id, label: stage.label, count });
  };

  const confirmReassignAndDelete = () => {
    if (!reassigning || !reassignTarget) return;
    deleteStage(reassigning.stageId, reassignTarget);
    setReassigning(null);
    setReassignTarget("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Manage stages</DialogTitle>
        </DialogHeader>

        {reassigning && (
          <div className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm">
              {reassigning.count} post{reassigning.count === 1 ? "" : "s"} {reassigning.count === 1 ? "is" : "are"} still in
              &quot;{reassigning.label}&quot; — move {reassigning.count === 1 ? "it" : "them"} to:
            </p>
            <div className="flex gap-2">
              <Select value={reassignTarget} onValueChange={(value) => setReassignTarget(value ?? "")}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Choose a stage" />
                </SelectTrigger>
                <SelectContent>
                  {stages.filter((s) => s.id !== reassigning.stageId).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" size="sm" variant="destructive" disabled={!reassignTarget} onClick={confirmReassignAndDelete}>
                Move &amp; delete
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setReassigning(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="stages">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="flex flex-col gap-2">
                {stages.map((stage, index) => (
                  <Draggable key={stage.id} draggableId={stage.id} index={index}>
                    {(dragProvided, snapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        className={cn(
                          "flex flex-col gap-2 rounded-lg border bg-background p-2.5",
                          snapshot.isDragging && "shadow-lg",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            {...dragProvided.dragHandleProps}
                            className="flex size-6 shrink-0 cursor-grab items-center justify-center text-muted-foreground"
                            aria-label={`Reorder ${stage.label}`}
                          >
                            <GripVertical className="size-4" />
                          </span>
                          <Input
                            value={drafts[stage.id] ?? stage.label}
                            onChange={(e) => setDrafts((prev) => ({ ...prev, [stage.id]: e.target.value }))}
                            onBlur={() => commitRename(stage.id, stage.label)}
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
                            onClick={() => handleSetDefault(stage.id)}
                            className={cn(
                              "shrink-0 whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-medium",
                              stage.isDefaultNewPostStage ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70",
                            )}
                          >
                            {stage.isDefaultNewPostStage ? "Default ✓" : "Set as default"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(stage)}
                            aria-label={`Delete stage ${stage.label}`}
                            title={`Delete "${stage.label}"`}
                            className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                        <div className="flex flex-col gap-2 pl-8">
                          {FLAG_GROUPS.map((group) => (
                            <div key={group.title} className="flex flex-col gap-1">
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                                {group.title}
                              </span>
                              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                                {group.items.map(({ key, label }) => (
                                  <label key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Checkbox
                                      className="size-3.5"
                                      checked={stage[key] as boolean}
                                      onCheckedChange={(checked) => updateStage(stage.id, { [key]: checked === true })}
                                    />
                                    {label}
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        <div className="flex gap-2 border-t pt-3">
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="New stage…"
            className="h-8"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                createStage();
              }
            }}
          />
          <Button type="button" size="sm" onClick={createStage} disabled={!newLabel.trim()}>
            <Plus className="size-3.5" />
            Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
