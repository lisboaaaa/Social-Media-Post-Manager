"use client";

import { useState } from "react";
import { MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecentPostComments } from "@/components/comments/RecentPostComments";
import { MyCommentsFeed } from "@/components/comments/MyCommentsFeed";
import { mentionsProfile } from "@/lib/mentions";
import { useStore } from "@/lib/store";

export function TeamNotesTab() {
  const [open, setOpen] = useState(false);
  const [unreadSince, setUnreadSince] = useState<string | null>(null);
  const { comments, posts, openPreview, hasUnreadTeamNotes, lastReadTeamNotesAt, markTeamNotesRead, currentUser } =
    useStore();

  const hasNewForYou = comments.some((c) => {
    if (c.postId === null || c.authorId === currentUser.id) return false;
    if (lastReadTeamNotesAt !== null && c.createdAt <= lastReadTeamNotesAt) return false;
    const post = posts.find((p) => p.id === c.postId);
    return mentionsProfile(c.body, currentUser.fullName) || post?.assigneeId === currentUser.id;
  });

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setUnreadSince(lastReadTeamNotesAt);
      markTeamNotesRead();
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger render={<Button variant="outline" size="lg" className="relative px-4 text-[0.95rem]" />}>
        <MessageSquareText className="size-4" />
        Team notes
        {hasUnreadTeamNotes && (
          <span className="absolute -right-1 -top-1 flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive/60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-destructive" />
          </span>
        )}
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Team notes</SheetTitle>
        </SheetHeader>
        <Tabs defaultValue="recent" className="flex flex-1 flex-col overflow-hidden px-4">
          <TabsList className="self-center">
            <TabsTrigger value="recent">Recent</TabsTrigger>
            <TabsTrigger value="for-you" className="relative">
              For you
              {hasNewForYou && <span className="ml-1 size-1.5 shrink-0 rounded-full bg-destructive" aria-label="Unread" />}
            </TabsTrigger>
          </TabsList>
          <ScrollArea className="flex-1">
            <TabsContent value="recent" className="pb-4">
              <RecentPostComments
                unreadSince={unreadSince}
                onOpenPost={(postId) => {
                  setOpen(false);
                  openPreview(postId);
                }}
              />
            </TabsContent>
            <TabsContent value="for-you" className="pb-4">
              <MyCommentsFeed
                unreadSince={unreadSince}
                onOpenPost={(postId) => {
                  setOpen(false);
                  openPreview(postId);
                }}
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
