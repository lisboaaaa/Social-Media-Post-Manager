"use client";

import { useState } from "react";
import { MessageSquareText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecentPostComments } from "@/components/comments/RecentPostComments";
import { MyCommentsFeed } from "@/components/comments/MyCommentsFeed";
import { mentionsProfile } from "@/lib/mentions";
import { isCommentUnread, useStore } from "@/lib/store";

export function TeamNotesTab() {
  const [open, setOpen] = useState(false);
  const [unreadSince, setUnreadSince] = useState<string | null>(null);
  const { comments, posts, openPreview, lastReadTeamNotesAt, markTeamNotesRead, currentUser } = useStore();

  const unreadCount = comments.filter((c) => isCommentUnread(c, currentUser?.id, lastReadTeamNotesAt)).length;

  const forYouCount = comments.filter((c) => {
    if (c.postId === null || c.authorId === currentUser.id) return false;
    if (lastReadTeamNotesAt !== null && c.createdAt <= lastReadTeamNotesAt) return false;
    const post = posts.find((p) => p.id === c.postId);
    return mentionsProfile(c.body, currentUser.fullName) || post?.assigneeId === currentUser.id;
  }).length;

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setUnreadSince(lastReadTeamNotesAt);
      markTeamNotesRead();
    }
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} swipeDirection="right" showSwipeHandle>
      <DrawerTrigger render={<Button variant="outline" size="lg" className="relative px-2.5 text-[0.95rem] sm:px-4" />}>
        <MessageSquareText className="size-4" />
        <span className="hidden sm:inline">Team notes</span>
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -right-2 -top-2 min-w-4.5 justify-center rounded-full px-1 py-0 text-[10px] leading-4"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </DrawerTrigger>

      <DrawerContent className="w-full sm:max-w-sm">
        <DrawerHeader>
          <DrawerTitle>Team notes</DrawerTitle>
        </DrawerHeader>
        <Tabs defaultValue="recent" className="flex flex-1 flex-col overflow-hidden px-4">
          <TabsList className="mb-4 h-10 self-center">
            <TabsTrigger value="recent" className="px-5 text-sm">
              Recent
            </TabsTrigger>
            <TabsTrigger value="for-you" className="relative px-5 text-sm">
              For you
              {forYouCount > 0 && (
                <Badge variant="destructive" className="min-w-4 justify-center rounded-full px-1 py-0 text-[10px] leading-4">
                  {forYouCount > 99 ? "99+" : forYouCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <ScrollArea className="flex-1 border-t pt-4">
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
      </DrawerContent>
    </Drawer>
  );
}
