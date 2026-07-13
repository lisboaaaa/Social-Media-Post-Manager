"use client";

import { useState } from "react";
import { BarChart3, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PersonalStatsModal } from "@/components/stats/PersonalStatsModal";
import { SettingsMenu } from "./SettingsMenu";
import { useStore } from "@/lib/store";

export function UserMenu() {
  const { currentUser, signOut } = useStore();
  const [statsOpen, setStatsOpen] = useState(false);

  const handleSignOut = () => {
    if (confirm("Sign out?")) signOut();
  };

  return (
    <div className="flex items-center gap-2">
      <SettingsMenu />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<button type="button" aria-label={currentUser.fullName} title={currentUser.fullName} className="rounded-full outline-offset-2" />}
        >
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-[10px]">{currentUser.initials}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => setStatsOpen(true)}>
            <BarChart3 className="size-3.5" />
            Your stats
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
            <LogOut className="size-3.5" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <PersonalStatsModal open={statsOpen} onOpenChange={setStatsOpen} />
    </div>
  );
}
