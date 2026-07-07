"use client";

import { useState } from "react";
import { LogOut, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PersonalStatsModal } from "@/components/stats/PersonalStatsModal";
import { ConnectClaudeModal } from "@/components/settings/ConnectClaudeModal";
import { useStore } from "@/lib/store";

export function UserMenu() {
  const { currentUser, signOut } = useStore();
  const [statsOpen, setStatsOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setConnectOpen(true)}
        aria-label="Connect to Claude"
        title="Connect to Claude"
        className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Sparkles className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => setStatsOpen(true)}
        aria-label="View your stats"
        title={`${currentUser.fullName} — view your stats`}
        className="rounded-full outline-offset-2"
      >
        <Avatar className="h-7 w-7">
          <AvatarFallback className="text-[10px]">{currentUser.initials}</AvatarFallback>
        </Avatar>
      </button>
      <button
        type="button"
        onClick={signOut}
        aria-label="Sign out"
        title="Sign out"
        className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <LogOut className="size-4" />
      </button>
      <PersonalStatsModal open={statsOpen} onOpenChange={setStatsOpen} />
      <ConnectClaudeModal open={connectOpen} onOpenChange={setConnectOpen} />
    </div>
  );
}
