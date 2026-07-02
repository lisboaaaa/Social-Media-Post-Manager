"use client";

import { useState } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { Column } from "./Column";
import { PublishedUrlDialog } from "./PublishedUrlDialog";
import { ScheduleDateDialog } from "./ScheduleDateDialog";
import { useStore } from "@/lib/store";
import { POST_STATUSES, type PostStatus } from "@/lib/types";

const STATUS_ORDER = POST_STATUSES.map((s) => s.value);

// Sending a post back to an earlier stage (e.g. In Review -> Writing) is how
// "changes requested" happens on this board, since there's no dedicated
// column for it — flag it automatically. Moving forward again means the
// changes were addressed, so the flag clears once the post moves past
// wherever it was flagged.
function needsChangesPatch(oldStatus: PostStatus, newStatus: PostStatus): { needsChanges: boolean } | Record<string, never> {
  const oldIndex = STATUS_ORDER.indexOf(oldStatus);
  const newIndex = STATUS_ORDER.indexOf(newStatus);
  if (newIndex < oldIndex) return { needsChanges: true };
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
              posts={filteredPosts.filter((p) => p.status === value)}
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
