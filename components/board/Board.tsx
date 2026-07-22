"use client";

import { useRef, useState, type CSSProperties } from "react";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { Column } from "./Column";
import { ConfettiBurst } from "./ConfettiBurst";
import { PublishedUrlDialog } from "./PublishedUrlDialog";
import { ScheduleDateDialog } from "./ScheduleDateDialog";
import { StickyScrollbar } from "./StickyScrollbar";
import { useStore } from "@/lib/store";
import { needsChangesPatch } from "@/lib/stageRules";
import type { PostStatus, Stage } from "@/lib/types";

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
  const [confetti, setConfetti] = useState<{ x: number; y: number } | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  const stageById = (id: string) => stages.find((s) => s.id === id);

  // Center of the dropped card itself, found via the drag library's own
  // data attribute — read a couple frames after the move so the card has
  // already animated into its new column position.
  const cardCenter = (postId: string) => {
    const el = document.querySelector(`[data-rfd-draggable-id="${postId}"]`);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  };

  // A brief celebration the first time a post lands in the final stage —
  // pure delight, so it only fires on an actual transition into it (not a
  // reorder within it, and not on load), and never for anyone who's asked
  // the OS to reduce motion.
  const celebrateIfPublished = (oldStage: Stage | undefined, targetStage: Stage, postId: string) => {
    if (!targetStage.isArchiveStage || oldStage?.isArchiveStage) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const center = cardCenter(postId);
        if (center) setConfetti(center);
      });
    });
  };

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

    if (targetStage.requiresPublishedUrl && post.platforms.some((p) => !post.publishedUrls[p])) {
      setPendingPublish({ postId: draggableId, status: newStatus, index: destination.index });
      return;
    }

    const oldStage = stageById(post.status);
    movePost(draggableId, newStatus, destination.index, oldStage ? needsChangesPatch(oldStage, targetStage) : {});
    celebrateIfPublished(oldStage, targetStage, draggableId);
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
              className="board-columns scrollbar-hide grid flex-1 items-stretch overflow-x-auto pb-2 mx-auto w-full max-w-[1780px]"
              style={{ "--stage-count": stages.length } as CSSProperties}
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
          if (newStage) celebrateIfPublished(oldStage, newStage, pendingSchedule.postId);
          setPendingSchedule(null);
        }}
      />

      <PublishedUrlDialog
        open={pendingPublish !== null}
        platforms={(pendingPublish && getPostById(pendingPublish.postId)?.platforms) ?? []}
        initialUrls={(pendingPublish && getPostById(pendingPublish.postId)?.publishedUrls) ?? {}}
        onCancel={() => setPendingPublish(null)}
        onSkip={() => {
          if (!pendingPublish) return;
          const post = getPostById(pendingPublish.postId);
          const oldStage = post ? stageById(post.status) : undefined;
          const newStage = stageById(pendingPublish.status);
          movePost(pendingPublish.postId, pendingPublish.status, pendingPublish.index, {
            ...(oldStage && newStage ? needsChangesPatch(oldStage, newStage) : {}),
          });
          if (newStage) celebrateIfPublished(oldStage, newStage, pendingPublish.postId);
          setPendingPublish(null);
        }}
        onConfirm={(urls) => {
          if (!pendingPublish) return;
          const post = getPostById(pendingPublish.postId);
          const oldStage = post ? stageById(post.status) : undefined;
          const newStage = stageById(pendingPublish.status);
          movePost(pendingPublish.postId, pendingPublish.status, pendingPublish.index, {
            publishedUrls: { ...(post?.publishedUrls ?? { linkedin: null, instagram: null, x: null }), ...urls },
            ...(oldStage && newStage ? needsChangesPatch(oldStage, newStage) : {}),
          });
          if (newStage) celebrateIfPublished(oldStage, newStage, pendingPublish.postId);
          setPendingPublish(null);
        }}
      />
      {confetti && <ConfettiBurst x={confetti.x} y={confetti.y} onDone={() => setConfetti(null)} />}
    </>
  );
}
