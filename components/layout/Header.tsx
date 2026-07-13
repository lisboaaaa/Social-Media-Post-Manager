"use client";

import { useState } from "react";
import Link from "next/link";
import { Columns3, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { TeamNotesTab } from "./TeamNotesTab";
import { UserMenu } from "./UserMenu";
import { ViewTabs } from "./ViewTabs";
import { FilterBar } from "@/components/filters/FilterBar";
import { ManageStagesModal } from "@/components/board/ManageStagesModal";

export function Header() {
  const [manageStagesOpen, setManageStagesOpen] = useState(false);

  return (
    <div className="sticky top-0 z-40 bg-background/70 shadow-sm backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <h1 className="text-3xl font-bold tracking-tight">Social Media Post Manager</h1>
        <div className="flex items-center gap-2">
          <TeamNotesTab />
          <Link href="/posts/new" className={buttonVariants({ size: "lg", className: "px-4 text-[0.95rem]" })}>
            <Plus className="size-4" />
            New post
          </Link>
          <UserMenu />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 pb-4">
        <div className="flex items-center gap-1.5">
          <ViewTabs />
          <button
            type="button"
            onClick={() => setManageStagesOpen(true)}
            aria-label="Manage stages"
            title="Manage stages"
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Columns3 className="size-4" />
          </button>
        </div>
        <FilterBar />
      </div>
      <ManageStagesModal open={manageStagesOpen} onOpenChange={setManageStagesOpen} />
    </div>
  );
}
