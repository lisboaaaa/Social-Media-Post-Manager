"use client";

import { useState } from "react";
import { Columns3, LayoutGrid, Rows3, Settings, Sparkles, Wrench } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConnectClaudeModal } from "@/components/settings/ConnectClaudeModal";
import { DevToolsPanel } from "@/components/devtools/DevToolsPanel";
import { ManageStagesModal } from "@/components/board/ManageStagesModal";
import { useStore, type BoardViewMode } from "@/lib/store";

// Everything here is either an admin/config action (used rarely, not part
// of daily work) or a personal display preference — grouped into one menu
// so they don't clutter the header as separate icons.
export function SettingsMenu() {
  const { boardViewMode, setBoardViewMode } = useStore();
  const [connectOpen, setConnectOpen] = useState(false);
  const [devToolsOpen, setDevToolsOpen] = useState(false);
  const [manageStagesOpen, setManageStagesOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label="Settings"
              title="Settings"
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            />
          }
        >
          <Settings className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>View</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={boardViewMode} onValueChange={(value) => setBoardViewMode(value as BoardViewMode)}>
            <DropdownMenuRadioItem value="board">
              <LayoutGrid className="size-3.5" />
              Board
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="list">
              <Rows3 className="size-3.5" />
              List
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setManageStagesOpen(true)}>
            <Columns3 className="size-3.5" />
            Manage stages
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setConnectOpen(true)}>
            <Sparkles className="size-3.5" />
            Connect to Claude
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDevToolsOpen(true)}>
            <Wrench className="size-3.5" />
            Dev Tools
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConnectClaudeModal open={connectOpen} onOpenChange={setConnectOpen} />
      <DevToolsPanel open={devToolsOpen} onOpenChange={setDevToolsOpen} />
      <ManageStagesModal open={manageStagesOpen} onOpenChange={setManageStagesOpen} />
    </>
  );
}
