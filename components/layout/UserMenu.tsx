"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, Columns3, History, Link2, LogOut, Settings, Tag, Trash2, Wrench } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PersonalStatsModal } from "@/components/stats/PersonalStatsModal";
import { DevToolsPanel } from "@/components/devtools/DevToolsPanel";
import { ManageStagesModal } from "@/components/board/ManageStagesModal";
import { ManageCategoriesModal } from "@/components/filters/ManageCategoriesModal";
import { GlobalHistoryModal } from "@/components/settings/GlobalHistoryModal";
import { PreferencesModal } from "@/components/settings/PreferencesModal";
import { UtmTagsModal } from "@/components/settings/UtmTagsModal";
import { useStore } from "@/lib/store";

// Everything that isn't part of daily work (admin/config actions, personal
// display preferences, account actions) lives in this one menu instead of
// scattered as separate header icons. The Board/List view choice moved to
// its own "eye" icon in the FilterBar instead — it's related to filtering
// what you see, not to the account, per team feedback.
export function UserMenu() {
  const { currentUser, signOut } = useStore();
  const [statsOpen, setStatsOpen] = useState(false);
  const [devToolsOpen, setDevToolsOpen] = useState(false);
  const [manageStagesOpen, setManageStagesOpen] = useState(false);
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);
  const [globalHistoryOpen, setGlobalHistoryOpen] = useState(false);
  const [utmTagsOpen, setUtmTagsOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  const handleSignOut = () => {
    if (confirm("Sign out?")) signOut();
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<button type="button" aria-label={currentUser.fullName} title={currentUser.fullName} className="rounded-full outline-offset-2" />}
        >
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-[10px]">{currentUser.initials}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Settings</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setManageStagesOpen(true)}>
              <Columns3 className="size-3.5" />
              Manage stages
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setManageCategoriesOpen(true)}>
              <Tag className="size-3.5" />
              Manage categories
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setGlobalHistoryOpen(true)}>
              <History className="size-3.5" />
              Global history
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setUtmTagsOpen(true)}>
              <Link2 className="size-3.5" />
              UTM tags
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDevToolsOpen(true)}>
              <Wrench className="size-3.5" />
              Dev Tools
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/trash" />}>
              <Trash2 className="size-3.5" />
              Trash
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setPreferencesOpen(true)}>
            <Settings className="size-3.5" />
            Preferences
          </DropdownMenuItem>
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
      <DevToolsPanel open={devToolsOpen} onOpenChange={setDevToolsOpen} />
      <ManageStagesModal open={manageStagesOpen} onOpenChange={setManageStagesOpen} />
      <ManageCategoriesModal open={manageCategoriesOpen} onOpenChange={setManageCategoriesOpen} />
      <GlobalHistoryModal open={globalHistoryOpen} onOpenChange={setGlobalHistoryOpen} />
      <UtmTagsModal open={utmTagsOpen} onOpenChange={setUtmTagsOpen} />
      <PreferencesModal open={preferencesOpen} onOpenChange={setPreferencesOpen} />
    </div>
  );
}
