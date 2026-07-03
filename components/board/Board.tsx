"use client";

import { useState } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { Column } from "./Column";
import { PublishedUrlDialog } from "./PublishedUrlDialog";
import { ScheduleDateDialog } from "./ScheduleDateDialog";
import { useStore } from "@/lib/store";
import { POST_STATUSES, type PostStatus } from "@/lib/types";

const STATUS_ORDER = POST_STATUSES.map((s) => s.value);
const PUBLISHED_WINDOW_MS = 21 * 24 * 60 * 60 * 1000; // 3 weeks — older posts still live in the Archive tab

function isRecentlyPublished(post: { targetDate: string | null }) {
  if (!post.targetDate) return false;
  return Date.now() - new Date(post.targetDate).getTime() <= PUBLISHED_WINDOW_MS;
}

// Sending a post back from In Review (e.g. to Writing or Designing) is how
// "changes requested" happens on this board, since there's no dedicated
// column for it — flag it automatically. Moving forward again means the
// changes were addressed, so the flag clears once the post moves past
// wherever it was flagged. Only moves originating at In Review count —
// dragging something already Approved/Scheduled/Published a step back is
// usually just a correction or a misclick, not new review feedback.
function needsChangesPatch(oldStatus: PostStatus, newStatus: PostStatus): { needsChanges: boolean } | Record<string, never> {
  const oldIndex = STATUS_ORDER.indexOf(oldStatus);
  const newIndex = STATUS_ORDER.indexOf(newStatus);
  if (oldStatus === "in_review" && newIndex < oldIndex) return { needsChanges: true };
  if (newIndex > oldIndex) return { needsChanges: false };
  return {};
}

export function Board() {
  const { filteredPosts, movePost, getPostById } = useStore();
  const [pendingSchedule, setPendingSchedule] = useState<{ postId: string; status: PostStatus; index: number } | null>(null);
  const [pendingPublish, setPendingPublish] = useState<{ postId: string; status: PostStatus; index: number } | null>(null);

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as PostStatus;
    const post = getPostById(draggableId);
    if (!post) return;

    if (newStatus === "scheduled" && !post.targetDate) {
      setPendingSchedule({ postId: draggableId, status: newStatus, index: destination.index });
      return;
    }

    if (newStatus === "published" && !post.publishedUrl) {
      setPendingPublish({ postId: draggableId, status: newStatus, index: destination.index });
      return;
    }

    movePost(draggableId, newStatus, destination.index, needsChangesPatch(post.status, newStatus));
  };

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex flex-1 items-stretch gap-3 overflow-x-auto pb-2">
          {POST_STATUSES.map(({ value, label }) => (
            <Column
              key={value}
              status={value}
              label={label}
              hint={value === "published" ? "Last 3 weeks — see Archive for more" : undefined}
              posts={filteredPosts.filter((p) => p.status === value && (value !== "published" || isRecentlyPublished(p)))}
            />
          ))}
        </div>
      </DragDropContext>

      <ScheduleDateDialog
        open={pendingSchedule !== null}
        onCancel={() => setPendingSchedule(null)}
        onConfirm={(date) => {
          if (!pendingSchedule) return;
          const post = getPostById(pendingSchedule.postId);
          movePost(pendingSchedule.postId, pendingSchedule.status, pendingSchedule.index, {
            targetDate: date,
            ...(post ? needsChangesPatch(post.status, pendingSchedule.status) : {}),
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
          movePost(pendingPublish.postId, pendingPublish.status, pendingPublish.index, {
            ...(post ? needsChangesPatch(post.status, pendingPublish.status) : {}),
          });
          setPendingPublish(null);
        }}
        onConfirm={(url) => {
          if (!pendingPublish) return;
          const post = getPostById(pendingPublish.postId);
          movePost(pendingPublish.postId, pendingPublish.status, pendingPublish.index, {
            publishedUrl: url,
            ...(post ? needsChangesPatch(post.status, pendingPublish.status) : {}),
          });
          setPendingPublish(null);
        }}
      />
    </>
  );
}
