"use client";

import { useState } from "react";
import { MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { GeneralComments } from "@/components/comments/GeneralComments";
import { RecentPostComments } from "@/components/comments/RecentPostComments";
import { useStore } from "@/lib/store";

export function TeamNotesTab() {
  const [open, setOpen] = useState(false);
  const [unreadSince, setUnreadSince] = useState<string | null>(null);
  const { openPreview, hasUnreadTeamNotes, lastReadTeamNotesAt, markTeamNotesRead } = useStore();

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
        <ScrollArea className="flex-1 px-4">
          <div className="flex flex-col gap-6 pb-4">
            <GeneralComments unreadSince={unreadSince} />
            <Separator />
            <RecentPostComments
              unreadSince={unreadSince}
              onOpenPost={(postId) => {
                setOpen(false);
                openPreview(postId);
              }}
            />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
