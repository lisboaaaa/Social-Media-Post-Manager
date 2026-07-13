"use client";

import { useRef, useState } from "react";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { Column } from "./Column";
import { PublishedUrlDialog } from "./PublishedUrlDialog";
import { ScheduleDateDialog } from "./ScheduleDateDialog";
import { StickyScrollbar } from "./StickyScrollbar";
import { useStore } from "@/lib/store";
import { needsChangesPatch } from "@/lib/stageRules";
import type { PostStatus } from "@/lib/types";

const PUBLISHED_WINDOW_MS = 21 * 24 * 60 * 60 * 1000; // 3 weeks — older posts still live in the Archive tab

function isRecentlyPublished(post: { targetDate: string | null }) {
  if (!post.targetDate) return false;
  // Appending a local time avoids the browser parsing the date-only string
  // as UTC midnight, which shifts it a day earlier in timezones behind UTC.
  return Date.now() - new Date(`${post.targetDate}T00:00:00`).getTime() <= PUBLISHED_WINDOW_MS;
}

export function Board() {
  const { filteredPosts, stages, movePost, getPostById, updateStage, reorderStages } = useStore();
  const [pendingSchedule, setPendingSchedule] = useState<{ postId: string; status: PostStatus; index: number } | null>(null);
  const [pendingPublish, setPendingPublish] = useState<{ postId: string; status: PostStatus; index: number } | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  const stageById = (id: string) => stages.find((s) => s.id === id);

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId, type } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    if (type === "COLUMN") {
      const reordered = [...stages];
      const [moved] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, moved);
      reorderStages(reordered.map((s) => s.id));
      return;
    }

    const newStatus = destination.droppableId as PostStatus;
    const post = getPostById(draggableId);
    const targetStage = stageById(newStatus);
    if (!post || !targetStage) return;

    if (targetStage.requiresTargetDate && !post.targetDate) {
      setPendingSchedule({ postId: draggableId, status: newStatus, index: destination.index });
      return;
    }

    if (targetStage.requiresPublishedUrl && !post.publishedUrl) {
      setPendingPublish({ postId: draggableId, status: newStatus, index: destination.index });
      return;
    }

    const oldStage = stageById(post.status);
    movePost(draggableId, newStatus, destination.index, oldStage ? needsChangesPatch(oldStage, targetStage) : {});
  };

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="board-columns" direction="horizontal" type="COLUMN">
          {(columnsProvided) => (
            <div
              ref={(el) => {
                rowRef.current = el;
                columnsProvided.innerRef(el);
              }}
              {...columnsProvided.droppableProps}
              className="scrollbar-hide grid flex-1 items-stretch overflow-x-auto pb-2 mx-auto w-full max-w-[1780px]"
              style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(188px, 1fr))` }}
            >
              {stages.map((stage, index) => (
                <Draggable key={stage.id} draggableId={`column-${stage.id}`} index={index}>
                  {(dragProvided, dragSnapshot) => (
                    <Column
                      innerRef={dragProvided.innerRef}
                      draggableProps={dragProvided.draggableProps}
                      dragHandleProps={dragProvided.dragHandleProps}
                      isDragging={dragSnapshot.isDragging}
                      status={stage.id}
                      label={stage.label}
                      hint={stage.isArchiveStage ? "Last 3 weeks — see Archive for more" : undefined}
                      posts={filteredPosts.filter((p) => p.status === stage.id && (!stage.isArchiveStage || isRecentlyPublished(p)))}
                      onRename={(newLabel) => updateStage(stage.id, { label: newLabel })}
                    />
                  )}
                </Draggable>
              ))}
              {columnsProvided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      <StickyScrollbar targetRef={rowRef} />

      <ScheduleDateDialog
        open={pendingSchedule !== null}
        onCancel={() => setPendingSchedule(null)}
        onConfirm={(date) => {
          if (!pendingSchedule) return;
          const post = getPostById(pendingSchedule.postId);
          const oldStage = post ? stageById(post.status) : undefined;
          const newStage = stageById(pendingSchedule.status);
          movePost(pendingSchedule.postId, pendingSchedule.status, pendingSchedule.index, {
            targetDate: date,
            ...(oldStage && newStage ? needsChangesPatch(oldStage, newStage) : {}),
          });
          setPendingSchedule(null);
        }}
      />

      <PublishedUrlDialog
        open={pendingPublish !== null}
        onCancel={() => setPendingPublish(null)}
        onSkip={() => {
          if (!pendingPublish) return;
          const post = getPostById(pendingPublish.postId);
          const oldStage = post ? stageById(post.status) : undefined;
          const newStage = stageById(pendingPublish.status);
          movePost(pendingPublish.postId, pendingPublish.status, pendingPublish.index, {
            ...(oldStage && newStage ? needsChangesPatch(oldStage, newStage) : {}),
          });
          setPendingPublish(null);
        }}
        onConfirm={(url) => {
          if (!pendingPublish) return;
          const post = getPostById(pendingPublish.postId);
          const oldStage = post ? stageById(post.status) : undefined;
          const newStage = stageById(pendingPublish.status);
          movePost(pendingPublish.postId, pendingPublish.status, pendingPublish.index, {
            publishedUrl: url,
            ...(oldStage && newStage ? needsChangesPatch(oldStage, newStage) : {}),
          });
          setPendingPublish(null);
        }}
      />
    </>
  );
}
