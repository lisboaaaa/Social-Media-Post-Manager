import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { TeamNotesTab } from "./TeamNotesTab";
import { UserMenu } from "./UserMenu";
import { ViewTabs } from "./ViewTabs";
import { FilterBar } from "@/components/filters/FilterBar";

export function Header() {
  return (
    <div className="sticky top-0 z-40 border-b bg-background">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <h1 className="text-2xl font-bold tracking-tight">Social Media Post Manager</h1>
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
        <ViewTabs />
        <FilterBar />
      </div>
    </div>
  );
}
